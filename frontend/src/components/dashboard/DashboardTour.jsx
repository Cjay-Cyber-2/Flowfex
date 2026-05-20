import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import useStore from '../../store/useStore';
import './DashboardTour.css';

const STORAGE_KEY = 'syniq_dashboard_tour_v1';

const STEPS = [
  {
    id: 'map',
    title: 'Map view',
    body: 'Map shows the full orchestration graph — every node, branch, and edge. Use it when you want the whole picture of how Syniq routed your session.',
    mode: 'map',
    target: 'canvas-modes',
  },
  {
    id: 'flow',
    title: 'Flow view',
    body: 'Flow highlights the active path: running, queued, and approval nodes stay bright while the rest fade back. Use it to focus on what is executing right now.',
    mode: 'flow',
    target: 'canvas-modes',
  },
  {
    id: 'live',
    title: 'Live view',
    body: 'Live keeps the canvas fully visible for real-time updates as your connected agent posts work through Syniq. Use it while an agent is actively orchestrating.',
    mode: 'live',
    target: 'canvas-modes',
  },
  {
    id: 'library',
    title: 'Syniq library',
    body: 'Skills, agents, and multi-agent totals match the live catalog. Expand a group to browse every indexed skill in that category.',
    target: 'library',
  },
  {
    id: 'agents',
    title: 'Connected agents',
    body: 'This panel lists agents currently attached to your workspace. The count is live — one connected agent shows as 1.',
    target: 'agents',
  },
  {
    id: 'graph',
    title: 'Orchestration graph',
    body: 'The graph is rendered from Syniq execution data — node positions, edges, and states match the backend plan. Pinch with two fingers to zoom; scroll with two fingers to pan.',
    target: 'graph',
  },
];

function readSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

function resolveTargetRect(target) {
  if (!target || typeof document === 'undefined') {
    return null;
  }

  const element = document.querySelector(`[data-tour="${target}"]`);
  if (!element) {
    return null;
  }

  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  const rect = element.getBoundingClientRect();
  const padding = 10;

  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
    height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
  };
}

function pickCardPlacement(rect) {
  if (!rect) {
    return { className: 'dashboard-tour-card--centered', style: {} };
  }

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const spaceBelow = viewportHeight - (rect.top + rect.height);
  const spaceAbove = rect.top;
  const cardMaxWidth = Math.min(480, viewportWidth - 32);

  if (spaceBelow >= 220) {
    return {
      className: 'dashboard-tour-card--below',
      style: {
        top: rect.top + rect.height + 16,
        left: Math.max(16, Math.min(rect.left, viewportWidth - cardMaxWidth - 16)),
        width: cardMaxWidth,
      },
    };
  }

  if (spaceAbove >= 220) {
    return {
      className: 'dashboard-tour-card--above',
      style: {
        bottom: viewportHeight - rect.top + 16,
        left: Math.max(16, Math.min(rect.left, viewportWidth - cardMaxWidth - 16)),
        width: cardMaxWidth,
      },
    };
  }

  return {
    className: 'dashboard-tour-card--side',
    style: {
      top: Math.max(16, rect.top),
      left: Math.min(viewportWidth - cardMaxWidth - 16, rect.left + rect.width + 16),
      width: cardMaxWidth,
    },
  };
}

export default function DashboardTour({ sessionReady }) {
  const setCanvasMode = useStore((s) => s.setCanvasMode);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const [cardPlacement, setCardPlacement] = useState({ className: 'dashboard-tour-card--centered', style: {} });

  useEffect(() => {
    if (!sessionReady) return;
    if (readSeen()) return;
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [sessionReady]);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    if (!open || !step?.mode) return;
    setCanvasMode(step.mode);
  }, [open, step?.mode, setCanvasMode]);

  const updateSpotlight = useCallback(() => {
    if (!open || !step) {
      return;
    }

    const rect = resolveTargetRect(step.target);
    setSpotlight(rect);
    setCardPlacement(pickCardPlacement(rect));
  }, [open, step]);

  useLayoutEffect(() => {
    updateSpotlight();
  }, [updateSpotlight, stepIndex]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onResize = () => updateSpotlight();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    const timer = window.setTimeout(updateSpotlight, 120);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updateSpotlight]);

  const close = useCallback(() => {
    writeSeen();
    setOpen(false);
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      close();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [close, isLast]);

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  if (!open || !step) {
    return null;
  }

  return (
    <div className="dashboard-tour-root" role="dialog" aria-modal="true" aria-labelledby="dashboard-tour-title">
      <div className="dashboard-tour-backdrop" aria-hidden="true">
        {spotlight ? (
          <div
            className="dashboard-tour-spotlight"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        ) : null}
      </div>
      <div
        className={`dashboard-tour-card ${cardPlacement.className} dashboard-tour-card--${step.target || step.id}`}
        style={cardPlacement.style}
      >
        <span className="dashboard-tour-kicker">
          Dashboard guide · {stepIndex + 1} / {STEPS.length}
        </span>
        <h2 id="dashboard-tour-title" className="dashboard-tour-title">{step.title}</h2>
        <p className="dashboard-tour-body">{step.body}</p>
        <div className="dashboard-tour-actions">
          <button type="button" className="btn btn-ghost" onClick={goPrev} disabled={isFirst}>
            Previous
          </button>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Done
          </button>
          <button type="button" className="btn btn-primary" onClick={goNext}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function resetDashboardTourForDev() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
