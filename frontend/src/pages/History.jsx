import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';

function History() {
  const navigate = useNavigate();

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--color-eigengrau)',
      padding: 'var(--space-8)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/canvas')}
          className="btn-ghost"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <ArrowLeft size={16} />
          Back to Canvas
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-6)'
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/session/${i}`)}
            >
              <div style={{
                height: '120px',
                background: 'var(--color-eigengrau)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-bistre)'
              }}>
                Session Graph Preview
              </div>
              <h3 style={{
                fontFamily: 'var(--font-satoshi)',
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--color-velin)',
                marginBottom: 'var(--space-2)'
              }}>
                Session {i}
              </h3>
              <p style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-bistre)',
                marginBottom: 'var(--space-3)'
              }}>
                Sample task description for session {i}
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span className="badge badge-verdigris">COMPLETED</span>
                <span style={{
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-bistre)'
                }}>
                  2h ago
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default History;
