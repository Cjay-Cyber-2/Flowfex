import { ExecutionGraphSchema } from './schemas.js';
import { stableId, truncate } from './utils.js';
const NODE_WIDTH = 196;
const NODE_HEIGHT = 96;
const DECISION_SIZE = 118;
const GRAPH_PADDING_X = 180;
const GRAPH_PADDING_Y = 280;
const NODE_SPACING_X = 280;
const BRANCH_SPACING_Y = 200;
const CATEGORY_ICON_MAP = {
    api: 'globe',
    code: 'layers',
    text: 'file-text',
    data: 'database',
    security: 'shield',
    automation: 'shuffle',
    general: 'sparkles',
};
export class ExecutionGraphBuilder {
    buildGraph(selection, options) {
        const stepNodeIdByStepId = new Map();
        const stepIndexByStepId = new Map();
        const alternateTargets = new Set(selection.decisionNodes.map(decision => decision.alternateTargetStepId));
        for (const [index, step] of selection.selectedSteps.entries()) {
            stepNodeIdByStepId.set(step.id, stableId('node', step.id));
            stepIndexByStepId.set(step.id, index);
        }
        const decisionsBySourceStepId = new Map();
        const decisionNodeIdByDecisionId = new Map();
        for (const decision of selection.decisionNodes) {
            const existing = decisionsBySourceStepId.get(decision.sourceStepId) || [];
            existing.push(decision);
            decisionsBySourceStepId.set(decision.sourceStepId, existing);
            decisionNodeIdByDecisionId.set(decision.id, stableId('node', decision.id, decision.sourceStepId));
        }
        const exclusiveAlternateStepIds = new Set(selection.decisionNodes
            .filter(decision => isExclusiveAlternateBranch(decision, selection.selectedSteps, stepIndexByStepId))
            .map(decision => decision.alternateTargetStepId));
        const orderedNodes = [];
        for (const step of selection.selectedSteps) {
            orderedNodes.push({
                kind: 'skill',
                graphNodeId: stepNodeIdByStepId.get(step.id) || stableId('node', step.id),
                stepId: step.id,
                title: step.title,
                objective: step.objective,
                capabilityCategory: step.capabilityCategory,
                toolId: step.toolId,
                tool: step.tool,
                requiresApproval: step.requiresApproval,
                score: step.score,
                reasoning: step.reasoning,
                alternatives: step.alternatives,
                branchLane: alternateTargets.has(step.id) ? 1 : 0,
            });
            const stepDecisions = decisionsBySourceStepId.get(step.id) || [];
            for (const decision of stepDecisions) {
                orderedNodes.push({
                    kind: 'decision',
                    graphNodeId: stableId('node', decision.id, decision.sourceStepId),
                    decisionId: decision.id,
                    sourceStepId: decision.sourceStepId,
                    title: decision.title,
                    condition: decision.condition,
                    reasoning: decision.reasoning,
                    takeAlternateWhen: decision.takeAlternateWhen,
                });
            }
        }
        const graphNodes = orderedNodes.map((node, index) => {
            const x = GRAPH_PADDING_X + index * NODE_SPACING_X;
            if (node.kind === 'decision') {
                return {
                    id: node.graphNodeId,
                    type: 'decision',
                    shape: 'diamond',
                    x,
                    y: GRAPH_PADDING_Y,
                    width: DECISION_SIZE,
                    height: DECISION_SIZE,
                    title: truncate(node.title, 24),
                    subtitle: truncate(node.condition, 38),
                    state: 'queued',
                    icon: 'git-branch',
                    confidence: 1,
                    reasoning: node.reasoning,
                    alternatives: [],
                    inputs: {},
                    config: {
                        lane: 0,
                    },
                    owner: 'Flowfex Engine',
                    skill: null,
                    executionMetadata: {
                        branchCondition: node.condition,
                    },
                };
            }
            return {
                id: node.graphNodeId,
                type: node.capabilityCategory,
                shape: 'rect',
                x,
                y: GRAPH_PADDING_Y + node.branchLane * BRANCH_SPACING_Y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                title: truncate(node.title, 28),
                subtitle: truncate(node.tool.name, 34),
                state: 'queued',
                icon: CATEGORY_ICON_MAP[node.capabilityCategory] || 'sparkles',
                confidence: Number(node.score.toFixed(4)),
                reasoning: node.reasoning,
                alternatives: node.alternatives.map(mapAlternative),
                inputs: {
                    objective: node.objective,
                },
                config: {
                    lane: node.branchLane,
                },
                owner: node.tool.metadata?.source
                    ? String(node.tool.metadata.source)
                    : 'Flowfex Registry',
                skill: node.toolId,
                executionMetadata: {
                    category: node.capabilityCategory,
                    objective: node.objective,
                    selectionScore: node.score,
                    requiresApproval: node.requiresApproval,
                },
            };
        });
        const edges = [];
        const runtimeNodes = {};
        const outgoingEdges = {};
        const incomingEdgeIdByNode = {};
        const orderedIndexByNodeId = new Map();
        for (const [index, node] of graphNodes.entries()) {
            outgoingEdges[node.id] = [];
            incomingEdgeIdByNode[node.id] = null;
            orderedIndexByNodeId.set(node.id, index);
        }
        for (const orderedNode of orderedNodes) {
            if (orderedNode.kind === 'skill') {
                const runtimeNode = {
                    graphNodeId: orderedNode.graphNodeId,
                    kind: 'skill',
                    title: orderedNode.title,
                    objective: orderedNode.objective,
                    capabilityCategory: orderedNode.capabilityCategory,
                    tool: orderedNode.tool,
                    toolId: orderedNode.toolId,
                    requiresApproval: orderedNode.requiresApproval,
                    score: orderedNode.score,
                    reasoning: orderedNode.reasoning,
                    alternatives: orderedNode.alternatives,
                };
                runtimeNodes[orderedNode.graphNodeId] = runtimeNode;
            }
        }
        for (const [stepIndex, step] of selection.selectedSteps.entries()) {
            const fromNodeId = stepNodeIdByStepId.get(step.id);
            if (!fromNodeId) {
                continue;
            }
            const stepDecisions = decisionsBySourceStepId.get(step.id) || [];
            if (stepDecisions.length > 0) {
                for (const decision of stepDecisions) {
                    const decisionNodeId = decisionNodeIdByDecisionId.get(decision.id);
                    if (decisionNodeId) {
                        addEdge(edges, outgoingEdges, incomingEdgeIdByNode, {
                            id: stableId('edge', fromNodeId, decisionNodeId),
                            from: fromNodeId,
                            to: decisionNodeId,
                            state: 'queued',
                            label: null,
                            type: 'sequential',
                        });
                    }
                }
                continue;
            }
            const nextSkillNodeId = findNextVisibleSkillNodeId(selection.selectedSteps, stepNodeIdByStepId, exclusiveAlternateStepIds, stepIndex);
            if (nextSkillNodeId) {
                addEdge(edges, outgoingEdges, incomingEdgeIdByNode, {
                    id: stableId('edge', fromNodeId, nextSkillNodeId),
                    from: fromNodeId,
                    to: nextSkillNodeId,
                    state: 'queued',
                    label: null,
                    type: 'sequential',
                });
            }
        }
        for (const decision of selection.decisionNodes) {
            const decisionNodeId = decisionNodeIdByDecisionId.get(decision.id) || stableId('node', decision.id, decision.sourceStepId);
            const alternateTargetNodeId = stepNodeIdByStepId.get(decision.alternateTargetStepId);
            const sourceStepIndex = stepIndexByStepId.get(decision.sourceStepId) ?? -1;
            const exclusiveAlternate = exclusiveAlternateStepIds.has(decision.alternateTargetStepId);
            const sequentialTargetNodeId = sourceStepIndex >= 0
                ? findNextVisibleSkillNodeId(selection.selectedSteps, stepNodeIdByStepId, exclusiveAlternateStepIds, sourceStepIndex)
                : null;
            let sequentialEdge = null;
            let alternateEdge = null;
            if (sequentialTargetNodeId) {
                sequentialEdge = {
                    id: stableId('edge', decisionNodeId, sequentialTargetNodeId),
                    from: decisionNodeId,
                    to: sequentialTargetNodeId,
                    state: 'queued',
                    label: 'continue',
                    type: 'conditional',
                };
                addEdge(edges, outgoingEdges, incomingEdgeIdByNode, sequentialEdge);
            }
            if (alternateTargetNodeId) {
                alternateEdge = {
                    id: stableId('edge', decisionNodeId, alternateTargetNodeId, 'alternate'),
                    from: decisionNodeId,
                    to: alternateTargetNodeId,
                    state: 'inactive',
                    label: 'alternate',
                    type: 'conditional',
                };
                addEdge(edges, outgoingEdges, incomingEdgeIdByNode, alternateEdge);
            }
            const skippedNodeIdsOnAlternate = alternateTargetNodeId
                ? collectIntermediateNodeIds(orderedNodes, orderedIndexByNodeId, decisionNodeId, alternateTargetNodeId)
                : [];
            const skippedNodeIdsOnSequential = exclusiveAlternate && alternateTargetNodeId
                ? collectExclusiveBranchNodeIds(orderedNodes, orderedIndexByNodeId, alternateTargetNodeId, exclusiveAlternateStepIds)
                : [];
            const runtimeNode = {
                graphNodeId: decisionNodeId,
                kind: 'decision',
                title: decision.title,
                condition: decision.condition,
                alternateTargetNodeId: alternateTargetNodeId || '',
                sequentialTargetNodeId,
                takeAlternateWhen: decision.takeAlternateWhen,
                reasoning: decision.reasoning,
                alternateEdgeId: alternateEdge?.id || '',
                sequentialEdgeId: sequentialEdge?.id || null,
                skippedNodeIdsOnAlternate,
                skippedNodeIdsOnSequential,
            };
            runtimeNodes[decisionNodeId] = runtimeNode;
        }
        const graph = {
            sessionId: options.sessionId,
            executionId: options.executionId,
            nodes: graphNodes,
            edges,
        };
        ExecutionGraphSchema.parse(graph);
        return {
            graph,
            runtimeNodes,
            orderedNodeIds: orderedNodes.map(node => node.graphNodeId),
            entryNodeId: orderedNodes[0]?.graphNodeId || null,
            outgoingEdges,
            incomingEdgeIdByNode,
        };
    }
}
function mapAlternative(alternative) {
    return {
        toolId: alternative.toolId,
        name: alternative.name,
        score: alternative.score,
        confidence: alternative.confidence,
        reason: alternative.reason,
    };
}
function addEdge(edges, outgoingEdges, incomingEdgeIdByNode, edge) {
    edges.push(edge);
    outgoingEdges[edge.from]?.push(edge);
    incomingEdgeIdByNode[edge.to] = incomingEdgeIdByNode[edge.to] || edge.id;
}
function findNextVisibleSkillNodeId(selectedSteps, stepNodeIdByStepId, exclusiveAlternateStepIds, currentStepIndex) {
    for (let index = currentStepIndex + 1; index < selectedSteps.length; index += 1) {
        const nextStep = selectedSteps[index];
        if (!nextStep || exclusiveAlternateStepIds.has(nextStep.id)) {
            continue;
        }
        return stepNodeIdByStepId.get(nextStep.id) || null;
    }
    return null;
}
function collectIntermediateNodeIds(orderedNodes, orderedIndexByNodeId, fromNodeId, toNodeId) {
    const fromIndex = orderedIndexByNodeId.get(fromNodeId);
    const toIndex = orderedIndexByNodeId.get(toNodeId);
    if (typeof fromIndex !== 'number' || typeof toIndex !== 'number' || fromIndex >= toIndex) {
        return [];
    }
    return orderedNodes
        .slice(fromIndex + 1, toIndex)
        .map(node => node.graphNodeId);
}
function collectExclusiveBranchNodeIds(orderedNodes, orderedIndexByNodeId, alternateTargetNodeId, exclusiveAlternateStepIds) {
    const startIndex = orderedIndexByNodeId.get(alternateTargetNodeId);
    if (typeof startIndex !== 'number') {
        return [];
    }
    let endIndex = orderedNodes.length;
    for (let index = startIndex + 1; index < orderedNodes.length; index += 1) {
        const node = orderedNodes[index];
        if (node?.kind === 'skill' && !exclusiveAlternateStepIds.has(node.stepId)) {
            endIndex = index;
            break;
        }
    }
    return orderedNodes.slice(startIndex, endIndex).map(node => node.graphNodeId);
}
function isExclusiveAlternateBranch(decision, selectedSteps, stepIndexByStepId) {
    const alternateStepIndex = stepIndexByStepId.get(decision.alternateTargetStepId);
    if (typeof alternateStepIndex !== 'number') {
        return false;
    }
    const alternateStep = selectedSteps[alternateStepIndex];
    if (!alternateStep) {
        return false;
    }
    const alternateText = `${alternateStep.title} ${alternateStep.objective}`.toLowerCase();
    const branchText = `${decision.title} ${decision.condition} ${decision.reasoning}`.toLowerCase();
    const branchOnlyPattern = /\b(manual|fallback|review|reject|rejection|error|invalid|alternate|rerout|human|approval|rollback|backup|contingency|escalat)\b/;
    if (branchOnlyPattern.test(alternateText)) {
        return true;
    }
    const isTerminal = alternateStepIndex === selectedSteps.length - 1;
    return isTerminal && branchOnlyPattern.test(branchText);
}
