import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Globe, Github } from 'lucide-react';
import LiveCanvasBackground from '../components/canvas/LiveCanvasBackground';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import { useSessionContext } from '../context/SessionContext';
import {
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
} from '../services/authService';

function SignIn() {
  const navigate = useNavigate();
  const { configured, isAuthenticated, sessionReady } = useSessionContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (sessionReady && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, sessionReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await signInWithEmail(email, password);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderSignIn = async (provider) => {
    setErrorMessage('');

    try {
      if (provider === 'google') {
        await signInWithGoogle();
        return;
      }

      await signInWithGitHub();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start social sign-in.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgWrap}>
        <LiveCanvasBackground />
        <div style={styles.bgBlur} />
      </div>

      <motion.div
        style={styles.card}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={styles.logoRow}>
          <FlowfexLogoNew size={38} animated={false} />
        </div>
        <h1 style={styles.title}>Welcome back.</h1>
        <p style={styles.subtitle}>Your orchestrations are waiting.</p>

        <div style={styles.socialRow}>
          {[{ icon: Globe, label: 'Continue with Google', provider: 'google' }, { icon: Github, label: 'Continue with GitHub', provider: 'github' }].map(({ icon: Icon, label, provider }) => (
            <button
              key={label}
              style={{ ...styles.socialBtn, opacity: isSubmitting ? 0.7 : 1 }}
              onClick={() => handleProviderSignIn(provider)}
              type="button"
              disabled={isSubmitting}
            >
              <Icon size={16} style={{ marginRight: 8 }} />{label}
            </button>
          ))}
        </div>

        <div style={styles.dividerRow}>
          <div style={styles.hairline} />
          <span style={styles.orText}>or</span>
          <div style={styles.hairline} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>EMAIL</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={e => Object.assign(e.target.style, { borderColor: 'rgba(0,212,170,0.1)', boxShadow: 'none' })}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...styles.input, paddingRight: 44 }}
                onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={e => Object.assign(e.target.style, { borderColor: 'rgba(0,212,170,0.1)', boxShadow: 'none' })}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <a href="#forgot" style={styles.forgotLink}>Forgot password?</a>
          </div>

          <button type="submit" style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {!configured ? (
          <p style={styles.noticeText}>
            Authentication is being migrated to Better Auth. Finish the backend setup to enable sign-in.
          </p>
        ) : null}

        {errorMessage ? <p style={styles.errorText}>{errorMessage}</p> : null}

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <span style={styles.switchLink} onClick={() => navigate('/signup')}>Sign up free</span>
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-eigengrau)', position: 'relative' },
  bgWrap: { position: 'fixed', inset: 0, zIndex: 0, opacity: 0.2 },
  bgBlur: { position: 'absolute', inset: 0, backdropFilter: 'blur(2px)' },
  card: {
    position: 'relative',
    zIndex: 1,
    width: 440,
    background: 'rgba(13, 19, 27, 0.86)',
    border: '1px solid rgba(0, 212, 170, 0.14)',
    boxShadow: '0 28px 90px rgba(0,0,0,0.38), 0 0 0 1px rgba(0,212,170,0.04)',
    backdropFilter: 'blur(32px) saturate(180%)',
    borderRadius: 24,
    padding: 48,
  },
  logoRow: { display: 'flex', justifyContent: 'center', marginBottom: 24 },
  title: { fontFamily: 'var(--font-geist)', fontSize: 32, fontWeight: 700, color: 'var(--color-velin)', margin: '0 0 8px', textAlign: 'center', letterSpacing: '-0.03em' },
  subtitle: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-bistre)', margin: '0 0 28px', textAlign: 'center' },
  socialRow: { display: 'flex', gap: 10, marginBottom: 20 },
  socialBtn: { flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,16,0.58)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 14, color: 'rgba(232,237,242,0.78)', fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer' },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  hairline: { flex: 1, height: 1, background: 'rgba(0,212,170,0.1)' },
  orText: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-bistre)' },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-bistre)', marginBottom: 6 },
  input: { width: '100%', height: 48, background: 'rgba(8,12,16,0.88)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 14, fontFamily: 'Inter, sans-serif', fontSize: 15, color: 'var(--color-velin)', padding: '0 16px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
  inputFocus: { borderColor: 'var(--color-sinoper)', boxShadow: '0 0 0 3px rgba(0,212,170,0.12)' },
  eyeBtn: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-bistre)', cursor: 'pointer', padding: 0, display: 'flex' },
  forgotLink: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-sinoper)', textDecoration: 'none' },
  submitBtn: { width: '100%', height: 50, background: 'var(--color-sinoper)', border: 'none', borderRadius: 14, fontFamily: 'var(--font-inter)', fontSize: 15, fontWeight: 700, color: '#031014', cursor: 'pointer', marginBottom: 20, boxShadow: '0 18px 38px rgba(0,212,170,0.22)' },
  noticeText: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-bistre)', textAlign: 'center', margin: '0 0 12px' },
  errorText: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#ff8d8d', textAlign: 'center', margin: '0 0 16px' },
  switchText: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-bistre)', textAlign: 'center', margin: 0 },
  switchLink: { color: 'var(--color-sinoper)', cursor: 'pointer' },
};

export default SignIn;
