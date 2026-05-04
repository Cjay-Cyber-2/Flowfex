import { z } from 'zod';

// ─── Shared Base Schemas ──────────────────────────────────────────────────────

const sessionIdSchema = z.string().uuid({ message: "Invalid session ID format." });
const nodeIdSchema = z.string().min(1, { message: "Node ID is required." }).max(128);

// ─── API Schemas ──────────────────────────────────────────────────────────────

export const executeSchema = z.object({
  sessionId: sessionIdSchema.optional(), // Can be null/omitted for new sessions
  input: z.string().min(1, { message: "Input string is required." }).max(8192, { message: "Input exceeds maximum length." }),
  token: z.string().optional(),
});

export const connectSchema = z.object({
  sessionId: sessionIdSchema,
  agentId: z.string().optional(), // Currently agentId may be dynamically generated
  status: z.enum(['connected', 'disconnected', 'idle', 'working']).optional(),
  syncedAt: z.string().datetime().optional()
});

export const ingestSchema = z.object({
  task: z.string().min(1, { message: "Task is required." }).max(8192),
  token: z.string().optional(),
  sessionId: sessionIdSchema.optional()
});

export const createApiKeySchema = z.object({
  label: z.string().min(1, { message: "API Key label is required." }).max(100, { message: "Label must be 100 characters or less." })
});

export const anonymousValidateSchema = z.object({
  anonymousToken: z.string().optional()
});

export const sessionUpgradeSchema = z.object({
  anonymousToken: z.string().optional(),
  accessToken: z.string().optional()
});

export const skillsSearchSchema = z.object({
  query: z.string().max(500).optional()
});

export const emptySchema = z.object({}).passthrough();

// ─── Control Plane Schemas ────────────────────────────────────────────────────

export const approveSchema = z.object({
  // Typically, node ID is passed in the URL, but if it's in body, we validate it.
  // We'll primarily validate the body payload.
  input: z.any().optional(), // Approval payload could be anything
});

export const rejectSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const rerouteSchema = z.object({
  targetNodeId: z.string().min(1).max(128).optional(),
  feedback: z.string().max(2000).optional(),
});

export const constrainSchema = z.object({
  blockedSkillIds: z.array(z.string()).max(100).optional(),
  skillIds: z.array(z.string()).max(100).optional(), // Fallback for blockedSkillIds
});

// ─── Helper for Error Formatting ──────────────────────────────────────────────

export function formatZodError(error) {
  return error.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}
