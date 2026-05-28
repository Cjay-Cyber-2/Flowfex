import { assertConfigured } from './config.js';

let attached = false;
let lastResponse = null;

export function isAttached() {
  return attached;
}

export function getLastResponse() {
  return lastResponse;
}

export function buildTaskBody(config, taskText) {
  const prefix = `SYNIQ_SESSION_TOKEN: ${config.sessionToken}`;
  const task = typeof taskText === 'string' && taskText.trim().length > 0
    ? taskText.trim()
    : 'syniq.attach';
  return {
    sessionId: config.sessionId,
    task: `${prefix}\n${task}`,
  };
}

export async function postIngest(config, taskText) {
  assertConfigured(config);

  const body = buildTaskBody(config, taskText);
  const response = await fetch(config.ingestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.sessionToken}`,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let payload = null;

  if (rawText.trim()) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { raw: rawText };
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message
      || payload?.message
      || `Syniq ingest failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    error.code = payload?.error?.code || 'syniq_ingest_failed';
    throw error;
  }

  lastResponse = payload;
  if (typeof taskText === 'string' && taskText.trim() === 'syniq.attach') {
    attached = true;
  }

  return payload;
}

function summarizeSkills(payload) {
  const steps = payload?.snapshot?.selection?.selectedSteps
    || payload?.selection?.selectedSteps
    || payload?.graph?.selection?.selectedSteps
    || [];

  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  return steps.slice(0, 12).map((step) => {
    const tool = step?.tool || {};
    return `- ${step.toolId || tool.id || 'unknown'}: ${tool.name || tool.description || 'Syniq resource'}`;
  }).join('\n');
}

export function formatSyniqResponse(payload, { heading = 'Syniq response' } = {}) {
  const footer = payload?.syniqUsage?.footer || null;
  const output = payload?.output || payload?.result?.output || payload?.text || null;
  const skillsBlock = summarizeSkills(payload);

  const sections = [heading];

  if (footer) {
    sections.push('', footer);
  }

  if (output && typeof output === 'string') {
    sections.push('', '## Orchestration output', output);
  }

  if (skillsBlock) {
    sections.push('', '## Relevant Syniq resources', skillsBlock);
  }

  sections.push('', '## Full JSON (for debugging)', '```json', JSON.stringify(payload, null, 2), '```');

  return sections.join('\n');
}

export function formatConfigStatus(config) {
  return [
    'Syniq MCP configuration:',
    `- Public URL: ${config.publicUrl}`,
    `- Ingest URL: ${config.ingestUrl}`,
    `- Session ID: ${config.sessionId || '(missing)'}`,
    `- Token: ${config.sessionToken ? `${config.sessionToken.slice(0, 12)}…` : '(missing)'}`,
    `- Config file: ${config.configPath || '(none)'}`,
    `- Attached: ${attached ? 'yes' : 'no'}`,
  ].join('\n');
}
