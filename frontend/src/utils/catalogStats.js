export const FALLBACK_CATALOG_STATS = {
  skillsIndexed: 853,
  agentTemplates: 420,
  multiAgentSystems: 64,
  mcpAgentSkills: 20,
  categories: 25,
};

export function formatCatalogCount(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function getSkillSourcePath(skill) {
  return String(skill?.metadata?.sourcePath || skill?.sourcePath || skill?.path || '').replace(/\\/g, '/');
}

export function getCatalogProjectKey(skill) {
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

export function isMultiAgentSkill(skill) {
  const haystack = [
    getSkillSourcePath(skill),
    skill?.id,
    skill?.name,
    skill?.title,
    skill?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

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

export function isAgentSkill(skill) {
  if (isMultiAgentSkill(skill)) {
    return false;
  }

  const haystack = [
    getSkillSourcePath(skill),
    skill?.id,
    skill?.name,
    skill?.title,
    skill?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

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

  tools.forEach((tool) => {
    if (!predicate(tool)) return;
    const projectKey = getCatalogProjectKey(tool);
    if (projectKey) {
      uniqueProjects.add(projectKey);
    }
  });

  return uniqueProjects.size;
}

/** Same totals as the landing page statement cards. */
export function deriveCatalogStats(payload) {
  const tools = Array.isArray(payload?.tools) ? payload.tools : [];
  const summary = payload?.summary || {};

  if (tools.length === 0 && !summary.totalTools) {
    return FALLBACK_CATALOG_STATS;
  }

  const agentTemplates = countUniqueProjects(tools, isAgentSkill);
  const multiAgentSystems = countUniqueProjects(tools, isMultiAgentSkill);
  const mcpAgentSkills = countUniqueProjects(
    tools,
    (tool) => {
      const sourcePath = getSkillSourcePath(tool);
      return sourcePath.includes('/mcp-ai-agents/')
        || sourcePath.includes('mcp-builder')
        || sourcePath.includes('mcp-server')
        || sourcePath.includes('mcp-memory');
    }
  );
  const categories = Number(summary.totalCategories)
    || new Set(tools.map((tool) => tool.category).filter(Boolean)).size;

  return {
    skillsIndexed: Number(summary.markdownTools || summary.totalTools || tools.length)
      || FALLBACK_CATALOG_STATS.skillsIndexed,
    agentTemplates: agentTemplates || FALLBACK_CATALOG_STATS.agentTemplates,
    multiAgentSystems: multiAgentSystems || FALLBACK_CATALOG_STATS.multiAgentSystems,
    mcpAgentSkills: mcpAgentSkills || FALLBACK_CATALOG_STATS.mcpAgentSkills,
    categories: categories || FALLBACK_CATALOG_STATS.categories,
  };
}
