# Flowfex Backend Foundation

A production-grade Node.js backend for the Flowfex AI orchestration platform. This is the core execution engine that manages tools, LLM interactions, and workflow orchestration.

## Architecture Overview

The backend is organized into modular, production-ready components:

```
src/
├── index.js                 # Main entry point with exports
├── init.js                  # Tool initialization
├── skills/                  # Markdown skill ingestion pipeline
│   ├── index.js             # Loader exports and default source config
│   ├── parser/              # Markdown and catalog parsers
│   ├── normalization/       # Prompt cleanup and metadata normalization
│   ├── validation/          # Security and quality validation
│   └── loader/              # Recursive bulk loader and registry integration
├── types/
│   └── Tool.js             # Tool class and interface definition
├── registry/
│   └── ToolRegistry.js     # Tool registry and discovery
├── llm/
│   └── LLMWrapper.js       # LLM abstraction layer
├── orchestrator/
│   └── Orchestrator.js     # Main execution orchestrator
├── tools/
│   ├── SummarizerTool.js   # Text summarization tool
│   ├── CodeGeneratorTool.js # Code generation tool
│   └── APIBuilderTool.js   # API specification tool
└── __tests__/
    └── integration.test.js # Comprehensive test suite

skills-md/
└── examples/               # Sample Claude-style markdown skills
```

## Core Components

### 1. Tool (src/types/Tool.js)

Every tool in Flowfex follows a strict interface with required fields:

```javascript
const tool = new Tool({
  id: 'tool.unique-id',                    // Unique identifier
  name: 'Tool Name',                       // Human-readable name
  description: 'What this tool does',      // Clear description
  prompt: 'System instructions...',        // LLM system prompt
  run: async (input, llm) => { ... },      // Async execution function
  keywords: ['key1', 'key2'],              // For input matching (optional)
  metadata: {                              // Additional metadata (optional)
    category: 'text',
    version: '1.0.0',
    tags: ['tag1', 'tag2']
  }
});

// Execute tool
const result = await tool.execute(input, llmInstance);
```

**Features:**
- Strict validation of all required fields
- Clear execution contract: `async run(input, llm) => output`
- Metadata support for categorization and discovery
- JSON serialization (excludes run function)

### 2. Tool Registry (src/registry/ToolRegistry.js)

Manages tool registration, discovery, and execution tracking.

```javascript
import { ToolRegistry } from './index.js';

const registry = new ToolRegistry();

// Register tools
registry.registerTool(myTool);
registry.registerTool(anotherTool);

// Find tools by keywords
const tools = registry.findToolsByKeywords('summarize text');

// Search tools
const results = registry.searchTools('summarizer');

// Get by category
const textTools = registry.getToolsByCategory('text');

// Get stats
const stats = registry.getStats();
// { registered: 3, executed: 5, failed: 0, totalTools: 3, categories: 2 }
```

**Methods:**
- `registerTool(tool)` - Register a tool instance
- `unregisterTool(toolId)` - Unregister a tool
- `getTool(toolId)` - Get tool by ID
- `getAllTools()` - Get all registered tools
- `findToolsByKeywords(input)` - Find tools matching input keywords
- `searchTools(query)` - Search by name, description, tags
- `getToolsByCategory(category)` - Filter by category
- `getCategories()` - Get all categories
- `getStats()` - Get usage statistics
- `executeTool(toolId, input, llm)` - Execute tool with tracking

### 3. LLM Wrapper (src/llm/LLMWrapper.js)

Abstraction layer for LLM interactions. Supports multiple providers through a unified interface.

```javascript
import { LLMWrapper } from './index.js';

// Create instance
const llm = new LLMWrapper({
  provider: 'mock',         // Default is 'mock' for development
  apiKey: 'your-api-key',   // For production providers
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2048
});

// Generate text
const response = await llm.generate(systemPrompt, userPrompt);

// Summarize
const summary = await llm.summarize(text, maxWords);

// Extract structured data
const data = await llm.extract(text, ['name', 'email']);

// Analyze with format
const json = await llm.analyze(prompt, input, 'json');

// Check usage
const usage = llm.getUsage();
```

**Providers:**
- `'mock'` - Mock responses for development/testing
- `'openai'` - OpenAI API (future implementation)
- `'anthropic'` - Anthropic Claude (future implementation)

### 4. Markdown Skill Ingestion (src/skills/)

Flowfex can import markdown skills recursively, normalize them into consistent prompts, validate them for unsafe behavior, and register the safe ones as tools.

```javascript
import {
  loadMarkdownSkills,
  getDefaultSkillSourceDirs,
  defaultRegistry
} from './index.js';

const report = await loadMarkdownSkills({
  registry: defaultRegistry,
  sourceDirs: getDefaultSkillSourceDirs()
});

console.log(report.loadedSkills);
console.log(report.blockedSkills);
console.log(report.catalogReferences);
```

**What the loader does:**
- Recursively scans `skills-md/` and any configured source roots
- Classifies markdown as `skill_markdown`, `command_markdown`, `agent_definition`, `catalog_markdown`, or `ignore`
- Extracts title, sections, description, instructions, and frontmatter
- Normalizes prompts into a consistent Flowfex tool format
- Adds inferred tags, category, keywords, source metadata, trust level, and validation status
- Blocks unsafe, duplicate, or low-quality skills before registration
- Indexes catalog-only markdown references without registering them as runnable tools

### 5. Orchestrator (src/orchestrator/Orchestrator.js)

The main execution engine that coordinates tool selection and execution.

```javascript
import { Orchestrator, defaultOrchestrator } from './index.js';

// Use default orchestrator (recommended)
const result = await defaultOrchestrator.orchestrate({
  steps: [
    {
      tool: 'tool.summarizer',
      input: {
        text: 'Long text to summarize...',
        maxWords: 100
      }
    }
  ]
});

// Or create custom instance
const orchestrator = new Orchestrator({
  registry: customRegistry,
  llm: customLLM
});

// Execute
const result = await orchestrator.orchestrate(input);
// Result: { executionId, status, selectedTool, trace, finalResult, output, error, duration, timestamp }

// Execute specific tool
const result = await orchestrator.executeTool('tool.summarizer', input);

// Execute multiple tools in sequence
const workflowResult = await orchestrator.orchestrate({
  input: {
    article: 'Long article text...',
    maxWords: 75
  },
  steps: [
    {
      tool: 'tool.summarizer',
      input: {
        text: { $from: 'originalInput.article' },
        maxWords: { $from: 'originalInput.maxWords' }
      }
    },
    {
      tool: 'tool.code-generator',
      input: {
        specification: { $from: 'previous.summary' },
        language: 'javascript',
        type: 'function'
      }
    }
  ]
});

// `workflowResult.trace` contains [{ step, tool, input, output }]
// `workflowResult.finalResult` contains the last step output

// Browse available tools
const tools = orchestrator.getAvailableTools();
const textTools = orchestrator.getAvailableTools({ category: 'text' });

// Search tools
const found = orchestrator.searchTools('summarize');

// Get execution history
const history = orchestrator.getExecutionHistory({ limit: 10, status: 'success' });

// Statistics
const stats = orchestrator.getStats();
```

## Example Tools

### 1. SummarizerTool

Condenses text while preserving key information.

```javascript
import { summarizerTool } from './index.js';

const result = await summarizerTool.execute({
  text: 'Long text to summarize...',
  maxWords: 100  // Default: 100
}, llm);

// Result:
// {
//   success: true,
//   originalLength: 250,
//   summaryLength: 95,
//   summary: 'Condensed text...',
//   maxWordsRequested: 100
// }
```

**Input:**
- `text` (string, required) - Text to summarize
- `maxWords` (number, optional) - Target summary length (default: 100)

### 2. CodeGeneratorTool

Generates code snippets or complete modules.

```javascript
import { codeGeneratorTool } from './index.js';

const result = await codeGeneratorTool.execute({
  specification: 'A function that validates email addresses',
  language: 'javascript',  // Default: 'javascript'
  type: 'function'         // Options: 'function', 'class', 'module', 'test', 'api'
}, llm);

// Result:
// {
//   success: true,
//   language: 'javascript',
//   type: 'function',
//   code: 'function validateEmail(...) { ... }',
//   lineCount: 15,
//   characterCount: 450
// }
```

**Input:**
- `specification` (string, required) - What to generate
- `language` (string, optional) - javascript, typescript, python, java, go, rust
- `type` (string, optional) - function, class, module, test, api

### 3. APIBuilderTool

Generates API specifications and schemas.

```javascript
import { apiBuilderTool } from './index.js';

const result = await apiBuilderTool.execute({
  requirements: 'Create a user authentication API',
  format: 'openapi',  // Options: 'openapi', 'jsonapi', 'graphql', 'rest'
  version: '1.0.0'
}, llm);

// Result:
// {
//   success: true,
//   format: 'openapi',
//   version: '1.0.0',
//   specification: 'OpenAPI 3.0 spec...',
//   metadata: {
//     estimatedEndpoints: 5,
//     estimatedSchemas: 8,
//     lineCount: 250,
//     characterCount: 5000
//   }
// }
```

**Input:**
- `requirements` (string, required) - API requirements
- `format` (string, optional) - openapi, jsonapi, graphql, rest
- `version` (string, optional) - API version

## Usage Examples

### Basic Usage

```javascript
import { orchestrate, registry } from './index.js';

const result = await orchestrate({
  steps: [
    {
      tool: 'tool.summarizer',
      input: {
        text: 'Long document text...',
        maxWords: 100
      }
    }
  ]
});

console.log(result.finalResult);
console.log(result.trace);
```

### Markdown Skill Loading

```javascript
import { loadMarkdownSkills, ToolRegistry } from './index.js';

const registry = new ToolRegistry();

const report = await loadMarkdownSkills({
  registry,
  sourceDirs: [
    '../skills-md',
    '../awesome-agent-skills'
  ]
});

console.log(report.registeredTools);
console.log(report.blockedSkills);
console.log(report.catalogReferences.length);
```

### Sample Conversion Flow

Run the example importer against the local markdown sample set:

```bash
npm run skills:sample
```

This loads:
- `skills-md/examples/frontend-review.md`
- `skills-md/examples/commands/release-check.md`
- `skills-md/examples/agents/code-review-agent.md`
- additional markdown examples under `skills-md/examples/before/`

And blocks:
- `skills-md/examples/dangerous-exfiltration.md`
- unsafe examples such as `skills-md/examples/before/security/unsafe-secret-extractor.md`

### Advanced Usage

```javascript
import {
  Orchestrator,
  ToolRegistry,
  LLMWrapper,
  summarizerTool,
  codeGeneratorTool
} from './index.js';

// Create custom registry with specific tools
const registry = new ToolRegistry();
registry.registerTool(summarizerTool);
registry.registerTool(codeGeneratorTool);

// Create custom LLM
const llm = new LLMWrapper({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY
});

// Create orchestrator
const orchestrator = new Orchestrator({ registry, llm });

// Execute
const result = await orchestrator.executeTool('tool.summarizer', {
  text: 'Very long document text...',
  maxWords: 150
});

console.log(`Execution Time: ${result.duration}ms`);
console.log(`Status: ${result.status}`);
console.log(result.output);
```

### Creating Custom Tools

```javascript
import { Tool, defaultRegistry } from './index.js';

const myTool = new Tool({
  id: 'tool.my-custom-tool',
  name: 'My Custom Tool',
  description: 'Does something specific',
  prompt: 'You are an expert in X...',
  keywords: ['custom', 'tool', 'specific'],
  metadata: {
    category: 'custom',
    version: '1.0.0',
    tags: ['custom', 'example']
  },
  run: async (input, llm) => {
    // Your custom logic here
    const processed = await llm.generate(
      'Process this data: ',
      JSON.stringify(input)
    );
    
    return {
      success: true,
      result: processed
    };
  }
});

// Register it
defaultRegistry.registerTool(myTool);

// Use it
const result = await defaultOrchestrator.orchestrate('my keyword here');
```

## API Structure

### Execution Result Format

All tool executions return a structured result:

```javascript
{
  executionId: 'exec-1-1234567890',  // Unique execution ID
  status: 'success',                  // 'success', 'error', 'pending'
  input: { text: '...' },             // Input provided
  selectedTool: {                     // Present for single-step orchestrate/executeTool
    id: 'tool.summarizer',
    name: 'Summarizer'
  },
  trace: [                            // Full step-by-step execution trace
    {
      step: 1,
      tool: 'tool.summarizer',
      input: { text: '...' },
      output: { summary: '...' }
    }
  ],
  finalResult: { summary: '...' },    // Output from the last successful step
  output: { summary: '...' },         // Alias of finalResult for compatibility
  error: null,                        // Error info if failed
  duration: 245,                      // Execution time in ms
  timestamp: '2024-04-09T...'         // ISO timestamp
}
```

### Tool Summary Format

Tools are exposed via API with this structure:

```javascript
{
  id: 'tool.summarizer',
  name: 'Summarizer',
  description: 'Condenses text...',
  category: 'text',
  tags: ['summarization', 'nlp'],
  version: '1.0.0',
  source: 'examples/frontend-review.md',
  trustLevel: 'trusted',
  validationStatus: 'verified'
}
```

## Testing

Run the comprehensive integration test suite:

```bash
npm test
```

This runs the integration suite covering:
- Tool validation and interface
- Registry operations and discovery
- LLM wrapper functionality
- Markdown skill parsing, normalization, validation, and loading
- Orchestrator execution
- Example tools
- End-to-end workflows

All tests are currently passing ✓

## Project Structure Decisions

### Modularity
Each component is self-contained and can be used independently or together.

### No Unnecessary Abstractions
Simple, direct implementations that solve problems without over-engineering.

### Production-Minded Code
- Comprehensive validation
- Clear error messages
- Execution tracking and statistics
- Well-documented JSDoc comments

### Extensibility
- Easy to add new tools by implementing the Tool interface
- Easy to ingest large skill trees by pointing the loader at new markdown roots
- Support for multiple LLM providers
- Custom registries and orchestrators for specialized use cases

## Future Enhancements

**Planned:**
- OpenAI and Anthropic provider implementations
- Caching layer for repeated queries
- Streaming execution support
- Advanced tool selection using LLM
- Tool versioning
- Role-based access control

**Not Included in MVP:**
- Database persistence
- API server (separate project)
- Web UI (separate project)
- Authentication/Authorization

## Performance Considerations

- **Registry Lookups:** O(n) keyword matching, O(1) ID lookup
- **Tool Execution:** Async/await with no blocking operations
- **Memory:** Tools held in Map for fast access
- **Concurrency:** Can handle multiple simultaneous executions

## Error Handling

All components include comprehensive error handling:

```javascript
try {
  const result = await orchestrator.orchestrate(input);
} catch (error) {
  console.error('Orchestration failed:', error.message);
}
```

Errors include:
- Tool validation failures
- LLM provider errors
- Execution timeouts
- Invalid inputs
- Tool not found

## Contributing

When adding new tools:
1. Extend the Tool class
2. Implement the `run(input, llm)` method
3. Add comprehensive JSDoc comments
4. Write tests in `__tests__/integration.test.js`
5. Register in `src/init.js` if it's a default tool

## License

ISC
