import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ENV_KEYS = {
  publicUrl: ['SYNIQ_PUBLIC_URL', 'FLOWFEX_PUBLIC_ORIGIN', 'SYNIQ_PUBLIC_ORIGIN', 'BETTER_AUTH_URL'],
  ingestUrl: ['SYNIQ_INGEST_URL', 'FLOWFEX_INGEST_URL'],
  sessionId: ['SYNIQ_SESSION_ID', 'SESSION_ID'],
  sessionToken: ['SYNIQ_SESSION_TOKEN', 'SYNIQ_TOKEN'],
};

function firstEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeBaseUrl(value) {
  if (!value) {
    return null;
  }
  return value.replace(/\/+$/, '');
}

function loadConfigFile() {
  const candidates = [
    process.env.SYNIQ_MCP_CONFIG,
    join(process.cwd(), '.syniq', 'mcp.json'),
    join(homedir(), '.config', 'syniq', 'mcp.json'),
  ].filter(Boolean);

  for (const path of candidates) {
    if (!existsSync(path)) {
      continue;
    }
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      return { path, config: parsed?.syniq || parsed?.mcp?.syniq || parsed };
    } catch {
      continue;
    }
  }

  return { path: null, config: null };
}

export function loadSyniqConfig(overrides = {}) {
  const file = loadConfigFile();
  const fromFile = file.config || {};

  const publicUrl = normalizeBaseUrl(
    overrides.publicUrl
    || fromFile.publicUrl
    || fromFile.baseUrl
    || firstEnv(ENV_KEYS.publicUrl)
    || 'http://127.0.0.1:4000'
  );

  const sessionToken = overrides.sessionToken
    || fromFile.sessionToken
    || fromFile.token
    || firstEnv(ENV_KEYS.sessionToken);

  const sessionId = overrides.sessionId
    || fromFile.sessionId
    || firstEnv(ENV_KEYS.sessionId);

  const ingestUrl = normalizeBaseUrl(
    overrides.ingestUrl
    || fromFile.ingestUrl
    || firstEnv(ENV_KEYS.ingestUrl)
    || `${publicUrl}/ingest`
  );

  return {
    configPath: file.path,
    publicUrl,
    ingestUrl,
    sessionId,
    sessionToken,
    isConfigured: Boolean(sessionId && sessionToken && ingestUrl),
  };
}

export function assertConfigured(config) {
  const missing = [];
  if (!config.sessionId) {
    missing.push('SYNIQ_SESSION_ID (or SESSION_ID)');
  }
  if (!config.sessionToken) {
    missing.push('SYNIQ_SESSION_TOKEN');
  }
  if (!config.ingestUrl) {
    missing.push('SYNIQ_INGEST_URL or SYNIQ_PUBLIC_URL');
  }

  if (missing.length > 0) {
    const error = new Error(
      `Syniq MCP is not configured. Set: ${missing.join(', ')}. `
      + 'Copy the MCP block from the Syniq dashboard Connect Your Agent dialog, or save ~/.config/syniq/mcp.json.'
    );
    error.code = 'syniq_not_configured';
    throw error;
  }
}
