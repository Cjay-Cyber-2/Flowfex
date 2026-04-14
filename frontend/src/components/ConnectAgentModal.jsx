import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, CheckCheck, RefreshCw } from 'lucide-react';
import { CONNECT_LINK, CONNECT_LIVE_SNIPPET, CONNECT_PROMPT, CONNECT_SDK_SNIPPET } from '../store/demoData';
import '../styles/landing-sections3.css';

const TABS = ['Prompt', 'Link', 'SDK', 'Live Channel'];

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return [copied, copy];
}

function CopyBtn({ text, style }) {
  const [copied, copy] = useCopy();
  return (
    <button className="cam-copy-btn" style={style} onClick={() => copy(text)}>
      {copied ? <><CheckCheck size={14} style={{ marginRight: 5 }} />Copied</> : <><Copy size={14} style={{ marginRight: 5 }} />Copy</>}
    </button>
  );
}

function PromptTab() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="cam-tab-desc">Paste this into the target agent so it connects to this Flowfex session and asks Flowfex for resources before acting.</p>
      <div className="cam-code-block" style={{ position: 'relative' }}>
        <pre>{CONNECT_PROMPT}</pre>
        <CopyBtn text={CONNECT_PROMPT} style={{ position: 'absolute', bottom: 12, right: 12 }} />
      </div>
      <button className="cam-expand-row" onClick={() => setOpen(!open)}>
        <span>{open ? '▾' : '▸'} Why this works</span>
      </button>
      <div className="cam-expand-body" style={{ maxHeight: open ? 200 : 0 }}>
        <p>The prompt names the session, tells the agent to pull resources through Flowfex first, and defines the step format Flowfex uses to map the run back onto the live canvas.</p>
      </div>
    </div>
  );
}

function LinkTab() {
  const [copied, copy] = useCopy();
  const url = CONNECT_LINK;
  return (
    <div>
      <p className="cam-tab-desc">Share this link when you want a fast attach flow without editing code.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input readOnly value={url} className="cam-readonly-input" />
        <button className="cam-copy-btn" onClick={() => copy(url)}>
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <button className="cam-text-link" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <RefreshCw size={13} /> Regenerate Link
      </button>
      <p className="cam-security-note">🔒 This link expires in 24 hours and is single-use.</p>
    </div>
  );
}

function SDKTab() {
  return (
    <div>
      <div className="cam-code-block" style={{ position: 'relative' }}>
        <pre>{CONNECT_SDK_SNIPPET}</pre>
        <CopyBtn text={CONNECT_SDK_SNIPPET} style={{ position: 'absolute', bottom: 12, right: 12 }} />
      </div>
      <p className="cam-security-note">Use the SDK when you want the cleanest app-side integration with Flowfex session control.</p>
    </div>
  );
}

function LiveChannelTab() {
  const [copied, copy] = useCopy();
  const endpoint = CONNECT_LIVE_SNIPPET;
  return (
    <div>
      <p className="cam-tab-desc">Use the live channel when the agent already supports persistent streaming.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input readOnly value={endpoint} className="cam-readonly-input" />
        <button className="cam-copy-btn" onClick={() => copy(endpoint)}>
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="cam-pulse-dot" />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-bistre)' }}>Ready for connection</span>
      </div>
    </div>
  );
}

const TAB_CONTENT = { Prompt: PromptTab, Link: LinkTab, SDK: SDKTab, 'Live Channel': LiveChannelTab };

function ConnectAgentModal({ isOpen, onClose, onConnected }) {
  const [activeTab, setActiveTab] = useState('Prompt');
  const TabContent = TAB_CONTENT[activeTab];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="cam-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="cam-modal-wrapper">
            <motion.div
              className="cam-modal"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
            <div className="cam-header">
              <div>
                <h2 className="cam-title">Connect Your Agent</h2>
                <p className="cam-subtitle">Choose how this agent connects to Flowfex.</p>
              </div>
              <button className="cam-close" onClick={onClose}><X size={18} /></button>
            </div>

            <div className="cam-tabs">
              {TABS.map(tab => (
                <button
                  key={tab}
                  className={`cam-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="cam-tab-body"
              >
                <TabContent />
              </motion.div>
            </AnimatePresence>

            <div className="cam-footer">
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-bistre)' }}>
                Prompt attach is the fastest way to test a session. Move to SDK or live channel when you want a tighter integration.
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="cam-done-btn" onClick={onClose}>Done</button>
                {onConnected && (
                  <button className="cam-connected-btn" onClick={onConnected}>
                    I've Connected My Agent
                  </button>
                )}
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConnectAgentModal;
