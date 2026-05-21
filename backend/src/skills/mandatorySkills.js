/**
 * Compulsory Syniq skills — always attached on every orchestration run for any
 * connected AI assistant. Catalog folder paths (e.g. imported/openclaw/) are
 * import locations only, not runtime-specific products.
 */

/** @typedef {{ slug: string, stepTitle: string, category?: string }} MandatorySkillEntry */

/** @type {MandatorySkillEntry[]} */
export const MANDATORY_SKILL_CATALOG = [
  { slug: 'xiucheng-self-improving-agent', stepTitle: 'Self-improvement', category: 'productivity' },
  { slug: 'code-review', stepTitle: 'Code review', category: 'testing' },
  { slug: 'self-evolving-skill', stepTitle: 'Skill evolution', category: 'productivity' },
  { slug: 'ai-agent-helper', stepTitle: 'Agent helper', category: 'ai' },
  { slug: 'token-optimizer', stepTitle: 'Token efficiency', category: 'productivity' },
  { slug: 'cognitive-memory', stepTitle: 'Cognitive memory', category: 'rag' },
  { slug: 'openclaw-mem', stepTitle: 'Workspace memory', category: 'rag' },
  { slug: 'senior-architect', stepTitle: 'Architecture', category: 'backend' },
  { slug: 'vibe-coding', stepTitle: 'Implementation flow', category: 'code' },
  { slug: 'self-evolution', stepTitle: 'Self evolution', category: 'productivity' },
  { slug: 'deep-thinking', stepTitle: 'Deep thinking', category: 'research' },
  { slug: 'memory-never-forget', stepTitle: 'Persistent memory', category: 'rag' },
  { slug: 'clawbrain', stepTitle: 'Structured reasoning', category: 'ai' },
  { slug: 'self-discover-reasoning', stepTitle: 'Discover reasoning', category: 'research' },
  { slug: 'better-every-run', stepTitle: 'Better every run', category: 'productivity' },
  { slug: 'implementation-self-review', stepTitle: 'Implementation review', category: 'testing' },
  { slug: 'self-refine-reflection', stepTitle: 'Refine & reflect', category: 'productivity' },
  { slug: 'strategic-thinking', stepTitle: 'Strategic thinking', category: 'research' },
  { slug: 'creative-thinking', stepTitle: 'Creative thinking', category: 'ai' },
  { slug: 'analytical-thinking', stepTitle: 'Analytical thinking', category: 'research' },
  { slug: 'self-iteration-engine', stepTitle: 'Iteration engine', category: 'productivity', strong: true },
  { slug: 'ah-learning-system', stepTitle: 'Learning system', category: 'productivity' },
  { slug: 'agent-skills-for-context-engineering', stepTitle: 'Context engineering', category: 'ai' },
];

/** Injected first and emphasized on every orchestration. */
export const MANDATORY_STRONG_SLUGS = ['self-iteration-engine'];

export const MANDATORY_SKILL_SLUGS = MANDATORY_SKILL_CATALOG.map(entry => entry.slug);

const MANDATORY_SCORE = 0.99;
const MANDATORY_ID_PREFIX = 'skill.imported.openclaw.';

let cachedMandatoryIds = null;
let cachedMandatoryBySlug = null;

function buildIdCandidates(slug) {
  return [
    `${MANDATORY_ID_PREFIX}${slug}`,
    `skill.imported.syniq-mandatory.${slug}`,
    `skill.${slug}`,
  ];
}

export function resolveMandatorySkillEntry(slug) {
  return MANDATORY_SKILL_CATALOG.find(entry => entry.slug === slug) || null;
}

export function resolveMandatorySkillIds(registry) {
  if (!registry || typeof registry.getTool !== 'function') {
    return [];
  }

  if (cachedMandatoryIds) {
    return [...cachedMandatoryIds];
  }

  const resolved = [];
  const bySlug = new Map();
  const seen = new Set();

  for (const entry of MANDATORY_SKILL_CATALOG) {
    for (const candidateId of buildIdCandidates(entry.slug)) {
      if (seen.has(candidateId)) {
        continue;
      }
      const tool = registry.getTool(candidateId);
      if (tool) {
        seen.add(tool.id);
        resolved.push(tool.id);
        bySlug.set(entry.slug, tool.id);
        break;
      }
    }
  }

  if (typeof registry.getAllTools === 'function') {
    for (const tool of registry.getAllTools()) {
      const meta = tool.metadata || {};
      if (meta.syniq !== 'mandatory' || seen.has(tool.id)) {
        continue;
      }
      const slug = MANDATORY_SKILL_SLUGS.find(s => tool.id.includes(s));
      if (slug && !bySlug.has(slug)) {
        seen.add(tool.id);
        resolved.push(tool.id);
        bySlug.set(slug, tool.id);
      }
    }
  }

  cachedMandatoryIds = sortMandatoryIds(resolved);
  cachedMandatoryBySlug = bySlug;
  return [...cachedMandatoryIds];
}

function sortMandatoryIds(ids) {
  return [...ids].sort((leftId, rightId) => {
    const leftStrong = MANDATORY_STRONG_SLUGS.some((slug) => leftId.includes(slug));
    const rightStrong = MANDATORY_STRONG_SLUGS.some((slug) => rightId.includes(slug));
    if (leftStrong && !rightStrong) {
      return -1;
    }
    if (!leftStrong && rightStrong) {
      return 1;
    }
    return leftId.localeCompare(rightId);
  });
}

export function getMandatorySkillIdForSlug(slug, registry) {
  resolveMandatorySkillIds(registry);
  return cachedMandatoryBySlug?.get(slug) || null;
}

export function clearMandatorySkillCache() {
  cachedMandatoryIds = null;
  cachedMandatoryBySlug = null;
}

export function isMandatorySkillId(toolId) {
  if (!toolId) {
    return false;
  }
  if (MANDATORY_SKILL_SLUGS.some(slug => toolId.includes(slug))) {
    return true;
  }
  return toolId.includes('syniq-mandatory');
}

export function mergeMandatoryToolIds(toolIds, registry) {
  const mandatory = resolveMandatorySkillIds(registry);
  if (mandatory.length === 0) {
    return Array.isArray(toolIds) ? [...toolIds] : [];
  }
  const base = Array.isArray(toolIds) ? toolIds : [];
  return [...new Set([...mandatory, ...base])];
}

export function stripMandatoryFromBlockedIds(blockedSkillIds = []) {
  return (Array.isArray(blockedSkillIds) ? blockedSkillIds : []).filter(id => !isMandatorySkillId(id));
}

function normalizeMandatoryCandidate(tool) {
  const category = tool.metadata?.category || 'productivity';
  return {
    toolId: tool.id,
    toolName: tool.name || tool.id,
    description: tool.description || '',
    tags: Array.isArray(tool.metadata?.tags) ? tool.metadata.tags : [],
    category,
    matchedCategory: category,
    strategy: 'mandatory',
    score: MANDATORY_SCORE,
    tool,
  };
}

function resolveStepMeta(toolId, tool) {
  const slug = MANDATORY_SKILL_SLUGS.find(s => toolId.includes(s));
  const entry = slug ? resolveMandatorySkillEntry(slug) : null;
  return {
    title: entry?.stepTitle || tool?.name || 'Syniq baseline',
    category: entry?.category || tool?.metadata?.category || 'productivity',
    slug,
  };
}

export function injectMandatoryIntoRetrieval(retrieval, registry) {
  const mandatoryIds = resolveMandatorySkillIds(registry);
  if (mandatoryIds.length === 0 || !retrieval) {
    return retrieval;
  }

  const mergedByToolId = new Map(
    (Array.isArray(retrieval.merged) ? retrieval.merged : []).map(candidate => [candidate.toolId, candidate])
  );

  for (const toolId of mandatoryIds) {
    const tool = registry.getTool(toolId);
    if (!tool) {
      continue;
    }
    mergedByToolId.set(toolId, normalizeMandatoryCandidate(tool));
  }

  const merged = Array.from(mergedByToolId.values()).sort((left, right) => {
    const leftMandatory = isMandatorySkillId(left.toolId) ? 1 : 0;
    const rightMandatory = isMandatorySkillId(right.toolId) ? 1 : 0;
    if (rightMandatory !== leftMandatory) {
      return rightMandatory - leftMandatory;
    }
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.toolId.localeCompare(right.toolId);
  });

  return {
    ...retrieval,
    merged,
    mandatorySkillIds: mandatoryIds,
  };
}

export function injectMandatoryIntoSelection(selectedSteps, retrieval, intent, registry, options = {}) {
  if (!registry || typeof registry.getTool !== 'function') {
    return selectedSteps;
  }
  const mandatoryIds = resolveMandatorySkillIds(registry);
  if (mandatoryIds.length === 0) {
    return selectedSteps;
  }

  const minSlots = mandatoryIds.length + 6;
  const maxSkills = Math.max(options.maxSkills ?? 16, minSlots);
  const steps = Array.isArray(selectedSteps) ? [...selectedSteps] : [];
  const present = new Set(steps.map(step => step.toolId));
  const taskGoal = intent?.goal ? String(intent.goal).slice(0, 160) : '';

  for (const toolId of mandatoryIds) {
    if (present.has(toolId)) {
      continue;
    }

    const tool = registry.getTool(toolId);
    if (!tool) {
      continue;
    }

    while (steps.length >= maxSkills) {
      const removableIndex = steps.findIndex(step => !isMandatorySkillId(step.toolId));
      if (removableIndex < 0) {
        break;
      }
      present.delete(steps[removableIndex].toolId);
      steps.splice(removableIndex, 1);
    }

    if (steps.length >= maxSkills) {
      break;
    }

    const { title, category, slug } = resolveStepMeta(toolId, tool);
    const candidate =
      (Array.isArray(retrieval?.merged) ? retrieval.merged : []).find(entry => entry.toolId === toolId)
      || normalizeMandatoryCandidate(tool);

    steps.push({
      id: `plan-mandatory-${slug || toolId}`,
      stepId: `step-mandatory-${slug || toolId}`,
      title,
      objective: taskGoal
        ? `Apply Syniq compulsory skill "${title}" for: ${taskGoal}`
        : `Apply Syniq compulsory skill "${title}" on every request.`,
      capabilityCategory: category,
      requiresApproval: false,
      tool: candidate.tool,
      toolId: candidate.toolId,
      score: MANDATORY_SCORE,
      reasoning: MANDATORY_STRONG_SLUGS.some((slug) => toolId.includes(slug))
        ? `Syniq compulsory skill (high priority — iterate until quality bar met): ${tool.name || title}.`
        : `Syniq compulsory skill (always active): ${tool.name || title}.`,
      alternatives: [],
      mandatory: true,
    });
    present.add(toolId);
  }

  return steps;
}

export function assertMandatorySkillsRegistered(registry, logger = console) {
  resolveMandatorySkillIds(registry);
  const missing = MANDATORY_SKILL_SLUGS.filter(slug => !cachedMandatoryBySlug?.has(slug));

  if (missing.length === MANDATORY_SKILL_SLUGS.length) {
    logger.warn?.(
      '[Syniq] No compulsory skills registered. Add SKILL.md files under skills-md/imported/openclaw/ and restart.'
    );
    return false;
  }

  if (missing.length > 0) {
    logger.warn?.(`[Syniq] Missing compulsory skills (${missing.length}): ${missing.join(', ')}`);
  }

  logger.log?.(
    `[Syniq] Compulsory skills active (${(cachedMandatoryIds || []).length}/${MANDATORY_SKILL_SLUGS.length}): ` +
      (cachedMandatoryIds || []).join(', ')
  );
  return missing.length === 0;
}
