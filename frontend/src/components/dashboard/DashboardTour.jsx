import React, { useCallback, useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import './DashboardTour.css';

const STORAGE_KEY = 'syniq_dashboard_tour_v1';

const STEPS = [
  {
    id: 'map',
    title: 'Map view',
    body: 'Map shows the full orchestration graph — every node, branch, and edge. Use it when you want the whole picture of how Syniq routed your session.',
    mode: 'map',
  },
  {
    id: 'flow',
    title: 'Flow view',
    body: 'Flow highlights the active path: running, queued, and approval nodes stay bright while the rest fade back. Use it to focus on what is executing right now.',
    mode: 'flow',
  },
  {
    id: 'live',
    title: 'Live view',
    body: 'Live keeps the canvas fully visible for real-time updates as your connected agent posts work through Syniq. Use it while an agent is actively orchestrating.',
    mode: 'live',
  },
  {
    id: 'library',
    title: 'Syniq library',
    body: 'Grouped skill cards show how many tools and skills Syniq has indexed per category. Search filters categories; counts reflect the live catalog.',
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

export default function DashboardTour({ sessionReady }) {
  const setCanvasMode = useStore((s) => s.setCanvasMode);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

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
      <div className="dashboard-tour-backdrop" aria-hidden="true" />
      <div className={`dashboard-tour-card dashboard-tour-card--${step.target || step.id}`}>
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
