import React, { useState } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import './ApprovalsQueue.css';

function ApprovalsQueue({ approvals = [], onApprove, onReject }) {
  const [expandedId, setExpandedId] = useState(null);

  if (approvals.length === 0) {
    return (
      <div className="approvals-queue empty">
        <div className="all-clear">
          <div className="all-clear-icon">✓</div>
          <p>All clear</p>
        </div>
      </div>
    );
  }

  const formatTimeSince = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="approvals-queue">
      <div className="queue-header">
        <h3>Pending Approvals</h3>
        <span className="queue-count">{approvals.length}</span>
      </div>

      <div className="queue-list">
        {approvals.map((approval, index) => (
          <div
            key={approval.id}
            className={`approval-card ${expandedId === approval.id ? 'expanded' : ''}`}
            style={{ '--index': index }}
          >
            <div className="approval-header" onClick={() => setExpandedId(expandedId === approval.id ? null : approval.id)}>
              <div className="approval-icon">
                {approval.type === 'tool' && '🔧'}
                {approval.type === 'decision' && '🤔'}
                {approval.type === 'risk' && <AlertCircle size={16} />}
              </div>
              <div className="approval-info">
                <h4>{approval.title}</h4>
                <div className="approval-meta">
                  <Clock size={12} />
                  <span>{formatTimeSince(approval.timestamp)}</span>
                  {approval.confidence && (
                    <span className="confidence">
                      {Math.round(approval.confidence * 100)}% confident
                    </span>
                  )}
                </div>
              </div>
            </div>

            {expandedId === approval.id && (
              <div className="approval-details">
                <p className="approval-reasoning">{approval.reasoning}</p>
                
                {approval.alternatives && approval.alternatives.length > 0 && (
                  <div className="approval-alternatives">
                    <h5>Alternatives considered:</h5>
                    <ul>
                      {approval.alternatives.map((alt, i) => (
                        <li key={i}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {approval.risks && approval.risks.length > 0 && (
                  <div className="approval-risks">
                    <h5>Potential risks:</h5>
                    <ul>
                      {approval.risks.map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="approval-actions">
              <button
                className="btn-approve"
                onClick={() => onApprove(approval.id)}
                aria-label="Approve"
              >
                <Check size={16} />
                <span>Approve</span>
              </button>
              <button
                className="btn-reject"
                onClick={() => onReject(approval.id)}
                aria-label="Reject"
              >
                <X size={16} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApprovalsQueue;
