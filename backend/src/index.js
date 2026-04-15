// Initialize tools first to avoid circular dependencies
import './init.js';

// Core classes
export { Tool } from './types/Tool.js';
export {
  EmbeddingService,
  MemoryVectorIndex,
  defaultEmbeddingService,
  buildToolEmbeddingText,
  inputToEmbeddingText
} from './embeddings/index.js';
export { ToolRegistry, defaultRegistry } from './registry/ToolRegistry.js';
export { LLMWrapper, defaultLLM } from './llm/LLMWrapper.js';
export { Orchestrator, defaultOrchestrator } from './orchestrator/Orchestrator.js';
export { orchestrate as orchestrateSimple } from './orchestrator.js';
export { ExecutionEventPublisher } from './execution/ExecutionEventPublisher.js';
export {
  OrchestrationEngine,
  TaskIntentPlanner,
  CapabilityRetriever,
  ExecutionPlanSelector,
  ExecutionGraphBuilder,
  ExecutionRunner,
  SessionStateStore,
  OrchestrationEventBridge,
  createEngineLogger
} from './orchestration-engine/index.js';
export {
  SessionManager,
  defaultSessionManager,
  publicSessionView,
  ConnectionService,
  defaultConnectionService
} from './connection/index.js';
export { FlowfexServer, defaultFlowfexServer } from './server/FlowfexServer.js';
export { FlowfexSocketServer, initSocketServer, getSocketServer } from './ws/server.js';
export {
  ORCHESTRATION_EVENTS,
  SESSION_EVENTS,
  CONTROL_EVENTS,
} from './ws/events.js';
export { buildExecutionGraph, buildGraphFromTrace } from './orchestrator/GraphBuilder.js';
export {
  MarkdownSkillLoader,
  defaultMarkdownSkillParser,
  defaultCatalogMarkdownParser,
  defaultSkillNormalizer,
  defaultSkillValidator,
  getDefaultSkillSourceDirs,
  loadMarkdownSkills,
  registerMarkdownSkills,
  logSkillRegistrationReport,
  parseMarkdownSkillFile,
  normalizeParsedSkill,
  validateNormalizedSkill,
  sanitizePrompt,
  parseCatalogMarkdown,
  isCatalogMarkdown,
  DEFAULT_MARKDOWN_SKILL_SOURCES
} from './skills/index.js';

// Example tools
export { summarizerTool, createSummarizerTool } from './tools/SummarizerTool.js';
export { codeGeneratorTool, createCodeGeneratorTool } from './tools/CodeGeneratorTool.js';
export { apiBuilderTool, createAPIBuilderTool } from './tools/APIBuilderTool.js';

// Convenience exports
import { defaultOrchestrator } from './orchestrator/Orchestrator.js';
import { defaultRegistry } from './registry/ToolRegistry.js';
import { defaultSkillLoadReport, markdownSkillReport } from './init.js';

export const orchestrate = (input) => defaultOrchestrator.orchestrate(input);
export { defaultRegistry as registry };
export { defaultSkillLoadReport };
export { markdownSkillReport };
