import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inferProviderFromTitle,
  inferProviderFromURL,
  inferCategoryFromTitle,
  inferComplexityLevel,
  buildCatalogSkillReference,
  buildCatalogSkillRegistry
} from './catalog/CatalogSkillEnhancer.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..', '..');

async function runPhase2Tests() {
  console.log('\n================================================================================');
  console.log('FLOWFEX SKILL INGESTION - PHASE 2: ENHANCED CATALOG PROCESSING');
  console.log('================================================================================\n');

  const awesomeSkillsPath = path.join(projectRoot, 'awesome-agent-skills', 'README.md');

  if (!fs.existsSync(awesomeSkillsPath)) {
    console.log(`README.md not found at ${awesomeSkillsPath}`);
    return;
  }

  const content = fs.readFileSync(awesomeSkillsPath, 'utf-8');

  // Test 1: Provider inference from URLs
  console.log('\n--- TEST 1: PROVIDER INFERENCE FROM URLs ---');
  const testURLs = [
    'https://officialskills.sh/anthropics/skills/docx',
    'https://github.com/vercel-labs/react-best-practices',
    'https://stripe.com/docs',
    'https://cloud.google.com/gemini',
    'https://github.com/coreyhaines31/marketingskills'
  ];

  console.log('\nURL to Provider Mapping:');
  for (const url of testURLs) {
    const provider = inferProviderFromURL(url);
    console.log(`  ${url} → ${provider}`);
  }

  // Test 2: Category inference from titles
  console.log('\n--- TEST 2: CATEGORY INFERENCE FROM TITLES ---');
  const testTitles = [
    'React Best Practices',
    'Security Audit Framework',
    'PostgreSQL Database Optimization',
    'Frontend Design Review',
    'DevOps Infrastructure as Code',
    'AI Agent Orchestration',
    'Testing with Playwright'
  ];

  console.log('\nTitle to Category Mapping:');
  for (const title of testTitles) {
    const category = inferCategoryFromTitle(title);
    console.log(`  "${title}" → ${category}`);
  }

  // Test 3: Complexity inference
  console.log('\n--- TEST 3: COMPLEXITY LEVEL INFERENCE ---');
  const testSkills = [
    { title: 'Getting Started with Next.js', description: 'A beginner guide' },
    { title: 'Advanced React Performance Optimization', description: 'Enterprise patterns' },
    { title: 'Building Secure Smart Contracts', description: 'Security audit framework' },
    { title: 'REST API Best Practices', description: 'Design patterns' }
  ];

  console.log('\nComplexity Level Inference:');
  for (const skill of testSkills) {
    const complexity = inferComplexityLevel(skill.title, skill.description);
    console.log(`  "${skill.title}" → ${complexity}`);
  }

  // Test 4: Catalog entry enrichment
  console.log('\n--- TEST 4: CATALOG ENTRY ENRICHMENT ---');
  const sampleCatalogEntries = [
    {
      title: 'vercel-labs/react-best-practices',
      description: 'React best practices and patterns',
      url: 'https://officialskills.sh/vercel-labs/skills/react-best-practices',
      section: 'Skills by Vercel Engineering Team'
    },
    {
      title: 'anthropics/docx',
      description: 'Create, edit, and analyze Word documents',
      url: 'https://officialskills.sh/anthropics/skills/docx',
      section: 'Official Claude Skills'
    },
    {
      title: 'stripe/stripe-best-practices',
      description: 'Best practices for building Stripe integrations',
      url: 'https://officialskills.sh/stripe/skills/stripe-best-practices',
      section: 'Skills by Stripe Team'
    }
  ];

  console.log('\nEnriched Catalog References:');
  for (const entry of sampleCatalogEntries) {
    const enriched = buildCatalogSkillReference(entry);
    console.log(`\n  ID: ${enriched.id}`);
    console.log(`  Title: ${enriched.title}`);
    console.log(`  Provider: ${enriched.provider}`);
    console.log(`  Category: ${enriched.category}`);
    console.log(`  Complexity: ${enriched.complexity}`);
    console.log(`  Tags: ${enriched.tags.join(', ')}`);
  }

  // Test 5: Build registry index
  console.log('\n--- TEST 5: CATALOG REGISTRY INDEX ---');
  const registry = buildCatalogSkillRegistry(sampleCatalogEntries);

  console.log('\nRegistry by Provider:');
  for (const [provider, skills] of Object.entries(registry.byProvider)) {
    console.log(`  ${provider}: ${skills.length} skills`);
  }

  console.log('\nRegistry by Category:');
  for (const [category, skills] of Object.entries(registry.byCategory)) {
    console.log(`  ${category}: ${skills.length} skills`);
  }

  console.log('\nRegistry by Complexity:');
  for (const [complexity, skills] of Object.entries(registry.byComplexity)) {
    console.log(`  ${complexity}: ${skills.length} skills`);
  }

  // Test 6: Extract catalog section stats from README
  console.log('\n--- TEST 6: CATALOG STATISTICS FROM awesome-agent-skills ---');

  const catalogSections = [
    'Official Claude Skills',
    'Skills by Vercel Engineering Team',
    'Skills by Cloudflare Team',
    'Skills by Netlify Team',
    'Skills by Google Labs (Stitch)',
    'Skills by Stripe Team'
  ];

  const catalogStats = {};
  for (const section of catalogSections) {
    const regex = new RegExp(`### ${section}[\\s\\S]*?(?=###|$)`, 'i');
    const match = content.match(regex);

    if (match) {
      const entries = (match[0].match(/^-\s+(?:\*\*\[|\[)/gm) || []).length;
      catalogStats[section] = entries;
    }
  }

  console.log('\nCatalog Entries by Section:');
  let totalEntries = 0;
  for (const [section, count] of Object.entries(catalogStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${section}: ${count} entries`);
    totalEntries += count;
  }

  console.log(`\nTotal Extracted: ${totalEntries} skill references`);

  // Test 7: Provider distribution analysis
  console.log('\n--- TEST 7: PROVIDER DISTRIBUTION ---');

  const providers = {
    anthropic: 0,
    google: 0,
    vercel: 0,
    stripe: 0,
    cloudflare: 0,
    netlify: 0,
    microsoft: 0,
    huggingface: 0,
    others: 0
  };

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.match(/^-\s+\*?\*?\[/)) {
      if (line.match(/anthropic|claude/i)) providers.anthropic++;
      else if (line.match(/google|gemini/i)) providers.google++;
      else if (line.match(/vercel/i)) providers.vercel++;
      else if (line.match(/stripe/i)) providers.stripe++;
      else if (line.match(/cloudflare/i)) providers.cloudflare++;
      else if (line.match(/netlify/i)) providers.netlify++;
      else if (line.match(/microsoft|azure/i)) providers.microsoft++;
      else if (line.match(/hugging face/i)) providers.huggingface++;
      else providers.others++;
    }
  }

  console.log('\nSkills by Provider:');
  for (const [provider, count] of Object.entries(providers).sort((a, b) => b[1] - a[1])) {
    if (count > 0) {
      console.log(`  ${provider}: ${count} skills`);
    }
  }

  // Summary
  console.log('\n================================================================================');
  console.log('PHASE 2 TEST SUMMARY');
  console.log('================================================================================');
  console.log(`✓ Provider inference: ${testURLs.length} URLs classified`);
  console.log(`✓ Category inference: ${testTitles.length} titles categorized`);
  console.log(`✓ Complexity detection: ${testSkills.length} skills leveled`);
  console.log(`✓ Catalog enrichment: ${sampleCatalogEntries.length} entries enhanced`);
  console.log(`✓ Registry indexing: ${Object.keys(registry.byProvider).length} providers indexed`);
  console.log(`✓ Catalog parsing: ${totalEntries}+ skill references extracted`);
  console.log(`✓ Coverage: Multiple teams and providers classified`);
  console.log('\n');
}

try {
  await runPhase2Tests();
  process.exit(0);
} catch (err) {
  console.error('\n[FATAL ERROR]', err.message);
  process.exit(1);
}
