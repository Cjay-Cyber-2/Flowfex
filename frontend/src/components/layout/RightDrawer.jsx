import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Pause, RotateCcw, ShieldCheck, X, XCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import FlowIcon from '../common/FlowIcon';
import './RightDrawer.css';

function buildTimeline(node) {
  const state = node?.state || 'idle';
  const isApproval = state === 'approval';
  const isCompleted = state === 'completed';
  const isSkipped = state === 'skipped';

  return [
    { label: 'Queued', status: isSkipped ? 'complete' : state === 'idle' ? 'current' : 'complete' },
    {
      label: 'Running',
      status:
        state === 'queued'
          ? 'upcoming'
          : state === 'approval'
            ? 'complete'
            : state === 'active' || state === 'paused'
              ? 'current'
              : 'complete',
    },
    {
      label: isApproval ? 'Awaiting approval' : 'Result',
      status:
        isApproval
          ? 'current'
          : isCompleted
            ? 'complete'
            : isSkipped
              ? 'skipped'
              : 'upcoming',
    },
  ];
}

function formatStatusLabel(state) {
  switch (state) {
    case 'active':
      return 'Running';
    case 'approval':
      return 'Awaiting Approval';
    case 'completed':
      return 'Completed';
    case 'queued':
      return 'Queued';
    case 'paused':
      return 'Paused';
    case 'skipped':
      return 'Skipped';
    default:
      return 'Idle';
  }
}

function formatRelevanceScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }

  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function RightDrawer() {
  const {
    approveNode,
    pauseNode,
    rejectNode,
    rerouteNode,
    rightDrawerOpen,
    selectedNode,
    addNotification,
    setRightDrawerOpen,
    setSelectedNode,
    updateNode,
  } = useStore();
  const [draft, setDraft] = useState({
    title: '',
    subtitle: '',
    policy: '',
    timeout: '',
    owner: '',
  });
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    if (!selectedNode) return;

    setDraft({
      title: selectedNode.title || '',
      subtitle: selectedNode.subtitle || '',
      policy: selectedNode.config?.policy || '',
      timeout: selectedNode.config?.timeout || '',
      owner: selectedNode.owner || '',
    });
    setShowAlternatives(false);
  }, [selectedNode]);

  const timeline = useMemo(() => buildTimeline(selectedNode), [selectedNode]);
  const isActionable = ['approval', 'queued', 'active', 'paused'].includes(selectedNode?.state || '');

  const notify = (title, message, type = 'info') => {
    addNotification({ title, message, type });
  };

  const handleApprove = async () => {
    if (!selectedNode || !isActionable) return;
    const success = await approveNode(selectedNode.id);
    if (success) {
      notify('Step approved', `${selectedNode.title} will continue through the live path.`, 'success');
    }
  };

  const handleReject = async () => {
    if (!selectedNode || !isActionable) return;
    const success = await rejectNode(selectedNode.id);
    if (success) {
      notify('Step rejected', `${selectedNode.title} was moved off the main path.`, 'warning');
    }
  };

  const handleReroute = async () => {
    if (!selectedNode || !isActionable) return;
    const success = await rerouteNode(selectedNode.id);
    if (success) {
      notify('Path rerouted', `${selectedNode.title} is now flowing through the fallback lane.`, 'info');
    }
  };

  const handlePause = async () => {
    if (!selectedNode || !isActionable) return;
    const success = await pauseNode(selectedNode.id);
    if (success) {
      notify('Execution updated', `${selectedNode.title} was ${selectedNode.state === 'paused' ? 'resumed' : 'paused'}.`, 'info');
    }
  };

  const handleApplyChanges = () => {
    if (!selectedNode) return;

    updateNode(selectedNode.id, {
      title: draft.title,
      subtitle: draft.subtitle,
      owner: draft.owner,
      config: {
        ...selectedNode.config,
        policy: draft.policy,
        timeout: draft.timeout,
      },
    });
    notify('Changes applied', `${draft.title || selectedNode.title} was updated in the live graph.`, 'success');
  };

  if (!rightDrawerOpen) {
    return (
      <aside className="right-drawer right-drawer-empty">
        <div className="right-drawer-empty-copy">
          <span className="drawer-kicker">Node detail</span>
          <h3>Select a node</h3>
          <p>Reasoning, alternatives, and controls will appear here when you select a step.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="right-drawer">
      {selectedNode ? (
        <>
          <div className="drawer-header">
            <div className="drawer-title-group">
              <span className="drawer-node-icon">
                <FlowIcon name={selectedNode.icon} size={18} />
              </span>
              <div>
                <span className="drawer-kicker">{selectedNode.type}</span>
                <h3 className="drawer-title">{selectedNode.title}</h3>
              </div>
            </div>

            <div className={`status-pill status-pill-${selectedNode.state}`}>
              {formatStatusLabel(selectedNode.state)}
            </div>

            <button
              className="drawer-close-btn"
              onClick={() => {
                setSelectedNode(null);
                setRightDrawerOpen(false);
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="drawer-content" key={selectedNode.id}>
            <section className="drawer-section">
              <h4 className="drawer-section-heading">Decision Transparency</h4>

              <div className="reasoning-card">
                <span className="drawer-kicker">Why this was chosen</span>
                <p>{selectedNode.reasoning}</p>
                <div className="reasoning-score-row">
                  <span className="drawer-kicker">Relevance score</span>
                  <strong>{formatRelevanceScore(selectedNode.score ?? selectedNode.confidence)}</strong>
                </div>
              </div>

              <div className="alternatives-list">
                <button
                  className={`alternatives-toggle ${showAlternatives ? 'is-open' : ''}`}
                  onClick={() => setShowAlternatives((current) => !current)}
                >
                  <span className="drawer-kicker">Rejected alternatives</span>
                  <ChevronDown size={16} />
                </button>
                {showAlternatives
                  ? selectedNode.alternatives?.map((alternative) => (
                      <div key={alternative.name} className="alternative-row">
                        <div>
                          <strong>{alternative.name}</strong>
                          <p>{alternative.reason}</p>
                        </div>
                        <span>{formatRelevanceScore(alternative.score ?? alternative.confidence)} rejected</span>
                      </div>
                    ))
                  : null}
              </div>

              <div className="timeline-list">
                <span className="drawer-kicker">Current state</span>
                {timeline.map((item) => (
                  <div key={item.label} className={`timeline-row timeline-row-${item.status}`}>
                    <span className="timeline-dot" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="drawer-section">
              <h4 className="drawer-section-heading">Controls</h4>
              <div className={`drawer-actions ${isActionable ? '' : 'is-dormant'}`}>
                <button
                  className="btn btn-primary drawer-action-primary"
                  onClick={handleApprove}
                  disabled={!isActionable}
                >
                  <ShieldCheck size={16} />
                  Approve
                </button>
                <button className="btn btn-ghost" onClick={handleReject} disabled={!isActionable}>
                  <XCircle size={16} />
                  Reject
                </button>
                <button className="btn btn-ghost" onClick={handleReroute} disabled={!isActionable}>
                  <RotateCcw size={16} />
                  Reroute
                </button>
                <button className="btn btn-ghost" onClick={handlePause} disabled={!isActionable}>
                  <Pause size={16} />
                  Pause
                </button>
              </div>
            </section>

            <section className="drawer-section">
              <h4 className="drawer-section-heading">Configuration</h4>
              <div className="drawer-form-grid">
                <label>
                  <span className="drawer-kicker">Step Name</span>
                  <input
                    className="input"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="drawer-kicker">State Label</span>
                  <input
                    className="input"
                    value={draft.subtitle}
                    onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="drawer-kicker">Policy</span>
                  <input
                    className="input"
                    value={draft.policy}
                    onChange={(event) => setDraft((current) => ({ ...current, policy: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="drawer-kicker">Timeout</span>
                  <input
                    className="input"
                    value={draft.timeout}
                    onChange={(event) => setDraft((current) => ({ ...current, timeout: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="drawer-kicker">Owner</span>
                  <input
                    className="input"
                    value={draft.owner}
                    onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))}
                  />
                </label>
              </div>
            </section>

            <section className="drawer-section">
              <h4 className="drawer-section-heading">Metadata</h4>
              <div className="metadata-list">
                {Object.entries(selectedNode.inputs || {}).map(([key, value]) => (
                  <div key={key} className="metadata-row">
                    <span>{key}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>
            </section>

            {selectedNode.risks?.length ? (
              <section className="drawer-section">
                <h4 className="drawer-section-heading">Risks</h4>
                <div className="metadata-list">
                  {selectedNode.risks.map((risk) => (
                    <div key={risk} className="risk-row">
                      <span className="risk-dot" />
                      <p>{risk}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <button className="btn btn-primary drawer-apply-button" onClick={handleApplyChanges}>
              Apply Changes
            </button>
          </div>
        </>
      ) : (
        <div className="right-drawer-empty-copy">
          <span className="drawer-kicker">Node detail</span>
          <h3>Select a node</h3>
          <p>Reasoning, alternatives, and controls will appear here when you select a step.</p>
        </div>
      )}
    </aside>
  );
}

export default RightDrawer;
