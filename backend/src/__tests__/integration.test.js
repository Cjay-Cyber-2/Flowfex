/**
 * Integration Tests for Flowfex Backend
 * 
 * Comprehensive testing of:
 * - Tool interface and validation
 * - Tool registry operations
 * - LLM wrapper functionality
 * - Orchestrator execution flows
 * - Example tools
 */

import fs from 'fs/promises';
import http from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  Tool,
  SessionManager,
  ConnectionService,
  FlowfexServer,
  ToolRegistry,
  LLMWrapper,
  Orchestrator,
  summarizerTool,
  codeGeneratorTool,
  apiBuilderTool,
  defaultRegistry,
  defaultLLM,
  defaultOrchestrator,
  defaultMarkdownSkillParser,
  defaultSkillNormalizer,
  defaultSkillValidator,
  loadMarkdownSkills,
  defaultSkillLoadReport
} from '../index.js';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;
const currentFile = fileURLToPath(import.meta.url);
const testsDir = path.dirname(currentFile);
const backendRoot = path.resolve(testsDir, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');
const sampleSkillsDir = path.join(projectRoot, 'skills-md', 'examples');
const importedCatalogDir = path.join(projectRoot, 'awesome-agent-skills');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${error.message}`);
    testsFailed++;
  }
}

function section(title) {
  console.log(`\n${colors.blue}${title}${colors.reset}`);
  console.log('='.repeat(60));
}

// ============================================================================
// TEST SUITE
// ============================================================================

section('1. Tool Class Validation');

await test('Tool requires all required fields', async () => {
  try {
    new Tool({ id: 'test' });
    throw new Error('Should have thrown validation error');
  } catch (e) {
    assert(e.message.includes('validation failed'), 'Wrong error message');
  }
});

await test('Tool validates successfully with all fields', async () => {
  const tool = new Tool({
    id: 'test.tool',
    name: 'Test Tool',
    description: 'A test tool',
    prompt: 'You are helpful',
    run: async (input, llm) => 'output',
    keywords: ['test'],
    metadata: { category: 'test' }
  });
  assert(tool.id === 'test.tool', 'Tool ID not set');
  assert(tool.name === 'Test Tool', 'Tool name not set');
});

await test('Tool.execute delegates to run function', async () => {
  const tool = new Tool({
    id: 'test.exec',
    name: 'Test',
    description: 'Test',
    prompt: 'Test',
    run: async (input, llm) => 'executed: ' + input
  });
  const result = await tool.execute('hello', null);
  assert(result === 'executed: hello', 'Execute did not call run correctly');
});

await test('Tool.toJSON excludes run function', async () => {
  const tool = new Tool({
    id: 'test.json',
    name: 'Test',
    description: 'Test',
    prompt: 'Test',
    run: async () => 'result'
  });
  const json = tool.toJSON();
  assert(!json.run, 'run function should not be in JSON');
  assert(json.id === 'test.json', 'id should be in JSON');
});

section('2. Tool Registry');

await test('Registry registers and retrieves tools', async () => {
  const registry = new ToolRegistry();
  const tool = new Tool({
    id: 'registry.test',
    name: 'Test',
    description: 'Test',
    prompt: 'Test',
    run: async () => 'result'
  });
  registry.registerTool(tool);
  const retrieved = registry.getTool('registry.test');
  assert(retrieved.id === 'registry.test', 'Tool not retrieved correctly');
});

await test('Registry prevents duplicate tool IDs', async () => {
  const registry = new ToolRegistry();
  const tool = new Tool({
    id: 'dup.test',
    name: 'Test',
    description: 'Test',
    prompt: 'Test',
    run: async () => 'result'
  });
  registry.registerTool(tool);
  try {
    registry.registerTool(tool);
    throw new Error('Should have thrown duplicate error');
  } catch (e) {
    assert(e.message.includes('already registered'), 'Wrong error');
  }
});

await test('Registry finds tools by keywords', async () => {
  const registry = new ToolRegistry();
  const tool = new Tool({
    id: 'kw.test',
    name: 'Summarizer',
    description: 'Summarizes text',
    prompt: 'Test',
    keywords: ['summarize', 'condense', 'compress'],
    run: async () => 'result'
  });
  registry.registerTool(tool);
  const matches = registry.findToolsByKeywords('please summarize this text');
  assert(matches.length > 0, 'No keyword matches found');
  assert(matches[0].id === 'kw.test', 'Wrong tool matched');
});

await test('Registry organizes tools by category', async () => {
  const registry = new ToolRegistry();
  const tool1 = new Tool({
    id: 'cat1',
    name: 'Text Tool',
    description: 'A text tool',
    prompt: 'Test',
    metadata: { category: 'text' },
    run: async () => 'result'
  });
  const tool2 = new Tool({
    id: 'cat2',
    name: 'Code Tool',
    description: 'A code tool',
    prompt: 'Test',
    metadata: { category: 'code' },
    run: async () => 'result'
  });
  registry.registerTool(tool1);
  registry.registerTool(tool2);
  
  const textTools = registry.getToolsByCategory('text');
  assert(textTools.length === 1, 'Text category not working');
  assert(registry.getCategories().length === 2, 'Categories not indexed');
});

await test('Registry searches tools by name/description', async () => {
  const registry = new ToolRegistry();
  const tool = new Tool({
    id: 'search.test',
    name: 'Weather Tool',
    description: 'Fetches weather information',
    prompt: 'Test',
    metadata: { tags: ['weather', 'forecast'] },
    run: async () => 'result'
  });
  registry.registerTool(tool);
  const results = registry.searchTools('weather');
  assert(results.length > 0, 'Search did not find tool');
});

await test('Registry resolves tools by ID and name', async () => {
  const registry = new ToolRegistry();
  const tool = new Tool({
    id: 'resolve.test',
    name: 'Resolve Tool',
    description: 'Resolves from the registry',
    prompt: 'Test',
    run: async () => 'result'
  });

  registry.registerTool(tool);

  assert(registry.resolveTool('resolve.test') === tool, 'Should resolve by ID');
  assert(registry.resolveTool('Resolve Tool') === tool, 'Should resolve by name');
});

await test('Registry filters tools by metadata fields', async () => {
  const registry = new ToolRegistry();
  const tool = new Tool({
    id: 'filter.test',
    name: 'Frontend Review',
    description: 'Reviews frontend work',
    prompt: 'Test',
    metadata: {
      category: 'frontend',
      tags: ['react', 'review'],
      source: 'local-skills-md',
      sourceType: 'agent',
      trustLevel: 'trusted',
      validationStatus: 'approved'
    },
    run: async () => 'result'
  });

  registry.registerTool(tool);

  assert(registry.getToolsByTag('react').length === 1, 'Should index by tag');
  assert(registry.filterTools({ category: 'frontend', sourceType: 'agent' }).length === 1, 'Should filter by metadata');
  assert(registry.searchTools('trusted').length === 1, 'Search should include trust level metadata');
});

await test('Registry retrieves tools semantically from embedded descriptions and prompts', async () => {
  const registry = new ToolRegistry();
  const summarizer = new Tool({
    id: 'semantic.summary',
    name: 'Briefing Assistant',
    description: 'Creates concise summaries of long text and reports',
    prompt: 'Condense the provided document into a quick overview.',
    run: async () => 'result'
  });
  const planner = new Tool({
    id: 'semantic.plan',
    name: 'Planner Assistant',
    description: 'Builds schedules and meeting plans',
    prompt: 'Organize a project plan.',
    run: async () => 'result'
  });

  registry.registerTool(summarizer);
  registry.registerTool(planner);

  const retrieval = registry.retrieveTools('Please shorten this article into a short overview for me.');
  assert(retrieval.strategy === 'semantic', 'Should use semantic retrieval when embeddings are available');
  assert(retrieval.matches.length > 0, 'Should return semantic matches');
  assert(retrieval.matches[0].tool.id === 'semantic.summary', 'Should rank the summarizer-like tool first');
});

await test('Registry falls back to keyword retrieval when embeddings fail', async () => {
  const registry = new ToolRegistry({
    embeddingService: {
      embedText() {
        throw new Error('embedding provider offline');
      }
    }
  });
  const weatherTool = new Tool({
    id: 'fallback.weather',
    name: 'Weather Assistant',
    description: 'Shares weather updates',
    prompt: 'Provide weather conditions.',
    keywords: ['weather', 'forecast'],
    run: async () => 'result'
  });

  registry.registerTool(weatherTool);

  const retrieval = registry.retrieveTools('Need a weather forecast for Lagos.');
  assert(retrieval.strategy === 'keyword-fallback', 'Should fall back to keyword retrieval');
  assert(retrieval.fallbackUsed === true, 'Fallback should be marked as used');
  assert(retrieval.matches[0].tool.id === 'fallback.weather', 'Should still resolve the keyword-matched tool');
});

section('3. LLM Wrapper');

await test('LLMWrapper initializes with default config', async () => {
  const llm = new LLMWrapper();
  assert(llm.provider === 'mock', 'Default provider not set');
  assert(llm.temperature === 0.7, 'Default temperature not set');
});

await test('LLMWrapper generates text', async () => {
  const llm = new LLMWrapper({ provider: 'mock' });
  const result = await llm.generate('summarize', 'test text');
  assert(typeof result === 'string', 'Result should be a string');
  assert(result.length > 0, 'Result should not be empty');
});

await test('LLMWrapper summarizes text', async () => {
  const llm = new LLMWrapper({ provider: 'mock' });
  const result = await llm.summarize('This is a very long text that needs summarization');
  assert(typeof result === 'string', 'Summary should be a string');
});

await test('LLMWrapper tracks request count', async () => {
  const llm = new LLMWrapper({ provider: 'mock' });
  assert(llm.requestCount === 0, 'Initial request count should be 0');
  await llm.generate('test', 'test');
  assert(llm.requestCount === 1, 'Request count should increment');
});

section('4. Markdown Skill Ingestion');

await test('MarkdownSkillParser extracts title, sections, and instructions', async () => {
  const filePath = path.join(sampleSkillsDir, 'frontend-review.md');
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = defaultMarkdownSkillParser.parse({
    filePath,
    content,
    sourceRoot: sampleSkillsDir
  });

  assert(parsed.title === 'Frontend Review Assistant', 'Parser should extract title');
  assert(parsed.sections.some(section => section.title === 'Workflow'), 'Parser should extract sections');
  assert(parsed.instructions.length >= 3, 'Parser should extract instruction blocks');
});

await test('SkillNormalizer creates consistent prompt structure, tags, and category', async () => {
  const filePath = path.join(sampleSkillsDir, 'frontend-review.md');
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = defaultMarkdownSkillParser.parse({
    filePath,
    content,
    sourceRoot: sampleSkillsDir
  });
  const normalized = defaultSkillNormalizer.normalize(parsed);

  assert(normalized.prompt.includes('Instructions:'), 'Prompt should include normalized instruction heading');
  assert(normalized.prompt.includes('Execution rules:'), 'Prompt should include execution guardrails');
  assert(normalized.tags.includes('frontend'), 'Tags should include frontmatter/path terms');
  assert(normalized.category && normalized.category !== 'general', 'Category should be inferred');
});

await test('SkillValidator blocks unsafe imported markdown skills', async () => {
  const filePath = path.join(sampleSkillsDir, 'dangerous-exfiltration.md');
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = defaultMarkdownSkillParser.parse({
    filePath,
    content,
    sourceRoot: sampleSkillsDir
  });
  const normalized = defaultSkillNormalizer.normalize(parsed);
  const validation = defaultSkillValidator.validate(normalized);

  assert(validation.allowed === false, 'Unsafe skill should be blocked');
  assert(validation.validationStatus === 'blocked', 'Unsafe skill should be marked blocked');
  assert(
    validation.issues.some(issue => issue.code.startsWith('prompt_injection') || issue.code.startsWith('unsafe_instruction')),
    'Should flag security issues in unsafe content'
  );
});

await test('Markdown skill loader loads safe skills, blocks unsafe ones, and indexes catalog references', async () => {
  const registry = new ToolRegistry();
  const report = await loadMarkdownSkills({
    registry,
    sourceDirs: [sampleSkillsDir, importedCatalogDir]
  });

  assert(report.loadedSkills.length >= 5, 'Expected safe example skills to load from nested folders');
  assert(report.blockedSkills.length >= 2, 'Expected unsafe example skills to be blocked');
  assert(report.catalogReferences.length > 100, 'Expected catalog references to be extracted from README');
  assert(report.stats.totalCatalogEntries === report.catalogReferences.length, 'Stats should track catalog references');
  assert(Array.isArray(report.sources) && report.sources.length === 2, 'Report should include source summaries');
  assert(typeof report.processing.durationMs === 'number', 'Report should include processing metrics');
  assert(report.catalogIndex.byProvider.anthropic.length > 0, 'Catalog index should group by provider');
  const docxReference = report.catalogReferences.find(reference => reference.title === 'anthropics/docx');
  assert(docxReference.provider === 'anthropic', 'Catalog references should include inferred provider metadata');
  assert(docxReference.section, 'Catalog references should retain section metadata');
  assert(registry.getTool('skill.frontend-review'), 'Loaded skill should be registered');
});

await test('Default registry auto-registers markdown skills and exposes load report', async () => {
  assert(defaultSkillLoadReport.registeredTools.length >= 5, 'Default load report should include imported markdown skills');
  assert(defaultSkillLoadReport.stats.totalLoadedTools >= 5, 'Default load report should expose stats');
  assert(defaultRegistry.getTool('skill.frontend-review'), 'Default registry should include example markdown skill');
});

section('5. Example Tools');

await test('SummarizerTool executes successfully', async () => {
  const result = await summarizerTool.execute(
    { text: 'This is a long text that needs to be summarized into something much shorter.' },
    defaultLLM
  );
  assert(result.success === true, 'Summarizer should succeed');
  assert(result.summary, 'Should have summary field');
});

await test('CodeGeneratorTool executes successfully', async () => {
  const result = await codeGeneratorTool.execute(
    { specification: 'A function that adds two numbers', language: 'javascript' },
    defaultLLM
  );
  assert(result.success === true, 'Code generator should succeed');
  assert(result.code, 'Should have code field');
});

await test('APIBuilderTool executes successfully', async () => {
  const result = await apiBuilderTool.execute(
    { requirements: 'Create a user management API', format: 'openapi' },
    defaultLLM
  );
  assert(result.success === true, 'API builder should succeed');
  assert(result.specification, 'Should have specification field');
});

section('6. Orchestrator');

await test('Orchestrator initializes with defaults', async () => {
  const orchestrator = new Orchestrator();
  assert(orchestrator.registry, 'Should have registry');
  assert(orchestrator.llm, 'Should have LLM');
});

await test('Orchestrator orchestrates a request', async () => {
  // First, register the summarizer tool
  const testRegistry = new ToolRegistry();
  testRegistry.registerTool(summarizerTool);
  
  const orchestrator = new Orchestrator({
    registry: testRegistry,
    llm: defaultLLM
  });
  
  const result = await orchestrator.orchestrate('summarize this long text');
  assert(result.status === 'success', 'Should successfully orchestrate a simple string request');
  assert(result.executionId, 'Should have execution ID');
});

await test('Legacy orchestrator wrapper preserves the simple phase contract', async () => {
  const legacy = await import('../orchestrator.js');
  const result = await legacy.orchestrate('summarize this long text');

  assert(result.status === 'success', 'Legacy wrapper should succeed for simple text input');
  assert(result.tool_used, 'Legacy wrapper should identify the selected tool');
  assert(Object.prototype.hasOwnProperty.call(result, 'output'), 'Legacy wrapper should return output');
});

await test('Orchestrator executes specific tool', async () => {
  const testRegistry = new ToolRegistry();
  testRegistry.registerTool(apiBuilderTool);
  
  const orchestrator = new Orchestrator({
    registry: testRegistry,
    llm: defaultLLM
  });
  
  const result = await orchestrator.executeTool(
    'tool.api-builder',
    { requirements: 'A simple API', format: 'openapi' }
  );
  assert(result.status, 'Should have status');
  assert(result.toolId === 'tool.api-builder', 'Should track tool ID');
  assert(result.trace.length === 1, 'Should include a single trace step');
  assert(result.finalResult === result.output, 'Final result should mirror output');
});

await test('Orchestrator returns available tools', async () => {
  const testRegistry = new ToolRegistry();
  testRegistry.registerTool(summarizerTool);
  
  const orchestrator = new Orchestrator({ registry: testRegistry });
  const tools = orchestrator.getAvailableTools();
  assert(Array.isArray(tools), 'Should return array');
  assert(tools.length > 0, 'Should have tools');
});

await test('Orchestrator searches tools', async () => {
  const testRegistry = new ToolRegistry();
  testRegistry.registerTool(summarizerTool);
  
  const orchestrator = new Orchestrator({ registry: testRegistry });
  const results = orchestrator.searchTools('summarize');
  assert(Array.isArray(results), 'Should return array');
});

await test('Orchestrator provides statistics', async () => {
  const orchestrator = new Orchestrator();
  const stats = orchestrator.getStats();
  assert(stats.totalExecutions >= 0, 'Should have execution count');
  assert(stats.registryStats, 'Should have registry stats');
});

await test('Orchestrator executes multi-step workflows with trace and references', async () => {
  const registry = new ToolRegistry();

  const seedTool = new Tool({
    id: 'workflow.seed',
    name: 'Workflow Seed',
    description: 'Seeds a workflow with text',
    prompt: 'Test',
    run: async (input) => ({
      text: input.text,
      source: 'seed'
    })
  });

  const transformTool = new Tool({
    id: 'workflow.transform',
    name: 'Workflow Transform',
    description: 'Transforms prior step output',
    prompt: 'Test',
    run: async (input) => ({
      result: `${input.text} -> transformed`,
      source: 'transform'
    })
  });

  registry.registerTool(seedTool);
  registry.registerTool(transformTool);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const result = await orchestrator.orchestrate({
    input: { seed: 'hello flowfex' },
    steps: [
      {
        tool: 'workflow.seed',
        input: {
          text: { $from: 'originalInput.seed' }
        }
      },
      {
        tool: 'workflow.transform',
        input: {
          text: { $from: 'previous.text' }
        }
      }
    ]
  });

  assert(result.status === 'success', 'Workflow should succeed');
  assert(result.trace.length === 2, 'Workflow should record each step');
  assert(result.trace[0].tool === 'workflow.seed', 'First step should record the seed tool');
  assert(result.trace[1].input.text === 'hello flowfex', 'Second step should receive prior output');
  assert(result.finalResult.result === 'hello flowfex -> transformed', 'Should expose final result separately');
});

await test('Orchestrator defaults missing step input to prior output', async () => {
  const registry = new ToolRegistry();

  const firstTool = new Tool({
    id: 'workflow.first',
    name: 'Workflow First',
    description: 'Creates a value payload',
    prompt: 'Test',
    run: async (input) => ({ value: input })
  });

  const secondTool = new Tool({
    id: 'workflow.second',
    name: 'Workflow Second',
    description: 'Consumes the prior payload',
    prompt: 'Test',
    run: async (input) => ({ final: `${input.value} world` })
  });

  registry.registerTool(firstTool);
  registry.registerTool(secondTool);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const result = await orchestrator.orchestrate({
    input: 'hello',
    steps: [
      { tool: 'workflow.first' },
      { tool: 'workflow.second' }
    ]
  });

  assert(result.trace[0].input === 'hello', 'First step should default to workflow input');
  assert(result.trace[1].input.value === 'hello', 'Second step should default to previous output');
  assert(result.finalResult.final === 'hello world', 'Final result should come from the last step');
});

await test('Orchestrator records semantic selection details for auto-routed steps', async () => {
  const registry = new ToolRegistry();
  const summarizer = new Tool({
    id: 'orchestrator.semantic.summary',
    name: 'Narrative Summarizer',
    description: 'Produces concise summaries from long narrative text',
    prompt: 'Shorten the text into a concise overview.',
    run: async (input) => ({ handled: input })
  });
  const planner = new Tool({
    id: 'orchestrator.semantic.plan',
    name: 'Roadmap Planner',
    description: 'Plans milestones and project schedules',
    prompt: 'Build a delivery plan.',
    run: async (input) => ({ handled: input })
  });

  registry.registerTool(summarizer);
  registry.registerTool(planner);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const result = await orchestrator.orchestrate('Please shorten this update into a quick overview.');

  assert(result.status === 'success', 'Semantic orchestration should succeed');
  assert(result.selectedTool.id === 'orchestrator.semantic.summary', 'Should pick the semantically closest tool');
  assert(result.toolSelection.strategy === 'semantic', 'Should record semantic selection strategy');
  assert(result.trace[0].selection.candidates.length > 0, 'Trace should include ranked candidates');
});

await test('Orchestrator streams structured execution events with progress and reroute details', async () => {
  const registry = new ToolRegistry({
    embeddingService: {
      embedText() {
        throw new Error('embedding provider offline');
      }
    }
  });
  const streamingTool = new Tool({
    id: 'streaming.progress',
    name: 'Streaming Progress Tool',
    description: 'Streams visible progress updates for long-running work',
    prompt: 'Test',
    keywords: ['stream', 'progress', 'live'],
    run: async (input, llm, runtime) => {
      runtime.reportProgress({
        phase: 'prepare',
        current: 1,
        total: 2,
        message: 'Preparing execution'
      });
      runtime.reportProgress({
        phase: 'work',
        current: 2,
        total: 2,
        message: 'Completing execution'
      });

      return {
        success: true,
        echoed: input
      };
    }
  });

  registry.registerTool(streamingTool);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const events = [];
  const result = await orchestrator.orchestrate('Need live progress for this stream', {
    eventSink: event => events.push(event)
  });

  assert(result.status === 'success', 'Execution should succeed');
  assert(result.trace[0].status === 'completed', 'Trace should record step completion status');
  assert(events[0].type === 'execution.started', 'Should emit an execution.started event first');
  assert(events.some(event => event.type === 'step.progress'), 'Should emit progress events');
  assert(events.some(event => event.type === 'step.rerouted'), 'Keyword fallback should emit a reroute event');
  assert(events.at(-1).type === 'execution.completed', 'Should end with execution.completed');
  assert(events.at(-1).final === true, 'Final event should be marked final');
  assert(events.every((event, index) => event.sequence === index + 1), 'Events should have stable sequence numbers');
  assert(events.some(event => event.selection?.strategy === 'keyword-fallback'), 'Events should carry selection metadata');
});

await test('Orchestrator emits failure events when tool execution fails', async () => {
  const registry = new ToolRegistry();
  const failingTool = new Tool({
    id: 'streaming.failure',
    name: 'Streaming Failure Tool',
    description: 'Fails after reporting progress',
    prompt: 'Test',
    run: async (input, llm, runtime) => {
      runtime.reportProgress({
        phase: 'prepare',
        percent: 25,
        message: 'Starting work'
      });
      throw new Error('simulated execution failure');
    }
  });

  registry.registerTool(failingTool);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const events = [];
  const result = await orchestrator.executeTool('streaming.failure', { task: 'fail' }, {
    eventSink: event => events.push(event)
  });

  assert(result.status === 'error', 'Execution should fail');
  assert(result.trace[0].status === 'failed', 'Trace should record failed step status');
  assert(events.some(event => event.type === 'step.failed'), 'Should emit a step.failed event');
  assert(events.at(-1).type === 'execution.failed', 'Final event should describe execution failure');
  assert(events.at(-1).final === true, 'Failure event should be final');
});

section('7. Agent Connection');

await test('SessionManager authenticates and revokes secure sessions', async () => {
  const sessionManager = new SessionManager();
  const { session, token } = sessionManager.createSession({
    mode: 'api',
    allowedToolIds: ['tool.summarizer']
  });

  const authenticated = sessionManager.authenticate(session.id, token);
  assert(authenticated.id === session.id, 'Should authenticate the created session');
  assert(authenticated.allowedToolIds[0] === 'tool.summarizer', 'Should preserve session scope');

  sessionManager.revokeSession(session.id);

  try {
    sessionManager.authenticate(session.id, token);
    throw new Error('Authentication should fail after revocation');
  } catch (error) {
    assert(error.message.includes('Session not found') || error.message.includes('no longer active'), 'Should reject revoked sessions');
  }
});

await test('ConnectionService creates prompt-scoped sessions from semantic tool matches', async () => {
  const registry = new ToolRegistry();
  const summarizer = new Tool({
    id: 'connect.summary',
    name: 'Prompt Summarizer',
    description: 'Summarizes long notes into short overviews',
    prompt: 'Condense the provided note.',
    run: async (input) => ({ summary: String(input) })
  });
  const apiTool = new Tool({
    id: 'connect.api',
    name: 'Prompt API Tool',
    description: 'Builds endpoint definitions and API contracts',
    prompt: 'Design APIs.',
    run: async () => ({ ok: true })
  });

  registry.registerTool(summarizer);
  registry.registerTool(apiTool);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const service = new ConnectionService({
    registry,
    orchestrator,
    sessionManager: new SessionManager()
  });

  const connection = await service.connect({
    mode: 'prompt',
    prompt: 'I am an IDE agent that needs to shorten long technical notes.',
    agent: { name: 'IDE Agent', type: 'ide' }
  });

  const allowedToolIds = connection.connection.session.allowedToolIds || [];
  assert(allowedToolIds.includes('connect.summary'), 'Prompt session should allow the semantically matched tool');
  assert(!allowedToolIds.includes('connect.api'), 'Prompt session should stay scoped instead of granting everything');
});

await test('FlowfexServer exposes connect and execute endpoints for external agents', async () => {
  const registry = new ToolRegistry();
  const summarizer = new Tool({
    id: 'server.summary',
    name: 'Server Summarizer',
    description: 'Summarizes notes into concise overviews',
    prompt: 'Shorten the provided note.',
    run: async (input) => ({
      success: true,
      summary: typeof input === 'string' ? input.slice(0, 20) : String(input.text || '')
    })
  });

  registry.registerTool(summarizer);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const connectionService = new ConnectionService({
    registry,
    orchestrator,
    sessionManager: new SessionManager()
  });
  const server = new FlowfexServer({
    connectionService,
    host: '127.0.0.1',
    port: 0
  });

  try {
    const address = await server.start();

    const connectResponse = await requestJson({
      host: address.host,
      port: address.port,
      path: '/connect',
      method: 'POST',
      body: {
        mode: 'prompt',
        prompt: 'I need to shorten a note from my editor.',
        agent: { name: 'CLI Agent', type: 'cli' }
      }
    });

    assert(connectResponse.statusCode === 200, 'Connect endpoint should return 200');
    assert(connectResponse.body.connection.session.token, 'Connect endpoint should return a session token');

    const session = connectResponse.body.connection.session;
    const executeResponse = await requestJson({
      host: address.host,
      port: address.port,
      path: `/sessions/${session.id}/execute`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`
      },
      body: {
        toolId: 'server.summary',
        input: 'This note should become shorter.'
      }
    });

    assert(executeResponse.statusCode === 200, 'Execute endpoint should return 200');
    assert(executeResponse.body.status === 'success', 'Execute endpoint should return a successful orchestration result');
    assert(executeResponse.body.selectedTool.id === 'server.summary', 'Execute endpoint should route to the authorized tool');
  } finally {
    await server.stop();
  }
});

await test('FlowfexServer ingests token-prefixed prompt tasks without separate auth headers', async () => {
  const registry = new ToolRegistry();
  const promptTool = new Tool({
    id: 'server.prompt-ingest',
    name: 'Prompt Ingest Tool',
    description: 'Processes prompt-ingested tasks for connected agents',
    prompt: 'Execute the connected task.',
    keywords: ['prompt', 'ingest', 'connected', 'task'],
    metadata: {
      category: 'text',
    },
    run: async (input) => ({
      success: true,
      task: input.task,
      session: input.session,
      agent: input.agent,
    })
  });

  registry.registerTool(promptTool);

  const plannerLLM = {
    async generate(systemPrompt, userPrompt) {
      if (systemPrompt.includes('Flowfex orchestration planner')) {
        return JSON.stringify({
          goal: 'Handle a prompt-ingested task',
          capabilityCategories: ['text'],
          suggestedExecutionSteps: [
            {
              id: 'step-prompt-ingest',
              title: 'Handle prompt task',
              objective: 'Process the connected prompt task',
              capabilityCategory: 'text',
              requiresApproval: false,
            },
          ],
          branchPoints: [],
          confidence: 0.96,
          constraints: [],
        });
      }

      return `LLM:${userPrompt}`;
    }
  };

  const orchestrator = new Orchestrator({ registry, llm: plannerLLM });
  const connectionService = new ConnectionService({
    registry,
    orchestrator,
    sessionManager: new SessionManager()
  });
  const server = new FlowfexServer({
    connectionService,
    host: '127.0.0.1',
    port: 0
  });

  try {
    const address = await server.start();

    const connectResponse = await requestJson({
      host: address.host,
      port: address.port,
      path: '/connect',
      method: 'POST',
      body: {
        mode: 'prompt',
        prompt: 'I am a connected agent that needs Flowfex to process prompt-ingested tasks.',
        agent: { name: 'Prompt Ingest Agent', type: 'cli' }
      }
    });

    assert(connectResponse.statusCode === 200, 'Prompt connect should return 200');
    const session = connectResponse.body.connection.session;
    const task = `FLOWFEX_SESSION_TOKEN: ${session.token}\nSummarize the connected deployment notes.`;
    const ingestResponse = await requestJson({
      host: address.host,
      port: address.port,
      path: '/ingest',
      method: 'POST',
      body: {
        task,
      }
    });

    assert(ingestResponse.statusCode === 200, 'Prompt ingest should return 200');
    assert(ingestResponse.body.status === 'success', 'Prompt ingest should execute successfully');
    assert(ingestResponse.body.output.task === 'Summarize the connected deployment notes.', 'Prompt ingest should strip the token prefix before execution');
    assert(ingestResponse.body.output.session.mode === 'prompt', 'Prompt ingest should execute against the prompt session');
  } finally {
    await server.stop();
  }
});

await test('FlowfexServer streams execution events over SSE for live clients', async () => {
  const registry = new ToolRegistry();
  const streamingTool = new Tool({
    id: 'server.stream',
    name: 'Server Stream Tool',
    description: 'Streams live progress for server-side orchestration',
    prompt: 'Test',
    run: async (input, llm, runtime) => {
      runtime.reportProgress({
        phase: 'prepare',
        current: 1,
        total: 2,
        message: 'Preparing streamed execution'
      });
      runtime.reportProgress({
        phase: 'complete',
        current: 2,
        total: 2,
        message: 'Completing streamed execution'
      });

      return {
        success: true,
        echoed: input
      };
    }
  });

  registry.registerTool(streamingTool);

  const orchestrator = new Orchestrator({ registry, llm: defaultLLM });
  const connectionService = new ConnectionService({
    registry,
    orchestrator,
    sessionManager: new SessionManager()
  });
  const server = new FlowfexServer({
    connectionService,
    host: '127.0.0.1',
    port: 0
  });

  try {
    const address = await server.start();

    const connectResponse = await requestJson({
      host: address.host,
      port: address.port,
      path: '/connect',
      method: 'POST',
      body: {
        mode: 'api',
        requestedTools: ['server.stream'],
        agent: { name: 'Live UI', type: 'web' }
      }
    });

    const session = connectResponse.body.connection.session;
    const streamResponse = await requestEventStream({
      host: address.host,
      port: address.port,
      path: `/sessions/${session.id}/execute?stream=1`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        Accept: 'text/event-stream'
      },
      body: {
        toolId: 'server.stream',
        input: {
          task: 'stream live state'
        }
      }
    });

    assert(streamResponse.statusCode === 200, 'Streaming endpoint should return 200');
    assert(streamResponse.events.length > 0, 'Streaming endpoint should emit events');
    assert(streamResponse.events[0].type === 'execution.started', 'First streamed event should start the execution');
    assert(streamResponse.events.some(event => event.type === 'step.progress'), 'Stream should include progress updates');
    assert(streamResponse.events.at(-1).type === 'execution.completed', 'Stream should end with execution.completed');
    assert(streamResponse.events.at(-1).final === true, 'Final streamed event should be marked final');
  } finally {
    await server.stop();
  }
});

section('8. Integration: End-to-End');

await test('Full workflow: register, find, and execute tool', async () => {
  const registry = new ToolRegistry();
  registry.registerTool(summarizerTool);
  
  const orchestrator = new Orchestrator({
    registry,
    llm: defaultLLM
  });
  
  // Search for the tool
  const found = orchestrator.searchTools('summarize');
  assert(found.length > 0, 'Tool should be found');
  
  // Execute it
  const result = await orchestrator.executeTool(
    'tool.summarizer',
    { text: 'This is a test text for summarization.' }
  );
  assert(result.executionId, 'Should have execution ID');
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

section('TEST SUMMARY');
const total = testsPassed + testsFailed;
console.log(`\n${colors.green}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
console.log(`Total: ${total}\n`);

if (testsFailed === 0) {
  console.log(`${colors.green}All tests passed! ✓${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}Some tests failed.${colors.reset}\n`);
  process.exit(1);
}

function requestJson({ host, port, path, method, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'undefined' ? null : JSON.stringify(body);
    const request = http.request({
      host,
      port,
      path,
      method,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: response.statusCode,
          body: rawBody ? JSON.parse(rawBody) : null
        });
      });
    });

    request.on('error', reject);

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
}

function requestEventStream({ host, port, path, method, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'undefined' ? null : JSON.stringify(body);
    const request = http.request({
      host,
      port,
      path,
      method,
      headers: {
        accept: 'text/event-stream',
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: response.statusCode,
          events: parseEventStream(rawBody),
          rawBody
        });
      });
    });

    request.on('error', reject);

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
}

function parseEventStream(raw) {
  return raw
    .split(/\n\n+/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const parsed = {
        id: null,
        type: null,
        data: null
      };

      for (const line of block.split('\n')) {
        if (!line || line.startsWith(':')) {
          continue;
        }

        const separator = line.indexOf(':');
        if (separator === -1) {
          continue;
        }

        const field = line.slice(0, separator);
        const value = line.slice(separator + 1).trimStart();

        if (field === 'id') {
          parsed.id = value;
          continue;
        }

        if (field === 'event') {
          parsed.type = value;
          continue;
        }

        if (field === 'data') {
          parsed.data = parsed.data ? `${parsed.data}\n${value}` : value;
        }
      }

      if (parsed.data) {
        parsed.data = JSON.parse(parsed.data);
      }

      return parsed.data || parsed;
    });
}
