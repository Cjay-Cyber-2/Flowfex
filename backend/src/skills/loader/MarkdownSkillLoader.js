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

export const DEFAULT_MARKDOWN_SKILL_SOURCES = [
  {
    name: 'local-skills-md',
    directory: path.join(FLOWFEX_ROOT, 'skills-md'),
    trustLevel: 'trusted'
  },
  {
    name: 'imported-skill-source',
    directory: path.join(FLOWFEX_ROOT, 'awesome-agent-skills'),
    trustLevel: 'unverified'
  }
];

const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024;
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules']);
const IGNORED_FILES = new Set(['license.md', 'contributing.md']);

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

  if (stat.size > settings.maxFileSizeBytes) {
    sourceSummary.skippedFiles++;
    sourceSummary.classifications.ignore++;
    report.skippedFiles.push({
      filePath,
      reason: 'file-too-large',
      sizeBytes: stat.size
    });
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
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
    classification
  });
  const validation = validateNormalizedSkill(normalizedSkill, {
    seenIds,
    seenHashes,
    sourceTrustLevel: source.trustLevel
  });
  const record = {
    source: source.name,
    filePath,
    relativePath,
    classification,
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

  return new Tool({
    id: normalizedSkill.id,
    name: normalizedSkill.name,
    description: normalizedSkill.description,
    prompt: validation.sanitizedPrompt,
    keywords: normalizedSkill.keywords,
    metadata: {
      category: normalizedSkill.category,
      version: '1.0.0',
      tags: normalizedSkill.tags,
      source,
      sourcePath: filePath,
      sourceType: normalizedSkill.normalizedSourceType,
      sourceClassification: classification,
      trustLevel: validation.trustLevel,
      validationStatus: validation.validationStatus,
      qualityScore: validation.qualityScore,
      imported: true,
      contentHash: normalizedSkill.contentHash,
      sections: normalizedSkill.sections.map(section => section.title)
    },
    run: async (input, llm, runtime) => {
      if (validation.validationStatus !== 'approved') {
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

  if (path.basename(filePath) === 'SKILL.md' || path.basename(filePath) === 'AGENTS.md') {
    score += 3;
  }

  if (/(^|\/)(skills|commands|agents)\//i.test(normalizedPath)) {
    score += 2;
  }

  if (/^#\s+/m.test(content)) {
    score += 1;
  }

  if (/(^|\n)##?\s+(instructions|steps|workflow|when to use|use when|guidelines|rules|best practices|approach|checklist|command)/i.test(content)) {
    score += 2;
  }

  if (/^---\n[\s\S]*?\n---/m.test(content)) {
    score += 1;
  }

  if (/curates links only|adding a skill|contributing to/i.test(content)) {
    score -= 3;
  }

  return score >= 3;
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

  return (
    normalizedPath.includes('/agents/')
    || /(^|\n)##?\s+(role|responsibilities|handoff|operating rules|mission)\b/i.test(content)
    || /\bagent\b/i.test(path.basename(filePath))
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
    catalogByProvider: report.catalogRegistry.byProvider,
    catalogByCategory: report.catalogRegistry.byCategory
  };

  for (const entry of report.loadedTools) {
    indexValue(indexes.byCategory, entry.normalizedSkill.category, entry.normalizedSkill.id);
    indexValue(indexes.bySourceType, entry.normalizedSkill.normalizedSourceType, entry.normalizedSkill.id);
    indexValue(indexes.byTrustLevel, entry.validation.trustLevel, entry.normalizedSkill.id);

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
