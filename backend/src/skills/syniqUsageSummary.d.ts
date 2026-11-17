import type { SelectedExecutionStep, ToolRegistryLike } from '../orchestration-engine-src/contracts.js';

export interface SyniqUsageSummary {
  skills: number;
  tools: number;
  workflows: number;
  memoryFiles: number;
  compulsorySkills: number;
  taskSkills: number;
  total: number;
  footer: string;
}

export function buildSyniqUsageFromMandatoryIds(
  mandatorySkillIds: string[] | undefined,
  registry: ToolRegistryLike
): SyniqUsageSummary;

export function buildSyniqUsageSummary(
  selectedSteps?: SelectedExecutionStep[]
): SyniqUsageSummary;
