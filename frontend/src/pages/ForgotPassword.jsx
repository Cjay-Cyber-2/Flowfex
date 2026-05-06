import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import AuthBackdrop from '../components/auth/AuthBackdrop';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import { useSessionContext } from '../context/SessionContext';
import { requestPasswordReset, resetPassword } from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrorMessages';

function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, refreshSession, sessionReady } = useSessionContext();
  const token = searchParams.get('token') || '';
  const resetError = searchParams.get('error') || '';
  const isResetMode = Boolean(token);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(resetError ? getAuthErrorMessage(resetError, 'That reset link is invalid or expired. Request a new one.') : '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionReady && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, sessionReady]);

  const heading = useMemo(
    () => (isResetMode ? 'Set a new password.' : 'Reset your password.'),
    [isResetMode]
  );

  const subtitle = useMemo(
    () => (isResetMode
      ? 'Choose a new password for your Flowfex account.'
      : 'Enter the account email and Flowfex will send a reset link.'),
    [isResetMode]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (isResetMode && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isResetMode) {
        await resetPassword(token, password);
        await refreshSession();
        setNotice('Password updated. Sign in with the new password.');
        navigate('/signin');
      } else {
        await requestPasswordReset(email);
        setNotice('If the email exists, a reset link has been sent.');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete this request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgWrap}>
        <AuthBackdrop />
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
        <h1 style={styles.title}>{heading}</h1>
        <p style={styles.subtitle}>{subtitle}</p>

        <form onSubmit={handleSubmit}>
          {!isResetMode ? (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>EMAIL</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                style={styles.input}
                onFocus={(event) => Object.assign(event.target.style, styles.inputFocus)}
                onBlur={(event) => Object.assign(event.target.style, styles.inputBlur)}
              />
            </div>
          ) : (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>NEW PASSWORD</label>
                <div style={styles.inputWrap}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    style={{ ...styles.input, paddingRight: 44 }}
                    onFocus={(event) => Object.assign(event.target.style, styles.inputFocus)}
                    onBlur={(event) => Object.assign(event.target.style, styles.inputBlur)}
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>CONFIRM PASSWORD</label>
                <div style={styles.inputWrap}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    style={{ ...styles.input, paddingRight: 44 }}
                    onFocus={(event) => Object.assign(event.target.style, styles.inputFocus)}
                    onBlur={(event) => Object.assign(event.target.style, styles.inputBlur)}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} style={styles.eyeBtn}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button type="submit" style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
            {isSubmitting
              ? (isResetMode ? 'Updating Password...' : 'Sending Link...')
              : (isResetMode ? 'Update Password' : 'Send Reset Link')}
          </button>
        </form>

        {notice ? <p style={styles.noticeText}>{notice}</p> : null}
        {error ? <p style={styles.errorText}>{error}</p> : null}

        <p style={styles.switchText}>
          <span style={styles.switchLink} onClick={() => navigate('/signin')}>Return to sign in</span>
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-eigengrau)', position: 'relative', padding: '24px 16px' },
  bgWrap: { position: 'fixed', inset: 0, zIndex: 0, opacity: 1 },
  bgBlur: { position: 'absolute', inset: 0, backdropFilter: 'blur(4px)' },
  card: {
    position: 'relative',
    zIndex: 1,
    width: 'min(440px, calc(100vw - 32px))',
    background: 'rgba(13, 19, 27, 0.86)',
    border: '1px solid rgba(0, 212, 170, 0.14)',
    boxShadow: '0 28px 90px rgba(0,0,0,0.38), 0 0 0 1px rgba(0,212,170,0.04)',
    backdropFilter: 'blur(32px) saturate(180%)',
    borderRadius: 24,
    padding: 'clamp(28px, 4vw, 48px)',
  },
  logoRow: { display: 'flex', justifyContent: 'center', marginBottom: 24 },
  title: { fontFamily: 'var(--font-geist)', fontSize: 32, fontWeight: 700, color: 'var(--color-velin)', margin: '0 0 8px', textAlign: 'center' },
  subtitle: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-bistre)', margin: '0 0 28px', textAlign: 'center' },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-bistre)', marginBottom: 6 },
  inputWrap: { position: 'relative' },
  input: { width: '100%', height: 48, background: 'rgba(8,12,16,0.88)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 14, fontFamily: 'Inter, sans-serif', fontSize: 15, color: 'var(--color-velin)', padding: '0 16px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
  inputFocus: { borderColor: 'var(--color-sinoper)', boxShadow: '0 0 0 3px rgba(0,212,170,0.12)' },
  inputBlur: { borderColor: 'rgba(0,212,170,0.1)', boxShadow: 'none' },
  eyeBtn: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-bistre)', cursor: 'pointer', padding: 0, display: 'flex' },
  submitBtn: { width: '100%', height: 50, background: 'var(--color-sinoper)', border: 'none', borderRadius: 14, fontFamily: 'var(--font-inter)', fontSize: 15, fontWeight: 700, color: '#031014', cursor: 'pointer', marginBottom: 16, boxShadow: '0 18px 38px rgba(0,212,170,0.22)' },
  noticeText: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-sinoper)', textAlign: 'center', margin: '0 0 12px' },
  errorText: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#ff8d8d', textAlign: 'center', margin: '0 0 12px' },
  switchText: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-bistre)', textAlign: 'center', margin: 0 },
  switchLink: { color: 'var(--color-sinoper)', cursor: 'pointer' },
};

export default ForgotPassword;
