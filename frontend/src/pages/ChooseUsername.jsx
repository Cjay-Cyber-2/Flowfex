import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthBackdrop from '../components/auth/AuthBackdrop';
import SyniqLogoNew from '../components/SyniqLogoNew';
import { useSessionContext } from '../context/SessionContext';
import { setSyniqProfileUsername, userMustChooseSyniqUsername } from '../services/authService';
import '../styles/authPagesLayout.css';

function resolveReturnPath(location) {
  const from = location.state?.from;
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return '/onboarding';
}

export default function ChooseUsername() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionReady, isAuthenticated, user, refreshSession } = useSessionContext();
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    if (!isAuthenticated) {
      navigate('/signin', { replace: true });
    }
  }, [isAuthenticated, navigate, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !user) {
      return;
    }
    if (!userMustChooseSyniqUsername(user)) {
      navigate(resolveReturnPath(location), { replace: true });
    }
  }, [sessionReady, user, navigate, location]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setErrorMessage('Username must be at least 2 characters.');
      return;
    }
    if (!/^[\p{L}\p{N}._-]+$/u.test(trimmed)) {
      setErrorMessage('Username can use letters, numbers, dot, underscore, or hyphen.');
      return;
    }

    setIsSubmitting(true);
    try {
      await setSyniqProfileUsername(trimmed);
      await refreshSession();
      navigate(resolveReturnPath(location), { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save username.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sessionReady || !isAuthenticated) {
    return null;
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell__bg">
        <AuthBackdrop />
        <div className="auth-shell__bg-blur" />
      </div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <SyniqLogoNew size={34} animated={false} />
        </div>
        <h1 style={styles.title}>Choose your Syn-IQ username</h1>
        <p style={styles.subtitle}>
          This is how you appear in the app. You can use letters, numbers, dot, underscore, or hyphen.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="choose-username">USERNAME</label>
            <input
              id="choose-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, { borderColor: 'rgba(0,212,170,0.1)', boxShadow: 'none' })}
            />
          </div>
          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Continue'}
          </button>
        </form>

        {errorMessage ? <p style={styles.errorText}>{errorMessage}</p> : null}
      </motion.div>
    </div>
  );
}

const styles = {
  title: {
    fontFamily: 'var(--font-geist)',
    fontSize: 'clamp(22px, 3.6vw, 28px)',
    fontWeight: 700,
    color: 'var(--color-velin)',
    margin: '0 0 8px',
    textAlign: 'center',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-bistre)',
    margin: '0 0 18px',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  fieldGroup: { marginBottom: 12 },
  label: {
    display: 'block',
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-bistre)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 42,
    background: 'rgba(8,12,16,0.88)',
    border: '1px solid rgba(0,212,170,0.1)',
    borderRadius: 12,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: 'var(--color-velin)',
    padding: '0 14px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocus: { borderColor: 'var(--color-sinoper)', boxShadow: '0 0 0 3px rgba(0,212,170,0.12)' },
  submitBtn: {
    width: '100%',
    height: 44,
    background: 'var(--color-sinoper)',
    border: 'none',
    borderRadius: 12,
    fontFamily: 'var(--font-inter)',
    fontSize: 14,
    fontWeight: 700,
    color: '#031014',
    cursor: 'pointer',
    marginTop: 4,
    boxShadow: '0 18px 38px rgba(0,212,170,0.22)',
  },
  errorText: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    color: '#ff8d8d',
    textAlign: 'center',
    margin: '10px 0 0',
  },
};
