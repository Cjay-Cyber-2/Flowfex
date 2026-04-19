import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ToolRegistry } from '../registry/ToolRegistry.js';
import { loadMarkdownSkills, getDefaultSkillSourceDirs } from './index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..', '..');
const awesomeReadmePath = path.join(projectRoot, 'awesome-agent-skills', 'README.md');

const registry = new ToolRegistry();
const report = loadMarkdownSkills({
  registry,
  sourceDirs: getDefaultSkillSourceDirs(),
  chunkSize: 100,
  continueOnError: true,
  maxFileSizeBytes: 1024 * 1024
});

const summary = {
  sourceDirs: getDefaultSkillSourceDirs(),
  awesomeReadmePath,
  actualLocalMarkdownFiles: report.stats.totalMarkdownFiles,
  actualCatalogReferences: report.stats.totalCatalogEntries,
  loadedTools: report.loadedSkills.length,
  blockedSkills: report.blockedSkills.length,
  ignoredFiles: report.ignoredFiles.length,
  failedFiles: report.failedFiles.length,
  duplicateSkills: report.duplicateSkills.length,
  catalogOnlyReferences: report.stats.catalogOnlyReferences,
  catalogLocalMatches: report.stats.catalogLocalMatches,
  sources: report.sources,
  topLoadedCategories: sortTopEntries(report.stats.loadedByCategory),
  topCatalogProviders: sortTopEntries(report.stats.catalogByProvider),
  blockedByReason: sortTopEntries(report.stats.blockedByReason),
  registryStats: registry.getStats(),
  sampleLoadedSkills: report.loadedSkills.slice(0, 5).map(skill => ({
    id: skill.id,
    category: skill.category,
    sourceType: skill.normalizedSourceType,
    validationStatus: skill.validationStatus,
    sourcePath: skill.sourcePath
  })),
  sampleCatalogReferences: report.catalogReferences.slice(0, 5).map(reference => ({
    title: reference.title,
    provider: reference.provider,
    category: reference.category,
    sourceType: reference.sourceType,
    hasLocalMatch: reference.hasLocalMatch
  }))
};

console.log(JSON.stringify(summary, null, 2));

function sortTopEntries(counts = {}) {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([key, value]) => ({ key, value }));
}
