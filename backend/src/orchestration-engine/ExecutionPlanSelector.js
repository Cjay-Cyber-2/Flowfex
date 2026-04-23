import { includesLoosePhrase, overlapScore, stableId, truncate } from './utils.js';
export class ExecutionPlanSelector {
    logger;
    constructor(config) {
        this.logger = config.logger;
    }
    selectPlan(intent, retrieval, options) {
        const maxSkills = options.maxSkills ?? 16;
        const minimumSelectionScore = options.minimumSelectionScore ?? 0.22;
        const steps = intent.suggestedExecutionSteps.slice(0, maxSkills);
        const selectedSteps = [];
        const rankings = [];
        const selectedToolUsage = new Map();
        let fallbackUsed = retrieval.fallbackUsed;
        for (const step of steps) {
            const candidatePool = (retrieval.byCategory[step.capabilityCategory] || retrieval.merged)
                .slice(0, 12);
            const rankedCandidates = candidatePool
                .map(candidate => rankCandidate(candidate, step, intent, selectedToolUsage))
                .sort((left, right) => {
                if (right.score !== left.score) {
                    return right.score - left.score;
                }
                return left.candidate.toolId.localeCompare(right.candidate.toolId);
            });
            const alternatives = rankedCandidates.slice(0, 4).map(rankToAlternative);
            const selected = rankedCandidates[0];
            const ranking = selected
                ? {
                    stepId: step.id,
                    stepTitle: step.title,
                    strategy: selected.candidate.strategy,
                    candidates: alternatives,
                    selectedToolId: selected.candidate.toolId,
                }
                : {
                    stepId: step.id,
                    stepTitle: step.title,
                    strategy: retrieval.strategy,
                    candidates: alternatives,
                };
            rankings.push(ranking);
            if (!selected || selected.score < minimumSelectionScore) {
                fallbackUsed = true;
                continue;
            }
            selectedToolUsage.set(selected.candidate.toolId, (selectedToolUsage.get(selected.candidate.toolId) || 0) + 1);
            selectedSteps.push({
                id: stableId('plan', step.id, selected.candidate.toolId),
                stepId: step.id,
                title: step.title,
                objective: step.objective,
                capabilityCategory: step.capabilityCategory,
                requiresApproval: resolveApprovalRequirement(step.requiresApproval, selected.candidate),
                tool: selected.candidate.tool,
                toolId: selected.candidate.toolId,
                score: selected.score,
                reasoning: buildSelectionReason(step, selected.candidate, selected.score),
                alternatives: alternatives.slice(1),
            });
        }
        const decisionNodes = resolveDecisionNodes(intent, selectedSteps);
        this.logger.info({
            event: 'orchestration.plan.selected',
            message: 'Execution plan selected from retrieved capabilities',
            sessionId: options.sessionId,
            executionId: options.executionId,
            selectedSkillCount: selectedSteps.length,
            decisionCount: decisionNodes.length,
            fallbackUsed,
            selectedToolIds: selectedSteps.map(step => step.toolId),
        });
        return {
            selectedSteps,
            decisionNodes,
            rankings,
            fallbackUsed,
        };
    }
}
function rankCandidate(candidate, step, intent, selectedToolUsage) {
    const categoryScore = normalizeCategoryScore(step.capabilityCategory, candidate.category);
    const objectiveScore = overlapScore(step.objective, `${candidate.toolName} ${candidate.description} ${candidate.tags.join(' ')}`);
    const goalScore = overlapScore(intent.goal, `${candidate.toolName} ${candidate.description}`);
    const approvalScore = step.requiresApproval && resolveApprovalRequirement(false, candidate) ? 0.06 : 0;
    const trustScore = String(candidate.tool.metadata?.validationStatus || '').toLowerCase() === 'approved' ? 0.05 : 0;
    const duplicatePenalty = (selectedToolUsage.get(candidate.toolId) || 0) * 0.08;
    const score = Number((candidate.score * 0.55
        + categoryScore * 0.2
        + objectiveScore * 0.15
        + goalScore * 0.09
        + approvalScore
        + trustScore
        - duplicatePenalty).toFixed(4));
    return { candidate, score };
}
function normalizeCategoryScore(expected, actual) {
    if (expected.toLowerCase() === actual.toLowerCase()) {
        return 1;
    }
    return includesLoosePhrase(actual, expected) || includesLoosePhrase(expected, actual) ? 0.6 : 0;
}
function rankToAlternative(entry) {
    return {
        toolId: entry.candidate.toolId,
        name: entry.candidate.toolName,
        score: entry.score,
        confidence: Math.round(entry.score * 100),
        category: entry.candidate.category,
        reason: `Matched ${entry.candidate.matchedCategory} via ${entry.candidate.strategy}`,
    };
}
function resolveApprovalRequirement(stepRequiresApproval, candidate) {
    if (stepRequiresApproval) {
        return true;
    }
    const metadata = candidate.tool.metadata || {};
    if (metadata.approvalRequired === true || metadata.requiresApproval === true) {
        return true;
    }
    const tags = Array.isArray(metadata.tags) ? metadata.tags.join(' ') : '';
    return /approval|review|manual|human/.test(tags.toLowerCase());
}
function buildSelectionReason(step, candidate, score) {
    return truncate(`${candidate.toolName} scored ${score.toFixed(2)} for ${step.capabilityCategory} because it aligns with "${step.objective}" and carries ${candidate.strategy} retrieval support.`, 220);
}
function resolveDecisionNodes(intent, selectedSteps) {
    if (selectedSteps.length < 2) {
        return [];
    }
    const decisionNodes = [];
    for (const branch of intent.branchPoints) {
        const sourceIndex = findSourceStepIndex(branch, selectedSteps);
        if (sourceIndex < 0 || sourceIndex >= selectedSteps.length - 1) {
            continue;
        }
        const alternateTarget = findAlternateTarget(branch, selectedSteps, sourceIndex);
        if (!alternateTarget) {
            continue;
        }
        decisionNodes.push({
            id: stableId('decision', branch.id, selectedSteps[sourceIndex]?.stepId || '', alternateTarget.stepId),
            sourceStepId: selectedSteps[sourceIndex]?.stepId || '',
            title: branch.sourceStepTitle || 'Branch decision',
            condition: branch.condition,
            alternateTargetStepId: alternateTarget.stepId,
            takeAlternateWhen: inferAlternateTiming(branch, alternateTarget.title),
            reasoning: branch.rationale || `Evaluates whether the flow should reroute from ${selectedSteps[sourceIndex]?.title || 'the selected step'}`,
        });
    }
    return decisionNodes;
}
function findSourceStepIndex(branch, steps) {
    if (typeof branch.sourceStepIndex === 'number') {
        return Math.max(0, branch.sourceStepIndex - 1);
    }
    if (branch.sourceStepId) {
        return steps.findIndex(step => step.stepId === branch.sourceStepId || step.id === branch.sourceStepId);
    }
    if (branch.sourceStepTitle) {
        return steps.findIndex(step => includesLoosePhrase(step.title, branch.sourceStepTitle || ''));
    }
    return -1;
}
function findAlternateTarget(branch, steps, sourceIndex) {
    const futureSteps = steps.slice(sourceIndex + 1);
    if (branch.onTrue) {
        const trueTarget = futureSteps.find(step => includesLoosePhrase(`${step.title} ${step.objective}`, branch.onTrue || ''));
        if (trueTarget) {
            return trueTarget;
        }
    }
    if (branch.onFalse) {
        const falseTarget = futureSteps.find(step => includesLoosePhrase(`${step.title} ${step.objective}`, branch.onFalse || ''));
        if (falseTarget) {
            return falseTarget;
        }
    }
    const fallbackStep = steps[sourceIndex + 2];
    return fallbackStep || null;
}
function inferAlternateTiming(branch, alternateTitle) {
    if (branch.onTrue && includesLoosePhrase(alternateTitle, branch.onTrue)) {
        return 'if_true';
    }
    if (branch.onFalse && includesLoosePhrase(alternateTitle, branch.onFalse)) {
        return 'if_false';
    }
    return 'if_true';
}
