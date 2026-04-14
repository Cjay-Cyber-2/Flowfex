import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import ConnectAgentModal from '../components/ConnectAgentModal';
import PulseBeams from '../components/animations/PulseBeams';
import '../styles/onboarding.css';

// ─── PulseBeams config ────────────────────────────────────────────────────────
// Paths fan out from a central point (representing your agent) into Flowfex,
// then out to tools/skills — visualising the bridge metaphor.
const ONBOARDING_BEAMS = [
  // Left agent → centre bridge
  {
    path: 'M 80 217 C 200 217, 300 217, 429 217',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 0.2 },
    },
    connectionPoints: [
      { cx: 80, cy: 217, r: 5 },
      { cx: 429, cy: 217, r: 5 },
    ],
  },
  // Left agent upper arc
  {
    path: 'M 80 140 C 180 140, 280 180, 429 200',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.6, repeat: Infinity, ease: 'linear', delay: 0.4, repeatDelay: 0.5 },
    },
    connectionPoints: [{ cx: 80, cy: 140, r: 4 }],
  },
  // Left agent lower arc
  {
    path: 'M 80 294 C 180 294, 280 260, 429 234',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.8, repeat: Infinity, ease: 'linear', delay: 0.8, repeatDelay: 0.3 },
    },
    connectionPoints: [{ cx: 80, cy: 294, r: 4 }],
  },
  // Centre bridge → right skill
  {
    path: 'M 429 200 C 550 178, 650 152, 778 134',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.4, repeat: Infinity, ease: 'linear', delay: 1.0, repeatDelay: 0.4 },
    },
    connectionPoints: [{ cx: 778, cy: 134, r: 5 }],
  },
  // Centre bridge → right tool
  {
    path: 'M 429 234 C 550 256, 650 280, 778 300',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.7, repeat: Infinity, ease: 'linear', delay: 0.5, repeatDelay: 0.6 },
    },
    connectionPoints: [{ cx: 778, cy: 300, r: 5 }],
  },
  // Centre straight out to canvas
  {
    path: 'M 429 217 C 560 217, 660 217, 778 217',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.2, repeat: Infinity, ease: 'linear', delay: 1.5, repeatDelay: 0.2 },
    },
    connectionPoints: [{ cx: 778, cy: 217, r: 6 }],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [connectionStage, setConnectionStage] = useState('idle'); // idle | connecting | connected | navigating

  const handleConnected = () => {
    setIsModalOpen(false);
    setConnectionStage('connecting');
    setTimeout(() => setConnectionStage('connected'), 1000);
    setTimeout(() => setConnectionStage('navigating'), 3000);
    setTimeout(() => navigate('/dashboard'), 3800);
  };

  return (
    <div className="ob-root">
      <div className="ob-dotgrid" />

      <header className="ob-topbar">
        <FlowfexLogoNew size={30} animated={false} />
      </header>

      <main className="ob-center">
        {/* ── PulseBeams animation — always visible as background ── */}
        <div className="ob-beams-layer">
          <PulseBeams
            beams={ONBOARDING_BEAMS}
            width={858}
            height={434}
            gradientColors={{ start: '#00D4AA', middle: '#6344F5', end: '#AE48FF' }}
            baseColor="rgba(255,255,255,0.06)"
            accentColor="rgba(0,212,170,0.3)"
          />
        </div>

        {/* Legacy expanding ring */}
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

        {/* Connected label */}
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

        {/* Centre pulsing circle with logo */}
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
