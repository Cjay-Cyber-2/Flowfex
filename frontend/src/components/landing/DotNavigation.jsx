import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Sparkles, Workflow, ShieldCheck, Layers, Play, Code, CreditCard, HelpCircle, Rocket } from 'lucide-react'
import '../../styles/DotNavigation.css'

const sectionIcons = {
  hero: Sparkles,
  statement: Sparkles,
  problem: Workflow,
  reveal: Layers,
  layers: Layers,
  demo: Play,
  bridge: Workflow,
  developer: Code,
  pricing: CreditCard,
  faq: HelpCircle,
  final: Rocket,
}

const sectionDescriptions = {
  hero: 'The skill operating layer for connected agents',
  statement: 'What Flowfex does in action',
  problem: 'Why agents need a unified resource layer',
  reveal: 'How Flowfex bridges agents and resources',
  layers: 'Structure meets execution',
  demo: 'Live dashboard preview',
  bridge: 'Connect your agent now',
  developer: 'Build with our SDK',
  pricing: 'Simple, transparent pricing',
  faq: 'Common questions answered',
  final: 'Start building today',
}

function DotNavigation({ sections, activeSection, onSectionChange }) {
  const [hoveredSection, setHoveredSection] = useState(null)
  const [clickedSection, setClickedSection] = useState(null)
  const [showTooltip, setShowTooltip] = useState(null)

  const handleDotClick = (event, sectionId) => {
    event.preventDefault()
    setClickedSection(sectionId)
    setShowTooltip(sectionId === showTooltip ? null : sectionId)
    
    const target = document.getElementById(sectionId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
    
    setTimeout(() => {
      setClickedSection(null)
    }, 1000)
  }

  const handleDotEnter = (sectionId) => {
    setHoveredSection(sectionId)
  }

  const handleDotLeave = () => {
    setHoveredSection(null)
  }

  return (
    <div className="dot-navigation">
      {sections.map((section, index) => {
        const Icon = sectionIcons[section.id] || Sparkles
        const isActive = activeSection === section.id
        const isHovered = hoveredSection === section.id
        const isClicked = clickedSection === section.id
        const isTooltipVisible = showTooltip === section.id || isHovered

        return (
          <div
            key={section.id}
            className="dot-wrapper"
            onMouseEnter={() => handleDotEnter(section.id)}
            onMouseLeave={handleDotLeave}
          >
            {/* Animated background glow */}
            <AnimatePresence>
              {(isActive || isHovered) && (
                <motion.div
                  className="dot-glow"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>

            {/* The interactive dot */}
            <motion.button
              className={`dot ${isActive ? 'is-active' : ''} ${isClicked ? 'is-clicked' : ''}`}
              onClick={(e) => handleDotClick(e, section.id)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              transition={{
                scale: { type: 'spring', stiffness: 400, damping: 17 },
              }}
              aria-label={`Navigate to ${section.label}`}
            >
              {/* Inner core */}
              <motion.div
                className="dot-core"
                animate={{
                  scale: isActive ? [1, 1.3, 1] : 1,
                  opacity: isActive ? [0.6, 1, 0.6] : 0.4,
                }}
                transition={{
                  scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                  opacity: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                }}
              />

              {/* Ring animation for active state */}
              {isActive && (
                <motion.div
                  className="dot-ring"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                />
              )}
            </motion.button>

            {/* Drop-down tooltip card */}
            <AnimatePresence>
              {isTooltipVisible && (
                <motion.div
                  className="dot-tooltip-card"
                  initial={{ opacity: 0, x: 10, y: '-50%' }}
                  animate={{ opacity: 1, x: 0, y: '-50%' }}
                  exit={{ opacity: 0, x: 10, y: '-50%' }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    mass: 0.5,
                  }}
                >
                  {/* Icon badge */}
                  <div className="tooltip-icon-badge">
                    <Icon size={14} strokeWidth={2.5} />
                  </div>

                  {/* Content */}
                  <div className="tooltip-content">
                    <div className="tooltip-section-label">
                      {section.label}
                    </div>
                    <div className="tooltip-description">
                      {sectionDescriptions[section.id]}
                    </div>
                  </div>

                  {/* Decorative arrow */}
                  <div className="tooltip-arrow" />

                  {/* Subtle gradient background effect */}
                  <div className="tooltip-gradient-overlay" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress indicator line between dots */}
            {index < sections.length - 1 && (
              <motion.div
                className="dot-progress-line"
                initial={{ height: 0 }}
                animate={{ 
                  height: isActive ? '100%' : '20%',
                  opacity: isActive ? 1 : 0.3,
                }}
                transition={{ duration: 0.4 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default DotNavigation
