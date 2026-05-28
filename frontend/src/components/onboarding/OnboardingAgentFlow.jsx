import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  Layers,
  Monitor,
  Server,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from 'lucide-react';
import SyniqLogoNew from '../SyniqLogoNew';
import {
  AGENT_SURFACE_OPTIONS,
  getAgentSurfaceById,
  getConnectionProfileForSurface,
  saveOnboardingProgress,
} from '../../utils/connectionRecommendations';

const SURFACE_ICONS = {
  cli: Terminal,
  'ide-panel': Monitor,
  'ide-inline': Monitor,
  'web-chat': Globe,
  'desktop-app': Monitor,
  'browser-extension': Globe,
  'mcp-host': Zap,
  'backend-api': Server,
  workflow: Workflow,
  'live-runner': Layers,
  mobile: Globe,
  'multi-agent': Layers,
  'custom-embedded': Server,
  unsure: Sparkles,
};

const STEP_LABELS = {
  welcome: 'Start',
  'choose-surface': 'Your agent',
  'choose-method': 'Connection',
};

const panelMotion = {
  initial: { opacity: 0, y: 20, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -14, filter: 'blur(4px)' },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
};

function StepProgress({ step }) {
  const order = ['welcome', 'choose-surface', 'choose-method'];
  const activeIndex = Math.max(0, order.indexOf(step));

  return (
    <div className="ob-progress" aria-label="Onboarding progress">
      {order.map((key, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <div
            key={key}
            className={`ob-progress__segment${isActive ? ' ob-progress__segment--active' : ''}${isDone ? ' ob-progress__segment--done' : ''}`}
          >
            <span className="ob-progress__dot">
              {isDone ? <Check size={12} strokeWidth={3} /> : index + 1}
            </span>
            <span className="ob-progress__label">{STEP_LABELS[key]}</span>
          </div>
        );
      })}
    </div>
  );
}

function MethodCard({ option, onSelect, index }) {
  return (
    <motion.button
      type="button"
      className={`ob-method-card${option.recommended ? ' ob-method-card--recommended' : ''}`}
      onClick={() => onSelect(option.method)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="ob-method-card__head">
        <span className="ob-method-card__title">{option.title}</span>
        {option.recommended ? (
          <span className="ob-method-card__badge">Recommended</span>
        ) : null}
      </div>
      <p className="ob-method-card__tagline">{option.tagline}</p>
      <p className="ob-method-card__reason">{option.reason}</p>
      <div className="ob-method-card__meta">
        <span>{option.setup}</span>
        <span className="ob-method-card__chevron" aria-hidden>
          <ChevronRight size={18} />
        </span>
      </div>
    </motion.button>
  );
}

export default function OnboardingAgentFlow({
  step,
  setStep,
  selectedSurfaceId,
  setSelectedSurfaceId,
  onOpenConnect,
  AnimatedLayerButton,
}) {
  const surface = useMemo(
    () => (selectedSurfaceId ? getAgentSurfaceById(selectedSurfaceId) : null),
    [selectedSurfaceId],
  );

  const profile = useMemo(
    () => (selectedSurfaceId ? getConnectionProfileForSurface(selectedSurfaceId) : null),
    [selectedSurfaceId],
  );

  const handleSelectSurface = (surfaceId) => {
    setSelectedSurfaceId(surfaceId);
    const nextProfile = getConnectionProfileForSurface(surfaceId);

    saveOnboardingProgress({
      step: nextProfile.skipMethodStep ? 'setup' : 'choose-method',
      selectedSurfaceId: surfaceId,
      recommendedMethod: nextProfile.defaultMethod,
    });

    if (nextProfile.skipMethodStep) {
      onOpenConnect(nextProfile.defaultMethod);
      return;
    }

    setStep('choose-method');
  };

  const handleSelectMethod = (method) => {
    saveOnboardingProgress({
      step: 'setup',
      selectedSurfaceId,
      selectedMethod: method,
    });
    onOpenConnect(method);
  };

  const showProgress = step !== 'welcome';

  return (
    <div className="ob-flow">
      {showProgress ? <StepProgress step={step} /> : null}

      <AnimatePresence mode="wait">
        {step === 'welcome' ? (
          <motion.div key="welcome" className="ob-step-panel ob-step-panel--hero" {...panelMotion}>
            <motion.div
              className="ob-circle"
              animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SyniqLogoNew size={92} animated={false} />
            </motion.div>
            <h1 className="ob-headline">Connect your agent to Syniq</h1>
            <p className="ob-copy-subline ob-copy-subline--narrow">
              Two quick questions. We’ll surface the connection path that fits your setup — nothing generic.
            </p>
            <AnimatedLayerButton onClick={() => setStep('choose-surface')}>
              Connect Agent
            </AnimatedLayerButton>
          </motion.div>
        ) : null}

        {step === 'choose-surface' ? (
          <motion.div key="surface" className="ob-step-panel ob-step-panel--wide" {...panelMotion}>
            <p className="ob-eyebrow">Step 1 of 2</p>
            <h1 className="ob-headline">Where does your agent run?</h1>
            <p className="ob-copy-subline ob-copy-subline--narrow">
              Pick the surface that best matches how you work. We’ll tailor the connection next.
            </p>
            <div className="ob-surface-grid">
              {AGENT_SURFACE_OPTIONS.map((option, index) => {
                const Icon = SURFACE_ICONS[option.id] || Sparkles;
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    className="ob-surface-card"
                    onClick={() => handleSelectSurface(option.id)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025, duration: 0.35 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span className="ob-surface-card__icon" aria-hidden>
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                    <span className="ob-surface-card__label">{option.label}</span>
                    <span className="ob-surface-card__desc">{option.description}</span>
                    <ArrowRight className="ob-surface-card__arrow" size={16} aria-hidden />
                  </motion.button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn btn-ghost ob-back-link"
              onClick={() => setStep('welcome')}
            >
              Back
            </button>
          </motion.div>
        ) : null}

        {step === 'choose-method' && profile ? (
          <motion.div key="method" className="ob-step-panel ob-step-panel--wide" {...panelMotion}>
            <p className="ob-eyebrow">Step 2 of 2</p>
            <h1 className="ob-headline">How should we connect?</h1>
            <p className="ob-copy-subline ob-copy-subline--narrow">
              {surface
                ? `Best options for ${surface.label.toLowerCase()}. Choose one — we’ll show only that setup.`
                : 'Choose the path that fits your environment.'}
            </p>
            <div className="ob-method-stack">
              {profile.methods.map((option, index) => (
                <MethodCard
                  key={option.method}
                  option={option}
                  index={index}
                  onSelect={handleSelectMethod}
                />
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost ob-back-link"
              onClick={() => setStep('choose-surface')}
            >
              Choose a different agent type
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
