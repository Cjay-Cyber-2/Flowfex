/**
 * Production Skill Tools
 *
 * 15 LLM-powered tools across key categories that expand Flowfex's
 * skill registry for real orchestration. Each tool uses the LLM via
 * the unified registry.executeTool(id, input, llm, runtime) interface.
 */

import { Tool } from '../types/Tool.js';

// ─── Data Category ──────────────────────────────────────────────────────

export const dataAnalyzerTool = new Tool({
  id: 'tool.data-analyzer',
  name: 'Data Analyzer',
  description: 'Analyzes datasets, extracts patterns, identifies trends, and provides statistical insights from structured or unstructured data.',
  prompt: `You are an expert data analyst. Analyze the provided data or data description and return structured insights. Include:
1. Key patterns and trends observed
2. Statistical summaries where applicable
3. Anomalies or outliers detected
4. Actionable recommendations based on the data
5. Data quality observations
Return a structured analysis report.`,
  keywords: ['data', 'analyze', 'analytics', 'statistics', 'trends', 'patterns', 'insights', 'dataset', 'csv'],
  metadata: {
    category: 'data',
    version: '1.0.0',
    tags: ['data-analysis', 'statistics', 'insights'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'analyze', current: 1, total: 3, message: 'Analyzing data' });
    const userPrompt = formatInput(input, 'data');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating insights' });
    const response = await llm.generate(
      'You are an expert data analyst. Analyze the provided data and return structured insights covering patterns, anomalies, quality, and recommendations.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Analysis complete' });
    return { success: true, skill: 'tool.data-analyzer', category: 'data', response };
  },
});

export const schemaValidatorTool = new Tool({
  id: 'tool.schema-validator',
  name: 'Schema Validator',
  description: 'Validates JSON schemas, database schemas, and API contracts for correctness, completeness, and consistency.',
  prompt: `You are a schema validation expert. Review the provided schema or data structure and:
1. Verify structural correctness
2. Check for missing required fields
3. Validate data types and constraints
4. Identify potential edge cases
5. Suggest improvements for robustness
Return a validation report with findings and recommendations.`,
  keywords: ['schema', 'validate', 'json', 'database', 'contract', 'format', 'structure', 'yaml'],
  metadata: {
    category: 'data',
    version: '1.0.0',
    tags: ['validation', 'schema', 'json'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'validate', current: 1, total: 3, message: 'Validating schema' });
    const userPrompt = formatInput(input, 'schema');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating validation report' });
    const response = await llm.generate(
      'You are a schema validation expert. Validate the provided schema for correctness, completeness, and consistency. Return a structured report.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Validation complete' });
    return { success: true, skill: 'tool.schema-validator', category: 'data', response };
  },
});

// ─── Security Category ──────────────────────────────────────────────────

export const securityAuditorTool = new Tool({
  id: 'tool.security-auditor',
  name: 'Security Auditor',
  description: 'Audits code, configurations, and architectures for security vulnerabilities, compliance gaps, and hardening opportunities.',
  prompt: `You are a senior security engineer. Audit the provided code, configuration, or architecture for:
1. Common vulnerabilities (OWASP Top 10)
2. Authentication and authorization gaps
3. Input validation weaknesses
4. Sensitive data exposure risks
5. Security header and CORS issues
6. Dependency vulnerabilities
Return a prioritized security report with severity ratings and remediation steps.`,
  keywords: ['security', 'audit', 'vulnerability', 'pentest', 'owasp', 'hardening', 'auth', 'encrypt'],
  metadata: {
    category: 'security',
    version: '1.0.0',
    tags: ['security', 'audit', 'vulnerability-assessment'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'audit', current: 1, total: 3, message: 'Running security audit' });
    const userPrompt = formatInput(input, 'security audit');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating security report' });
    const response = await llm.generate(
      'You are a senior security engineer. Audit the provided code, config, or architecture for vulnerabilities. Return findings with severity, category, and remediation steps.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Audit complete' });
    return { success: true, skill: 'tool.security-auditor', category: 'security', response };
  },
});

export const complianceCheckerTool = new Tool({
  id: 'tool.compliance-checker',
  name: 'Compliance Checker',
  description: 'Checks systems and processes against compliance standards like GDPR, HIPAA, SOC2, and industry best practices.',
  prompt: `You are a compliance and regulatory expert. Review the provided system, process, or policy for compliance with applicable standards. Cover:
1. Data handling and privacy (GDPR, CCPA)
2. Access controls and audit trails
3. Data retention and deletion policies
4. Encryption requirements
5. Incident response readiness
Return a compliance assessment with gaps and remediation priorities.`,
  keywords: ['compliance', 'gdpr', 'hipaa', 'soc2', 'regulation', 'privacy', 'standard', 'policy'],
  metadata: {
    category: 'security',
    version: '1.0.0',
    tags: ['compliance', 'regulation', 'privacy'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'check', current: 1, total: 3, message: 'Checking compliance' });
    const userPrompt = formatInput(input, 'compliance check');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating compliance report' });
    const response = await llm.generate(
      'You are a compliance expert. Review the system for regulatory and standards compliance. Return a detailed assessment with gaps and remediation priorities.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Compliance check complete' });
    return { success: true, skill: 'tool.compliance-checker', category: 'security', response };
  },
});

// ─── Testing Category ───────────────────────────────────────────────────

export const testGeneratorTool = new Tool({
  id: 'tool.test-generator',
  name: 'Test Generator',
  description: 'Generates comprehensive test suites including unit tests, integration tests, and edge case coverage from specifications or existing code.',
  prompt: `You are an expert test engineer. Generate comprehensive test suites for the provided specification or code. Include:
1. Unit tests for core functionality
2. Edge case and boundary condition tests
3. Error handling tests
4. Integration test scenarios
5. Test data and fixtures
Use modern testing patterns and clear, maintainable test structure.`,
  keywords: ['test', 'testing', 'unit', 'integration', 'spec', 'coverage', 'e2e', 'jest', 'vitest'],
  metadata: {
    category: 'testing',
    version: '1.0.0',
    tags: ['testing', 'test-generation', 'quality-assurance'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'analyze', current: 1, total: 3, message: 'Analyzing test requirements' });
    const userPrompt = formatInput(input, 'test generation');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating test suite' });
    const response = await llm.generate(
      'You are an expert test engineer. Generate a comprehensive test suite covering unit tests, edge cases, error handling, and integration scenarios.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Test generation complete' });
    return { success: true, skill: 'tool.test-generator', category: 'testing', response };
  },
});

// ─── Code Category ──────────────────────────────────────────────────────

export const refactoringAssistantTool = new Tool({
  id: 'tool.refactoring-assistant',
  name: 'Refactoring Assistant',
  description: 'Analyzes code for refactoring opportunities including code smells, duplication, complexity reduction, and pattern application.',
  prompt: `You are a senior software engineer specializing in code quality. Analyze the provided code and:
1. Identify code smells and anti-patterns
2. Suggest specific refactoring techniques to apply
3. Reduce complexity where possible
4. Improve readability and maintainability
5. Apply appropriate design patterns
Return refactored code with explanations for each change.`,
  keywords: ['refactor', 'code', 'clean', 'smell', 'pattern', 'complexity', 'quality', 'duplication'],
  metadata: {
    category: 'code',
    version: '1.0.0',
    tags: ['refactoring', 'code-quality', 'clean-code'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'analyze', current: 1, total: 3, message: 'Analyzing code structure' });
    const userPrompt = formatInput(input, 'refactoring');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating refactoring suggestions' });
    const response = await llm.generate(
      'You are a senior software engineer. Analyze the code for refactoring opportunities. Identify smells, suggest improvements, and provide refactored code with explanations.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Refactoring analysis complete' });
    return { success: true, skill: 'tool.refactoring-assistant', category: 'code', response };
  },
});

// ─── Text Category ──────────────────────────────────────────────────────

export const contentWriterTool = new Tool({
  id: 'tool.content-writer',
  name: 'Content Writer',
  description: 'Writes professional content including documentation, articles, marketing copy, technical guides, and README files.',
  prompt: `You are an expert content creator. Write high-quality, engaging content based on the provided brief. Ensure:
1. Clear, professional tone appropriate to the audience
2. Well-structured with headings and sections
3. Accurate and informative content
4. Proper formatting and readability
5. SEO-friendly when applicable
Deliver polished, publication-ready content.`,
  keywords: ['write', 'content', 'article', 'documentation', 'copy', 'readme', 'blog', 'guide'],
  metadata: {
    category: 'text',
    version: '1.0.0',
    tags: ['content-writing', 'documentation', 'copywriting'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'plan', current: 1, total: 3, message: 'Planning content structure' });
    const userPrompt = formatInput(input, 'content writing');
    runtime?.reportProgress({ phase: 'write', current: 2, total: 3, message: 'Writing content' });
    const response = await llm.generate(
      'You are an expert content creator. Write high-quality, professional content based on the brief. Ensure clear structure, accuracy, and readability.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Content creation complete' });
    return { success: true, skill: 'tool.content-writer', category: 'text', response };
  },
});

export const translatorTool = new Tool({
  id: 'tool.translator',
  name: 'Translator',
  description: 'Translates text between languages while preserving meaning, tone, context, and technical terminology.',
  prompt: `You are a professional translator. Translate the provided text accurately while:
1. Preserving the original meaning and nuance
2. Maintaining appropriate tone and formality
3. Keeping technical terms accurate
4. Adapting idioms and cultural references
5. Preserving formatting and structure
Return the translated text with any notes about translation choices.`,
  keywords: ['translate', 'translation', 'language', 'i18n', 'localization', 'l10n', 'multilingual'],
  metadata: {
    category: 'text',
    version: '1.0.0',
    tags: ['translation', 'i18n', 'localization'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'prepare', current: 1, total: 3, message: 'Preparing translation' });
    const userPrompt = formatInput(input, 'translation');
    runtime?.reportProgress({ phase: 'translate', current: 2, total: 3, message: 'Translating content' });
    const response = await llm.generate(
      'You are a professional translator. Translate the text accurately while preserving meaning, tone, and technical accuracy.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Translation complete' });
    return { success: true, skill: 'tool.translator', category: 'text', response };
  },
});

// ─── DevOps Category ────────────────────────────────────────────────────

export const deployPlannerTool = new Tool({
  id: 'tool.deploy-planner',
  name: 'Deploy Planner',
  description: 'Plans deployment strategies including rollout sequences, rollback procedures, environment configurations, and health check verification.',
  prompt: `You are a DevOps engineer. Create a detailed deployment plan covering:
1. Pre-deployment checklist and prerequisites
2. Step-by-step deployment sequence
3. Environment configuration requirements
4. Health check and monitoring setup
5. Rollback procedures and criteria
6. Post-deployment verification steps
Return an actionable deployment runbook.`,
  keywords: ['deploy', 'deployment', 'ci', 'cd', 'pipeline', 'rollback', 'devops', 'release', 'staging'],
  metadata: {
    category: 'devops',
    version: '1.0.0',
    tags: ['deployment', 'devops', 'ci-cd'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'plan', current: 1, total: 3, message: 'Planning deployment' });
    const userPrompt = formatInput(input, 'deployment planning');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating deployment plan' });
    const response = await llm.generate(
      'You are a DevOps engineer. Create a comprehensive deployment plan with checklists, rollout steps, health checks, and rollback procedures.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Deployment plan complete' });
    return { success: true, skill: 'tool.deploy-planner', category: 'devops', response };
  },
});

// ─── API Category ───────────────────────────────────────────────────────

export const apiDocumenterTool = new Tool({
  id: 'tool.api-documenter',
  name: 'API Documenter',
  description: 'Generates comprehensive API documentation including endpoint specifications, request/response schemas, authentication guides, and usage examples.',
  prompt: `You are a technical writer specializing in API documentation. Generate clear, developer-friendly API docs including:
1. Endpoint specifications (method, path, parameters)
2. Request and response schemas with examples
3. Authentication and authorization details
4. Error codes and handling guidance
5. Rate limiting and pagination info
6. Usage examples in common languages
Return OpenAPI-compatible documentation.`,
  keywords: ['api', 'documentation', 'swagger', 'openapi', 'endpoint', 'rest', 'graphql', 'reference'],
  metadata: {
    category: 'api',
    version: '1.0.0',
    tags: ['api-documentation', 'openapi', 'developer-docs'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'analyze', current: 1, total: 3, message: 'Analyzing API surface' });
    const userPrompt = formatInput(input, 'API documentation');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating API docs' });
    const response = await llm.generate(
      'You are a technical writer. Generate comprehensive, developer-friendly API documentation with endpoint specs, schemas, auth details, examples, and error handling.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'API documentation complete' });
    return { success: true, skill: 'tool.api-documenter', category: 'api', response };
  },
});

// ─── Analysis Category ──────────────────────────────────────────────────

export const performanceProfilerTool = new Tool({
  id: 'tool.performance-profiler',
  name: 'Performance Profiler',
  description: 'Profiles systems for performance bottlenecks, memory leaks, latency issues, and optimization opportunities.',
  prompt: `You are a performance engineering expert. Analyze the provided system, code, or architecture for:
1. Performance bottlenecks and hotspots
2. Memory usage and potential leaks
3. Network latency and I/O optimization
4. Caching opportunities
5. Database query optimization
6. Scalability considerations
Return a prioritized optimization report with estimated impact.`,
  keywords: ['performance', 'optimize', 'profile', 'latency', 'speed', 'memory', 'bottleneck', 'scale'],
  metadata: {
    category: 'analysis',
    version: '1.0.0',
    tags: ['performance', 'optimization', 'profiling'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'profile', current: 1, total: 3, message: 'Profiling system' });
    const userPrompt = formatInput(input, 'performance analysis');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating optimization report' });
    const response = await llm.generate(
      'You are a performance engineering expert. Analyze for bottlenecks, memory issues, latency, and optimization opportunities. Return a prioritized report.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Performance analysis complete' });
    return { success: true, skill: 'tool.performance-profiler', category: 'analysis', response };
  },
});

export const dependencyMapperTool = new Tool({
  id: 'tool.dependency-mapper',
  name: 'Dependency Mapper',
  description: 'Maps project dependencies, identifies version conflicts, security vulnerabilities, and upgrade paths.',
  prompt: `You are a dependency management expert. Analyze the provided project dependencies and:
1. Map the dependency tree and relationships
2. Identify version conflicts or incompatibilities
3. Flag known security vulnerabilities
4. Suggest upgrade paths and breaking change risks
5. Identify unused or redundant dependencies
Return a dependency health report with actionable recommendations.`,
  keywords: ['dependency', 'package', 'npm', 'version', 'conflict', 'upgrade', 'bundle', 'module'],
  metadata: {
    category: 'analysis',
    version: '1.0.0',
    tags: ['dependency-management', 'package-audit', 'version-control'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'map', current: 1, total: 3, message: 'Mapping dependencies' });
    const userPrompt = formatInput(input, 'dependency analysis');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating dependency report' });
    const response = await llm.generate(
      'You are a dependency management expert. Map dependencies, identify conflicts and vulnerabilities, and suggest upgrade paths.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Dependency mapping complete' });
    return { success: true, skill: 'tool.dependency-mapper', category: 'analysis', response };
  },
});

// ─── Planning Category ──────────────────────────────────────────────────

export const taskDecomposerTool = new Tool({
  id: 'tool.task-decomposer',
  name: 'Task Decomposer',
  description: 'Breaks complex tasks into manageable subtasks with dependencies, priorities, effort estimates, and acceptance criteria.',
  prompt: `You are a project planning expert. Break down the provided complex task into:
1. Clear, actionable subtasks
2. Dependency relationships between tasks
3. Priority ordering
4. Effort estimates (time/complexity)
5. Acceptance criteria for each subtask
6. Risk factors and mitigation strategies
Return a structured task breakdown with a recommended execution order.`,
  keywords: ['plan', 'task', 'decompose', 'breakdown', 'project', 'milestone', 'roadmap', 'sprint'],
  metadata: {
    category: 'planning',
    version: '1.0.0',
    tags: ['task-planning', 'project-management', 'decomposition'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'analyze', current: 1, total: 3, message: 'Analyzing task complexity' });
    const userPrompt = formatInput(input, 'task planning');
    runtime?.reportProgress({ phase: 'decompose', current: 2, total: 3, message: 'Decomposing into subtasks' });
    const response = await llm.generate(
      'You are a project planning expert. Break the complex task into actionable subtasks with dependencies, priorities, effort estimates, and acceptance criteria.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Task decomposition complete' });
    return { success: true, skill: 'tool.task-decomposer', category: 'planning', response };
  },
});

// ─── Debugging Category ─────────────────────────────────────────────────

export const errorDiagnosticianTool = new Tool({
  id: 'tool.error-diagnostician',
  name: 'Error Diagnostician',
  description: 'Diagnoses errors, exceptions, and unexpected behavior by analyzing stack traces, logs, and code context to identify root causes and fixes.',
  prompt: `You are a debugging expert. Analyze the provided error, stack trace, or unexpected behavior and:
1. Identify the root cause
2. Explain the error chain and propagation
3. Provide specific fix recommendations
4. Suggest preventive measures
5. Identify related issues that might exist
Return a diagnostic report with root cause analysis and resolution steps.`,
  keywords: ['debug', 'error', 'exception', 'fix', 'diagnose', 'troubleshoot', 'stacktrace', 'bug'],
  metadata: {
    category: 'debugging',
    version: '1.0.0',
    tags: ['debugging', 'error-diagnosis', 'troubleshooting'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'analyze', current: 1, total: 3, message: 'Analyzing error context' });
    const userPrompt = formatInput(input, 'error diagnosis');
    runtime?.reportProgress({ phase: 'diagnose', current: 2, total: 3, message: 'Diagnosing root cause' });
    const response = await llm.generate(
      'You are a debugging expert. Analyze the error, identify the root cause, explain the error chain, and provide specific fix recommendations and preventive measures.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Diagnosis complete' });
    return { success: true, skill: 'tool.error-diagnostician', category: 'debugging', response };
  },
});

// ─── Architecture Category ──────────────────────────────────────────────

export const architectureReviewerTool = new Tool({
  id: 'tool.architecture-reviewer',
  name: 'Architecture Reviewer',
  description: 'Reviews system architecture decisions including scalability, maintainability, security boundaries, and technology choices.',
  prompt: `You are a systems architect. Review the provided architecture and evaluate:
1. Scalability and performance characteristics
2. Maintainability and modularity
3. Security boundaries and trust zones
4. Technology stack fitness
5. Failure modes and resilience
6. Operational complexity and observability
Return an architecture review with ratings, risks, and improvement recommendations.`,
  keywords: ['architecture', 'design', 'system', 'scale', 'monolith', 'microservice', 'infrastructure'],
  metadata: {
    category: 'architecture',
    version: '1.0.0',
    tags: ['architecture-review', 'system-design', 'scalability'],
  },
  run: async (input, llm, runtime) => {
    runtime?.reportProgress({ phase: 'review', current: 1, total: 3, message: 'Reviewing architecture' });
    const userPrompt = formatInput(input, 'architecture review');
    runtime?.reportProgress({ phase: 'generate', current: 2, total: 3, message: 'Generating review report' });
    const response = await llm.generate(
      'You are a systems architect. Review the architecture for scalability, maintainability, security, resilience, and operational concerns. Return a detailed evaluation.',
      userPrompt,
      { runtime }
    );
    runtime?.reportProgress({ phase: 'complete', current: 3, total: 3, message: 'Architecture review complete' });
    return { success: true, skill: 'tool.architecture-reviewer', category: 'architecture', response };
  },
});

// ─── Export All ──────────────────────────────────────────────────────────

export const allProductionTools = [
  dataAnalyzerTool,
  schemaValidatorTool,
  securityAuditorTool,
  complianceCheckerTool,
  testGeneratorTool,
  refactoringAssistantTool,
  contentWriterTool,
  translatorTool,
  deployPlannerTool,
  apiDocumenterTool,
  performanceProfilerTool,
  dependencyMapperTool,
  taskDecomposerTool,
  errorDiagnosticianTool,
  architectureReviewerTool,
];

// ─── Helpers ────────────────────────────────────────────────────────────

function formatInput(input, context) {
  if (typeof input === 'string') {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return `Apply ${context} capabilities to the current task.`;
  }

  const parts = [];

  if (input.task) parts.push(`Task: ${input.task}`);
  if (input.text) parts.push(`Input: ${input.text}`);
  if (input.goal) parts.push(`Goal: ${input.goal}`);
  if (input.objective) parts.push(`Objective: ${input.objective}`);
  if (input.requirements) parts.push(`Requirements: ${input.requirements}`);
  if (input.specification) parts.push(`Specification: ${input.specification}`);
  if (input.previousOutput) {
    const prev = typeof input.previousOutput === 'string'
      ? input.previousOutput
      : JSON.stringify(input.previousOutput, null, 2);
    parts.push(`Previous output:\n${prev}`);
  }
  if (input.constraints && Array.isArray(input.constraints) && input.constraints.length > 0) {
    parts.push(`Constraints: ${input.constraints.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : JSON.stringify(input, null, 2);
}
