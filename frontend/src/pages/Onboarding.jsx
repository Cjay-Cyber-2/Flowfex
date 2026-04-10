import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Link2, Code, Radio } from 'lucide-react';
import FlowfexLogo from '../assets/FlowfexLogo';
import useStore from '../store/useStore';
import '../styles/onboarding.css';

function Onboarding() {
  const navigate = useNavigate();
  const addAgent = useStore(state => state.addAgent);
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const connectionMethods = [
    {
      id: 'prompt',
      name: 'Prompt',
      icon: Copy,
      description: 'Copy this prompt into any AI agent',
      recommended: true
    },
    {
      id: 'link',
      name: 'Link',
      icon: Link2,
      description: 'Share a connection link with your agent environment'
    },
    {
      id: 'sdk',
      name: 'SDK',
      icon: Code,
      description: 'Add 3 lines to your code'
    },
    {
      id: 'live',
      name: 'Live Channel',
      icon: Radio,
      description: 'Use a real-time socket connection'
    }
  ];

  const handleStartExploring = () => {
    // Create a demo session
    const demoAgent = {
      id: 'demo-agent',
      name: 'Demo Agent',
      status: 'connected',
      type: 'demo'
    };
    addAgent(demoAgent);
    navigate('/canvas');
  };

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    setStep(3);
  };

  const handleConnect = () => {
    setIsWaiting(true);
    // Simulate connection after 3 seconds
    setTimeout(() => {
      const agent = {
        id: `agent-${Date.now()}`,
        name: 'Connected Agent',
        status: 'connected',
        type: selectedMethod
      };
      addAgent(agent);
      navigate('/canvas');
    }, 3000);
  };

  const promptText = `You are now connected to Flowfex, a visual AI orchestration platform.

When you receive a task, break it down into steps and report each step back to Flowfex using this format:

STEP: [step name]
TOOL: [tool being used]
STATUS: [queued|active|completed|error]
REASONING: [why this tool was chosen]

Flowfex will visualize your decision-making process in real-time.`;

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="onboarding-step animate-fade-in">
            <div className="onboarding-logo-pulse">
              <FlowfexLogo variant="icon" size={80} animated={true} />
            </div>
            
            <h1 className="onboarding-heading">Let's connect your first agent.</h1>
            <p className="onboarding-subheading">
              Flowfex works with any AI agent. Choose how you want to connect.
            </p>
            
            <div className="onboarding-options">
              <button
                className="option-card option-card-primary"
                onClick={handleStartExploring}
              >
                <div className="option-content">
                  <div className="option-title">I want to start exploring</div>
                  <div className="option-desc">Try Flowfex with a demo session</div>
                </div>
              </button>
              
              <button
                className="option-card"
                onClick={() => setStep(2)}
              >
                <div className="option-content">
                  <div className="option-title">I have an agent to connect</div>
                  <div className="option-desc">Connect your own AI agent</div>
                </div>
              </button>
            </div>
            
            <p className="onboarding-note">
              No agent? Start with a demo session. Connect anytime.
            </p>
          </div>
        )}

        {/* Step 2: Connection Method */}
        {step === 2 && (
          <div className="onboarding-step animate-fade-in">
            <h1 className="onboarding-heading">Choose a connection method</h1>
            <p className="onboarding-subheading">
              Select how you'd like to connect your agent to Flowfex.
            </p>
            
            <div className="connection-methods-grid">
              {connectionMethods.map(method => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    className={`connection-method-card ${selectedMethod === method.id ? 'selected' : ''}`}
                    onClick={() => handleMethodSelect(method.id)}
                  >
                    {method.recommended && (
                      <span className="badge badge-massicot method-badge">RECOMMENDED</span>
                    )}
                    <Icon size={32} className="method-icon" />
                    <div className="method-name">{method.name}</div>
                    <div className="method-desc">{method.description}</div>
                  </button>
                );
              })}
            </div>
            
            <button
              className="btn-ghost"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Method Detail */}
        {step === 3 && selectedMethod && (
          <div className="onboarding-step animate-fade-in">
            <h1 className="onboarding-heading">
              {connectionMethods.find(m => m.id === selectedMethod)?.name} Connection
            </h1>
            
            {selectedMethod === 'prompt' && (
              <div className="connection-detail">
                <p className="detail-instruction">
                  Copy this prompt and paste it into your AI agent's system instructions:
                </p>
                <div className="code-block">
                  <pre>{promptText}</pre>
                  <button
                    className="btn-ghost btn-sm copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(promptText);
                    }}
                  >
                    <Copy size={16} />
                    Copy prompt
                  </button>
                </div>
                <p className="detail-note">
                  This prompt tells your agent how to communicate with Flowfex.
                </p>
              </div>
            )}
            
            {selectedMethod === 'link' && (
              <div className="connection-detail">
                <p className="detail-instruction">
                  Share this connection link with your agent environment:
                </p>
                <div className="code-block">
                  <code>https://flowfex.app/connect/abc123xyz</code>
                  <button className="btn-ghost btn-sm copy-button">
                    <Copy size={16} />
                    Copy link
                  </button>
                </div>
              </div>
            )}
            
            {selectedMethod === 'sdk' && (
              <div className="connection-detail">
                <p className="detail-instruction">
                  Add these lines to your code:
                </p>
                <div className="code-block">
                  <pre>{`import { FlowfexClient } from 'flowfex-sdk';

const client = new FlowfexClient({
  apiKey: 'your-api-key'
});

await client.connect();`}</pre>
                  <button className="btn-ghost btn-sm copy-button">
                    <Copy size={16} />
                    Copy code
                  </button>
                </div>
              </div>
            )}
            
            {selectedMethod === 'live' && (
              <div className="connection-detail">
                <p className="detail-instruction">
                  Connect using WebSocket:
                </p>
                <div className="code-block">
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <strong>Session ID:</strong> <code>session-abc123</code>
                  </div>
                  <div>
                    <strong>Endpoint:</strong> <code>wss://flowfex.app/ws</code>
                  </div>
                </div>
              </div>
            )}
            
            <div className="connection-actions">
              <button
                className="btn-primary"
                onClick={handleConnect}
                disabled={isWaiting}
              >
                {isWaiting ? 'Waiting for connection...' : 'Continue'}
              </button>
              <button
                className="btn-ghost"
                onClick={() => setStep(2)}
                disabled={isWaiting}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Waiting State */}
        {isWaiting && (
          <div className="waiting-overlay">
            <div className="waiting-content">
              <div className="waiting-pulse" />
              <h2 className="waiting-heading">Waiting for your agent to connect...</h2>
              <p className="waiting-status">Listening for connection</p>
              <button
                className="btn-ghost"
                onClick={handleStartExploring}
              >
                Start with demo session instead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Onboarding;
