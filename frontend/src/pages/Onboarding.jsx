import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import ConnectAgentModal from '../components/ConnectAgentModal';
import '../styles/onboarding.css';

export default function Onboarding() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectedLabel, setShowConnectedLabel] = useState(false);

  const handleConnected = () => {
    setIsModalOpen(false);
    setIsConnected(true);
    setIsConnecting(true);
    setTimeout(() => {
      setShowConnectedLabel(true);
      setTimeout(() => setShowConnectedLabel(false), 2000);
    }, 800);
    setTimeout(() => navigate('/dashboard'), 2800);
  };

  const handleDemo = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setShowConnectedLabel(true);
      setTimeout(() => setShowConnectedLabel(false), 2000);
    }, 800);
    setTimeout(() => navigate('/dashboard'), 2800);
  };

  return (
    <div className="ob-root">
      {/* Dot-grid background */}
      <div className="ob-dotgrid" />

      {/* Top bar */}
      <header className="ob-topbar">
        <FlowfexLogoNew size={30} animated={false} />
        <button className="ob-connect-btn" onClick={() => setIsModalOpen(true)}>
          Connect Agent
        </button>
      </header>

      {/* Center empty state */}
      <main className="ob-center">
        {/* Pulse beam from top during demo */}
        <AnimatePresence>
          {isConnecting && (
            <motion.div
              className="ob-beam"
              initial={{ y: -300, opacity: 0 }}
              animate={{ y: 0, opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Connected label */}
        <AnimatePresence>
          {showConnectedLabel && (
            <motion.p
              className="ob-connected-label"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              Agent connected
            </motion.p>
          )}
        </AnimatePresence>

        {/* Pulsing circle */}
        <motion.div
          className="ob-circle"
          animate={
            isConnecting
              ? { scale: [0.5, 1.2, 1.0], boxShadow: ['0 0 40px rgba(0,212,170,0.26)', '0 0 90px rgba(0,212,170,0.72)', '0 0 40px rgba(0,212,170,0.26)'] }
              : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }
          }
          transition={
            isConnecting
              ? { duration: 0.8, ease: 'easeOut' }
              : { duration: 2, repeat: Infinity }
          }
        >
          <FlowfexLogoNew size={32} animated={false} />
        </motion.div>

        <p className="ob-headline">Connect your first agent to begin.</p>

        <button className="ob-cta-btn" onClick={() => setIsModalOpen(true)}>
          Connect Agent
        </button>

        <button className="ob-demo-link" onClick={handleDemo}>
          or start with a demo session
        </button>
      </main>

      <ConnectAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}
