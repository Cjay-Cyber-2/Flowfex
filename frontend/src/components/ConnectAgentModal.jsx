import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, CheckCheck, Globe, Github, ExternalLink, Radio, Code2, Link2, RefreshCw } from 'lucide-react';
import '../styles/landing-sections3.css';

const PROMPT_TEXT = `You are connected to Flowfex visual AI orchestration.

Report each step using:
STEP: [name]
TOOL: [tool]
STATUS: [queued|active|completed|error]
REASONING: [why]`;

const JS_CODE = `import { FlowfexClient } from "flowfex-sdk";

const client = new FlowfexClient({
  sessionId: "your-session-id"
});

await client.connect();`;

const PY_CODE = `from flowfex import FlowfexClient

client = FlowfexClient(
    session_id="your-session-id"
)

client.connect()`;

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
      <p className="cam-tab-desc">Paste this prompt into your AI agent to enable Flowfex reporting.</p>
      <div className="cam-code-block" style={{ position: 'relative' }}>
        <pre>{PROMPT_TEXT}</pre>
        <CopyBtn text={PROMPT_TEXT} style={{ position: 'absolute', bottom: 12, right: 12 }} />
      </div>
      <button className="cam-expand-row" onClick={() => setOpen(!open)}>
        <span>{open ? '▾' : '▸'} Why this works</span>
      </button>
      <div className="cam-expand-body" style={{ maxHeight: open ? 200 : 0 }}>
        <p>Flowfex parses structured STEP/TOOL/STATUS/REASONING lines from your agent's output stream in real time, mapping each to a visual node on the canvas.</p>
      </div>
    </div>
  );
}

function LinkTab() {
  const [copied, copy] = useCopy();
  const url = 'https://flowfex.app/connect/session-abc123';
  return (
    <div>
      <p className="cam-tab-desc">Share this link with your agent or paste it into any integration.</p>
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
  const [lang, setLang] = useState('js');
  const code = lang === 'js' ? JS_CODE : PY_CODE;
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['js', 'python'].map(l => (
          <button key={l} className={`cam-pill ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
            {l === 'js' ? 'JavaScript' : 'Python'}
          </button>
        ))}
      </div>
      <div className="cam-code-block" style={{ position: 'relative' }}>
        <pre>{code}</pre>
        <CopyBtn text={code} style={{ position: 'absolute', bottom: 12, right: 12 }} />
      </div>
      <a href="#docs" className="cam-text-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
        <ExternalLink size={13} /> View SDK docs
      </a>
    </div>
  );
}

function LiveChannelTab() {
  const [copied, copy] = useCopy();
  const endpoint = 'wss://flowfex.app/live/session-abc123';
  return (
    <div>
      <p className="cam-tab-desc">Connect directly via WebSocket for real-time bidirectional streaming.</p>
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

function ConnectAgentModal({ isOpen, onClose }) {
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
                <p className="cam-subtitle">Choose how your agent reports to Flowfex.</p>
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
                Need help connecting?{' '}
                <a href="#guide" className="cam-text-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  View connection guide <ExternalLink size={12} />
                </a>
              </span>
              <button className="cam-done-btn" onClick={onClose}>Done</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConnectAgentModal;
