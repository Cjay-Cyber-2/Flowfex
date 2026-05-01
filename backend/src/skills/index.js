export {
  DEFAULT_MARKDOWN_SKILL_SOURCES,
  discoverMarkdownFiles,
  classifyMarkdownFile
} from './loader/MarkdownSkillLoader.js';
export { parseMarkdownSkillFile } from './parser/MarkdownSkillParser.js';
export { normalizeParsedSkill } from './normalization/SkillNormalizer.js';
export { validateNormalizedSkill, sanitizePrompt } from './validation/SkillValidator.js';
export { parseCatalogMarkdown, isCatalogMarkdown } from './catalog/CatalogSkillParser.js';
export {
  buildCatalogSkillReference,
  buildCatalogSkillRegistry,
  extractCatalogPathMetadata,
  matchCatalogEntryToLocalSkills,
  inferProviderFromURL,
  inferCategoryFromTitle,
  inferComplexityLevel
} from './catalog/CatalogSkillEnhancer.js';

import {
  DEFAULT_MARKDOWN_SKILL_SOURCES,
  discoverMarkdownFiles,
  classifyMarkdownFile,
  loadMarkdownSkills as loadMarkdownSkillsInternal,
  registerMarkdownSkills as registerMarkdownSkillsInternal,
  logSkillRegistrationReport as logSkillRegistrationReportInternal
} from './loader/MarkdownSkillLoader.js';
import { parseMarkdownSkillFile } from './parser/MarkdownSkillParser.js';
import { normalizeParsedSkill } from './normalization/SkillNormalizer.js';
import { validateNormalizedSkill } from './validation/SkillValidator.js';
import { parseCatalogMarkdown, isCatalogMarkdown } from './catalog/CatalogSkillParser.js';

export const defaultMarkdownSkillParser = {
  parse: parseMarkdownSkillFile
};

export const defaultSkillNormalizer = {
  normalize: normalizeParsedSkill
};

export const defaultSkillValidator = {
  validate(skill, context) {
    const validation = validateNormalizedSkill(skill, context);
    return {
      ...validation,
      issues: validation.findings.map(toLegacyIssue)
    };
  }
};

export const defaultCatalogMarkdownParser = {
  parse: parseCatalogMarkdown,
  isCatalogMarkdown
};

export function getDefaultSkillSourceDirs() {
  return DEFAULT_MARKDOWN_SKILL_SOURCES.map(source => source.directory);
}

export function loadMarkdownSkills(options = {}) {
  const { registry, ...loaderOptions } = options;
  const report = registry
    ? registerMarkdownSkillsInternal(registry, loaderOptions)
    : loadMarkdownSkillsInternal(loaderOptions);

  return toLegacyReport(report);
}

export function registerMarkdownSkills(registry, options = {}) {
  return toLegacyReport(registerMarkdownSkillsInternal(registry, options));
}

export function logSkillRegistrationReport(report, logger = console) {
  logSkillRegistrationReportInternal(toInternalLogReport(report), logger);
}

export class MarkdownSkillLoader {
  constructor(config = {}) {
    this.registry = config.registry || null;
    this.logger = config.logger || console;
    this.options = {
      sources: config.sources,
      sourceDirs: config.sourceDirs,
      chunkSize: config.chunkSize,
      continueOnError: config.continueOnError,
      maxFileSizeBytes: config.maxFileSizeBytes
    };
  }

  async discoverFiles() {
    const sources = this._resolveSources();
    return sources.flatMap(source =>
      discoverMarkdownFiles(source.directory).map(filePath => ({
        source: source.name,
        filePath
      }))
    );
  }

  async loadSkills() {
    return this.registry
      ? registerMarkdownSkills(this.registry, this.options)
      : loadMarkdownSkills(this.options);
  }

  logReport(report) {
    logSkillRegistrationReport(report, this.logger);
  }

  _resolveSources() {
    return this.options.sources
      || (Array.isArray(this.options.sourceDirs) && this.options.sourceDirs.length > 0
        ? this.options.sourceDirs.map(directory => ({
            name: directory.split(/[\\/]/).pop() || 'markdown-source',
            directory,
            trustLevel: directory.includes('/skills-md') || directory.includes('\\skills-md')
              ? 'trusted'
              : 'unverified'
          }))
        : DEFAULT_MARKDOWN_SKILL_SOURCES);
  }
}

function toLegacyReport(report) {
  const issuesById = new Map(
    report.validationLog.map(entry => [
      entry.id,
      entry.findings.map(toLegacyIssue)
    ])
  );

  return {
    sources: report.sources,
    scannedFiles: report.sources.reduce((total, source) => total + source.discoveredMarkdownFiles, 0),
    loadedSkills: report.loadedTools.map(entry => ({
      ...entry.normalizedSkill,
      title: entry.normalizedSkill.name,
      trustLevel: entry.validation.trustLevel,
      validationStatus: entry.validation.validationStatus,
      qualityScore: entry.validation.qualityScore,
      classification: entry.classification,
      sourcePath: entry.filePath
    })),
    blockedSkills: report.blockedSkills.map(entry => ({
      ...entry.normalizedSkill,
      title: entry.normalizedSkill.name,
      trustLevel: entry.validation.trustLevel,
      validationStatus: entry.validation.validationStatus,
      qualityScore: entry.validation.qualityScore,
      classification: entry.classification,
      sourcePath: entry.filePath,
      issues: issuesById.get(entry.normalizedSkill.id) || []
    })),
    catalogFiles: report.catalogs,
    catalogReferences: report.catalogEntries.map(entry => ({
      title: entry.title || entry.name,
      description: entry.description,
      provider: entry.provider,
      category: entry.category,
      complexity: entry.complexity,
      language: entry.language,
      section: entry.section,
      subsection: entry.subsection,
      url: entry.url,
      sourceType: entry.sourceType,
      hasLocalMatch: entry.hasLocalMatch,
      localMatches: entry.localMatches || []
    })),
    ignoredFiles: report.skippedFiles,
    failedFiles: report.failedFiles || [],
    duplicateSkills: report.duplicateSkills || [],
    catalogIndex: report.catalogRegistry || {},
    indexes: report.indexes || {},
    stats: report.stats || {},
    processing: report.processing || {},
    validationLog: report.validationLog.map(entry => ({
      id: entry.id,
      classification: entry.classification,
      validationStatus: entry.validationStatus,
      trustLevel: entry.trustLevel,
      qualityScore: entry.qualityScore,
      issues: entry.findings.map(toLegacyIssue)
    })),
    registeredTools: report.registeredTools || [],
    skippedDuplicates: report.skippedDuplicates || []
  };
}

function toLegacyIssue(finding) {
  return {
    code: finding.type.replace(/-/g, '_'),
    severity: finding.severity,
    message: finding.message,
    evidence: finding.evidence
  };
}

function toInternalLogReport(report) {
  if (!isLegacyReport(report)) {
    return report;
  }

  return {
    loadedTools: report.loadedSkills.map(skill => ({
      normalizedSkill: skill
    })),
    blockedSkills: report.blockedSkills.map(skill => ({
      normalizedSkill: skill,
      validation: {
        findings: (report.validationLog.find(entry => entry.id === skill.id)?.issues || []).map(issue => ({
          type: issue.code.replace(/_/g, '-'),
          severity: issue.severity,
          message: issue.message,
          evidence: issue.evidence
        }))
      }
    })),
    catalogEntries: report.catalogReferences || [],
    failedFiles: report.failedFiles || [],
    duplicateSkills: report.duplicateSkills || [],
    processing: report.processing || {},
    registeredTools: report.registeredTools && report.registeredTools.length > 0
      ? report.registeredTools
      : report.loadedSkills.map(skill => skill.id)
  };
}

function isLegacyReport(report) {
  return Boolean(report)
    && Array.isArray(report.loadedSkills)
    && Array.isArray(report.blockedSkills)
    && Array.isArray(report.catalogReferences);
}
