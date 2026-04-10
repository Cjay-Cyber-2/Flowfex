import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Link2, Key, Settings as SettingsIcon, BarChart } from 'lucide-react';

function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('account');

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'agents', label: 'Connected Agents', icon: Link2 },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'usage', label: 'Usage & Limits', icon: BarChart }
  ];

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--color-eigengrau)',
      display: 'flex'
    }}>
      {/* Left Navigation */}
      <div style={{
        width: '240px',
        background: 'var(--color-eigengrau)',
        borderRight: '1px solid var(--color-caput-mortuum)',
        padding: 'var(--space-6)'
      }}>
        <button
          onClick={() => navigate('/canvas')}
          className="btn-ghost"
          style={{ marginBottom: 'var(--space-8)', width: '100%' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <nav>
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  marginBottom: 'var(--space-2)',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 'var(--text-sm)',
                  color: activeSection === section.id ? 'var(--color-velin)' : 'var(--color-bistre)',
                  background: activeSection === section.id ? 'var(--color-wenge-ash)' : 'transparent',
                  border: 'none',
                  borderLeft: activeSection === section.id ? '2px solid var(--color-sinoper)' : '2px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--duration-fast) var(--ease-expo-out)'
                }}
              >
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        padding: 'var(--space-12)',
        overflowY: 'auto'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <h1 style={{
            fontFamily: 'var(--font-satoshi)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-velin)',
            marginBottom: 'var(--space-8)'
          }}>
            {sections.find(s => s.id === activeSection)?.label}
          </h1>

          {activeSection === 'account' && (
            <div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label">Email</label>
                <input type="email" className="input" defaultValue="user@example.com" />
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label">Display Name</label>
                <input type="text" className="input" defaultValue="User" />
              </div>
              <button className="btn-primary">Save Changes</button>
            </div>
          )}

          {activeSection === 'agents' && (
            <div>
              <p style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-bistre)',
                marginBottom: 'var(--space-6)'
              }}>
                Manage your connected AI agents.
              </p>
              <button className="btn-primary" onClick={() => navigate('/onboarding')}>
                Connect New Agent
              </button>
            </div>
          )}

          {activeSection === 'api' && (
            <div>
              <p style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-bistre)',
                marginBottom: 'var(--space-6)'
              }}>
                Create and manage API keys for programmatic access.
              </p>
              <button className="btn-primary">Create New Key</button>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label">Default Canvas Mode</label>
                <select className="input">
                  <option>Map</option>
                  <option>Flow</option>
                  <option>Live</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label">Animation Intensity</label>
                <select className="input">
                  <option>Full</option>
                  <option>Reduced</option>
                  <option>Minimal</option>
                </select>
              </div>
              <button className="btn-primary">Save Preferences</button>
            </div>
          )}

          {activeSection === 'usage' && (
            <div>
              <div style={{
                background: 'var(--color-wenge-ash)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                marginBottom: 'var(--space-6)'
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-satoshi)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  color: 'var(--color-velin)',
                  marginBottom: 'var(--space-4)'
                }}>
                  Current Usage
                </h3>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-2)'
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-bistre)'
                    }}>
                      Execution Steps
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-jetbrains)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-velin)'
                    }}>
                      45 / 100
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'var(--color-eigengrau)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '45%',
                      height: '100%',
                      background: 'var(--color-sinoper)',
                      transition: 'width var(--duration-slow) var(--ease-expo-out)'
                    }} />
                  </div>
                </div>
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-bistre)'
                }}>
                  Resets in 15 days
                </p>
              </div>
              <button className="btn-primary">Upgrade Plan</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
