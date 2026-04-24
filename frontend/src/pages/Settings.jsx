import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Link2, Key, Settings as SettingsIcon, BarChart } from 'lucide-react';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
} from '../services/sessionApi';

function Settings() {
  const navigate = useNavigate();
  const storeUser = useStore((state) => state.user);
  const { accessToken, configured, isAuthenticated, signOut, user } = useSessionContext();
  const [activeSection, setActiveSection] = useState('account');
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeyLabel, setApiKeyLabel] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [apiMessage, setApiMessage] = useState('');
  const [isApiLoading, setIsApiLoading] = useState(false);

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'agents', label: 'Connected Agents', icon: Link2 },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'usage', label: 'Usage & Limits', icon: BarChart }
  ];

  useEffect(() => {
    if (activeSection !== 'api' || !accessToken || !configured || !isAuthenticated) {
      return;
    }

    setIsApiLoading(true);
    setApiMessage('');

    listApiKeys(accessToken)
      .then((payload) => {
        setApiKeys(Array.isArray(payload.apiKeys) ? payload.apiKeys : []);
      })
      .catch((error) => {
        setApiMessage(error instanceof Error ? error.message : 'Unable to load API keys.');
      })
      .finally(() => {
        setIsApiLoading(false);
      });
  }, [accessToken, activeSection, configured, isAuthenticated]);

  const displayUser = storeUser || (user ? {
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Flowfex User',
  } : null);

  const handleGenerateKey = async () => {
    if (!accessToken || !apiKeyLabel.trim()) {
      setApiMessage('Enter a label before generating a key.');
      return;
    }

    setIsApiLoading(true);
    setApiMessage('');

    try {
      const payload = await generateApiKey(accessToken, apiKeyLabel.trim());
      setGeneratedKey(payload.apiKey || '');
      setApiKeyLabel('');
      setApiKeys((current) => payload.record ? [payload.record, ...current] : current);
      setApiMessage('This key will only be shown once. Copy it now.');
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Unable to generate a new key.');
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!accessToken) {
      return;
    }

    setIsApiLoading(true);
    setApiMessage('');

    try {
      const payload = await revokeApiKey(accessToken, keyId);
      setApiKeys((current) =>
        current.map((key) => (key.id === keyId ? { ...key, ...(payload.record || {}), is_active: false } : key))
      );
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Unable to revoke the selected key.');
    } finally {
      setIsApiLoading(false);
    }
  };

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
                <input type="email" className="input" defaultValue={displayUser?.email || ''} />
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label">Display Name</label>
                <input type="text" className="input" defaultValue={displayUser?.name || 'Flowfex User'} />
              </div>
              <button className="btn-primary" onClick={() => signOut()}>Sign Out</button>
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

              {!configured ? (
                <p style={{ color: 'var(--color-bistre)' }}>
                  API key management will be available after the Better Auth and Neon migration is configured.
                </p>
              ) : null}

              {!isAuthenticated ? (
                <p style={{ color: 'var(--color-bistre)' }}>
                  Sign in first to create and manage Flowfex API keys.
                </p>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label className="form-label">New Key Label</label>
                    <input
                      type="text"
                      className="input"
                      value={apiKeyLabel}
                      onChange={(event) => setApiKeyLabel(event.target.value)}
                      placeholder="Production SDK"
                    />
                  </div>

                  <button className="btn-primary" onClick={handleGenerateKey} disabled={isApiLoading}>
                    {isApiLoading ? 'Working...' : 'Generate New Key'}
                  </button>

                  {generatedKey ? (
                    <div style={{
                      marginTop: 'var(--space-6)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'rgba(0, 212, 170, 0.08)',
                      border: '1px solid rgba(0, 212, 170, 0.18)'
                    }}>
                      <p style={{ color: 'var(--color-sinoper)', marginBottom: 'var(--space-3)' }}>
                        This key will only be shown once. Copy it now.
                      </p>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{generatedKey}</pre>
                    </div>
                  ) : null}

                  {apiMessage ? (
                    <p style={{ color: 'var(--color-bistre)', marginTop: 'var(--space-4)' }}>{apiMessage}</p>
                  ) : null}

                  <div style={{ marginTop: 'var(--space-8)', display: 'grid', gap: 'var(--space-4)' }}>
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        style={{
                          padding: 'var(--space-4)',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--color-wenge-ash)',
                          border: '1px solid var(--color-caput-mortuum)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 'var(--space-4)',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--color-velin)', display: 'block' }}>{key.label}</strong>
                          <span style={{ color: 'var(--color-bistre)', fontSize: 'var(--text-sm)' }}>
                            {key.key_prefix}... · {key.is_active ? 'Active' : 'Revoked'}
                          </span>
                        </div>
                        {key.is_active ? (
                          <button className="btn-ghost" onClick={() => handleRevokeKey(key.id)} disabled={isApiLoading}>
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
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
