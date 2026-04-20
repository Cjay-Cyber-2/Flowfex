/**
 * Bulk Markdown Skill Import Runner
 *
 * Standalone CLI script that runs the full Flowfex skill ingestion pipeline
 * across all configured markdown sources and produces detailed reports.
 *
 * Usage:
 *   node src/skills/runBulkImport.js                 # Full import + export
 *   node src/skills/runBulkImport.js --report-only   # Report only, no registry export
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ToolRegistry } from '../registry/ToolRegistry.js';
import {
  DEFAULT_MARKDOWN_SKILL_SOURCES,
  registerMarkdownSkills,
  logSkillRegistrationReport
} from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../.flowfex');
const reportOnly = process.argv.includes('--report-only');

console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   Flowfex Bulk Markdown Skill Import                ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');

// ─── Show configured sources ────────────────────────────────────────────

console.log('📂 Configured source directories:');
for (const source of DEFAULT_MARKDOWN_SKILL_SOURCES) {
  const exists = fs.existsSync(source.directory);
  const status = exists ? '✅' : '❌ NOT FOUND';
  console.log(`   ${status} ${source.name} → ${source.directory} [${source.trustLevel}]`);
}
console.log('');

// ─── Run import ─────────────────────────────────────────────────────────

console.log('⏳ Running ingestion pipeline...');
const startTime = Date.now();

const registry = new ToolRegistry();
const report = registerMarkdownSkills(registry);

const elapsed = Date.now() - startTime;
console.log(`✅ Pipeline completed in ${elapsed}ms`);
console.log('');

// ─── Source summary ─────────────────────────────────────────────────────

console.log('═══ Source Summary ═══');
for (const source of report.sources) {
  console.log(`\n📦 ${source.name} (${source.trustLevel})`);
  console.log(`   Directory: ${source.directory}`);
  console.log(`   Discovered: ${source.discoveredMarkdownFiles} markdown files`);
  console.log(`   Loaded:     ${source.loadedTools} tools`);
  console.log(`   Blocked:    ${source.blockedSkills} skills`);
  console.log(`   Skipped:    ${source.skippedFiles} files`);
  console.log(`   Failed:     ${source.failedFiles} files`);
  console.log(`   Catalog:    ${source.catalogFiles} catalog files, ${source.catalogEntries} entries`);
  console.log(`   Duration:   ${source.durationMs}ms`);
  console.log(`   Classifications:`);
  for (const [cls, count] of Object.entries(source.classifications)) {
    if (count > 0) {
      console.log(`     ${cls}: ${count}`);
    }
  }
}

// ─── Overall stats ──────────────────────────────────────────────────────

console.log('\n═══ Overall Statistics ═══');
const stats = report.stats;
console.log(`Total sources:        ${stats.totalSources}`);
console.log(`Total MD files:       ${stats.totalMarkdownFiles}`);
console.log(`Loaded tools:         ${stats.totalLoadedTools}`);
console.log(`Blocked skills:       ${stats.totalBlockedSkills}`);
console.log(`Skipped files:        ${stats.totalSkippedFiles}`);
console.log(`Failed files:         ${stats.totalFailedFiles}`);
console.log(`Catalog files:        ${stats.totalCatalogFiles}`);
console.log(`Catalog entries:      ${stats.totalCatalogEntries}`);
console.log(`Duplicate candidates: ${stats.totalDuplicateSkills}`);
console.log(`Registered tools:     ${report.registeredTools?.length || 0}`);
console.log(`Skipped duplicates:   ${report.skippedDuplicates?.length || 0}`);
console.log(`Processing duration:  ${stats.processingDurationMs}ms`);

// ─── Loaded by category ─────────────────────────────────────────────────

if (stats.loadedByCategory && Object.keys(stats.loadedByCategory).length > 0) {
  console.log(`\n═══ Loaded by Category ═══`);
  const sorted = Object.entries(stats.loadedByCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    console.log(`  ${cat}: ${count}`);
  }
}

// ─── Loaded by source type ──────────────────────────────────────────────

if (stats.loadedBySourceType && Object.keys(stats.loadedBySourceType).length > 0) {
  console.log(`\n═══ Loaded by Source Type ═══`);
  for (const [type, count] of Object.entries(stats.loadedBySourceType)) {
    console.log(`  ${type}: ${count}`);
  }
}

// ─── Blocked reasons ────────────────────────────────────────────────────

if (stats.blockedByReason && Object.keys(stats.blockedByReason).length > 0) {
  console.log(`\n═══ Blocked by Reason ═══`);
  for (const [reason, count] of Object.entries(stats.blockedByReason)) {
    console.log(`  ${reason}: ${count}`);
  }
}

// ─── Catalog summary ────────────────────────────────────────────────────

if (stats.totalCatalogEntries > 0) {
  console.log(`\n═══ Catalog References ═══`);
  console.log(`  Total entries:     ${stats.totalCatalogEntries}`);
  console.log(`  Local matches:     ${stats.catalogLocalMatches}`);
  console.log(`  Catalog-only:      ${stats.catalogOnlyReferences}`);

  if (stats.catalogByProvider && Object.keys(stats.catalogByProvider).length > 0) {
    console.log(`  By provider:`);
    for (const [provider, count] of Object.entries(stats.catalogByProvider)) {
      console.log(`    ${provider}: ${count}`);
    }
  }
}

// ─── Duplicate details ──────────────────────────────────────────────────

if (report.duplicateSkills?.length > 0) {
  console.log(`\n═══ Duplicate Skills (${report.duplicateSkills.length}) ═══`);
  for (const dup of report.duplicateSkills.slice(0, 20)) {
    const reasons = dup.findings.map(f => f.type).join(', ');
    console.log(`  ${dup.id} (${reasons}) → ${dup.filePath}`);
  }
  if (report.duplicateSkills.length > 20) {
    console.log(`  ... and ${report.duplicateSkills.length - 20} more`);
  }
}

// ─── Failed files ───────────────────────────────────────────────────────

if (report.failedFiles?.length > 0) {
  console.log(`\n═══ Failed Files (${report.failedFiles.length}) ═══`);
  for (const fail of report.failedFiles.slice(0, 10)) {
    console.log(`  ❌ ${fail.filePath}: ${fail.error?.message || fail.reason}`);
  }
  if (report.failedFiles.length > 10) {
    console.log(`  ... and ${report.failedFiles.length - 10} more`);
  }
}

// ─── Blocked skills preview ─────────────────────────────────────────────

if (report.blockedSkills?.length > 0) {
  console.log(`\n═══ Blocked Skills Preview (first 10) ═══`);
  for (const blocked of report.blockedSkills.slice(0, 10)) {
    const findings = blocked.validation?.findings || blocked.normalizedSkill?.findings || [];
    const reasons = findings
      .filter(f => f.severity === 'high')
      .map(f => `${f.type}: ${f.message}`)
      .join('; ');
    console.log(`  🚫 ${blocked.normalizedSkill?.id || blocked.id || 'unknown'} — ${reasons || 'quality issues'}`);
  }
}

// ─── Accountability check ───────────────────────────────────────────────

const totalAccountedFor = stats.totalLoadedTools + stats.totalBlockedSkills + stats.totalSkippedFiles + stats.totalFailedFiles + stats.totalCatalogFiles;
const unaccounted = stats.totalMarkdownFiles - totalAccountedFor;
console.log(`\n═══ Accountability ═══`);
console.log(`  Total MD files discovered: ${stats.totalMarkdownFiles}`);
console.log(`  Loaded:                    ${stats.totalLoadedTools}`);
console.log(`  Blocked:                   ${stats.totalBlockedSkills}`);
console.log(`  Skipped:                   ${stats.totalSkippedFiles}`);
console.log(`  Failed:                    ${stats.totalFailedFiles}`);
console.log(`  Catalog files:             ${stats.totalCatalogFiles}`);
console.log(`  TOTAL accounted for:       ${totalAccountedFor}`);
if (unaccounted !== 0) {
  console.log(`  ⚠️  UNACCOUNTED:           ${unaccounted} files`);
} else {
  console.log(`  ✅ Every file accounted for.`);
}

// ─── Export outputs ─────────────────────────────────────────────────────

if (!reportOnly) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Export registry JSON
  const registryPath = path.join(OUTPUT_DIR, 'skill-registry.json');
  const registryExport = {
    exportedAt: new Date().toISOString(),
    totalTools: registry.getAllTools().length,
    stats: report.stats,
    tools: registry.getAllTools().map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.metadata?.category,
      tags: t.metadata?.tags,
      source: t.metadata?.source,
      trustLevel: t.metadata?.trustLevel,
      validationStatus: t.metadata?.validationStatus,
      qualityScore: t.metadata?.qualityScore,
      executable: t.metadata?.executable,
      sourcePath: t.metadata?.sourcePath
    })),
    catalogs: (report.catalogEntries || report.catalogReferences || []).map(e => ({
      id: e.id,
      title: e.title,
      url: e.url,
      provider: e.provider,
      category: e.category,
      hasLocalMatch: e.hasLocalMatch
    })),
    duplicates: report.duplicateSkills || [],
    blocked: (report.blockedSkills || []).map(b => ({
      id: b.normalizedSkill?.id || b.id,
      filePath: b.filePath || b.sourcePath,
      findings: b.validation?.findings || []
    })),
    skipped: report.skippedFiles || report.ignoredFiles || [],
    failed: report.failedFiles || []
  };
  fs.writeFileSync(registryPath, JSON.stringify(registryExport, null, 2));
  console.log(`\n📁 Registry exported to: ${registryPath}`);

  // Export human-readable catalog
  const catalogPath = path.join(OUTPUT_DIR, 'skill-catalog.md');
  const catalogLines = [
    '# Flowfex Skill Catalog',
    '',
    `> Auto-generated on ${new Date().toISOString()}`,
    `> ${registry.getAllTools().length} tools registered from ${stats.totalMarkdownFiles} markdown files across ${stats.totalSources} sources`,
    '',
    '## Registered Tools',
    '',
    '| ID | Name | Category | Tags | Source | Trust | Quality |',
    '|---|---|---|---|---|---|---|'
  ];

  for (const tool of registry.getToolsSummary()) {
    const tags = (tool.tags || []).slice(0, 4).join(', ');
    catalogLines.push(
      `| ${tool.id} | ${tool.name} | ${tool.category} | ${tags} | ${tool.source || '-'} | ${tool.trustLevel || '-'} | ${tool.validationStatus || '-'} |`
    );
  }

  if ((report.catalogReferences || []).length > 0) {
    catalogLines.push('', '## Catalog References', '');
    catalogLines.push('| Title | Provider | Category | URL | Local Match |');
    catalogLines.push('|---|---|---|---|---|');
    for (const entry of report.catalogReferences) {
      catalogLines.push(
        `| ${entry.title} | ${entry.provider} | ${entry.category} | ${entry.url || '-'} | ${entry.hasLocalMatch ? '✅' : '❌'} |`
      );
    }
  }

  fs.writeFileSync(catalogPath, catalogLines.join('\n'));
  console.log(`📁 Catalog exported to: ${catalogPath}`);
}

// ─── Final log ──────────────────────────────────────────────────────────

logSkillRegistrationReport(report);
console.log('\n✅ Bulk import complete.');
