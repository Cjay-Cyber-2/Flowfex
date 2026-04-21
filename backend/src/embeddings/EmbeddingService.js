const DEFAULT_DIMENSIONS = 256;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'use',
  'with',
  'you',
  'your'
]);

const SYNONYM_GROUPS = [
  ['summary', 'summarize', 'summarizer', 'condense', 'digest', 'brief', 'shorten', 'overview', 'abstract'],
  ['code', 'coding', 'program', 'programming', 'function', 'functions', 'module', 'class', 'snippet', 'implementation'],
  ['api', 'apis', 'endpoint', 'endpoints', 'route', 'routes', 'rest', 'restful', 'openapi', 'graphql', 'schema', 'service'],
  ['review', 'inspect', 'audit', 'analyze', 'analysis', 'check'],
  ['frontend', 'ui', 'ux', 'interface', 'component', 'react'],
  ['security', 'secure', 'auth', 'authentication', 'authorization', 'credential', 'credentials', 'secret', 'token'],
  ['test', 'tests', 'testing', 'validate', 'validation', 'verify', 'verification'],
  ['deploy', 'deployment', 'release', 'ship', 'publish'],
  ['connect', 'connection', 'session', 'client', 'agent']
];

const TOKEN_TO_GROUP = buildTokenToGroup(SYNONYM_GROUPS);

/**
 * Lightweight embedding service.
 *
 * This uses deterministic feature hashing over normalized tokens and a small
 * synonym graph so Flowfex can perform semantic-ish retrieval without an
 * external vector dependency.
 */
export class EmbeddingService {
  constructor(config = {}) {
    this.dimensions = config.dimensions || DEFAULT_DIMENSIONS;
    this.model = config.model || 'local-hash-embedding-v1';
  }

  /**
   * Embeds a block of text into a unit-length vector.
   * @param {string} text
   * @returns {{ vector: number[], dimensions: number, model: string, terms: string[] }}
   */
  embedText(text) {
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('EmbeddingService requires a non-empty string');
    }

    const tokens = tokenize(text);
    if (tokens.length === 0) {
      throw new Error('EmbeddingService could not extract meaningful tokens');
    }

    const weightedTerms = new Map();

    for (const token of tokens) {
      increment(weightedTerms, token, 1);

      const synonymGroup = TOKEN_TO_GROUP.get(token);
      if (synonymGroup) {
        for (const synonym of synonymGroup) {
          if (synonym !== token) {
            increment(weightedTerms, synonym, 0.35);
          }
        }
      }
    }

    for (let index = 0; index < tokens.length - 1; index++) {
      const bigram = `${tokens[index]}_${tokens[index + 1]}`;
      increment(weightedTerms, bigram, 0.6);
    }

    const vector = new Array(this.dimensions).fill(0);

    for (const [term, weight] of weightedTerms.entries()) {
      const bucket = positiveModulo(hash(term), this.dimensions);
      const sign = positiveModulo(hash(`${term}:sign`), 2) === 0 ? 1 : -1;
      vector[bucket] += sign * weight;
    }

    normalizeVector(vector);

    return {
      vector,
      dimensions: this.dimensions,
      model: this.model,
      terms: Array.from(weightedTerms.keys())
    };
  }
}

export const defaultEmbeddingService = new EmbeddingService();

export function buildToolEmbeddingText(tool) {
  const tags = tool.metadata?.tags || [];
  const category = tool.metadata?.category || 'uncategorized';
  const sourcePath = tool.metadata?.sourcePath || '';
  const sourceType = tool.metadata?.sourceType || '';
  const sourceClassification = tool.metadata?.sourceClassification || '';
  const trustLevel = tool.metadata?.trustLevel || '';
  const validationStatus = tool.metadata?.validationStatus || '';
  const qualityScore = tool.metadata?.qualityScore ?? '';
  const prompt = typeof tool.prompt === 'string' ? tool.prompt.slice(0, 1200) : '';

  return [
    tool.name,
    tool.name,
    tool.description,
    `category ${category}`,
    `source ${tool.metadata?.source || ''}`,
    `sourcePath ${sourcePath}`,
    `sourceType ${sourceType}`,
    `sourceClassification ${sourceClassification}`,
    `trustLevel ${trustLevel}`,
    `validationStatus ${validationStatus}`,
    `qualityScore ${qualityScore}`,
    `keywords ${(tool.keywords || []).join(' ')}`,
    `tags ${tags.join(' ')}`,
    prompt
  ]
    .filter(Boolean)
    .join('\n');
}

export function inputToEmbeddingText(input) {
  if (typeof input === 'string') {
    return input;
  }

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map(normalizeToken)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function normalizeToken(token) {
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith('ing') && token.length > 5) {
    return token.slice(0, -3);
  }

  if (token.endsWith('ed') && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return;
  }

  for (let index = 0; index < vector.length; index++) {
    vector[index] /= magnitude;
  }
}

function buildTokenToGroup(groups) {
  const lookup = new Map();

  for (const group of groups) {
    const normalizedGroup = group.map(normalizeToken);
    for (const token of normalizedGroup) {
      lookup.set(token, normalizedGroup);
    }
  }

  return lookup;
}

function increment(map, key, amount) {
  map.set(key, (map.get(key) || 0) + amount);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function hash(value) {
  let hashValue = 2166136261;

  for (let index = 0; index < value.length; index++) {
    hashValue ^= value.charCodeAt(index);
    hashValue = Math.imul(hashValue, 16777619);
  }

  return hashValue | 0;
}
