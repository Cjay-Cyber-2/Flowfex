import { isMandatorySkillId } from './mandatorySkills.js';

function isSkillToolId(toolId) {
  return typeof toolId === 'string' && (toolId.startsWith('skill.') || toolId.includes('.skill.'));
}

function isMemoryCapability(toolId, tool) {
  const category = String(tool?.metadata?.category || '').toLowerCase();
  const slug = String(toolId || '').toLowerCase();
  return (
    category === 'rag'
    || slug.includes('memory')
    || slug.includes('openclaw-mem')
    || slug.includes('cognitive-memory')
  );
}

function isWorkflowCapability(tool) {
  const category = String(tool?.metadata?.category || tool?.category || '').toLowerCase();
  return tool?.metadata?.syniq === 'workflow' || category === 'workflow';
}

/**
 * Summarize what Syniq attached for an orchestration run so connected agents
 * can report accurate usage footers (including compulsory baseline skills).
 */
export function buildSyniqUsageFromMandatoryIds(mandatorySkillIds = [], registry) {
  if (!registry || typeof registry.getTool !== 'function') {
    return buildSyniqUsageSummary([]);
  }
  const steps = (Array.isArray(mandatorySkillIds) ? mandatorySkillIds : [])
    .map((toolId) => {
      const tool = registry.getTool(toolId);
      if (!tool) {
        return null;
      }
      return { toolId, tool, mandatory: true };
    })
    .filter(Boolean);
  return buildSyniqUsageSummary(steps);
}

export function buildSyniqUsageSummary(selectedSteps = []) {
  const steps = Array.isArray(selectedSteps) ? selectedSteps : [];
  let skills = 0;
  let tools = 0;
  let workflows = 0;
  let memoryFiles = 0;
  let compulsorySkills = 0;
  let taskSkills = 0;

  for (const step of steps) {
    const toolId = step.toolId || '';
    const tool = step.tool;
    const mandatory = Boolean(step.mandatory) || isMandatorySkillId(toolId);

    if (isMemoryCapability(toolId, tool)) {
      memoryFiles += 1;
    }
    if (isWorkflowCapability(tool)) {
      workflows += 1;
    } else if (isSkillToolId(toolId)) {
      skills += 1;
    } else {
      tools += 1;
    }

    if (mandatory) {
      compulsorySkills += 1;
    } else if (isSkillToolId(toolId)) {
      taskSkills += 1;
    }
  }

  const footer = compulsorySkills > 0
    ? `Syniq usage: ${skills} skills (${compulsorySkills} compulsory baseline${taskSkills > 0 ? ` + ${taskSkills} task` : ''}), ${tools} tools, ${workflows} workflows, ${memoryFiles} memory files`
    : `Syniq usage: ${skills} skills, ${tools} tools, ${workflows} workflows, ${memoryFiles} memory files`;

  return {
    skills,
    tools,
    workflows,
    memoryFiles,
    compulsorySkills,
    taskSkills,
    total: steps.length,
    footer,
  };
}
