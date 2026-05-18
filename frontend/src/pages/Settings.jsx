import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Key, Settings as SettingsIcon, BarChart } from 'lucide-react';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
} from '../services/sessionApi';

function formatResetCountdown(resetAt) {
  if (!resetAt) {
    return 'Resets at the next daily window';
  }
  const target = Date.parse(resetAt);
  if (Number.isNaN(target)) {
    return 'Resets at the next daily window';
  }
  const deltaMs = target - Date.now();
  if (deltaMs <= 0) {
    return 'Renewing now';
  }
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 60) {
    return `Resets in ${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMin = minutes % 60;
    return `Resets in ${hours} hour${hours === 1 ? '' : 's'}${remMin ? ` ${remMin} min` : ''}`;
  }
  const days = Math.floor(hours / 24);
  return `Resets in ${days} day${days === 1 ? '' : 's'}`;
}

function UsageBar({ label, current, limit }) {
  const safeLimit = Math.max(limit || 0, 1);
  const ratio = Math.min(1, (current || 0) / safeLimit);
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'var(--text-sm)', color: 'var(--color-bistre)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 'var(--text-sm)', color: 'var(--color-velin)' }}>
          {current || 0} / {limit || 0}
        </span>
      </div>
      <div style={{ height: '8px', background: 'var(--color-eigengrau)', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            background: ratio >= 1 ? 'var(--color-caput-mortuum, #ff4444)' : 'var(--color-sinoper)',
            transition: 'width var(--duration-slow) var(--ease-expo-out)',
          }}
        />
      </div>
    </div>
  );
}

function UsageSection({ usage, isAuthenticated, onUpgrade }) {
  const tier = usage?.tier || (isAuthenticated ? 'authenticated' : 'anonymous');
  const requestLimit = usage?.limits?.maxExecutionsPerSession || usage?.limits?.maxExecutionsPerDay || null;
  const requestsCount = usage?.usage?.executionsCount || 0;
  const attachLimit = usage?.limits?.maxConnectionsPerDay || null;
  const attachesCount = usage?.usage?.connectionsCount || 0;
  const concurrentLimit = usage?.limits?.maxConcurrentAgents || null;
  const concurrentCount = usage?.usage?.concurrentAgents || 0;

  return (
    <div>
      <div style={{
        background: 'var(--color-wenge-ash)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-satoshi)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--color-velin)',
          marginBottom: 'var(--space-2)',
        }}>
          Current usage
        </h3>
        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-bistre)',
          marginBottom: 'var(--space-4)',
        }}>
          Tier: <strong style={{ color: 'var(--color-velin)' }}>{tier}</strong>
        </p>

        {requestLimit ? (
          <UsageBar label="Skill / tool requests (rolling)" current={requestsCount} limit={requestLimit} />
        ) : null}
        {attachLimit ? (
          <UsageBar label="Verified attaches today" current={attachesCount} limit={attachLimit} />
        ) : null}
        {concurrentLimit ? (
          <UsageBar label="Concurrent connected agents" current={concurrentCount} limit={concurrentLimit} />
        ) : null}

        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-bistre)',
          marginTop: 'var(--space-3)',
        }}>
          {formatResetCountdown(usage?.resetAt)}
        </p>
      </div>
      <button className="btn-primary" onClick={onUpgrade}>Upgrade Plan</button>
    </div>
  );
}

function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const storeUser = useStore((state) => state.user);
  const { accessToken, configured, isAuthenticated, signOut, user, usage } = useSessionContext();
  const [activeSection, setActiveSection] = useState('account');
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeyLabel, setApiKeyLabel] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [apiMessage, setApiMessage] = useState('');
  const [isApiLoading, setIsApiLoading] = useState(false);

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'usage', label: 'Usage & Limits', icon: BarChart },
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

  const backTarget = (() => {
    const from = location.state?.from;
    if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
      return '/dashboard';
    }
    return from;
  })();

  const accountEmail = isAuthenticated ? (user?.email || storeUser?.email || '') : '';
  const accountUsername = isAuthenticated ? String(user?.name || storeUser?.name || '').trim() : '';

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
          type="button"
          onClick={() => navigate(backTarget)}
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
                <label className="form-label" htmlFor="settings-email">Email</label>
                <input
                  id="settings-email"
                  type="email"
                  className="input"
                  readOnly
                  value={accountEmail}
                  style={{ opacity: 0.92, cursor: 'default' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label" htmlFor="settings-username">Username</label>
                <input
                  id="settings-username"
                  type="text"
                  className="input"
                  readOnly
                  value={accountUsername}
                  placeholder={isAuthenticated ? undefined : ''}
                  style={{ opacity: 0.92, cursor: 'default' }}
                />
              </div>
              {isAuthenticated ? (
                <button type="button" className="btn-primary" onClick={() => signOut()}>Sign Out</button>
              ) : (
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-bistre)',
                  marginBottom: 'var(--space-4)',
                }}
                >
                  Sign up or sign in to manage a saved account, username, and API keys.
                </p>
              )}
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
                  Sign in first to create and manage Syniq API keys.
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
            <UsageSection usage={usage} isAuthenticated={isAuthenticated} onUpgrade={() => navigate('/#pricing')} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;

