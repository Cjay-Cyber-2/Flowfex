import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Play, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';
import { getBackendOrigin } from '../utils/runtimeConfig';
import { buildWorkspaceAuthRequestInit } from '../services/sessionRequestAuth';

function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessions = useStore((state) => state.sessions);
  const setActiveSession = useStore((state) => state.setActiveSession);

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const knownSession = useMemo(
    () => sessions.find((session) => session.id === id) || null,
    [sessions, id]
  );

  useEffect(() => {
    let cancelled = false;
    const backendOrigin = getBackendOrigin();
    if (!id || !backendOrigin) {
      setLoading(false);
      return () => undefined;
    }

    setLoading(true);
    setError(null);

    buildWorkspaceAuthRequestInit()
      .then((requestInit) => fetch(`${backendOrigin}/session/${encodeURIComponent(id)}/state`, requestInit))
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error?.message || `Backend returned ${response.status}`);
        }
        return payload;
      })
      .then((payload) => {
        if (!cancelled) {
          setSnapshot(payload?.snapshot || null);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load session');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const nodes = Array.isArray(snapshot?.graph?.nodes) ? snapshot.graph.nodes : [];
  const edges = Array.isArray(snapshot?.graph?.edges) ? snapshot.graph.edges : [];
  const status = snapshot?.status || knownSession?.status || 'unknown';

  const handleReopen = () => {
    if (knownSession) {
      setActiveSession(knownSession);
    }
    navigate('/dashboard');
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--color-eigengrau)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: 'var(--space-8)'
    }}>
      <div style={{
        maxWidth: '1080px',
        width: '100%',
        background: 'var(--color-wenge-ash)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        position: 'relative'
      }}>
        <button
          onClick={() => navigate('/history')}
          style={{
            position: 'absolute',
            top: 'var(--space-6)',
            right: 'var(--space-6)',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-bistre)',
            cursor: 'pointer'
          }}
          aria-label="Close session detail"
        >
          <X size={24} />
        </button>

        <span style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 999,
          background: 'rgba(0, 212, 170, 0.12)',
          color: 'var(--color-sinoper)',
          fontFamily: 'var(--font-space-grotesk, var(--font-inter))',
          fontSize: '0.65rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: 'var(--space-3)',
        }}>
          {status}
        </span>

        <h1 style={{
          fontFamily: 'var(--font-satoshi)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--color-velin)',
          marginBottom: 'var(--space-2)'
        }}>
          {knownSession?.name || 'Syn-IQ session'}
        </h1>

        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-bistre)',
          marginBottom: 'var(--space-6)'
        }}>
          {knownSession?.task || 'Live orchestration session'} · ID <code>{id}</code>
        </p>

        {loading ? (
          <p style={{ color: 'var(--color-bistre)' }}>Loading session state…</p>
        ) : error ? (
          <div style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 130, 130, 0.18)',
            background: 'rgba(67, 22, 22, 0.4)',
            color: 'var(--color-velin)',
            marginBottom: 'var(--space-4)',
          }}>
            <strong>Could not load this session.</strong>
            <p style={{ marginTop: 'var(--space-2)', color: 'rgba(232, 237, 242, 0.78)' }}>{error}</p>
            <button
              className="btn-ghost"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <SummaryCard label="Nodes" value={nodes.length} />
              <SummaryCard label="Edges" value={edges.length} />
              <SummaryCard label="Revision" value={snapshot?.revision ?? 0} />
              <SummaryCard
                label="Current node"
                value={snapshot?.currentNodeId || '—'}
              />
            </div>

            <h2 style={{
              fontFamily: 'var(--font-satoshi)',
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--color-velin)',
              marginBottom: 'var(--space-3)'
            }}>
              Execution timeline
            </h2>

            {nodes.length === 0 ? (
              <p style={{
                color: 'var(--color-bistre)',
                marginBottom: 'var(--space-6)',
              }}>
                No nodes captured for this session yet. Once the connected agent sends
                its first request, the orchestration timeline will appear here.
              </p>
            ) : (
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 var(--space-6)',
                display: 'grid',
                gap: 'var(--space-3)',
              }}>
                {nodes.map((node) => (
                  <li
                    key={node.id}
                    style={{
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-eigengrau)',
                      border: '1px solid rgba(0, 212, 170, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{
                        display: 'block',
                        color: 'var(--color-velin)',
                        fontFamily: 'var(--font-inter)',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {node.title || node.id}
                      </strong>
                      <span style={{
                        color: 'var(--color-bistre)',
                        fontSize: 'var(--text-sm)',
                      }}>
                        {node.subtitle || node.type || '—'}
                      </span>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: 'var(--color-velin)',
                      fontFamily: 'var(--font-jetbrains)',
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}>
                      {node.state || 'idle'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleReopen}>
            <Play size={16} />
            Open in Dashboard
          </button>
          <button className="btn-ghost" onClick={() => navigate('/history')}>
            Back to history
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-eigengrau)',
      border: '1px solid rgba(0, 212, 170, 0.06)',
    }}>
      <span style={{
        display: 'block',
        fontFamily: 'var(--font-space-grotesk, var(--font-inter))',
        fontSize: '0.6rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--color-bistre)',
        marginBottom: '6px',
      }}>
        {label}
      </span>
      <strong style={{
        color: 'var(--color-velin)',
        fontFamily: 'var(--font-inter)',
        fontSize: 'var(--text-base)',
        wordBreak: 'break-word',
      }}>
        {value}
      </strong>
    </div>
  );
}

export default SessionDetail;
