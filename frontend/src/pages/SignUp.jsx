import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Globe, Github } from 'lucide-react';
import AuthBackdrop from '../components/auth/AuthBackdrop';
import SyniqLogoNew from '../components/SyniqLogoNew';
import { useSessionContext } from '../context/SessionContext';
import {
  signInWithGitHub,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrorMessages';
import '../styles/authPagesLayout.css';

const getStrength = (pw) => {
  if (!pw) return null;
  if (pw.length < 6) return { level: 1, label: 'Weak', color: 'var(--color-amber-muted)' };
  if (pw.length < 10) return { level: 2, label: 'Fair', color: 'var(--color-sinoper)' };
  return { level: 3, label: 'Strong', color: 'var(--color-massicot)' };
};

function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { configured, isAuthenticated, refreshSession, sessionReady } = useSessionContext();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const socialErrorCode = searchParams.get('error');

  const strength = getStrength(password);

  useEffect(() => {
    if (sessionReady && isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate, sessionReady]);

  useEffect(() => {
    if (!socialErrorCode) {
      return;
    }

    setErrorMessage(getAuthErrorMessage(socialErrorCode, 'Unable to complete social sign-up right now.'));
  }, [socialErrorCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');

    if (password !== confirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!username.trim() || username.trim().length < 2) {
      setErrorMessage('Username must be at least 2 characters.');
      return;
    }
    if (!/^[\p{L}\p{N}._-]+$/u.test(username.trim())) {
      setErrorMessage('Username can use letters, numbers, dot, underscore, or hyphen.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUpWithEmail(email, password, username.trim());

      if (result.needsEmailConfirmation) {
        setNoticeMessage('Check your inbox to confirm your email, then come back to sign in.');
      } else {
        await refreshSession();
        navigate('/app');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderSignIn = async (provider) => {
    setErrorMessage('');
    setNoticeMessage('');

    try {
      if (provider === 'google') {
        await signInWithGoogle('/app', '/signup');
        return;
      }

      await signInWithGitHub('/app', '/signup');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start social sign-in.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-shell__bg">
        <AuthBackdrop variant="signup" />
        <div className="auth-shell__bg-blur" />
      </div>

      <motion.div
        className="auth-card auth-card--signup"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={styles.logoRow}>
          <SyniqLogoNew size={34} animated={false} />
        </div>
        <h1 style={styles.title}>Start your session.</h1>
        <p style={styles.subtitle}>No credit card. No commitment. Just start.</p>

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
            <label style={styles.label}>USERNAME</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              autoComplete="username"
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
            {strength && (
              <div style={styles.strengthRow}>
                <div style={styles.strengthTrack}>
                  <div style={{ ...styles.strengthFill, width: `${(strength.level / 3) * 100}%`, background: strength.color }} />
                </div>
                <span style={{ ...styles.strengthLabel, color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>CONFIRM PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'} required value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ ...styles.input, paddingRight: 44 }}
                onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={e => Object.assign(e.target.style, { borderColor: 'rgba(0,212,170,0.1)', boxShadow: 'none' })}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {!configured ? (
          <p style={styles.legalText}>
            Authentication is being migrated to Better Auth. Finish the backend setup to enable sign-up.
          </p>
        ) : null}

        {noticeMessage ? <p style={styles.noticeText}>{noticeMessage}</p> : null}
        {errorMessage ? <p style={styles.errorText}>{errorMessage}</p> : null}

        <p style={styles.legalText}>
          By continuing you agree to Syniq's{' '}
          <a href="#terms" style={styles.legalLink}>Terms</a> and{' '}
          <a href="#privacy" style={styles.legalLink}>Privacy Policy</a>
        </p>
        <p style={styles.switchText}>
          Already have an account?{' '}
          <span style={styles.switchLink} onClick={() => navigate('/signin')}>Sign in</span>
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  logoRow: { display: 'flex', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: 'var(--font-geist)', fontSize: 'clamp(24px, 4vw, 30px)', fontWeight: 700, color: 'var(--color-velin)', margin: '0 0 6px', textAlign: 'center', letterSpacing: '-0.03em' },
  subtitle: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-bistre)', margin: '0 0 14px', textAlign: 'center' },
  socialRow: { display: 'flex', gap: 8, marginBottom: 10 },
  socialBtn: { flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,16,0.58)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 12, color: 'rgba(232,237,242,0.78)', fontFamily: 'Inter, sans-serif', fontSize: 11, cursor: 'pointer' },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  hairline: { flex: 1, height: 1, background: 'rgba(0,212,170,0.1)' },
  orText: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-bistre)' },
  fieldGroup: { marginBottom: 8 },
  label: { display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-bistre)', marginBottom: 6 },
  input: { width: '100%', height: 42, background: 'rgba(8,12,16,0.88)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 12, fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-velin)', padding: '0 14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
  inputFocus: { borderColor: 'var(--color-sinoper)', boxShadow: '0 0 0 3px rgba(0,212,170,0.12)' },
  eyeBtn: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-bistre)', cursor: 'pointer', padding: 0, display: 'flex' },
  strengthRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  strengthTrack: { flex: 1, height: 3, background: 'rgba(0,212,170,0.1)', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2, transition: 'width 0.3s, background 0.3s' },
  strengthLabel: { fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600 },
  submitBtn: { width: '100%', height: 44, background: 'var(--color-sinoper)', border: 'none', borderRadius: 12, fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 700, color: '#031014', cursor: 'pointer', marginBottom: 8, boxShadow: '0 18px 38px rgba(0,212,170,0.22)' },
  legalText: { fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--color-bistre)', textAlign: 'center', margin: '0 0 6px', lineHeight: 1.45 },
  noticeText: { fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--color-sinoper)', textAlign: 'center', margin: '0 0 6px' },
  errorText: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#ff8d8d', textAlign: 'center', margin: '0 0 6px' },
  legalLink: { color: 'var(--color-sinoper)', textDecoration: 'none' },
  switchText: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-bistre)', textAlign: 'center', margin: 0 },
  switchLink: { color: 'var(--color-sinoper)', cursor: 'pointer' },
};

export default SignUp;
