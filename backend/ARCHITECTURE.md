# Flowfex Backend Architecture Document

## Design Philosophy

The Flowfex backend is built on three core principles:

1. **Modular**: Each component has a single responsibility and can be used independently
2. **Production-Ready**: Comprehensive validation, error handling, and logging
3. **Extensible**: Easy to add new tools, providers, and features

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Input                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │    Orchestrator        │
            │  - Receives input      │
            │  - Selects tool        │
            │  - Manages execution   │
            └────────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
      ┌─────────────┐         ┌────────────────┐
      │   Registry  │         │   LLM Wrapper  │
      │  - Finds    │         │  - Generates   │
      │    tools    │         │  - Summarizes  │
      │  - Manages  │         │  - Analyzes    │
      │    tools    │         │  - Extracts    │
      └─────────────┘         └────────────────┘
            │
            ▼
      ┌──────────────┐
      │ Tool Instance│
      │ ┌──────────┐ │
      │ │ run()    │ │
      │ │ method   │ │
      │ └──────────┘ │
      └──────────────┘
            │
            ▼
      ┌──────────────┐
      │ Tool Output  │
      │ (Result)     │
      └──────────────┘
```

## Module Responsibilities

### Tool (src/types/Tool.js)

**Purpose**: Defines the contract that all tools must follow

**Key Responsibilities**:
- Validate configuration on instantiation
- Enforce required fields (id, name, description, prompt, run)
- Provide consistent interface for execution
- Enable serialization for API responses

**Key Methods**:
```javascript
new Tool(config)      // Constructor with validation
.execute(input, llm)  // Execute tool with LLM
.toJSON()            // Serialize for API
```

**Design Decisions**:
- Validation in constructor catches errors early
- `run` function signature is `(input, llm) => Promise<output>`
- Keywords and metadata are optional for flexibility
- JSON serialization excludes `run` function for security

### ToolRegistry (src/registry/ToolRegistry.js)

**Purpose**: Manages tool lifecycle and discovery

**Key Responsibilities**:
- Register/unregister tools
- Index tools by category for fast lookup
- Find tools by keyword matching
- Search tools by name/description/tags
- Track execution statistics
- Execute tools with error handling

**Key Methods**:
```javascript
new ToolRegistry()           // Create registry
.registerTool(tool)          // Register tool
.getTool(toolId)             // Get by ID (O(1))
.findToolsByKeywords(input)  // Find by keywords (O(n))
.searchTools(query)          // Semantic search (O(n))
.executeTool(toolId, ...)    // Execute with tracking
.getStats()                  // Usage statistics
```

**Design Decisions**:
- Uses Map for O(1) ID lookup
- Maintains category index for filtering
- Keyword matching is substring-based for simplicity
- Statistics tracked at registry level
- Duplicate ID prevention enforced

### LLMWrapper (src/llm/LLMWrapper.js)

**Purpose**: Abstraction layer for LLM interactions

**Key Responsibilities**:
- Abstract away LLM provider details
- Provide unified interface for text generation
- Support multiple providers through plugin architecture
- Track token usage and request counts
- Implement mock provider for development

**Key Methods**:
```javascript
new LLMWrapper(config)      // Create with provider
.generate(system, user)     // Generate text
.summarize(text, maxWords)  // Summarize
.analyze(prompt, input, format) // Analyze with format
.extract(text, keys)        // Extract structured data
.getUsage()                 // Get statistics
```

**Provider Architecture**:
```javascript
// Structure for adding new providers
if (this.provider === 'new-provider') {
  return this._newProviderGenerate(systemPrompt, userPrompt);
}

async _newProviderGenerate(system, user) {
  // Custom implementation
}
```

**Design Decisions**:
- Mock provider is default for development
- Provider pattern allows easy extension
- Config includes temperature, maxTokens for tuning
- Request counting for usage monitoring
- Methods return direct values (not wrapped in objects)

### Orchestrator (src/orchestrator/Orchestrator.js)

**Purpose**: Main execution engine coordinating tool selection and execution

**Key Responsibilities**:
- Accept user input in various forms
- Select appropriate tools from registry
- Execute one or more tools in sequence
- Pass step output into later steps
- Return step-by-step execution traces
- Maintain execution history
- Provide tool discovery and search
- Track execution statistics

**Key Methods**:
```javascript
new Orchestrator(config)    // Create with registry/llm
.orchestrate(input)         // Execute with auto-selection
.executeTool(toolId, input) // Execute specific tool
.getAvailableTools(options) // List tools
.searchTools(query)         // Search tools
.getExecutionHistory(options) // Get history
.getStats()                 // Usage statistics
```

**Execution Flow**:
```javascript
1. Receive input
2. Normalize it into one or more execution steps
3. Resolve each step input from original input and prior outputs
4. Resolve the step tool explicitly or by keyword matching
5. Execute the tool with the LLM instance
6. Append { step, tool, input, output } to the trace
7. Repeat until all steps complete or one fails
8. Return the trace plus the final result
```

**Design Decisions**:
- Keyword matching is primary selection method
- Explicit step definitions override auto-selection
- Missing step input defaults to the previous step output
- Execution history is in-memory (for MVP)
- Structured result format for all executions
- Execution ID for tracking and correlation

### Markdown Skill Ingestion (src/skills/)

**Purpose**: Convert imported markdown skills into validated Flowfex tools at startup or on demand

**Key Responsibilities**:
- Recursively scan source directories for markdown content
- Classify markdown as skill docs, command docs, agent docs, or catalog indexes
- Parse titles, sections, descriptions, and instructions
- Normalize prompts, categories, tags, and keywords
- Validate for prompt injection, unsafe instructions, and duplicate content
- Register only approved skills in the registry
- Preserve catalog-only references for future ingestion without registering them

**Key Modules**:
```javascript
parser/MarkdownSkillParser.js   // Extracts title, sections, and instruction blocks
catalog/CatalogSkillParser.js   // Indexes catalog-style README references
normalization/SkillNormalizer.js // Builds consistent Flowfex prompt + metadata
validation/SkillValidator.js     // Blocks unsafe or low-quality imports
loader/MarkdownSkillLoader.js    // Recursively loads and registers skills
```

**Ingestion Flow**:
```javascript
1. Walk every configured source directory recursively
2. Classify each markdown file
3. Parse markdown into structured skill content
4. Normalize prompt, tags, keywords, and category
5. Validate and sanitize for safety and consistency
6. Register approved skills as Tool instances
7. Record blocked skills and catalog-only references in the load report
```

**Design Decisions**:
- Keep ingestion deterministic and file-system based
- Treat catalog markdown as references, not runnable tools
- Use rule-based sanitization and blocking before registration
- Store source, trust, and validation metadata on every imported tool
- Scale by walking directories iteratively and avoiding hardcoded skill lists

### Tool Implementations

#### SummarizerTool (src/tools/SummarizerTool.js)

**Purpose**: Condense text while preserving key information

**Input Schema**:
```javascript
{
  text: string,      // Required: text to summarize
  maxWords?: number  // Optional: target length (default: 100)
}
```

**Output Schema**:
```javascript
{
  success: true,
  originalLength: number,
  summaryLength: number,
  summary: string,
  maxWordsRequested: number
}
```

**Design Decisions**:
- Input validation before LLM call
- Word count tracking for verification
- LLM system prompt specifies output constraints
- Error handling for empty input

#### CodeGeneratorTool (src/tools/CodeGeneratorTool.js)

**Purpose**: Generate code from specifications

**Input Schema**:
```javascript
{
  specification: string,    // Required: what to generate
  language?: string,        // Optional: programming language (default: javascript)
  type?: string            // Optional: code type (default: function)
}
```

**Supported Languages**: javascript, typescript, python, java, go, rust

**Supported Types**: function, class, module, test, api

**Output Schema**:
```javascript
{
  success: true,
  language: string,
  type: string,
  code: string,
  lineCount: number,
  characterCount: number
}
```

**Design Decisions**:
- Whitelist of supported languages and types
- LLM system prompt includes language expertise
- Line/character counting for metadata
- Code validation after generation (could be enhanced)

#### APIBuilderTool (src/tools/APIBuilderTool.js)

**Purpose**: Generate API specifications

**Input Schema**:
```javascript
{
  requirements: string,     // Required: API requirements
  format?: string,         // Optional: specification format (default: openapi)
  version?: string         // Optional: API version (default: 1.0.0)
}
```

**Supported Formats**: openapi, jsonapi, graphql, rest

**Output Schema**:
```javascript
{
  success: true,
  format: string,
  version: string,
  specification: string,
  metadata: {
    estimatedEndpoints: number,
    estimatedSchemas: number,
    lineCount: number,
    characterCount: number
  }
}
```

**Design Decisions**:
- Format-specific prompt instructions
- Endpoint/schema estimation through regex
- Metadata for quality metrics
- Extensible format support

## Data Flow Patterns

### Simple Orchestration Flow

```
Input: "summarize this text"
  │
  ├─ Orchestrator.orchestrate(input)
  │  ├─ registry.findToolsByKeywords("summarize")
  │  │  └─ Returns [summarizerTool]
  │  ├─ Select summarizerTool
  │  ├─ summarizerTool.execute(input, llm)
  │  │  ├─ Validate input
  │  │  ├─ llm.generate(prompt, input)
  │  │  └─ Format result
  │  └─ Return result with metadata
  │
Output: { executionId, status, output, duration, ... }
```

### Tool Registry Search Flow

```
Query: "summarize"
  │
  ├─ searchTools(query)
  │  ├─ Match against tool names
  │  ├─ Match against descriptions
  │  ├─ Match against tags
  │  └─ Collect all matches
  │
Output: [tool1, tool2, ...]
```

### LLM Generation Flow

```
System: "You are a summarizer..."
User: "Text to summarize..."
  │
  ├─ LLMWrapper.generate(system, user)
  │  ├─ Check provider (mock, openai, etc.)
  │  ├─ Route to provider-specific method
  │  ├─ Increment request counter
  │  └─ Return response
  │
Output: "Generated text..."
```

## Error Handling Strategy

### Validation Errors
Occur at construction time:
```javascript
try {
  new Tool({ id: 'test' }); // Missing required fields
} catch (e) {
  // Tool validation failed: missing required field 'name'
}
```

### Execution Errors
Caught during tool execution:
```javascript
try {
  await tool.execute(input, llm);
} catch (e) {
  // Error executing tool: <specific error message>
  // Errors include: validation, LLM failures, timeout, etc.
}
```

### Registry Errors
Caught during registry operations:
```javascript
try {
  registry.registerTool(tool); // Duplicate ID
} catch (e) {
  // Tool with id 'X' is already registered
}
```

## Extensibility Points

### Adding a New Tool

```javascript
// 1. Create tool file: src/tools/MyTool.js
import { Tool } from '../types/Tool.js';

export const myTool = new Tool({
  id: 'tool.my-tool',
  name: 'My Tool',
  description: 'Does something',
  prompt: 'System instructions...',
  keywords: ['my', 'tool'],
  metadata: { category: 'custom' },
  run: async (input, llm) => {
    // Implementation
    return result;
  }
});

// 2. Register in src/init.js
import { myTool } from './tools/MyTool.js';
defaultRegistry.registerTool(myTool);

// 3. Export from src/index.js
export { myTool } from './tools/MyTool.js';
```

### Adding a New LLM Provider

```javascript
// 1. Add method to LLMWrapper
async _openaiGenerate(systemPrompt, userPrompt) {
  // Implementation using OpenAI API
}

// 2. Add to generate() method
if (this.provider === 'openai') {
  return this._openaiGenerate(systemPrompt, userPrompt);
}

// 3. Update config validation
const supportedProviders = ['mock', 'openai', 'anthropic'];
```

### Adding Tool Selection Algorithm

Current: Simple keyword matching (first match wins)

Future: Could implement:
- LLM-based selection (ask LLM which tool is best)
- Scoring algorithm (rank by relevance)
- Parallel step execution for independent branches

```javascript
// Example: LLM-based selection
async selectTool(input) {
  const tools = this.registry.getAllTools();
  const prompt = `Which tool should handle: "${input}"?`;
  const selection = await this.llm.generate(prompt, tools);
  return parseSelection(selection);
}
```

## Performance Characteristics

### Time Complexity
- `getTool(id)`: **O(1)** - Direct Map lookup
- `findToolsByKeywords(input)`: **O(n)** - Linear scan with keyword matching
- `searchTools(query)`: **O(n)** - Linear scan with string matching
- `executeTool()`: **O(1)** + LLM time - Tool lookup + async execution

### Space Complexity
- Registry: **O(n)** - Stores all tools
- Category index: **O(n)** - One entry per tool
- Execution history: **O(m)** - Proportional to executions

### Optimization Opportunities
- Add inverted index for faster keyword search
- Implement caching for frequently called tools
- Add tool selection scoring instead of first-match
- Batch execute multiple tools in parallel
- Implement execution result caching

## Testing Strategy

### Unit Testing (Per Component)
- Tool validation and interface
- Registry operations
- LLM wrapper initialization

### Integration Testing (Cross-Component)
- End-to-end execution flows
- Tool discovery and selection
- Error handling and recovery

### Test Coverage
Current: Integration tests cover all major features
Coverage includes:
- Happy paths
- Error cases
- Edge cases (empty input, invalid params)
- Integration scenarios

## Future Roadmap

### Phase 1 (Current MVP)
- ✅ Tool interface and validation
- ✅ Tool registry with discovery
- ✅ LLM abstraction with mock provider
- ✅ Orchestrator with sequential multi-step execution
- ✅ Three example tools
- ✅ Comprehensive testing

### Phase 2 (Planned)
- OpenAI and Anthropic provider implementations
- LLM-based tool selection
- In-memory caching layer
- Streaming execution support
- Tool versioning

### Phase 3 (Future)
- Database persistence
- API server integration
- Advanced metrics and observability
- Role-based access control
- Plugin architecture for custom tools
- Distributed execution support

## Code Style Guidelines

### Naming Conventions
- Classes: PascalCase (Tool, ToolRegistry)
- Methods: camelCase (registerTool, executeTool)
- Constants: UPPER_SNAKE_CASE (MAX_RETRIES)
- Files: Match exported class name

### Code Organization
- One class per file (except related helpers)
- Private methods prefixed with `_`
- Comprehensive JSDoc comments
- Error messages are descriptive

### Import Organization
```javascript
// 1. Node built-ins
import { promises as fs } from 'fs';

// 2. Third-party
import axios from 'axios';

// 3. Local imports
import { Tool } from '../types/Tool.js';
import { defaultLLM } from '../llm/LLMWrapper.js';
```

## Deployment Considerations

### Environment Variables
```
FLOWFEX_LLM_PROVIDER=openai      # LLM provider
FLOWFEX_LLM_API_KEY=sk-xxx       # API key
FLOWFEX_LLM_MODEL=gpt-4          # Model to use
FLOWFEX_TEMPERATURE=0.7          # LLM temperature
FLOWFEX_MAX_TOKENS=2048          # Max tokens
```

### Monitoring Points
- Tool execution count and success rate
- Average execution duration
- LLM request count and failures
- Tool registry size
- Execution history size

### Scalability
- Current: Single-process, in-memory storage
- Horizontal: Can run multiple instances with shared service layer
- Vertical: Optimize registry lookups with caching
- Database: Add persistence layer as needed

## Summary

The Flowfex backend is designed as a clean, modular system that:
- Provides a clear contract for tools via the Tool interface
- Manages tools efficiently through the ToolRegistry
- Abstracts LLM providers through the LLMWrapper
- Coordinates execution through the Orchestrator
- Maintains extensibility at every layer
- Prioritizes production quality with validation and error handling
