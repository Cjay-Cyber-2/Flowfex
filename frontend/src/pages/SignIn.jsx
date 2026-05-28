import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Globe, Github } from 'lucide-react';
import AuthBackdrop from '../components/auth/AuthBackdrop';
import SyniqLogoNew from '../components/SyniqLogoNew';
import { useSessionContext } from '../context/SessionContext';
import {
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
} from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrorMessages';
import { postAuthDashboardLocation, postAuthSocialCallbackPath } from '../utils/authNavigation';
import '../styles/authPagesLayout.css';

function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { configured, isAuthenticated, refreshSession, sessionReady } = useSessionContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const socialErrorCode = searchParams.get('error');
  const postAuthReason = location.state?.reason === 'anonymous_quota'
    ? 'anonymous_quota'
    : 'account_upgrade';

  useEffect(() => {
    if (sessionReady && isAuthenticated) {
      navigate(postAuthDashboardLocation(postAuthReason), { replace: true });
    }
  }, [isAuthenticated, navigate, postAuthReason, sessionReady]);

  useEffect(() => {
    if (!socialErrorCode) {
      return;
    }

    setErrorMessage(getAuthErrorMessage(socialErrorCode, 'Unable to complete social sign-in right now.'));
  }, [socialErrorCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await signInWithEmail(email, password);
      await refreshSession();
      navigate(postAuthDashboardLocation(postAuthReason), { replace: true });
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
        await signInWithGoogle(postAuthSocialCallbackPath(), '/signin');
        return;
      }

      await signInWithGitHub(postAuthSocialCallbackPath(), '/signin');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start social sign-in.');
    }
  };

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
        <div style={styles.logoRow}>
          <SyniqLogoNew size={36} animated={false} />
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

          <div style={{ textAlign: 'right', marginBottom: 14 }}>
            <span style={styles.forgotLink} onClick={() => navigate('/reset-password')}>Forgot password?</span>
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
  logoRow: { display: 'flex', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: 'var(--font-geist)', fontSize: 'clamp(26px, 4.2vw, 32px)', fontWeight: 700, color: 'var(--color-velin)', margin: '0 0 6px', textAlign: 'center', letterSpacing: '-0.03em' },
  subtitle: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-bistre)', margin: '0 0 16px', textAlign: 'center' },
  socialRow: { display: 'flex', gap: 10, marginBottom: 12 },
  socialBtn: { flex: 1, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,16,0.58)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 14, color: 'rgba(232,237,242,0.78)', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  hairline: { flex: 1, height: 1, background: 'rgba(0,212,170,0.1)' },
  orText: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-bistre)' },
  fieldGroup: { marginBottom: 10 },
  label: { display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-bistre)', marginBottom: 6 },
  input: { width: '100%', height: 44, background: 'rgba(8,12,16,0.88)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 12, fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-velin)', padding: '0 14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
  inputFocus: { borderColor: 'var(--color-sinoper)', boxShadow: '0 0 0 3px rgba(0,212,170,0.12)' },
  eyeBtn: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-bistre)', cursor: 'pointer', padding: 0, display: 'flex' },
  forgotLink: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-sinoper)', textDecoration: 'none', cursor: 'pointer' },
  submitBtn: { width: '100%', height: 46, background: 'var(--color-sinoper)', border: 'none', borderRadius: 12, fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 700, color: '#031014', cursor: 'pointer', marginBottom: 12, boxShadow: '0 18px 38px rgba(0,212,170,0.22)' },
  noticeText: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-bistre)', textAlign: 'center', margin: '0 0 12px' },
  errorText: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#ff8d8d', textAlign: 'center', margin: '0 0 16px' },
  switchText: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-bistre)', textAlign: 'center', margin: 0 },
  switchLink: { color: 'var(--color-sinoper)', cursor: 'pointer' },
};

export default SignIn;
