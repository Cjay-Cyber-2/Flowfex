import type {
  CapabilityCandidate,
  CapabilityRetrievalResult,
  EngineLogger,
  TaskIntent,
  ToolRegistryLike,
} from './contracts.js';
import { overlapScore, stringifyForSearch, truncate, uniqueStrings } from './utils.js';

export class CapabilityRetriever {
  private readonly registry: ToolRegistryLike;
  private readonly logger: EngineLogger;

  constructor(config: { registry: ToolRegistryLike; logger: EngineLogger }) {
    this.registry = config.registry;
    this.logger = config.logger;
  }

  retrieve(
    intent: TaskIntent,
    options: {
      sessionId: string;
      executionId: string;
      allowedToolIds?: string[];
      topKPerCategory?: number;
      minScore?: number;
      fallbackMinScore?: number;
    }
  ): CapabilityRetrievalResult {
    const categories = uniqueStrings([
      ...intent.capabilityCategories,
      ...intent.suggestedExecutionSteps.map(step => step.capabilityCategory),
    ]);
    const topKPerCategory = options.topKPerCategory ?? 10;
    const minScore = options.minScore ?? 0.14;
    const fallbackMinScore = options.fallbackMinScore ?? Math.max(0.2, minScore + 0.06);
    const byCategory: Record<string, CapabilityCandidate[]> = {};
    const mergedByToolId = new Map<string, CapabilityCandidate>();
    let usedFallback = false;
    let usedSemantic = false;

    for (const category of categories) {
      const query = this.buildCategoryQuery(intent, category);
      const retrieval = this.safeSemanticRetrieval(query, {
        category,
        allowedToolIds: options.allowedToolIds,
        topK: topKPerCategory,
        minScore,
      });
      const normalizedMatches = retrieval.matches.map(match =>
        normalizeCandidate(match.tool, match.score, match.strategy, category, query)
      );

      if (normalizedMatches.length === 0) {
        const fallbackMatches = this.runDeterministicFallback(query, category, {
          allowedToolIds: options.allowedToolIds,
          topK: topKPerCategory,
          minScore: fallbackMinScore,
        });
        byCategory[category] = fallbackMatches;
        usedFallback = usedFallback || fallbackMatches.length > 0;
      } else {
        byCategory[category] = normalizedMatches;
        usedSemantic = true;
        usedFallback = usedFallback || retrieval.fallbackUsed;
      }

      for (const candidate of byCategory[category] || []) {
        const existing = mergedByToolId.get(candidate.toolId);
        if (!existing || candidate.score > existing.score) {
          mergedByToolId.set(candidate.toolId, candidate);
        }
      }
    }

    const merged = Array.from(mergedByToolId.values()).sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.toolId.localeCompare(right.toolId);
    });

    this.logger.info({
      event: 'orchestration.capabilities.retrieved',
      message: 'Capability retrieval completed',
      sessionId: options.sessionId,
      executionId: options.executionId,
      categoryCount: categories.length,
      resultCount: merged.length,
      fallbackUsed: usedFallback,
    });

    return {
      byCategory,
      merged,
      strategy: usedSemantic && usedFallback
        ? 'mixed'
        : usedSemantic
          ? 'semantic'
          : 'deterministic-fallback',
      fallbackUsed: usedFallback,
    };
  }

  private safeSemanticRetrieval(
    query: string,
    options: {
      category: string;
      allowedToolIds?: string[];
      topK: number;
      minScore: number;
    }
  ) {
    try {
      const availableCategories = this.registry.getCategories?.() || [];
      const filters: { category?: string; toolIds?: string[] } = {};
      if (availableCategories.some(category => category.toLowerCase() === options.category.toLowerCase())) {
        filters.category = options.category;
      }
      if (options.allowedToolIds?.length) {
        filters.toolIds = options.allowedToolIds;
      }

      return this.registry.retrieveTools(query, {
        topK: options.topK,
        minScore: options.minScore,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        allowKeywordFallback: false,
      });
    } catch (error) {
      this.logger.warn({
        event: 'orchestration.capabilities.semantic_failed',
        message: 'Semantic capability retrieval failed, deterministic fallback will be used',
        category: options.category,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        strategy: 'deterministic-fallback',
        query,
        matches: [],
        fallbackUsed: true,
        fallbackReason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private runDeterministicFallback(
    query: string,
    category: string,
    options: {
      allowedToolIds?: string[];
      topK: number;
      minScore: number;
    }
  ): CapabilityCandidate[] {
    const allowedToolIds = options.allowedToolIds?.length
      ? new Set(options.allowedToolIds)
      : null;
    const pool = this.registry.getAllTools().filter(tool => {
      if (allowedToolIds && !allowedToolIds.has(tool.id)) {
        return false;
      }

      return true;
    });

    const ranked = pool
      .map(tool => {
        const haystack = [
          tool.name,
          tool.description,
          tool.metadata?.category || '',
          ...(tool.metadata?.tags || []),
          ...(tool.keywords || []),
        ].join(' ');
        const lexicalScore = overlapScore(query, haystack);
        const categoryAlignment = overlapScore(category, String(tool.metadata?.category || ''));
        const score = (
          lexicalScore * 0.75
          + categoryAlignment * 0.2
          + (String(tool.metadata?.validationStatus || '').toLowerCase() === 'approved' ? 0.05 : 0)
        );

        return {
          lexicalScore,
          categoryAlignment,
          candidate: normalizeCandidate(tool, Number(score.toFixed(4)), 'deterministic-fallback', category, query),
        };
      })
      .filter(entry =>
        entry.candidate.score >= options.minScore
        && entry.lexicalScore >= 0.12
        && (entry.lexicalScore >= 0.18 || entry.categoryAlignment >= 0.65)
      )
      .sort((left, right) => {
        if (right.candidate.score !== left.candidate.score) {
          return right.candidate.score - left.candidate.score;
        }
        return left.candidate.toolId.localeCompare(right.candidate.toolId);
      })
      .slice(0, options.topK)
      .map(entry => entry.candidate);

    return ranked;
  }

  private buildCategoryQuery(intent: TaskIntent, category: string): string {
    const stepObjectives = intent.suggestedExecutionSteps
      .filter(step => step.capabilityCategory.toLowerCase() === category.toLowerCase())
      .map(step => `${step.title}: ${step.objective}`)
      .slice(0, 4);

    return [
      `Goal: ${intent.goal}`,
      `Category: ${category}`,
      stepObjectives.length > 0 ? `Step objectives: ${stepObjectives.join(' | ')}` : '',
      intent.constraints.length > 0 ? `Constraints: ${intent.constraints.join(' | ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

function normalizeCandidate(
  tool: CapabilityCandidate['tool'],
  score: number,
  strategy: string,
  matchedCategory: string,
  query: string
): CapabilityCandidate {
  return {
    tool,
    toolId: tool.id,
    toolName: tool.name,
    description: truncate(tool.description, 180),
    category: String(tool.metadata?.category || 'uncategorized'),
    tags: Array.isArray(tool.metadata?.tags) ? tool.metadata?.tags : [],
    score: Number(score.toFixed(4)),
    strategy,
    matchedCategory,
    query: stringifyForSearch(query),
  };
}
