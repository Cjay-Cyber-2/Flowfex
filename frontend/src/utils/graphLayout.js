/** Client-side helpers for graph bounds, minimap, and level-of-detail. */

import { getGraphBounds } from './graphViewport';

export const GRAPH_LOD_SCALE = 0.42;

export function isCompactGraphScale(scale) {
  return scale < GRAPH_LOD_SCALE;
}

export function partitionGraphNodes(nodes = []) {
  const baseline = [];
  const task = [];
  for (const node of nodes) {
    if (node?.config?.group === 'baseline' || node?.config?.mandatory) {
      baseline.push(node);
    } else {
      task.push(node);
    }
  }
  return { baseline, task };
}

export const BASELINE_GROUP_ID = '__syniq_baseline_group__';

const BASELINE_CHIP_WIDTH = 248;
const BASELINE_CHIP_HEIGHT = 88;
const BASELINE_GAP_Y = 72;

// Earliest match wins, so 'completed' only surfaces once nothing else is pending.
const GROUP_STATE_PRIORITY = ['error', 'approval', 'active', 'paused', 'queued', 'idle', 'skipped', 'completed'];

export function aggregateGroupState(groupNodes = []) {
  if (groupNodes.length === 0) {
    return 'idle';
  }
  for (const state of GROUP_STATE_PRIORITY) {
    if (groupNodes.some((node) => node.state === state)) {
      return state;
    }
  }
  return 'completed';
}

/**
 * The compulsory baseline is identical on every run, so rendering it as N
 * separate nodes is noise. Collapse it to a single chip and rewire any edge
 * that crossed the group boundary onto that chip.
 */
export function buildDisplayGraph(nodes = [], edges = [], { collapsed = true } = {}) {
  const { baseline, task } = partitionGraphNodes(nodes);

  if (baseline.length === 0) {
    return { nodes, edges, baselineGroup: null };
  }

  if (!collapsed) {
    return {
      nodes,
      edges,
      baselineGroup: { count: baseline.length, nodes: baseline, collapsed: false },
    };
  }

  const hull = getGraphBounds(baseline, 0);
  const chip = {
    id: BASELINE_GROUP_ID,
    type: 'baseline',
    shape: 'rect',
    x: hull.minX,
    y: hull.minY,
    width: BASELINE_CHIP_WIDTH,
    height: BASELINE_CHIP_HEIGHT,
    title: `${baseline.length} baseline skills`,
    subtitle: 'Applied on every run',
    state: aggregateGroupState(baseline),
    icon: 'layers',
    confidence: 0,
    reasoning: `Syniq applies these ${baseline.length} baseline skills on every run, before any task-specific skill.`,
    alternatives: [],
    inputs: {},
    config: { group: 'baseline', collapsed: true, count: baseline.length },
    owner: 'Syniq Engine',
    skill: null,
    executionMetadata: {},
  };

  const shiftY = resolveTaskShift(task, chip);
  const shiftedTask = shiftY > 0
    ? task.map((node) => ({ ...node, y: node.y - shiftY }))
    : task;

  return {
    nodes: [chip, ...shiftedTask],
    edges: remapEdgesToGroup(edges, baseline, BASELINE_GROUP_ID),
    baselineGroup: {
      count: baseline.length,
      nodes: baseline,
      collapsed: true,
      state: chip.state,
    },
  };
}

/** Closes the vertical gap the expanded baseline band would have occupied. */
function resolveTaskShift(task, chip) {
  if (task.length === 0) {
    return 0;
  }
  const taskMinY = Math.min(...task.map((node) => node.y));
  return Math.max(0, taskMinY - (chip.y + chip.height + BASELINE_GAP_Y));
}

function remapEdgesToGroup(edges, baselineNodes, groupId) {
  const baselineIds = new Set(baselineNodes.map((node) => node.id));
  const resolve = (id) => (baselineIds.has(id) ? groupId : id);
  const seen = new Set();
  const remapped = [];

  for (const edge of edges) {
    const from = resolve(edge.from);
    const to = resolve(edge.to);
    if (from === to) {
      continue;
    }
    const key = `${from}->${to}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    remapped.push({ ...edge, from, to });
  }

  return remapped;
}

export function getBaselineHullBounds(baselineNodes, padding = 28) {
  if (!baselineNodes.length) {
    return null;
  }
  return getGraphBounds(baselineNodes, padding);
}

export function getMinimapViewportRect(transform, viewport, bounds) {
  if (!bounds?.width || !bounds?.height || !viewport?.width || !viewport?.height) {
    return null;
  }

  const worldLeft = -transform.x / transform.scale;
  const worldTop = -transform.y / transform.scale;
  const worldWidth = viewport.width / transform.scale;
  const worldHeight = viewport.height / transform.scale;

  const mapW = 120;
  const mapH = 80;
  const scale = Math.min(mapW / bounds.width, mapH / bounds.height);

  return {
    mapW,
    mapH,
    scale,
    bounds,
    viewX: (worldLeft - bounds.minX) * scale,
    viewY: (worldTop - bounds.minY) * scale,
    viewW: worldWidth * scale,
    viewH: worldHeight * scale,
  };
}
