import { createHash, randomUUID } from 'node:crypto';
import type { JsonObject, JsonValue } from './contracts.js';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'if',
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
  'with',
]);

export function buildExecutionId(): string {
  return `orch_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export function stableId(prefix: string, ...parts: string[]): string {
  const hash = createHash('sha1')
    .update(parts.join('|'))
    .digest('hex')
    .slice(0, 10);
  return `${prefix}_${hash}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map(value => value.trim())
        .filter(Boolean)
    )
  );
}

export function tokenize(input: string): string[] {
  return uniqueStrings(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(token => token.length > 2 && !STOP_WORDS.has(token))
  );
}

export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function extractJsonDocument(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function stringifyForSearch(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

export function toSerializable<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue: unknown) => {
      if (currentValue instanceof Error) {
        return {
          message: currentValue.message,
          type: currentValue.name,
        };
      }

      if (typeof currentValue === 'undefined') {
        return null;
      }

      if (typeof currentValue === 'function') {
        return '[Function]';
      }

      return currentValue;
    })
  ) as T;
}

export function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? ({ ...value } as Record<string, unknown>)
    : {};
}

export function asJsonObject(value: unknown): JsonObject {
  const serializable = toSerializable(value);
  if (!serializable || typeof serializable !== 'object' || Array.isArray(serializable)) {
    return {};
  }

  return serializable as JsonObject;
}

export function toJsonValue(value: unknown): JsonValue {
  return toSerializable(value) as JsonValue;
}

export function includesLoosePhrase(haystack: string, needle: string): boolean {
  const normalizedHaystack = haystack.toLowerCase();
  const normalizedNeedle = needle.toLowerCase();

  return normalizedHaystack.includes(normalizedNeedle)
    || tokenize(normalizedNeedle).every(token => normalizedHaystack.includes(token));
}

export function overlapScore(left: string, right: string): number {
  const leftTokens = tokenize(left);
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.length === 0 || rightTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(leftTokens.length, rightTokens.size);
}
