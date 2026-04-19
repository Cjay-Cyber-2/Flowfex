import { z } from 'zod';

export const SuggestedExecutionStepSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  capabilityCategory: z.string().trim().min(1),
  requiresApproval: z.boolean().optional().default(false),
});

export const BranchPointSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sourceStepId: z.string().trim().min(1).optional(),
  sourceStepIndex: z.number().int().positive().optional(),
  sourceStepTitle: z.string().trim().min(1).optional(),
  condition: z.string().trim().min(1),
  onTrue: z.string().trim().min(1).optional(),
  onFalse: z.string().trim().min(1).optional(),
  rationale: z.string().trim().min(1).optional(),
});

export const TaskIntentSchema = z.object({
  goal: z.string().trim().min(1),
  capabilityCategories: z.array(z.string().trim().min(1)).min(1).max(8),
  suggestedExecutionSteps: z.array(SuggestedExecutionStepSchema).min(1).max(8),
  branchPoints: z.array(BranchPointSchema).max(4).default([]),
  confidence: z.number().min(0).max(1),
  constraints: z.array(z.string().trim().min(1)).max(12).default([]),
});

export const ExecutionGraphNodeSchema = z.object({
  id: z.string().trim().min(1),
  type: z.string().trim().min(1),
  shape: z.enum(['rect', 'diamond']),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  title: z.string().trim().min(1),
  subtitle: z.string(),
  state: z.enum(['idle', 'queued', 'active', 'approval', 'completed', 'skipped', 'error', 'paused']),
  icon: z.string().trim().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alternatives: z.array(
    z.object({
      toolId: z.string().trim().min(1),
      name: z.string().trim().min(1),
      score: z.number(),
      confidence: z.number(),
      reason: z.string(),
    })
  ),
  inputs: z.record(z.string(), z.unknown()),
  config: z.record(z.string(), z.unknown()),
  owner: z.string().trim().min(1),
  skill: z.string().trim().min(1).nullable(),
  executionMetadata: z.record(z.string(), z.unknown()),
});

export const ExecutionGraphEdgeSchema = z.object({
  id: z.string().trim().min(1),
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  state: z.enum(['inactive', 'queued', 'active', 'completed', 'rerouted']),
  label: z.string().nullable(),
  type: z.enum(['sequential', 'conditional']),
});

export const ExecutionGraphSchema = z.object({
  sessionId: z.string().trim().min(1),
  executionId: z.string().trim().min(1),
  nodes: z.array(ExecutionGraphNodeSchema),
  edges: z.array(ExecutionGraphEdgeSchema),
});
