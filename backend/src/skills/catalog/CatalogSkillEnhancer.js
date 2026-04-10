/**
 * Catalog enhancement helpers for README-style markdown indexes.
 * These references are searchable metadata, not runnable tools.
 */

const PROVIDER_PATTERNS = {
  anthropic: /anthropic|claude/i,
  google: /google|gemini|gcloud|googleworkspace/i,
  vercel: /vercel/i,
  stripe: /stripe/i,
  cloudflare: /cloudflare|workers/i,
  netlify: /netlify/i,
  aws: /amazon|aws|lambda/i,
  microsoft: /azure|microsoft|copilot/i,
  openai: /openai/i,
  huggingface: /hugging face|huggingface|huggingface\.co/i,
  figma: /figma/i,
  wordpress: /wordpress|wp-/i,
  binance: /binance/i,
  composio: /composio/i,
  supabase: /supabase|postgres|postgresql/i,
  github: /github/i,
  notion: /notion/i,
  slack: /slack/i,
  contentful: /contentful/i,
  sanity: /sanity/i,
  hashicorp: /hashicorp|terraform/i,
  expo: /expo/i,
  remix: /remix|remix\.run/i,
  next: /nextjs|next\.js/i,
  react: /react/i,
  node: /nodejs|node\.js/i,
  python: /python/i,
  rust: /rust|rustlang/i,
  java: /java/i,
  golang: /golang|\bgo\b/i,
  duckdb: /duckdb/i,
  resend: /resend/i
};

const CATEGORY_KEYWORDS = {
  security: ['security', 'audit', 'threat', 'vulnerability', 'auth', 'oauth', 'encryption', 'secret'],
  frontend: ['frontend', 'ui', 'ux', 'react', 'css', 'html', 'accessibility', 'component', 'design system'],
  backend: ['backend', 'server', 'api', 'service', 'serverless', 'endpoint', 'express', 'fastify'],
  testing: ['test', 'testing', 'qa', 'playwright', 'jest', 'vitest', 'coverage', 'debug'],
  data: ['data', 'sql', 'database', 'postgres', 'analytics', 'warehouse', 'query', 'etl'],
  devops: ['devops', 'deploy', 'ci', 'cd', 'docker', 'terraform', 'cloud', 'infrastructure', 'container'],
  documentation: ['docs', 'documentation', 'readme', 'guide', 'writing', 'content', 'report'],
  ai: ['ai', 'agent', 'prompt', 'llm', 'model', 'mcp', 'language model', 'genai'],
  productivity: ['workflow', 'automation', 'review', 'planning', 'process', 'project', 'coordination'],
  design: ['brand', 'visual', 'motion', 'layout', 'typography'],
  api: ['graphql', 'rest', 'openapi', 'schema'],
  code: ['typescript', 'javascript', 'python', 'refactor', 'implementation', 'module']
};

const COMPLEXITY_LEVELS = {
  expert: ['enterprise', 'hardening', 'security audit', 'specification-to-code', 'variant analysis'],
  advanced: ['advanced', 'optimization', 'performance', 'scaling', 'distributed', 'complex'],
  intermediate: ['best practice', 'pattern', 'workflow', 'design', 'architecture'],
  beginner: ['simple', 'basic', 'intro', 'starter', 'guide', 'tutorial']
};

export function inferProviderFromTitle(title = '') {
  for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
    if (pattern.test(title)) {
      return provider;
    }
  }

  return 'unknown';
}

export function inferProviderFromURL(url = '') {
  try {
    const hostname = new URL(url).hostname;
    const domain = hostname.replace(/^www\./, '').split('.')[0].toLowerCase();

    for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
      if (pattern.test(domain) || pattern.test(url)) {
        return provider;
      }
    }

    return domain || 'unknown';
  } catch {
    return inferProviderFromTitle(url);
  }
}

export function inferCategoryFromTitle(title = '', description = '') {
  const signal = `${title} ${description}`.toLowerCase();
  const tokens = tokenizeSignal(signal);
  let bestCategory = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((sum, keyword) => sum + keywordMatches(signal, tokens, keyword), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory || 'general';
}

export function inferComplexityLevel(title = '', description = '') {
  const combined = `${title} ${description}`.toLowerCase();

  for (const [level, keywords] of Object.entries(COMPLEXITY_LEVELS)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return level;
    }
  }

  return 'beginner';
}

export function extractLanguageFromTitle(title = '') {
  const languages = ['typescript', 'javascript', 'python', 'golang', 'go', 'rust', 'java', 'c#', 'php', 'ruby'];
  const lowerTitle = title.toLowerCase();

  for (const language of languages) {
    if (lowerTitle.includes(language)) {
      return language;
    }
  }

  return null;
}

export function extractCatalogPathMetadata(url = '') {
  const metadata = {
    owner: null,
    repo: null,
    branch: null,
    skillSlug: null,
    providerHint: inferProviderFromURL(url),
    relativePathCandidates: []
  };

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (/officialskills\.sh$/i.test(parsed.hostname)) {
      metadata.owner = segments[0] || null;
      metadata.repo = segments[0] || null;
      if (segments[1] === 'skills') {
        metadata.skillSlug = segments.slice(2).join('/');
      }
    } else if (/github\.com$/i.test(parsed.hostname)) {
      metadata.owner = segments[0] || null;
      metadata.repo = segments[1] || null;

      if ((segments[2] === 'tree' || segments[2] === 'blob') && segments.length >= 5) {
        metadata.branch = segments[3];
        metadata.skillSlug = segments.slice(4).join('/');
      } else if (segments.length > 2) {
        metadata.skillSlug = segments.slice(2).join('/');
      }
    }
  } catch {
    return metadata;
  }

  metadata.relativePathCandidates = buildRelativePathCandidates(metadata);
  return metadata;
}

export function matchCatalogEntryToLocalSkills(catalogEntry, localSkillIndex = new Map()) {
  const matches = [];
  const seenPaths = new Set();
  const title = catalogEntry.title || catalogEntry.name || '';
  const pathMetadata = extractCatalogPathMetadata(catalogEntry.url);
  const candidateKeys = new Set(
    [
      title,
      buildSkillIdFromTitle(title),
      catalogEntry.name,
      pathMetadata.skillSlug,
      pathMetadata.repo && pathMetadata.skillSlug ? `${pathMetadata.repo}/${pathMetadata.skillSlug}` : null,
      pathMetadata.owner && pathMetadata.skillSlug ? `${pathMetadata.owner}/${pathMetadata.skillSlug}` : null,
      ...pathMetadata.relativePathCandidates
    ]
      .filter(Boolean)
      .map(normalizeLookupKey)
  );

  for (const key of candidateKeys) {
    const records = localSkillIndex.get(key) || [];
    for (const record of records) {
      if (seenPaths.has(record.relativePath)) {
        continue;
      }

      seenPaths.add(record.relativePath);
      matches.push(record);
    }
  }

  return matches.slice(0, 5);
}

export function buildCatalogSkillReference(catalogEntry, options = {}) {
  const title = catalogEntry.title || catalogEntry.name || 'Untitled Catalog Skill';
  const pathMetadata = extractCatalogPathMetadata(catalogEntry.url || '');
  const localMatches = options.localMatches || [];
  const providerFromUrl = inferProviderFromURL(catalogEntry.url || '');
  const providerFromOwner = pathMetadata.owner ? inferProviderFromTitle(pathMetadata.owner) : 'unknown';
  const providerFromSection = inferProviderFromTitle(`${catalogEntry.section || ''} ${title}`);
  const provider = providerFromOwner !== 'unknown'
    ? providerFromOwner
    : providerFromSection !== 'unknown'
      ? providerFromSection
      : !['unknown', 'github', 'officialskills'].includes(providerFromUrl)
        ? providerFromUrl
        : pathMetadata.owner || providerFromUrl;
  const category = inferCategoryFromTitle(`${title} ${catalogEntry.section || ''}`, catalogEntry.description || '');
  const complexity = inferComplexityLevel(title, catalogEntry.description || '');
  const language = extractLanguageFromTitle(title);

  return {
    id: `catalog.${buildSkillIdFromTitle(title)}`,
    title,
    name: title,
    description: catalogEntry.description || '',
    url: catalogEntry.url || null,
    provider,
    category,
    complexity,
    language,
    section: catalogEntry.section || 'Uncategorized',
    subsection: catalogEntry.subsection || null,
    source: 'catalog',
    sourceType: catalogEntry.sourceType || 'external',
    catalogEntry: true,
    hasLocalMatch: localMatches.length > 0,
    localMatches,
    pathMetadata,
    tags: Array.from(
      new Set(
        [
          provider,
          category,
          complexity,
          language,
          catalogEntry.sourceType,
          slugifyLabel(catalogEntry.section),
          slugifyLabel(catalogEntry.subsection),
          pathMetadata.owner,
          pathMetadata.repo,
          localMatches.length > 0 ? 'catalog-linked' : 'catalog-only'
        ].filter(Boolean)
      )
    )
  };
}

export function buildSkillIdFromTitle(title = '') {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, '')
    .replace(/[\/\s]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function extractSkillMetadataFromCatalog(catalogEntries, section) {
  const references = catalogEntries.map(entry => buildCatalogSkillReference(entry));

  return {
    section,
    provider: references[0]?.provider || 'unknown',
    skills: references,
    statistics: {
      total: references.length,
      byCategory: groupBy(references, entry => entry.category),
      byComplexity: groupBy(references, entry => entry.complexity),
      byProvider: groupBy(references, entry => entry.provider)
    }
  };
}

export function groupBy(items, keyFn) {
  const groups = {};

  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }

  const result = {};
  for (const [key, entries] of Object.entries(groups)) {
    result[key] = entries.length;
  }

  return result;
}

export function parseCatalogProviderSection(filePath, content, section) {
  const sectionPattern = new RegExp(`### ${section}.*?(?=###|$)`, 'is');
  const match = content.match(sectionPattern);
  if (!match) {
    return null;
  }

  const lines = match[0].split('\n');
  const entries = [];

  for (const line of lines) {
    const entryMatch = line.match(/^\s*-\s+\*?\*?(?:\[)?([^\]]+)(?:\(([^)]+)\))?\*?\*?\s*[-–]\s*(.+)$/);
    if (!entryMatch) {
      continue;
    }

    entries.push({
      title: entryMatch[1].trim(),
      url: entryMatch[2]?.trim() || null,
      description: entryMatch[3].trim(),
      section
    });
  }

  return entries.length > 0 ? entries : null;
}

export function buildCatalogSkillRegistry(catalogEntries) {
  const enrichedEntries = catalogEntries.map(entry =>
    entry.catalogEntry ? entry : buildCatalogSkillReference(entry)
  );

  const registry = {
    byProvider: {},
    byCategory: {},
    byComplexity: {},
    bySourceType: {},
    withLocalMatch: {
      linked: 0,
      catalogOnly: 0
    },
    all: enrichedEntries.length
  };

  for (const entry of enrichedEntries) {
    indexValue(registry.byProvider, entry.provider, entry.id);
    indexValue(registry.byCategory, entry.category, entry.id);
    indexValue(registry.byComplexity, entry.complexity, entry.id);
    indexValue(registry.bySourceType, entry.sourceType, entry.id);

    if (entry.hasLocalMatch) {
      registry.withLocalMatch.linked++;
    } else {
      registry.withLocalMatch.catalogOnly++;
    }
  }

  return registry;
}

function buildRelativePathCandidates(metadata) {
  const candidates = new Set();
  const slug = metadata.skillSlug ? normalizeLookupKey(metadata.skillSlug) : null;
  const owner = metadata.owner ? normalizeLookupKey(metadata.owner) : null;
  const repo = metadata.repo ? normalizeLookupKey(metadata.repo) : null;

  if (slug) {
    candidates.add(slug);
    candidates.add(`${slug}.md`);
    candidates.add(`${slug}/skill.md`);
    candidates.add(`${slug}/readme.md`);
  }

  if (repo && slug) {
    candidates.add(`${repo}/${slug}`);
    candidates.add(`${repo}/${slug}.md`);
    candidates.add(`${repo}/${slug}/skill.md`);
  }

  if (owner && slug) {
    candidates.add(`${owner}/${slug}`);
    candidates.add(`${owner}/${slug}.md`);
    candidates.add(`${owner}/${slug}/skill.md`);
  }

  return Array.from(candidates);
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

function slugifyLabel(value) {
  return value
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : null;
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

function tokenizeSignal(value) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9.+#-]+/)
      .filter(Boolean)
  );
}

function keywordMatches(signal, tokens, keyword) {
  const normalizedKeyword = keyword.toLowerCase();
  return normalizedKeyword.includes(' ')
    ? Number(signal.includes(normalizedKeyword))
    : Number(tokens.has(normalizedKeyword));
}
