import { z } from 'zod';
export declare const SuggestedExecutionStepSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    objective: z.ZodString;
    capabilityCategory: z.ZodString;
    requiresApproval: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const BranchPointSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    sourceStepId: z.ZodOptional<z.ZodString>;
    sourceStepIndex: z.ZodOptional<z.ZodNumber>;
    sourceStepTitle: z.ZodOptional<z.ZodString>;
    condition: z.ZodString;
    onTrue: z.ZodOptional<z.ZodString>;
    onFalse: z.ZodOptional<z.ZodString>;
    rationale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const TaskIntentSchema: z.ZodObject<{
    goal: z.ZodString;
    capabilityCategories: z.ZodArray<z.ZodString>;
    suggestedExecutionSteps: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        objective: z.ZodString;
        capabilityCategory: z.ZodString;
        requiresApproval: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>>;
    branchPoints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        sourceStepId: z.ZodOptional<z.ZodString>;
        sourceStepIndex: z.ZodOptional<z.ZodNumber>;
        sourceStepTitle: z.ZodOptional<z.ZodString>;
        condition: z.ZodString;
        onTrue: z.ZodOptional<z.ZodString>;
        onFalse: z.ZodOptional<z.ZodString>;
        rationale: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    confidence: z.ZodNumber;
    constraints: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const ExecutionGraphNodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    shape: z.ZodEnum<{
        rect: "rect";
        diamond: "diamond";
    }>;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    title: z.ZodString;
    subtitle: z.ZodString;
    state: z.ZodEnum<{
        completed: "completed";
        idle: "idle";
        queued: "queued";
        active: "active";
        approval: "approval";
        skipped: "skipped";
        error: "error";
        paused: "paused";
    }>;
    icon: z.ZodString;
    confidence: z.ZodNumber;
    reasoning: z.ZodString;
    alternatives: z.ZodArray<z.ZodObject<{
        toolId: z.ZodString;
        name: z.ZodString;
        score: z.ZodNumber;
        confidence: z.ZodNumber;
        reason: z.ZodString;
    }, z.core.$strip>>;
    inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    owner: z.ZodString;
    skill: z.ZodNullable<z.ZodString>;
    executionMetadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export declare const ExecutionGraphEdgeSchema: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodString;
    to: z.ZodString;
    state: z.ZodEnum<{
        completed: "completed";
        queued: "queued";
        active: "active";
        inactive: "inactive";
        rerouted: "rerouted";
    }>;
    label: z.ZodNullable<z.ZodString>;
    type: z.ZodEnum<{
        sequential: "sequential";
        conditional: "conditional";
    }>;
}, z.core.$strip>;
export declare const ExecutionGraphSchema: z.ZodObject<{
    sessionId: z.ZodString;
    executionId: z.ZodString;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        shape: z.ZodEnum<{
            rect: "rect";
            diamond: "diamond";
        }>;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        title: z.ZodString;
        subtitle: z.ZodString;
        state: z.ZodEnum<{
            completed: "completed";
            idle: "idle";
            queued: "queued";
            active: "active";
            approval: "approval";
            skipped: "skipped";
            error: "error";
            paused: "paused";
        }>;
        icon: z.ZodString;
        confidence: z.ZodNumber;
        reasoning: z.ZodString;
        alternatives: z.ZodArray<z.ZodObject<{
            toolId: z.ZodString;
            name: z.ZodString;
            score: z.ZodNumber;
            confidence: z.ZodNumber;
            reason: z.ZodString;
        }, z.core.$strip>>;
        inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        owner: z.ZodString;
        skill: z.ZodNullable<z.ZodString>;
        executionMetadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>>;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        from: z.ZodString;
        to: z.ZodString;
        state: z.ZodEnum<{
            completed: "completed";
            queued: "queued";
            active: "active";
            inactive: "inactive";
            rerouted: "rerouted";
        }>;
        label: z.ZodNullable<z.ZodString>;
        type: z.ZodEnum<{
            sequential: "sequential";
            conditional: "conditional";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
