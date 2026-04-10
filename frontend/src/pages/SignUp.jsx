import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import LiveCanvasBackground from '../components/canvas/LiveCanvasBackground';
import FlowfexLogo from '../assets/FlowfexLogo';
import useStore from '../store/useStore';
import '../styles/auth.css';

function SignUp() {
  const navigate = useNavigate();
  const setUser = useStore(state => state.setUser);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useCase, setUseCase] = useState('');

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const handleUseCaseSubmit = (selectedUseCase) => {
    setUseCase(selectedUseCase);
    setUser({ email, name: email.split('@')[0], useCase: selectedUseCase });
    navigate('/onboarding');
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, color: 'bistre', text: '' };
    if (password.length < 6) return { level: 1, color: 'sinoper', text: 'Weak' };
    if (password.length < 10) return { level: 2, color: 'indian-yellow', text: 'Fair' };
    return { level: 3, color: 'verdigris', text: 'Strong' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="logo-container" onClick={() => navigate('/')}>
              <FlowfexLogo variant="full" size={32} animated={false} />
            </div>
            
            <div className="auth-form-content">
              {/* Progress Dots */}
              <div className="signup-progress">
                <div className={`progress-dot ${step >= 1 ? 'active' : ''}`} />
                <div className={`progress-dot ${step >= 2 ? 'active' : ''}`} />
                <div className={`progress-dot ${step >= 3 ? 'active' : ''}`} />
              </div>

              {/* Step 1: Email */}
              {step === 1 && (
                <>
                  <h1 className="auth-heading">What's your email?</h1>
                  <p className="auth-subheading">We'll use this to save your work.</p>
                  
                  <form onSubmit={handleEmailSubmit} className="auth-form">
                    <div className="form-group">
                      <input
                        type="email"
                        className="input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }}>
                      Continue
                    </button>
                    
                    <div className="auth-links" style={{ justifyContent: 'center' }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signin'); }}>
                        Already have an account?
                      </a>
                    </div>
                  </form>
                </>
              )}

              {/* Step 2: Password */}
              {step === 2 && (
                <>
                  <h1 className="auth-heading">Create a password</h1>
                  <p className="auth-subheading">Keep your account secure.</p>
                  
                  <form onSubmit={handlePasswordSubmit} className="auth-form">
                    <div className="form-group">
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="input"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      
                      {password && (
                        <div className="password-strength">
                          <div className="strength-bar">
                            <div 
                              className={`strength-fill strength-${strength.color}`}
                              style={{ width: `${(strength.level / 3) * 100}%` }}
                            />
                          </div>
                          <span className={`strength-text text-${strength.color}`}>
                            {strength.text}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }}>
                      Continue
                    </button>
                    
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ width: '100%' }}
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                  </form>
                </>
              )}

              {/* Step 3: Use Case */}
              {step === 3 && (
                <>
                  <h1 className="auth-heading">How will you use Flowfex?</h1>
                  <p className="auth-subheading">This helps us personalize your experience.</p>
                  
                  <div className="use-case-grid">
                    <button
                      className="use-case-card"
                      onClick={() => handleUseCaseSubmit('builder')}
                    >
                      <div className="use-case-icon">🔨</div>
                      <div className="use-case-name">Builder</div>
                      <div className="use-case-desc">Create and orchestrate workflows</div>
                    </button>
                    
                    <button
                      className="use-case-card"
                      onClick={() => handleUseCaseSubmit('developer')}
                    >
                      <div className="use-case-icon">💻</div>
                      <div className="use-case-name">Developer</div>
                      <div className="use-case-desc">Integrate AI into applications</div>
                    </button>
                    
                    <button
                      className="use-case-card"
                      onClick={() => handleUseCaseSubmit('explorer')}
                    >
                      <div className="use-case-icon">🔍</div>
                      <div className="use-case-name">Explorer</div>
                      <div className="use-case-desc">Experiment and learn</div>
                    </button>
                  </div>
                  
                  <button
                    className="btn-ghost"
                    style={{ width: '100%', marginTop: 'var(--space-4)' }}
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="auth-visual-panel">
          <LiveCanvasBackground />
        </div>
      </div>
    </div>
  );
}

export default SignUp;
