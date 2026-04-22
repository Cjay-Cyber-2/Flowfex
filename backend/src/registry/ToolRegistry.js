import {
  EmbeddingService,
  MemoryVectorIndex,
  buildToolEmbeddingText,
  inputToEmbeddingText
} from '../embeddings/index.js';
import { Tool } from '../types/Tool.js';

/**
 * Enhanced ToolRegistry
 *
 * Manages tool registration, discovery, and selection.
 * Supports semantic retrieval, metadata filtering, and statistics.
 */
export class ToolRegistry {
  constructor(config = {}) {
    this.tools = new Map();
    this.toolsByCategory = new Map();
    this.toolsByTag = new Map();
    this.toolsBySource = new Map();
    this.toolsByTrustLevel = new Map();
    this.toolsByValidationStatus = new Map();
    this.toolsBySourceType = new Map();
    this.embeddingService = config.embeddingService || new EmbeddingService();
    this.vectorIndex = config.vectorIndex || new MemoryVectorIndex();
    this.embeddingMetadata = new Map();
    this.stats = {
      registered: 0,
      executed: 0,
      failed: 0,
      retrievals: 0,
      keywordFallbacks: 0,
      embeddingFailures: 0
    };
  }

  /**
   * Registers a tool in the registry
   * @param {Tool} tool - The tool instance to register
   * @throws {Error} if tool validation fails
   */
  registerTool(tool) {
    const normalizedTool = normalizeTool(tool);

    if (this.tools.has(normalizedTool.id)) {
      throw new Error(`Tool with id '${normalizedTool.id}' is already registered`);
    }

    this.tools.set(normalizedTool.id, normalizedTool);

    const category = normalizedTool.metadata?.category || 'uncategorized';
    indexTool(this.toolsByCategory, category, normalizedTool);
    indexMany(this.toolsByTag, normalizedTool.metadata?.tags || [], normalizedTool);
    indexTool(this.toolsBySource, normalizedTool.metadata?.source || 'unknown', normalizedTool);
    indexTool(this.toolsByTrustLevel, normalizedTool.metadata?.trustLevel || 'unknown', normalizedTool);
    indexTool(this.toolsByValidationStatus, normalizedTool.metadata?.validationStatus || 'unknown', normalizedTool);
    indexTool(this.toolsBySourceType, normalizedTool.metadata?.sourceType || 'unknown', normalizedTool);

    this._indexToolEmbedding(normalizedTool);
    this.stats.registered++;
    return normalizedTool;
  }

  /**
   * Unregisters a tool from the registry
   * @param {string} toolId - The tool ID to remove
   * @returns {boolean} true if removed, false if not found
   */
  unregisterTool(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }

    this.tools.delete(toolId);
    this.vectorIndex.remove(toolId);
    this.embeddingMetadata.delete(toolId);

    const category = tool.metadata?.category || 'uncategorized';
    removeIndexedTool(this.toolsByCategory, category, toolId);
    removeIndexedMany(this.toolsByTag, tool.metadata?.tags || [], toolId);
    removeIndexedTool(this.toolsBySource, tool.metadata?.source || 'unknown', toolId);
    removeIndexedTool(this.toolsByTrustLevel, tool.metadata?.trustLevel || 'unknown', toolId);
    removeIndexedTool(this.toolsByValidationStatus, tool.metadata?.validationStatus || 'unknown', toolId);
    removeIndexedTool(this.toolsBySourceType, tool.metadata?.sourceType || 'unknown', toolId);

    return true;
  }

  /**
   * Retrieves a tool by ID
   * @param {string} toolId - The tool ID
   * @returns {Tool|null} The tool or null if not found
   */
  getTool(toolId) {
    return this.tools.get(toolId) || null;
  }

  /**
   * Resolves a tool by ID, name, or tool-like object
   * @param {string|Tool} toolReference - Tool ID, name, or instance
   * @returns {Tool|null} The resolved tool or null
   */
  resolveTool(toolReference) {
    if (!toolReference) {
      return null;
    }

    if (typeof toolReference === 'object' && typeof toolReference.execute === 'function') {
      return toolReference;
    }

    const byId = this.getTool(toolReference);
    if (byId) {
      return byId;
    }

    return this.getAllTools().find(tool => tool.name === toolReference) || null;
  }

  /**
   * Retrieves all registered tools
   * @returns {Tool[]} Array of all tools
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }

  getTools() {
    return this.getAllTools();
  }

  /**
   * Finds tools by category
   * @param {string} category - The category to filter by
   * @returns {Tool[]} Tools matching the category
   */
  getToolsByCategory(category) {
    return this.toolsByCategory.get(category) || [];
  }

  /**
   * Gets all unique categories
   * @returns {string[]} Array of category names
   */
  getCategories() {
    return Array.from(this.toolsByCategory.keys());
  }

  getToolsByTag(tag) {
    return this.toolsByTag.get(tag) || [];
  }

  /**
   * Returns a normalized index snapshot for the requested dimension.
   * The server uses this to expose searchable metadata without leaking live maps.
   * @param {string} indexName
   * @returns {Object<string, string[]>}
   */
  getIndex(indexName) {
    const index = this._resolveIndex(indexName);
    if (!index) {
      return {};
    }

    return Array.from(index.entries()).reduce((result, [key, tools]) => {
      result[key] = tools.map(tool => tool.id);
      return result;
    }, {});
  }

  filterTools(filters = {}) {
    const {
      category,
      tag,
      source,
      sourcePath,
      trustLevel,
      validationStatus,
      sourceType,
      toolIds
    } = filters;

    const allowedToolIds = Array.isArray(toolIds) ? new Set(toolIds) : null;

    return this.getAllTools().filter(tool => this._matchesFilters(tool, {
      category,
      tag,
      source,
      sourcePath,
      trustLevel,
      validationStatus,
      sourceType,
      toolIds: allowedToolIds ? Array.from(allowedToolIds) : undefined
    }));
  }

  /**
   * Finds tools using keyword matching
   * @param {string|Object} input - User input to match against
   * @param {Object} [filters] - Metadata filters
   * @returns {Tool[]} Tools with matching keywords, sorted by relevance
   */
  findToolsByKeywords(input, filters = {}) {
    const lowerInput = inputToEmbeddingText(input).toLowerCase();
    const matches = [];

    for (const tool of this.filterTools(filters)) {
      const matchCount = (tool.keywords || []).filter(keyword =>
        lowerInput.includes(keyword.toLowerCase())
      ).length;

      if (matchCount > 0) {
        matches.push({ tool, relevance: matchCount });
      }
    }

    return matches
      .sort((left, right) => right.relevance - left.relevance)
      .map(match => match.tool);
  }

  /**
   * Finds tools using semantic similarity over precomputed embeddings.
   * @param {string|Object} input - User input to embed
   * @param {Object} [options] - Retrieval options
   * @returns {Array<{ tool: Tool, score: number, strategy: string }>}
   */
  findToolsBySemanticSimilarity(input, options = {}) {
    const {
      topK = 5,
      minScore = 0.08,
      filters = {}
    } = options;

    const queryText = inputToEmbeddingText(input);
    const embedded = this.embeddingService.embedText(queryText);
    const matches = this.vectorIndex.query(embedded.vector, {
      topK,
      minScore,
      filter: (payload) => this._matchesFilters(payload.tool, filters)
    });

    return matches.map(match => ({
      tool: match.payload.tool,
      score: Number(match.score.toFixed(4)),
      strategy: 'semantic'
    }));
  }

  /**
   * Retrieves relevant tools with semantic search first and keyword fallback.
   * @param {string|Object} input - User input
   * @param {Object} [options] - Retrieval options
   * @returns {{ strategy: string, query: string, matches: Array, fallbackUsed: boolean, fallbackReason?: string|null }}
   */
  retrieveTools(input, options = {}) {
    const {
      topK = 5,
      minScore = 0.08,
      filters = {},
      allowKeywordFallback = true
    } = options;

    const query = inputToEmbeddingText(input);
    this.stats.retrievals++;

    try {
      const semanticMatches = this.findToolsBySemanticSimilarity(query, {
        topK,
        minScore,
        filters
      });

      if (semanticMatches.length > 0) {
        return {
          strategy: 'semantic',
          query,
          matches: semanticMatches,
          fallbackUsed: false,
          fallbackReason: null
        };
      }

      if (!allowKeywordFallback) {
        return {
          strategy: 'semantic',
          query,
          matches: [],
          fallbackUsed: false,
          fallbackReason: 'no_semantic_match'
        };
      }

      return this._buildKeywordFallback(query, filters, topK, 'no_semantic_match');
    } catch (error) {
      this.stats.embeddingFailures++;

      if (!allowKeywordFallback) {
        return {
          strategy: 'semantic',
          query,
          matches: [],
          fallbackUsed: false,
          fallbackReason: error.message
        };
      }

      return this._buildKeywordFallback(query, filters, topK, error.message);
    }
  }

  /**
   * Searches tools using semantic retrieval plus lexical metadata matching.
   * @param {string} query - Search query
   * @param {Object} [filters] - Metadata filters
   * @returns {Tool[]} Tools matching the query
   */
  searchTools(query, filters = {}) {
    const results = [];
    const seen = new Set();
    const semanticRetrieval = this.retrieveTools(query, {
      topK: 10,
      minScore: 0.05,
      filters,
      allowKeywordFallback: false
    });

    for (const match of semanticRetrieval.matches) {
      if (!seen.has(match.tool.id)) {
        seen.add(match.tool.id);
        results.push(match.tool);
      }
    }

    const lowerQuery = query.toLowerCase();

    for (const tool of this.filterTools(filters)) {
      const nameMatch = tool.name.toLowerCase().includes(lowerQuery);
      const descMatch = tool.description.toLowerCase().includes(lowerQuery);
      const categoryMatch = (tool.metadata?.category || '').toLowerCase().includes(lowerQuery);
      const tagMatch = tool.metadata?.tags?.some(tag =>
        tag.toLowerCase().includes(lowerQuery)
      );
      const sourceMatch = (tool.metadata?.source || '').toLowerCase().includes(lowerQuery);
      const sourcePathMatch = (tool.metadata?.sourcePath || '').toLowerCase().includes(lowerQuery);
      const sourceTypeMatch = (tool.metadata?.sourceType || '').toLowerCase().includes(lowerQuery);
      const trustMatch = (tool.metadata?.trustLevel || '').toLowerCase().includes(lowerQuery);
      const validationMatch = (tool.metadata?.validationStatus || '').toLowerCase().includes(lowerQuery);

      if (
        (nameMatch || descMatch || categoryMatch || tagMatch || sourceMatch || sourcePathMatch || sourceTypeMatch || trustMatch || validationMatch) &&
        !seen.has(tool.id)
      ) {
        seen.add(tool.id);
        results.push(tool);
      }
    }

    return results;
  }

  /**
   * Selects the best tool for the given input using semantic retrieval.
   * @param {string|Object} input - User input
   * @param {Object} [options] - Retrieval options
   * @returns {Tool|null} The most relevant tool or null
   */
  selectTool(input, options = {}) {
    const retrieval = this.retrieveTools(input, options);
    return retrieval.matches.length > 0 ? retrieval.matches[0].tool : null;
  }

  findToolByInput(input, options = {}) {
    const keywordMatch = this.findToolsByKeywords(input, options.filters || {})[0];
    if (keywordMatch) {
      return keywordMatch;
    }

    return this.selectTool(input, options);
  }

  /**
   * Executes a tool and records statistics
   * @param {string} toolId - The tool ID to execute
   * @param {*} input - Input to pass to the tool
   * @param {LLMWrapper} llm - The LLM wrapper instance
   * @param {Object} [runtime] - Execution runtime helpers
   * @returns {Promise<*>} The result from the tool
   */
  async executeTool(toolId, input, llm, runtime = null) {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool '${toolId}' not found in registry`);
    }

    this.stats.executed++;

    try {
      return await tool.execute(input, llm, runtime);
    } catch (error) {
      this.stats.failed++;
      throw error;
    }
  }

  /**
   * Gets registry statistics
   * @returns {Object} Statistics about registry usage
   */
  getStats() {
    return {
      ...this.stats,
      totalTools: this.tools.size,
      categories: this.toolsByCategory.size,
      tags: this.toolsByTag.size,
      sources: this.toolsBySource.size,
      trustLevels: this.toolsByTrustLevel.size,
      validationStatuses: this.toolsByValidationStatus.size,
      vectorIndexSize: this.vectorIndex.size(),
      successRate: this.stats.executed > 0
        ? `${((this.stats.executed - this.stats.failed) / this.stats.executed * 100).toFixed(2)}%`
        : 'N/A'
    };
  }

  /**
   * Resets execution statistics
   */
  resetStats() {
    this.stats.executed = 0;
    this.stats.failed = 0;
    this.stats.retrievals = 0;
    this.stats.keywordFallbacks = 0;
    this.stats.embeddingFailures = 0;
  }

  /**
   * Gets a summary of all tools (for API responses)
   * @returns {Object[]} Array of tool summaries
   */
  getToolsSummary() {
    return this.getAllTools().map(tool => this._toolToSummary(tool));
  }

  getCanonicalSkillRecords(options = {}) {
    return this.getAllTools().map(tool => this._toolToCanonicalRecord(tool, options));
  }

  getCanonicalSkillRecord(toolId, options = {}) {
    const tool = this.getTool(toolId);
    return tool ? this._toolToCanonicalRecord(tool, options) : null;
  }

  _toolToSummary(tool) {
    const embedding = this.embeddingMetadata.get(tool.id);

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.metadata?.category || 'uncategorized',
      tags: tool.metadata?.tags || [],
      version: tool.metadata?.version || '1.0.0',
      source: tool.metadata?.source || null,
      sourcePath: tool.metadata?.sourcePath || null,
      sourceRoot: tool.metadata?.sourceRoot || null,
      sourceType: tool.metadata?.sourceType || null,
      sourceClassification: tool.metadata?.sourceClassification || null,
      trustLevel: tool.metadata?.trustLevel || null,
      validationStatus: tool.metadata?.validationStatus || null,
      qualityScore: tool.metadata?.qualityScore ?? null,
      executable: tool.metadata?.executable ?? true,
      embeddingIndexed: Boolean(embedding && !embedding.error),
      embeddingDimensions: embedding?.dimensions ?? null
    };
  }

  _toolToCanonicalRecord(tool, options = {}) {
    const embedding = this.embeddingMetadata.get(tool.id);
    const includeEmbeddingVector = options.includeEmbeddingVector !== false;
    const metadata = tool.metadata || {};
    const approvalRequired = metadata.approvalRequired === true || metadata.requiresApproval === true;

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: metadata.category || 'uncategorized',
      subcategory: metadata.subcategory || metadata.sourceType || 'general',
      inputSchema: metadata.inputSchema || buildDefaultInputSchema(tool),
      outputSchema: metadata.outputSchema || buildDefaultOutputSchema(tool),
      executionHandler: metadata.executionHandler || buildDefaultExecutionHandler(tool),
      approvalRequired,
      metadata: {
        source: metadata.source || 'unknown',
        trustLevel: metadata.trustLevel || metadata.sourceTrustLevel || 'unknown',
        sourcePath: metadata.sourcePath || null,
        sourceRoot: metadata.sourceRoot || metadata.sourceDirectory || null,
        sourceType: metadata.sourceType || null,
        sourceClassification: metadata.sourceClassification || null,
        validationStatus: metadata.validationStatus || null,
        qualityScore: metadata.qualityScore ?? null,
        version: metadata.version || '1.0.0',
        executable: metadata.executable ?? true,
        imported: metadata.imported === true,
        usage: metadata.usage || null,
        tags: metadata.tags || [],
        sectionTitles: metadata.sectionTitles || metadata.sections || [],
        instructionTitles: metadata.instructionTitles || [],
      },
      embeddingVector: includeEmbeddingVector ? embedding?.vector || null : null
    };
  }

  _resolveIndex(indexName) {
    const normalized = String(indexName || '').toLowerCase();

    switch (normalized) {
      case 'category':
      case 'categories':
        return this.toolsByCategory;
      case 'tag':
      case 'tags':
        return this.toolsByTag;
      case 'source':
      case 'sources':
        return this.toolsBySource;
      case 'trustlevel':
      case 'trustlevels':
        return this.toolsByTrustLevel;
      case 'validationstatus':
      case 'validationstatuses':
        return this.toolsByValidationStatus;
      case 'sourcetype':
      case 'sourcetypes':
        return this.toolsBySourceType;
      default:
        return null;
    }
  }

  _indexToolEmbedding(tool) {
    try {
      const document = buildToolEmbeddingText(tool);
      const embedding = this.embeddingService.embedText(document);

      this.vectorIndex.upsert(tool.id, embedding.vector, {
        tool,
        document,
        model: embedding.model,
        terms: embedding.terms
      });

      this.embeddingMetadata.set(tool.id, {
        document,
        model: embedding.model,
        terms: embedding.terms,
        dimensions: embedding.dimensions,
        vector: embedding.vector
      });
    } catch (error) {
      this.stats.embeddingFailures++;
      this.embeddingMetadata.set(tool.id, {
        error: error.message
      });
    }
  }

  _buildKeywordFallback(query, filters, topK, reason) {
    const matches = this.findToolsByKeywords(query, filters)
      .slice(0, topK)
      .map((tool, index) => ({
        tool,
        score: Number(Math.max(0.01, 1 - index * 0.1).toFixed(4)),
        strategy: 'keyword-fallback'
      }));

    if (matches.length > 0) {
      this.stats.keywordFallbacks++;
    }

    return {
      strategy: 'keyword-fallback',
      query,
      matches,
      fallbackUsed: true,
      fallbackReason: reason
    };
  }

  _matchesFilters(tool, filters = {}) {
    const {
      category,
      tag,
      source,
      sourcePath,
      trustLevel,
      validationStatus,
      sourceType,
      toolIds
    } = filters;

    const allowedToolIds = Array.isArray(toolIds) ? new Set(toolIds) : null;

    if (allowedToolIds && !allowedToolIds.has(tool.id)) {
      return false;
    }

    if (category && (tool.metadata?.category || 'uncategorized') !== category) {
      return false;
    }

    if (tag && !(tool.metadata?.tags || []).includes(tag)) {
      return false;
    }

    if (source && (tool.metadata?.source || null) !== source) {
      return false;
    }

    if (sourcePath && (tool.metadata?.sourcePath || null) !== sourcePath) {
      return false;
    }

    if (trustLevel && (tool.metadata?.trustLevel || null) !== trustLevel) {
      return false;
    }

    if (validationStatus && (tool.metadata?.validationStatus || null) !== validationStatus) {
      return false;
    }

    if (sourceType && (tool.metadata?.sourceType || null) !== sourceType) {
      return false;
    }

    return true;
  }
}

/**
 * Default singleton registry instance
 */
export const defaultRegistry = new ToolRegistry();

function normalizeTool(tool) {
  if (tool instanceof Tool) {
    return tool;
  }

  if (!tool || typeof tool !== 'object') {
    throw new Error('Invalid tool: must be a Tool instance or tool-like object');
  }

  if (typeof tool.execute === 'function' && typeof tool.run !== 'function') {
    return new Tool({
      ...tool,
      run: (input, llm, runtime) => tool.execute(input, llm, runtime)
    });
  }

  if (typeof tool.run === 'function') {
    return new Tool(tool);
  }

  throw new Error('Invalid tool: expected a Tool instance or an object with run()/execute()');
}

function indexTool(index, key, tool) {
  if (!index.has(key)) {
    index.set(key, []);
  }

  index.get(key).push(tool);
}

function indexMany(index, keys, tool) {
  for (const key of keys) {
    indexTool(index, key, tool);
  }
}

function removeIndexedTool(index, key, toolId) {
  const items = index.get(key);
  if (!items) {
    return;
  }

  const nextItems = items.filter(tool => tool.id !== toolId);
  if (nextItems.length === 0) {
    index.delete(key);
    return;
  }

  index.set(key, nextItems);
}

function removeIndexedMany(index, keys, toolId) {
  for (const key of keys) {
    removeIndexedTool(index, key, toolId);
  }
}

function buildDefaultInputSchema(tool) {
  return {
    type: 'object',
    description: 'Task payload accepted by this skill.',
    properties: {
      input: {
        type: 'string',
        description: `Input provided to ${tool.name}.`
      }
    },
    required: ['input']
  };
}

function buildDefaultOutputSchema(tool) {
  return {
    type: 'object',
    description: 'Structured response returned by this skill.',
    properties: {
      response: {
        type: 'string',
        description: `${tool.name} result payload.`
      }
    },
    required: ['response']
  };
}

function buildDefaultExecutionHandler(tool) {
  return {
    kind: tool.metadata?.imported ? 'markdown-import' : 'tool-runtime',
    handlerId: tool.id,
    runtime: 'tool.run',
    sourceType: tool.metadata?.sourceType || 'tool',
    sourceClassification: tool.metadata?.sourceClassification || 'direct'
  };
}
