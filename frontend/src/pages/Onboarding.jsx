import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import ConnectAgentModal from '../components/ConnectAgentModal';
import '../styles/onboarding.css';

export default function Onboarding() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [connectionStage, setConnectionStage] = useState('idle'); // idle | connecting | connected | navigating

  const handleConnected = () => {
    setIsModalOpen(false);
    setConnectionStage('connecting');

    // Stage 1: Beam animation (0-1s)
    setTimeout(() => {
      // Stage 2: Connected state (1s)
      setConnectionStage('connected');
    }, 1000);

    setTimeout(() => {
      // Stage 3: Fade out and navigate (3s)
      setConnectionStage('navigating');
    }, 3000);

    setTimeout(() => {
      navigate('/dashboard');
    }, 3800);
  };

  return (
    <div className="ob-root">
      {/* Dot-grid background */}
      <div className="ob-dotgrid" />

      {/* Top bar — logo only, no duplicate Connect Agent button */}
      <header className="ob-topbar">
        <FlowfexLogoNew size={30} animated={false} />
      </header>

      {/* Center empty state */}
      <main className="ob-center">
        {/* Beam animation during connection */}
        <AnimatePresence>
          {connectionStage === 'connecting' && (
            <motion.div
              className="ob-beam"
              initial={{ y: -300, opacity: 0 }}
              animate={{ y: 0, opacity: [0, 1, 0.6, 0] }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Expanding ring effect during connection */}
        <AnimatePresence>
          {(connectionStage === 'connecting' || connectionStage === 'connected') && (
            <motion.div
              className="ob-ring"
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Connected success label */}
        <AnimatePresence>
          {connectionStage === 'connected' && (
            <motion.div
              className="ob-connected-label"
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <CheckCircle size={20} />
              Agent connected successfully
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigating fade */}
        <AnimatePresence>
          {connectionStage === 'navigating' && (
            <motion.div
              className="ob-fade-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />
          )}
        </AnimatePresence>

        {/* Pulsing circle */}
        <motion.div
          className="ob-circle"
          animate={
            connectionStage === 'connecting'
              ? { scale: [0.5, 1.4, 1.0], boxShadow: ['0 0 40px rgba(0,212,170,0.26)', '0 0 120px rgba(0,212,170,0.8)', '0 0 60px rgba(0,212,170,0.4)'] }
              : connectionStage === 'connected'
                ? { scale: 1, boxShadow: '0 0 80px rgba(0,212,170,0.6)' }
                : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }
          }
          transition={
            connectionStage === 'connecting'
              ? { duration: 1, ease: 'easeOut' }
              : connectionStage === 'connected'
                ? { duration: 0.3 }
                : { duration: 2, repeat: Infinity }
          }
        >
          <FlowfexLogoNew size={32} animated={false} />
        </motion.div>

        {connectionStage === 'idle' && (
          <>
            <p className="ob-headline">Connect your first agent to begin.</p>
            <button className="ob-cta-btn" onClick={() => setIsModalOpen(true)}>
              Connect Agent
            </button>
          </>
        )}

        {connectionStage === 'connected' && (
          <motion.p
            className="ob-headline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Preparing your dashboard...
          </motion.p>
        )}
      </main>

      <ConnectAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}
