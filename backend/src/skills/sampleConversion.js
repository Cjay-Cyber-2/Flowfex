import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MarkdownSkillLoader,
  defaultMarkdownSkillParser,
  defaultSkillNormalizer,
  defaultSkillValidator
} from './index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..', '..');
const examplesDir = path.join(projectRoot, 'skills-md', 'examples');
const sampleFiles = [
  path.join(examplesDir, 'before', 'product-planner.md'),
  path.join(examplesDir, 'before', 'commands', 'release-coordinator.md'),
  path.join(examplesDir, 'before', 'security', 'unsafe-secret-extractor.md')
];

const sampleConversions = sampleFiles.map(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = defaultMarkdownSkillParser.parse({ filePath, content });
  const normalized = defaultSkillNormalizer.normalize(parsed, {
    relativePath: path.relative(path.join(projectRoot, 'skills-md'), filePath)
  });
  const validation = defaultSkillValidator.validate(normalized);

  return {
    source: path.relative(projectRoot, filePath),
    before: {
      title: parsed.title,
      description: parsed.description,
      sectionCount: parsed.sections.length
    },
    after: {
      id: normalized.id,
      category: normalized.category,
      sourceType: normalized.normalizedSourceType,
      tags: normalized.tags,
      validationStatus: validation.validationStatus,
      qualityScore: validation.qualityScore
    }
  };
});

const loader = new MarkdownSkillLoader({
  sourceDirs: [examplesDir],
  chunkSize: 25,
  continueOnError: true,
  logger: console
});

const report = await loader.loadSkills();
loader.logReport(report);

console.log(JSON.stringify({
  sampleConversions,
  loadSummary: {
    scannedFiles: report.scannedFiles,
    loadedSkills: report.loadedSkills.length,
    blockedSkills: report.blockedSkills.length,
    catalogReferences: report.catalogReferences.length,
    stats: report.stats
  }
}, null, 2));
