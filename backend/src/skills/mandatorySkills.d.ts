import type {
  CapabilityRetrievalResult,
  PlanSelectionResult,
  SelectedExecutionStep,
  TaskIntent,
  ToolRegistryLike,
} from '../orchestration-engine-src/contracts.js';

export interface MandatorySkillEntry {
  slug: string;
  stepTitle: string;
  category?: string;
  strong?: boolean;
}

export const MANDATORY_SKILL_CATALOG: MandatorySkillEntry[];
export const MANDATORY_STRONG_SLUGS: string[];
export const MANDATORY_SKILL_SLUGS: string[];

export function resolveMandatorySkillEntry(slug: string): MandatorySkillEntry | null;
export function resolveMandatorySkillIds(registry: ToolRegistryLike): string[];
export function getMandatorySkillIdForSlug(slug: string, registry: ToolRegistryLike): string | null;
export function clearMandatorySkillCache(): void;
export function isMandatorySkillId(toolId: string | null | undefined): boolean;
export function mergeMandatoryToolIds(toolIds: string[] | undefined, registry: ToolRegistryLike): string[];
export function stripMandatoryFromBlockedIds(blockedSkillIds?: string[]): string[];

export function injectMandatoryIntoRetrieval(
  retrieval: CapabilityRetrievalResult,
  registry: ToolRegistryLike
): CapabilityRetrievalResult & { mandatorySkillIds?: string[] };

export function injectMandatoryIntoSelection(
  selectedSteps: SelectedExecutionStep[],
  retrieval: CapabilityRetrievalResult,
  intent: TaskIntent,
  registry: ToolRegistryLike | undefined,
  options?: { maxSkills?: number }
): SelectedExecutionStep[];

export function assertMandatorySkillsRegistered(
  registry: ToolRegistryLike,
  logger?: { warn?: (...args: unknown[]) => void; log?: (...args: unknown[]) => void }
): boolean;
