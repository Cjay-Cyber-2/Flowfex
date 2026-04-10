import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Play } from 'lucide-react';

function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'var(--color-eigengrau)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)'
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        background: 'var(--color-wenge-ash)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        position: 'relative'
      }}>
        <button
          onClick={() => navigate('/canvas')}
          style={{
            position: 'absolute',
            top: 'var(--space-6)',
            right: 'var(--space-6)',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-bistre)',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        <h1 style={{
          fontFamily: 'var(--font-satoshi)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--color-velin)',
          marginBottom: 'var(--space-6)'
        }}>
          Session Detail: {id}
        </h1>

        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-bistre)',
          marginBottom: 'var(--space-8)'
        }}>
          Session details and execution timeline will be displayed here.
        </p>

        <button className="btn-primary" onClick={() => navigate('/canvas')}>
          <Play size={16} />
          Replay this flow
        </button>
      </div>
    </div>
  );
}

export default SessionDetail;
