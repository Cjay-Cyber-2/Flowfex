import { createHash, randomUUID } from 'node:crypto';
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
export function buildExecutionId() {
    return `orch_${Date.now()}_${randomUUID().slice(0, 8)}`;
}
export function stableId(prefix, ...parts) {
    const hash = createHash('sha1')
        .update(parts.join('|'))
        .digest('hex')
        .slice(0, 10);
    return `${prefix}_${hash}`;
}
export function slugify(input) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}
export function uniqueStrings(values) {
    return Array.from(new Set(values
        .map(value => value.trim())
        .filter(Boolean)));
}
export function tokenize(input) {
    return uniqueStrings(input
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(token => token.length > 2 && !STOP_WORDS.has(token)));
}
export function truncate(input, maxLength) {
    if (input.length <= maxLength) {
        return input;
    }
    return `${input.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
export function extractJsonDocument(raw) {
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
export function stringifyForSearch(input) {
    if (typeof input === 'string') {
        return input;
    }
    try {
        return JSON.stringify(input);
    }
    catch {
        return String(input);
    }
}
export function toSerializable(value) {
    return JSON.parse(JSON.stringify(value, (_key, currentValue) => {
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
    }));
}
export function safeRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? { ...value }
        : {};
}
export function asJsonObject(value) {
    const serializable = toSerializable(value);
    if (!serializable || typeof serializable !== 'object' || Array.isArray(serializable)) {
        return {};
    }
    return serializable;
}
export function toJsonValue(value) {
    return toSerializable(value);
}
export function includesLoosePhrase(haystack, needle) {
    const normalizedHaystack = haystack.toLowerCase();
    const normalizedNeedle = needle.toLowerCase();
    return normalizedHaystack.includes(normalizedNeedle)
        || tokenize(normalizedNeedle).every(token => normalizedHaystack.includes(token));
}
export function overlapScore(left, right) {
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
