import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import LiveCanvasBackground from '../components/canvas/LiveCanvasBackground';
import FlowfexLogo from '../assets/FlowfexLogo';
import useStore from '../store/useStore';
import '../styles/auth.css';

function SignIn() {
  const navigate = useNavigate();
  const setUser = useStore(state => state.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock authentication
    setUser({ email, name: email.split('@')[0] });
    navigate('/canvas');
  };

  const handleAnonymous = () => {
    navigate('/canvas');
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* Left Panel - Form */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="logo-container" onClick={() => navigate('/')}>
              <FlowfexLogo variant="full" size={32} animated={false} />
            </div>
            
            <div className="auth-form-content">
              <h1 className="auth-heading">Welcome back.</h1>
              <p className="auth-subheading">Your sessions are waiting.</p>
              
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password" className="form-label">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="form-checkbox">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label htmlFor="remember">Remember me</label>
                </div>
                
                <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }}>
                  Sign In
                </button>
                
                <div className="auth-divider">
                  <span>or</span>
                </div>
                
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: '100%', height: '48px' }}
                  onClick={handleAnonymous}
                >
                  Continue without signing in
                </button>
                
                <div className="auth-links">
                  <a href="#forgot">Forgot password?</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>
                    Create account
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Live Canvas */}
        <div className="auth-visual-panel">
          <LiveCanvasBackground />
        </div>
      </div>
    </div>
  );
}

export default SignIn;
