import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Tool } from '../../types/Tool.js';
import { parseMarkdownSkillFile } from '../parser/MarkdownSkillParser.js';
import { normalizeParsedSkill } from '../normalization/SkillNormalizer.js';
import { parseCatalogMarkdown, isCatalogMarkdown } from '../catalog/CatalogSkillParser.js';
import { buildCatalogSkillRegistry } from '../catalog/CatalogSkillEnhancer.js';
import { validateNormalizedSkill } from '../validation/SkillValidator.js';

const FLOWFEX_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024;
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.github',
  '.flowfex',
  '.cache',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  '__pycache__',
  '.venv',
  'venv',
  '.tox'
]);
const IGNORED_FILES = new Set(['license.md', 'contributing.md', 'changelog.md', 'code_of_conduct.md', 'fix_summary.md']);

export const DEFAULT_MARKDOWN_SKILL_SOURCES = discoverMarkdownSkillSources(FLOWFEX_ROOT);

const SKILL_SOURCE_NAME_PATTERN = /(skill|skills|agent|agents|llm|rag|mcp|voice|memory|chat|tutorial|awesome|ai)/i;
const SKILL_SOURCE_CONTENT_PATTERN = /(table of contents|skills count|awesome agent skills|awesome llm apps|multi-agent|agent skill|agentic|slash command|use when|instructions|workflow|tutorial|rag|mcp|voice|memory)/i;

export function discoverMarkdownSkillSources(rootDirectory = FLOWFEX_ROOT, options = {}) {
  const resolvedRoot = resolveSourceDirectory(rootDirectory, FLOWFEX_ROOT);
  const maxDiscoveryDepth = Math.max(0, Number(options.maxDiscoveryDepth) || 1);
  const minMarkdownFiles = Math.max(1, Number(options.minMarkdownFiles) || 5);
  const sources = [];
  const seenDirectories = new Set();

  addSourceCandidate(sources, seenDirectories, path.join(resolvedRoot, 'skills-md'), {
    name: 'local-skills-md',
    trustLevel: 'trusted',
    priority: 0
  });

  addSourceCandidate(sources, seenDirectories, path.join(resolvedRoot, 'awesome-agent-skills'), {
    name: 'imported-skill-source',
    trustLevel: 'unverified',
    priority: 10
  });

  addSourceCandidate(sources, seenDirectories, path.join(resolvedRoot, 'awesome-llm-apps', 'awesome_agent_skills'), {
    name: 'awesome-llm-apps-skills',
    trustLevel: 'unverified',
    priority: 20
  });

  addSourceCandidate(sources, seenDirectories, path.join(resolvedRoot, 'awesome-llm-apps'), {
    name: 'awesome-llm-apps',
    trustLevel: 'unverified',
    priority: 30
  });

  if (isLikelyMarkdownSkillSource(resolvedRoot, { minMarkdownFiles })) {
    addSourceCandidate(sources, seenDirectories, resolvedRoot, {
      trustLevel: resolveSourceTrustLevel(resolvedRoot),
      priority: 5
    });
  }

  for (const entry of fs.readdirSync(resolvedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const directory = path.join(resolvedRoot, entry.name);
    if (seenDirectories.has(resolveCanonicalPath(directory))) {
      continue;
    }

    if (!isLikelyMarkdownSkillSource(directory, { minMarkdownFiles, maxDiscoveryDepth })) {
      continue;
    }

    addSourceCandidate(sources, seenDirectories, directory, {
      trustLevel: resolveSourceTrustLevel(directory),
      priority: 100
    });
  }

  return sources
    .sort((left, right) => {
      const priorityDelta = left.priority - right.priority;
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.directory.localeCompare(right.directory);
    })
    .map(({ priority, ...source }) => source);
}

function addSourceCandidate(sources, seenDirectories, directory, overrides = {}) {
  const resolvedDirectory = resolveSourceDirectory(directory, FLOWFEX_ROOT);
  const canonicalDirectory = resolveCanonicalPath(resolvedDirectory);

  if (seenDirectories.has(canonicalDirectory) || !fs.existsSync(resolvedDirectory)) {
    return;
  }

  const stat = fs.statSync(resolvedDirectory);
  if (!stat.isDirectory()) {
    return;
  }

  seenDirectories.add(canonicalDirectory);
  sources.push({
    name: overrides.name || inferSourceName(resolvedDirectory),
    directory: resolvedDirectory,
    trustLevel: overrides.trustLevel || resolveSourceTrustLevel(resolvedDirectory),
    priority: overrides.priority ?? 100
  });
}

function isLikelyMarkdownSkillSource(directory, options = {}) {
  if (!directory || !fs.existsSync(directory)) {
    return false;
  }

  const stat = fs.statSync(directory);
  if (!stat.isDirectory()) {
    return false;
  }

  const markdownFiles = discoverMarkdownFiles(directory);
  if (markdownFiles.length === 0) {
    return false;
  }

  const minMarkdownFiles = Math.max(1, Number(options.minMarkdownFiles) || 5);
  const lowerDirectory = directory.toLowerCase().replace(/\\/g, '/');
  const baseName = path.basename(directory).toLowerCase();
  const skillNameMatch = SKILL_SOURCE_NAME_PATTERN.test(baseName) || SKILL_SOURCE_NAME_PATTERN.test(lowerDirectory);

  if (skillNameMatch) {
    return true;
  }

  const readmePath = markdownFiles.find(filePath => /(^|\/)readme\.md$/i.test(filePath) || /(^|\/)README\.md$/.test(filePath));
  if (readmePath) {
    try {
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      if (SKILL_SOURCE_CONTENT_PATTERN.test(readmeContent)) {
        return true;
      }
    } catch {
      // Ignore read errors during discovery. Processing will surface them later.
    }
  }

  if (markdownFiles.length >= minMarkdownFiles && /\b(skill|agent|llm|rag|mcp|voice|memory|chat|tutorial|ai)\b/i.test(lowerDirectory)) {
    return true;
  }

  return markdownFiles.length === 1 && Boolean(readmePath) && SKILL_SOURCE_CONTENT_PATTERN.test(fs.readFileSync(readmePath, 'utf8'));
}

function inferSourceName(directory) {
  const normalized = resolveSourceDirectory(directory, FLOWFEX_ROOT);
  const baseName = path.basename(normalized);
  return baseName || 'markdown-source';
}

function resolveSourceDirectory(directory, baseDirectory = FLOWFEX_ROOT) {
  if (!directory) {
    return baseDirectory;
  }

  return path.isAbsolute(directory) ? path.resolve(directory) : path.resolve(baseDirectory, directory);
}

function resolveSourceTrustLevel(directory) {
  const normalized = resolveSourceDirectory(directory, FLOWFEX_ROOT).toLowerCase().replace(/\\/g, '/');
  return normalized.includes('/skills-md') ? 'trusted' : 'unverified';
}

export function discoverMarkdownFiles(rootDirectory) {
  if (!rootDirectory || !fs.existsSync(rootDirectory)) {
    return [];
  }

  const discoveredFiles = [];
  const pendingDirectories = [rootDirectory];

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop();
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          pendingDirectories.push(absolutePath);
        }
        continue;
      }

      if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
        discoveredFiles.push(absolutePath);
      }
    }
  }

  return discoveredFiles.sort();
}

export function classifyMarkdownFile(filePath, content) {
  const lowerFileName = path.basename(filePath).toLowerCase();

  if (IGNORED_FILES.has(lowerFileName)) {
    return 'ignore';
  }

  if (isCatalogMarkdown(filePath, content)) {
    return 'catalog_markdown';
  }

  if (!isLikelySkillMarkdown(filePath, content)) {
    return 'ignore';
  }

  if (looksLikeCommandMarkdown(filePath, content)) {
    return 'command_markdown';
  }

  if (looksLikeAgentDefinition(filePath, content)) {
    return 'agent_definition';
  }

  return 'skill_markdown';
}

export function loadMarkdownSkills(options = {}) {
  const sources = resolveSources(options);
  const settings = resolveLoaderSettings(options);
  const inventory = sources.map(source => ({
    source,
    files: discoverMarkdownFiles(source.directory)
  }));

  // Deduplicate files across sources by absolute path.
  // When sources overlap (e.g. awesome-llm-apps/awesome_agent_skills is both
  // its own source AND a subtree of awesome-llm-apps), each physical file
  // should only be processed once — by the first source that discovers it.
  const processedAbsolutePaths = new Set();
  for (const entry of inventory) {
    entry.files = entry.files.filter(filePath => {
      const canonicalPath = resolveCanonicalPath(filePath);
      if (processedAbsolutePaths.has(canonicalPath)) {
        return false;
      }
      processedAbsolutePaths.add(canonicalPath);
      return true;
    });
  }

  const localSkillIndex = buildLocalSkillIndex(inventory);
  const report = {
    sources: [],
    loadedTools: [],
    blockedSkills: [],
    skippedFiles: [],
    failedFiles: [],
    catalogs: [],
    catalogEntries: [],
    catalogRegistry: {
      byProvider: {},
      byCategory: {},
      byComplexity: {},
      bySourceType: {},
      withLocalMatch: { linked: 0, catalogOnly: 0 },
      all: 0
    },
    validationLog: [],
    duplicateSkills: [],
    indexes: {},
    stats: {},
    processing: {
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationMs: 0,
      chunkSize: settings.chunkSize,
      continueOnError: settings.continueOnError,
      maxFileSizeBytes: settings.maxFileSizeBytes
    }
  };

  const seenIds = new Map();
  const seenHashes = new Map();
  const startTime = Date.now();

  for (const { source, files } of inventory) {
    const sourceStart = Date.now();
    const sourceSummary = {
      name: source.name,
      directory: source.directory,
      trustLevel: source.trustLevel,
      discoveredMarkdownFiles: files.length,
      processedFiles: 0,
      loadedTools: 0,
      blockedSkills: 0,
      skippedFiles: 0,
      failedFiles: 0,
      catalogFiles: 0,
      catalogEntries: 0,
      chunkCount: 0,
      durationMs: 0,
      classifications: {
        catalog_markdown: 0,
        skill_markdown: 0,
        command_markdown: 0,
        agent_definition: 0,
        ignore: 0
      }
    };

    for (const chunk of chunkArray(files, settings.chunkSize)) {
      sourceSummary.chunkCount++;

      for (const filePath of chunk) {
        sourceSummary.processedFiles++;

        try {
          processMarkdownFile({
            filePath,
            source,
            sourceSummary,
            settings,
            report,
            seenIds,
            seenHashes,
            localSkillIndex
          });
        } catch (error) {
          sourceSummary.failedFiles++;
          report.failedFiles.push({
            source: source.name,
            filePath,
            reason: 'processing-error',
            error: {
              message: error.message,
              type: error.constructor.name
            }
          });

          if (!settings.continueOnError) {
            throw error;
          }
        }
      }
    }

    sourceSummary.durationMs = Date.now() - sourceStart;
    report.sources.push(sourceSummary);
  }

  report.catalogRegistry = buildCatalogSkillRegistry(report.catalogEntries);
  report.indexes = buildReportIndexes(report);
  report.processing.finishedAt = new Date().toISOString();
  report.processing.durationMs = Date.now() - startTime;
  report.stats = buildLoadStats(report);

  return report;
}

export function registerMarkdownSkills(registry, options = {}) {
  const report = loadMarkdownSkills(options);
  const registeredTools = [];
  const skippedDuplicates = [];

  for (const entry of report.loadedTools) {
    if (registry.getTool(entry.tool.id)) {
      skippedDuplicates.push({
        id: entry.tool.id,
        filePath: entry.filePath,
        reason: 'duplicate-registry-entry'
      });
      continue;
    }

    registry.registerTool(entry.tool);
    registeredTools.push(entry.tool.id);
  }

  return {
    ...report,
    registeredTools,
    skippedDuplicates,
    stats: {
      ...report.stats,
      registeredTools: registeredTools.length,
      skippedRegistryDuplicates: skippedDuplicates.length
    }
  };
}

export function logSkillRegistrationReport(report, logger = console) {
  const totalLoaded = report.registeredTools?.length ?? report.loadedTools.length;
  const totalBlocked = report.blockedSkills.length;
  const totalCatalogEntries = report.catalogEntries.length;
  const totalErrors = report.failedFiles?.length || 0;
  const durationMs = report.processing?.durationMs || 0;

  logger.info(
    `[Flowfex] Markdown skill ingestion loaded ${totalLoaded} tools, blocked ${totalBlocked}, discovered ${totalCatalogEntries} catalog entries in ${durationMs}ms.`
  );

  if (report.duplicateSkills?.length > 0) {
    logger.warn(`[Flowfex] Duplicate skill candidates detected: ${report.duplicateSkills.length}`);
  }

  if (totalBlocked > 0) {
    const blockedPreview = report.blockedSkills
      .slice(0, 5)
      .map(entry => `${entry.normalizedSkill.id} (${entry.validation.findings.map(finding => finding.type).join(', ')})`)
      .join('; ');

    logger.warn(`[Flowfex] Blocked markdown skills: ${blockedPreview}`);
  }

  if (totalErrors > 0) {
    const failedPreview = report.failedFiles
      .slice(0, 5)
      .map(entry => `${entry.filePath}: ${entry.error.message}`)
      .join('; ');

    logger.warn(`[Flowfex] Processing errors: ${failedPreview}`);
  }
}

function processMarkdownFile({
  filePath,
  source,
  sourceSummary,
  settings,
  report,
  seenIds,
  seenHashes,
  localSkillIndex
}) {
  const lowerFileName = path.basename(filePath).toLowerCase();
  const stat = fs.statSync(filePath);

  let content = fs.readFileSync(filePath, 'utf8');

  const classification = classifyMarkdownFile(filePath, content);
  sourceSummary.classifications[classification] = (sourceSummary.classifications[classification] || 0) + 1;

  if (classification === 'catalog_markdown') {
    const catalog = parseCatalogMarkdown({ filePath, content, localSkillIndex });
    report.catalogs.push(catalog);
    report.catalogEntries.push(...catalog.entries);
    sourceSummary.catalogFiles++;
    sourceSummary.catalogEntries += catalog.entryCount;
    return;
  }

  if (classification === 'ignore') {
    sourceSummary.skippedFiles++;
    report.skippedFiles.push({
      filePath,
      reason: IGNORED_FILES.has(lowerFileName) ? 'ignored-document' : 'not-a-skill',
      classification
    });
    return;
  }

  const relativePath = path.relative(source.directory, filePath) || path.basename(filePath);
  const parsedSkill = parseMarkdownSkillFile({ filePath, content });
  const normalizedSkill = normalizeParsedSkill(parsedSkill, {
    relativePath,
    classification,
    fileSizeBytes: stat.size
  });
  const validation = validateNormalizedSkill(normalizedSkill, {
    seenIds,
    seenHashes,
    sourceTrustLevel: source.trustLevel,
    fileSizeBytes: stat.size,
    maxFileSizeBytes: settings.maxFileSizeBytes
  });
  const record = {
    source: source.name,
    filePath,
    relativePath,
    classification,
    sourceSizeBytes: stat.size,
    normalizedSkill,
    validation
  };

  report.validationLog.push({
    id: normalizedSkill.id,
    filePath,
    classification,
    validationStatus: validation.validationStatus,
    trustLevel: validation.trustLevel,
    qualityScore: validation.qualityScore,
    sourceSizeBytes: stat.size,
    findings: validation.findings
  });

  if (!seenIds.has(normalizedSkill.id)) {
    seenIds.set(normalizedSkill.id, {
      filePath,
      source: source.name
    });
  }

  if (!seenHashes.has(normalizedSkill.contentHash)) {
    seenHashes.set(normalizedSkill.contentHash, {
      filePath,
      source: source.name
    });
  }

  if (validation.findings.some(finding => finding.type === 'duplicate-id' || finding.type === 'duplicate-content')) {
    report.duplicateSkills.push({
      id: normalizedSkill.id,
      filePath,
      findings: validation.findings.filter(finding =>
        finding.type === 'duplicate-id' || finding.type === 'duplicate-content'
      )
    });
  }

  if (!validation.allowed) {
    sourceSummary.blockedSkills++;
    report.blockedSkills.push(record);
    return;
  }

  const tool = createMarkdownSkillTool(record);
  sourceSummary.loadedTools++;
  report.loadedTools.push({
    ...record,
    tool
  });
}

function createMarkdownSkillTool(record) {
  const { normalizedSkill, validation, filePath, source, classification } = record;

  // Safety fallbacks for required Tool fields — edge-case files with heavy HTML
  // preambles or emoji-only content can produce empty strings after cleaning.
  const safeDescription = normalizedSkill.description?.trim()
    || `${normalizedSkill.name || normalizedSkill.id} — imported Flowfex skill.`;
  const safePrompt = validation.sanitizedPrompt?.trim()
    || `You are executing the Flowfex skill "${normalizedSkill.name || normalizedSkill.id}". Follow the user's instructions and produce practical output.`;

  return new Tool({
    id: normalizedSkill.id,
    name: normalizedSkill.name || normalizedSkill.id,
    description: safeDescription,
    prompt: safePrompt,
    keywords: normalizedSkill.keywords,
    metadata: {
      category: normalizedSkill.category,
      version: '1.0.0',
      tags: normalizedSkill.tags,
      source: source.name,
      sourceDirectory: source.directory,
      sourceTrustLevel: source.trustLevel,
      sourcePath: filePath,
      sourceType: normalizedSkill.normalizedSourceType,
      sourceClassification: classification,
      trustLevel: validation.trustLevel,
      validationStatus: validation.validationStatus,
      qualityScore: validation.qualityScore,
      sourceSizeBytes: normalizedSkill.sourceSizeBytes,
      imported: true,
      contentHash: normalizedSkill.contentHash,
      sections: normalizedSkill.sections.map(section => section.title),
      executable: validation.executable === true,
    },
    run: async (input, llm, runtime) => {
      if (validation.executable !== true) {
        throw new Error(`Skill '${normalizedSkill.id}' is not approved for execution`);
      }

      if (!llm || typeof llm.generate !== 'function') {
        throw new Error(`Skill '${normalizedSkill.id}' requires an LLM instance with a generate() method`);
      }

      runtime?.reportProgress({
        phase: 'prepare',
        current: 1,
        total: 3,
        message: `Preparing imported skill ${normalizedSkill.id}`
      });
      const userPrompt = formatExecutionInput(input);
      runtime?.reportProgress({
        phase: 'generate',
        current: 2,
        total: 3,
        message: `Executing imported skill ${normalizedSkill.id}`
      });
      const response = await llm.generate(validation.sanitizedPrompt, userPrompt, { runtime });
      runtime?.reportProgress({
        phase: 'finalize',
        current: 3,
        total: 3,
        message: `Finalized imported skill ${normalizedSkill.id}`
      });

      return {
        success: true,
        skill: normalizedSkill.id,
        category: normalizedSkill.category,
        source: filePath,
        validation: validation.validationStatus,
        response
      };
    }
  });
}

function resolveSources(options = {}) {
  if (Array.isArray(options.sources) && options.sources.length > 0) {
    return options.sources;
  }

  if (Array.isArray(options.sourceDirs) && options.sourceDirs.length > 0) {
    return options.sourceDirs.map(directory => ({
      name: path.basename(directory) || 'markdown-source',
      directory,
      trustLevel: directory.includes(`${path.sep}skills-md`) ? 'trusted' : 'unverified'
    }));
  }

  return DEFAULT_MARKDOWN_SKILL_SOURCES;
}

function resolveLoaderSettings(options = {}) {
  return {
    chunkSize: Math.max(1, Number(options.chunkSize) || DEFAULT_CHUNK_SIZE),
    continueOnError: options.continueOnError !== false,
    maxFileSizeBytes: Math.max(1024, Number(options.maxFileSizeBytes) || DEFAULT_MAX_FILE_SIZE_BYTES)
  };
}

function formatExecutionInput(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (!input || typeof input === 'undefined') {
    return 'Apply the imported skill to the current task.';
  }

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function isLikelySkillMarkdown(filePath, content) {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
  let score = 0;

  // Direct skill file names
  if (path.basename(filePath) === 'SKILL.md' || path.basename(filePath) === 'AGENTS.md') {
    score += 3;
  }

  // In a known skills/commands/agents directory
  if (/(^|\/)(skills|commands|agents)\//i.test(normalizedPath)) {
    score += 2;
  }

  // Boost for files inside known AI/LLM app directories — comprehensive coverage
  if (/(^|\/)(awesome[-_]llm[-_]apps|awesome[-_]agent[-_]skills|advanced[-_]ai[-_]agents|starter[-_]ai[-_]agents|rag[-_]tutorials|mcp[-_]ai[-_]agents|voice[-_]ai[-_]agents|advanced[-_]llm[-_]apps|ai[-_]agent[-_]framework)\//i.test(normalizedPath)) {
    score += 2;
  }

  // Additional directory-level boosts for all categories
  if (/(^|\/)(chat[-_]with[-_]x[-_]tutorials|llm[-_]apps[-_]with[-_]memory[-_]tutorials|llm[-_]finetuning[-_]tutorials|llm[-_]optimization[-_]tools|multi[-_]agent|game[-_]agents|cursor[-_]ai[-_]experiments)\//i.test(normalizedPath)) {
    score += 2;
  }

  // Specific sub-directories containing agents/apps
  if (/(^|\/)(chat[-_]with[-_](github|gmail|pdf|substack|research|youtube|tarots)|ai[-_](blog|breakup|data|medical|meme|music|travel|consultant|finance|fraud|health|investment|journalist|meeting|mental|product|sales|self|social|system|movie|recruitment|teaching|legal|real[-_]estate|competitor)|multimodal[-_](ai|coding|design|video|ui)|web[-_]scraping|openai[-_]research|mixture[-_]of[-_]agents|xai[-_]finance|deepseek|llama|gemini|gemma|corrective[-_]rag|agentic[-_]rag|autonomous[-_]rag|hybrid[-_]search|knowledge[-_]graph|rag[-_]diagnostics|rag[-_]as[-_]a[-_]service|trust[-_]gated|openwork|browser[-_]mcp|github[-_]mcp|notion[-_]mcp|multi[-_]mcp)\//i.test(normalizedPath)) {
    score += 2;
  }

  // Has a heading
  if (/^#\s+/m.test(content)) {
    score += 1;
  }

  // Has instruction-like sections
  if (/(^|\n)##?\s+(instructions|steps|workflow|when to use|use when|guidelines|rules|best practices|approach|checklist|command|features|how to get started|how to use|quick start|getting started|setup|usage|prerequisites|overview|run|architecture|configuration)/i.test(content)) {
    score += 2;
  }

  // Has frontmatter
  if (/^---\n[\s\S]*?\n---/m.test(content)) {
    score += 1;
  }

  // AI/LLM-specific content signals
  if (/\b(agent|llm|rag|openai|anthropic|gemini|langchain|phidata|crewai|streamlit|api[_\s-]?key|requirements\.txt|pip install)\b/i.test(content)) {
    score += 1;
  }

  // Python/app content signals — these are real agent implementations
  if (/\b(import\s+(streamlit|phi|crewai|langchain|openai|google)|def\s+\w+|class\s+\w+|app\.py|main\.py)\b/i.test(content)) {
    score += 1;
  }

  // Framework crash course signals
  if (/\b(crash[\s_-]?course|tutorial|lesson|chapter|module|exercise|hands[\s_-]?on)\b/i.test(content)) {
    score += 1;
  }

  // Memory/conversation signals
  if (/\b(memory|conversation|chat[\s_-]?history|stateful|session|personalized)\b/i.test(content)) {
    score += 1;
  }

  // Negative signals — pure curation/meta documents
  if (/curates links only|adding a skill|contributing to/i.test(content)) {
    score -= 3;
  }

  // Lower threshold for files inside known AI source repos —
  // EVERY README.md in those repos is a valid agent/skill/tutorial.
  const isInAIRepo = /(awesome[-_]llm[-_]apps|awesome[-_]agent[-_]skills)\//i.test(normalizedPath);
  return score >= (isInAIRepo ? 1 : 3);
}

function looksLikeCommandMarkdown(filePath, content) {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

  return (
    normalizedPath.includes('/commands/')
    || /^#\s*\/[a-z0-9-]+/im.test(content)
  );
}

function looksLikeAgentDefinition(filePath, content) {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
  const baseName = path.basename(filePath);

  return (
    baseName === 'AGENTS.md'
    || normalizedPath.includes('/agents/')
    || /(^|\n)##?\s+(role|responsibilities|handoff|operating rules|mission)\b/i.test(content)
    || /\bagent\b/i.test(baseName)
    || /(multi[_-]?agent|agent[_-]?team|agent[_-]?apps|advanced[_-]?ai[_-]?agents|starter[_-]?ai[_-]?agents)\//i.test(normalizedPath)
  );
}

function buildLocalSkillIndex(inventory) {
  const index = new Map();

  for (const { source, files } of inventory) {
    for (const filePath of files) {
      const relativePath = path.relative(source.directory, filePath).replace(/\\/g, '/');
      const normalizedRelativePath = normalizeLookupKey(relativePath);
      const basename = normalizeLookupKey(path.basename(filePath, path.extname(filePath)));
      const shortPath = normalizeLookupKey(relativePath.split('/').slice(-2).join('/'));
      const record = {
        source: source.name,
        filePath,
        relativePath
      };

      for (const key of new Set([normalizedRelativePath, basename, shortPath])) {
        if (!key) {
          continue;
        }

        if (!index.has(key)) {
          index.set(key, []);
        }

        index.get(key).push(record);
      }
    }
  }

  return index;
}

function buildReportIndexes(report) {
  const indexes = {
    byCategory: {},
    bySourceType: {},
    byTag: {},
    byTrustLevel: {},
    byValidationStatus: {},
    catalogByProvider: report.catalogRegistry.byProvider,
    catalogByCategory: report.catalogRegistry.byCategory
  };

  for (const entry of report.loadedTools) {
    indexValue(indexes.byCategory, entry.normalizedSkill.category, entry.normalizedSkill.id);
    indexValue(indexes.bySourceType, entry.normalizedSkill.normalizedSourceType, entry.normalizedSkill.id);
    indexValue(indexes.byTrustLevel, entry.validation.trustLevel, entry.normalizedSkill.id);
    indexValue(indexes.byValidationStatus, entry.validation.validationStatus, entry.normalizedSkill.id);

    for (const tag of entry.normalizedSkill.tags) {
      indexValue(indexes.byTag, tag, entry.normalizedSkill.id);
    }
  }

  return indexes;
}

function buildLoadStats(report) {
  return {
    totalSources: report.sources.length,
    totalMarkdownFiles: report.sources.reduce((sum, source) => sum + source.discoveredMarkdownFiles, 0),
    totalLoadedTools: report.loadedTools.length,
    totalBlockedSkills: report.blockedSkills.length,
    totalSkippedFiles: report.skippedFiles.length,
    totalFailedFiles: report.failedFiles.length,
    totalCatalogFiles: report.catalogs.length,
    totalCatalogEntries: report.catalogEntries.length,
    totalDuplicateSkills: report.duplicateSkills.length,
    processingDurationMs: report.processing.durationMs,
    blockedByReason: countFindings(report.blockedSkills),
    loadedByCategory: countBy(report.loadedTools, entry => entry.normalizedSkill.category),
    loadedBySourceType: countBy(report.loadedTools, entry => entry.normalizedSkill.normalizedSourceType),
    loadedByTrustLevel: countBy(report.loadedTools, entry => entry.validation.trustLevel),
    loadedByValidationStatus: countBy(report.loadedTools, entry => entry.validation.validationStatus),
    catalogByProvider: countBy(report.catalogEntries, entry => entry.provider),
    catalogByCategory: countBy(report.catalogEntries, entry => entry.category),
    catalogLocalMatches: report.catalogEntries.filter(entry => entry.hasLocalMatch).length,
    catalogOnlyReferences: report.catalogEntries.filter(entry => !entry.hasLocalMatch).length
  };
}

function chunkArray(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function normalizeLookupKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\.md$/i, '')
    .replace(/\/(skill|readme)$/i, '')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '');
}

function countFindings(entries) {
  const counts = {};

  for (const entry of entries) {
    for (const finding of entry.validation.findings) {
      counts[finding.type] = (counts[finding.type] || 0) + 1;
    }
  }

  return counts;
}

function countBy(items, keyFn) {
  const counts = {};

  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

function indexValue(index, key, id) {
  if (!key) {
    return;
  }

  if (!index[key]) {
    index[key] = [];
  }

  index[key].push(id);
}

function resolveCanonicalPath(filePath) {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}
