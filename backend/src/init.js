/**
 * Initialization module
 *
 * Registers all tools with the default registry:
 *   - 3 core tools (Summarizer, Code Generator, API Builder)
 *   - 3 system tools (Weather, Calculator, Default Fallback)
 *   - 15 production tools (Data, Security, Testing, Code, Text, DevOps, API, Analysis, Planning, Debug, Architecture)
 *   - Markdown-imported skills from skills-md/ and awesome-agent-skills/
 *
 * Also loads environment variables from .env if present.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Load .env before anything else ─────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(__dirname, '..', '..', '.env'));
loadEnvFile(resolve(__dirname, '..', '.env'));

// ─── Imports ────────────────────────────────────────────────────────────

import { defaultRegistry } from './registry/ToolRegistry.js';
import { summarizerTool } from './tools/SummarizerTool.js';
import { codeGeneratorTool } from './tools/CodeGeneratorTool.js';
import { apiBuilderTool } from './tools/APIBuilderTool.js';
import { weatherTool, calculatorTool, defaultTool } from './tools/systemTools.js';
import { allProductionTools } from './tools/ProductionTools.js';
import { registerMarkdownSkills, logSkillRegistrationReport } from './skills/index.js';

// ─── Register core tools ────────────────────────────────────────────────

defaultRegistry.registerTool(summarizerTool);
defaultRegistry.registerTool(codeGeneratorTool);
defaultRegistry.registerTool(apiBuilderTool);

// ─── Register system tools ──────────────────────────────────────────────

defaultRegistry.registerTool(weatherTool);
defaultRegistry.registerTool(calculatorTool);
defaultRegistry.registerTool(defaultTool);

// ─── Register production tools ──────────────────────────────────────────

for (const tool of allProductionTools) {
  if (!defaultRegistry.getTool(tool.id)) {
    defaultRegistry.registerTool(tool);
  }
}

// ─── Register markdown-imported skills ──────────────────────────────────

export const defaultSkillLoadReport = registerMarkdownSkills(defaultRegistry);
logSkillRegistrationReport(defaultSkillLoadReport);
export const markdownSkillReport = defaultSkillLoadReport;

const totalTools = defaultRegistry.getAllTools().length;
console.log(`[Syniq] Registry initialized with ${totalTools} tools (3 core + 3 system + ${allProductionTools.length} production + ${defaultSkillLoadReport.registeredTools?.length || 0} markdown)`);

export { defaultRegistry };

// ─── .env Loader ────────────────────────────────────────────────────────

function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim().replace(/^\uFEFF/, '');
      if (!trimmed || trimmed.startsWith('#')) continue;

      const assignment = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
      const eqIndex = assignment.indexOf('=');
      if (eqIndex < 0) continue;

      const key = assignment.substring(0, eqIndex).trim();
      const value = parseEnvValue(assignment.substring(eqIndex + 1).trim());

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file is optional
  }
}

function parseEnvValue(value) {
  if (!value) {
    return '';
  }

  const quote = value[0];
  if ((quote === '"' || quote === "'") && value[value.length - 1] === quote) {
    const inner = value.slice(1, -1);
    return quote === '"'
      ? inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      : inner.replace(/\\'/g, "'");
  }

  return value;
}
