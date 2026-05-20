/** Layout helpers — keep canvas viewport aligned with backend graph coordinates. */

const DEFAULT_NODE_WIDTH = 196;
const DEFAULT_NODE_HEIGHT = 96;
const FIT_PADDING = 72;

export function getNodeBox(node) {
  const width = Number(node.width) || DEFAULT_NODE_WIDTH;
  const height = Number(node.height) || DEFAULT_NODE_HEIGHT;
  const x = Number(node.x) || 0;
  const y = Number(node.y) || 0;

  if (node.shape === 'diamond') {
    return {
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    };
  }

  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

export function getGraphBounds(nodes, padding = FIT_PADDING) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 800,
      maxY: 480,
      width: 800,
      height: 480,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const box = getNodeBox(node);
    minX = Math.min(minX, box.left);
    minY = Math.min(minY, box.top);
    maxX = Math.max(maxX, box.right);
    maxY = Math.max(maxY, box.bottom);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export function clampScale(scale, minScale, maxScale) {
  return Math.min(Math.max(scale, minScale), maxScale);
}

export function fitTransformToGraph(nodes, viewport, options = {}) {
  const { minScale = 0.2, maxScale = 2.5, padding = FIT_PADDING } = options;
  const bounds = getGraphBounds(nodes, padding);

  if (!viewport.width || !viewport.height || bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  const scale = clampScale(
    Math.min(viewport.width / bounds.width, viewport.height / bounds.height),
    minScale,
    maxScale
  );

  return {
    scale,
    x: (viewport.width - bounds.width * scale) / 2 - bounds.minX * scale,
    y: (viewport.height - bounds.height * scale) / 2 - bounds.minY * scale,
  };
}

/** Trackpad: pinch (ctrl/meta + wheel) zooms; two-finger scroll pans. */
export function isPinchZoomWheelEvent(event) {
  return event.ctrlKey || event.metaKey;
}
