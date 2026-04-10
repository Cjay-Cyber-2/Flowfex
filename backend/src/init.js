/**
 * Initialization module
 * Registers default tools with the registry
 */

import { defaultRegistry } from './registry/ToolRegistry.js';
import { summarizerTool } from './tools/SummarizerTool.js';
import { codeGeneratorTool } from './tools/CodeGeneratorTool.js';
import { apiBuilderTool } from './tools/APIBuilderTool.js';
import { registerMarkdownSkills, logSkillRegistrationReport } from './skills/index.js';

// Auto-register the example tools
defaultRegistry.registerTool(summarizerTool);
defaultRegistry.registerTool(codeGeneratorTool);
defaultRegistry.registerTool(apiBuilderTool);

export const defaultSkillLoadReport = registerMarkdownSkills(defaultRegistry);
logSkillRegistrationReport(defaultSkillLoadReport);
export const markdownSkillReport = defaultSkillLoadReport;

export { defaultRegistry };
