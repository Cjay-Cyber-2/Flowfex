import type {
  EngineLogger,
  OrchestrationAgentContext,
  OrchestrationSessionContext,
  TaskIntent,
  TaskIntentPlanningIssue,
  TaskPlanningResult,
} from './contracts.js';
import type { LLMProviderLike } from './contracts.js';
import { TaskIntentSchema } from './schemas.js';
import { extractJsonDocument, stableId, tokenize, uniqueStrings } from './utils.js';

const TASK_INTENT_SYSTEM_PROMPT = [
  'You are the Flowfex orchestration planner.',
  'Read the task and return ONLY strict JSON.',
  'Do not use markdown, prose, or code fences.',
  'The JSON must include:',
  '- goal: concise task goal string',
  '- capabilityCategories: array of real capability categories needed to solve the task',
  '- suggestedExecutionSteps: ordered array of objects with title, objective, capabilityCategory, requiresApproval',
  '- branchPoints: ordered array of objects with id, sourceStepIndex or sourceStepTitle, condition, onTrue, onFalse, rationale',
  '- confidence: number between 0 and 1',
  '- constraints: array of constraints or limits found in the task',
  'Do not invent non-existent capabilities.',
  'Keep suggestedExecutionSteps between 1 and 8.',
].join('\n');

export class TaskIntentPlanner {
  private readonly llm: LLMProviderLike;
  private readonly logger: EngineLogger;

  constructor(config: { llm: LLMProviderLike; logger: EngineLogger }) {
    this.llm = config.llm;
    this.logger = config.logger;
  }

  async planTask(
    task: string,
    context: {
      sessionId: string;
      executionId: string;
      agent?: OrchestrationAgentContext | null;
      sessionContext?: OrchestrationSessionContext | null;
      availableCategories: string[];
    }
  ): Promise<TaskPlanningResult> {
    const issues: TaskIntentPlanningIssue[] = [];
    const userPrompt = JSON.stringify(
      {
        task,
        sessionId: context.sessionId,
        agent: context.agent || null,
        sessionContext: context.sessionContext || null,
        availableCategories: context.availableCategories.slice(0, 24),
      },
      null,
      2
    );

    try {
      const rawResponse = await this.llm.generate(TASK_INTENT_SYSTEM_PROMPT, userPrompt);
      const parsed = JSON.parse(extractJsonDocument(rawResponse));
      const validation = TaskIntentSchema.safeParse(parsed);

      if (validation.success) {
        const intent = normalizeIntent(validation.data);
        this.logger.info({
          event: 'orchestration.intent.parsed',
          message: 'Task intent parsed through the configured LLM provider',
          sessionId: context.sessionId,
          executionId: context.executionId,
          confidence: intent.confidence,
          categories: intent.capabilityCategories,
          stepCount: intent.suggestedExecutionSteps.length,
          branchCount: intent.branchPoints.length,
        });

        return {
          intent,
          fallbackUsed: false,
          issues,
          rawResponse,
        };
      }

      issues.push({
        stage: 'validation',
        message: validation.error.issues.map(issue => issue.message).join('; '),
        rawResponse,
      });

      this.logger.warn({
        event: 'orchestration.intent.validation_failed',
        message: 'LLM returned an invalid planning payload, falling back to deterministic planning',
        sessionId: context.sessionId,
        executionId: context.executionId,
        issues: validation.error.issues.map(issue => issue.message),
      });

      return {
        intent: this.buildFallbackIntent(task, context.availableCategories),
        fallbackUsed: true,
        issues,
        rawResponse,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        stage: 'llm',
        message,
      });

      this.logger.warn({
        event: 'orchestration.intent.fallback',
        message: 'Task intent planning fell back to deterministic heuristics',
        sessionId: context.sessionId,
        executionId: context.executionId,
        error: message,
      });

      return {
        intent: this.buildFallbackIntent(task, context.availableCategories),
        fallbackUsed: true,
        issues,
      };
    }
  }

  private buildFallbackIntent(task: string, availableCategories: string[]): TaskIntent {
    const detectedCategories = detectCategories(task, availableCategories);
    const capabilityCategories = detectedCategories.length > 0 ? detectedCategories : ['general'];
    const steps = capabilityCategories.slice(0, 4).map((category, index) => ({
      id: stableId('step', `${index}`, category, task),
      title: buildFallbackTitle(category, index),
      objective: buildFallbackObjective(category, task),
      capabilityCategory: category,
      requiresApproval: /approve|review|manual|human/i.test(task) && index === capabilityCategories.length - 1,
    }));

    return {
      goal: task.trim(),
      capabilityCategories,
      suggestedExecutionSteps: steps.length > 0
        ? steps
        : [
            {
              id: stableId('step', '0', 'general', task),
              title: 'Execute task',
              objective: task.trim(),
              capabilityCategory: 'general',
              requiresApproval: false,
            },
          ],
      branchPoints: buildFallbackBranchPoints(task, steps),
      confidence: 0.38,
      constraints: detectConstraints(task),
    };
  }
}

function normalizeIntent(intent: {
  goal: string;
  capabilityCategories: string[];
  suggestedExecutionSteps: Array<{
    id?: string;
    title: string;
    objective: string;
    capabilityCategory: string;
    requiresApproval: boolean;
  }>;
  branchPoints: Array<{
    id?: string;
    sourceStepId?: string;
    sourceStepIndex?: number;
    sourceStepTitle?: string;
    condition: string;
    onTrue?: string;
    onFalse?: string;
    rationale?: string;
  }>;
  confidence: number;
  constraints: string[];
}): TaskIntent {
  return {
    goal: intent.goal.trim(),
    capabilityCategories: uniqueStrings(intent.capabilityCategories),
    suggestedExecutionSteps: intent.suggestedExecutionSteps.map((step, index) => ({
      id: step.id || stableId('step', `${index}`, step.title, step.objective, step.capabilityCategory),
      title: step.title.trim(),
      objective: step.objective.trim(),
      capabilityCategory: step.capabilityCategory.trim(),
      requiresApproval: Boolean(step.requiresApproval),
    })),
    branchPoints: intent.branchPoints.map((branch, index) => {
      const normalized = {
        id: branch.id || stableId('branch', `${index}`, branch.condition, branch.sourceStepTitle || branch.sourceStepId || ''),
        condition: branch.condition.trim(),
      };

      return {
        ...normalized,
        ...(branch.sourceStepId ? { sourceStepId: branch.sourceStepId.trim() } : {}),
        ...(typeof branch.sourceStepIndex === 'number' ? { sourceStepIndex: branch.sourceStepIndex } : {}),
        ...(branch.sourceStepTitle ? { sourceStepTitle: branch.sourceStepTitle.trim() } : {}),
        ...(branch.onTrue ? { onTrue: branch.onTrue.trim() } : {}),
        ...(branch.onFalse ? { onFalse: branch.onFalse.trim() } : {}),
        ...(branch.rationale ? { rationale: branch.rationale.trim() } : {}),
      };
    }),
    confidence: intent.confidence,
    constraints: uniqueStrings(intent.constraints),
  };
}

function detectCategories(task: string, availableCategories: string[]): string[] {
  const tokens = new Set(tokenize(task));
  const inferred: string[] = [];

  for (const category of availableCategories) {
    const categoryTokens = tokenize(category);
    if (categoryTokens.some(token => tokens.has(token))) {
      inferred.push(category);
    }
  }

  if (/code|typescript|javascript|bug|refactor|component|frontend|backend/i.test(task)) {
    inferred.push('code');
  }
  if (/api|route|rest|graphql|endpoint|schema/i.test(task)) {
    inferred.push('api');
  }
  if (/summary|summarize|rewrite|document|report|copy/i.test(task)) {
    inferred.push('text');
  }
  if (/data|database|sql|query|analytics|table/i.test(task)) {
    inferred.push('data');
  }
  if (/workflow|automation|orchestration|command|script/i.test(task)) {
    inferred.push('automation');
  }

  return uniqueStrings(inferred).slice(0, 6);
}

function buildFallbackTitle(category: string, index: number): string {
  if (index === 0) {
    return `Resolve ${category} path`;
  }

  return `Advance ${category} execution`;
}

function buildFallbackObjective(category: string, task: string): string {
  return `Use a ${category} capability to move this task forward: ${task.trim()}`;
}

function buildFallbackBranchPoints(
  task: string,
  steps: Array<{ id: string; title: string }>
): TaskIntent['branchPoints'] {
  if (steps.length < 2) {
    return [];
  }

  if (!/\b(if|when|unless|otherwise|fallback|review)\b/i.test(task)) {
    return [];
  }

  return [
    {
      id: stableId('branch', task, steps[0]?.id || ''),
      ...(steps[0]?.id ? { sourceStepId: steps[0].id } : {}),
      sourceStepIndex: 1,
      ...(steps[0]?.title ? { sourceStepTitle: steps[0].title } : {}),
      condition: 'Route to the alternate step when the previous output indicates manual review or fallback is required',
      ...(steps[1]?.title ? { onTrue: steps[1].title } : {}),
      onFalse: 'continue',
      rationale: 'The task includes conditional language, so a deterministic fallback branch is preserved',
    },
  ];
}

function detectConstraints(task: string): string[] {
  const constraints: string[] = [];

  if (/\bfast|quick|under\b/i.test(task)) {
    constraints.push('Prefer a compact execution plan');
  }
  if (/\bsecure|security|safe\b/i.test(task)) {
    constraints.push('Prioritize trusted and validated capabilities');
  }
  if (/\bno mock|real|live\b/i.test(task)) {
    constraints.push('Use real handlers and avoid simulated capabilities');
  }
  if (/\bmanual review|approval|approve\b/i.test(task)) {
    constraints.push('Keep operator approval visibility in the execution state');
  }

  return uniqueStrings(constraints);
}
