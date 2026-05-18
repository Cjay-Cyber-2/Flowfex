import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import useStore from '../store/useStore';

function relativeTimestamp(iso) {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const deltaSeconds = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'live':
    case 'running':
    case 'active':
      return 'badge badge-verdigris';
    case 'awaiting_approval':
    case 'paused':
      return 'badge badge-amber';
    case 'failed':
    case 'error':
      return 'badge badge-error';
    case 'completed':
      return 'badge badge-verdigris';
    default:
      return 'badge';
  }
}

function History() {
  const navigate = useNavigate();
  const sessions = useStore((state) => state.sessions);
  const [query, setQuery] = useState('');

  const filteredSessions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return sessions;
    return sessions.filter((session) => {
      const haystack = [session.name, session.task, session.status, session.heartbeat]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [sessions, query]);

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--color-eigengrau)',
      padding: 'var(--space-8)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-ghost"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <h1 style={{
          fontFamily: 'var(--font-satoshi)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--color-velin)',
          marginBottom: 'var(--space-6)'
        }}>
          Session History
        </h1>

        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <input
              type="text"
              className="input"
              placeholder="Search sessions..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ paddingLeft: 'var(--space-10)' }}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 'var(--space-4)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-bistre)'
              }}
            />
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--color-bistre)',
            }}
          >
            <h3 style={{
              fontFamily: 'var(--font-satoshi)',
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--color-velin)',
              marginBottom: 'var(--space-3)'
            }}>
              No sessions yet
            </h3>
            <p style={{ marginBottom: 'var(--space-4)' }}>
              Connect an agent and run a task to see it here. Every Syniq session
              is recorded the moment your agent's first request is verified.
            </p>
            <button className="btn-primary" onClick={() => navigate('/app')}>
              Connect Agent
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)'
          }}>
            {filteredSessions.map((session) => {
              const elapsed = session.elapsed
                || relativeTimestamp(session.lastActiveAt || session.updatedAt || session.createdAt)
                || '\u2014';
              const status = (session.status || 'ready').toUpperCase();
              const heartbeat = session.heartbeat || 'No live updates yet';

              return (
                <div
                  key={session.id}
                  className="card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/session/${session.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/session/${session.id}`);
                    }
                  }}
                >
                  <div style={{
                    height: '120px',
                    background: 'var(--color-eigengrau)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-bistre)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: 'var(--text-sm)',
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                  }}>
                    {heartbeat}
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-satoshi)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-velin)',
                    marginBottom: 'var(--space-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {session.name || 'Syniq session'}
                  </h3>
                  <p style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-bistre)',
                    marginBottom: 'var(--space-3)',
                    minHeight: '2.6em',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {session.task || 'Live orchestration session'}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className={statusBadgeClass(session.status)}>{status}</span>
                    <span style={{
                      fontFamily: 'var(--font-jetbrains)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-bistre)'
                    }}>
                      {elapsed}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
