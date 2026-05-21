import { MANDATORY_SKILL_SLUGS } from './mandatorySkills.js';

function getSkillSourcePath(skill) {
  return String(skill?.metadata?.sourcePath || skill?.sourcePath || '').replace(/\\/g, '/');
}

function getCatalogProjectKey(skill) {
  const sourcePath = getSkillSourcePath(skill);
  if (!sourcePath) return '';

  const segments = sourcePath.split('/').filter(Boolean);
  const rootIndex = segments.indexOf('skills-md');
  const scopedSegments = rootIndex >= 0 ? segments.slice(rootIndex + 1) : segments;
  const fileName = scopedSegments[scopedSegments.length - 1] || '';

  if (/^readme\.md$/i.test(fileName) && scopedSegments.length > 1) {
    return scopedSegments.slice(0, -1).join('/');
  }

  return scopedSegments.join('/');
}

function skillHaystack(skill) {
  return [
    getSkillSourcePath(skill),
    skill?.id,
    skill?.name,
    skill?.title,
    skill?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isMultiAgentSkill(skill) {
  const haystack = skillHaystack(skill);
  return [
    '/multi-agent-teams/',
    '/multi_agent_apps/',
    'multi agent',
    'multi-agent',
    'multi_agent',
    'agent team',
    'agent-team',
    'agent_team',
    'agent teams',
    'agent_teams',
    'mixture_of_agents',
    'multi_mcp_agent',
  ].some((pattern) => haystack.includes(pattern));
}

function isAgentSkill(skill) {
  if (isMultiAgentSkill(skill)) {
    return false;
  }

  const haystack = skillHaystack(skill);
  return [
    '/starter-ai-agents/',
    '/voice-ai-agents/',
    '/mcp-ai-agents/',
    '/advanced-ai-agents/',
    '/game-agents/',
    '/agent-skills/',
    '/chat-with-x/',
    '/agent-swarm-agents/',
    '/agency-agents/',
    '/agents/',
    ' agent ',
    ' agents ',
    '_agent',
    '-agent',
    '_agents',
    '-agents',
  ].some((pattern) => haystack.includes(pattern));
}

function countUniqueProjects(tools, predicate) {
  const uniqueProjects = new Set();

  for (const tool of tools) {
    if (!predicate(tool)) continue;
    const projectKey = getCatalogProjectKey(tool);
    if (projectKey) {
      uniqueProjects.add(projectKey);
    }
  }

  return uniqueProjects.size;
}

/**
 * Public catalog totals for marketing surfaces and dashboard headers.
 * Mirrors frontend deriveCatalogStats so landing and LeftRail stay in sync.
 */
export function buildCatalogStats(registry) {
  const tools = typeof registry?.getCanonicalSkillRecords === 'function'
    ? registry.getCanonicalSkillRecords()
    : [];
  const markdownTools = tools.filter((tool) => Boolean(tool.metadata?.sourcePath));
  const categories = new Set(markdownTools.map((tool) => tool.category).filter(Boolean));

  return {
    skillsIndexed: markdownTools.length,
    agentTemplates: countUniqueProjects(markdownTools, isAgentSkill),
    multiAgentSystems: countUniqueProjects(markdownTools, isMultiAgentSkill),
    mcpAgentSkills: countUniqueProjects(markdownTools, (tool) => {
      const sourcePath = getSkillSourcePath(tool);
      return sourcePath.includes('/mcp-ai-agents/')
        || sourcePath.includes('mcp-builder')
        || sourcePath.includes('mcp-server')
        || sourcePath.includes('mcp-memory');
    }),
    categories: categories.size,
    totalRegistryTools: tools.length,
    compulsoryBaseline: MANDATORY_SKILL_SLUGS.length,
    updatedAt: new Date().toISOString(),
  };
}
