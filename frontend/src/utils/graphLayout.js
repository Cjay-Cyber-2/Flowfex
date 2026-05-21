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
