import React from 'react';
import { motion } from 'framer-motion';
import { 
  MousePointer2, 
  Hand, 
  Plus, 
  MessageSquare, 
  Maximize2, 
  Map as MapIcon, 
  Maximize 
} from 'lucide-react';
import useCanvasStore from '../../store/canvasStore';
import './CanvasToolbar.css';

/**
 * CanvasToolbar - Floating tool palette
 * 
 * 7 tools: Selection, Pan, Add Node, Add Annotation, Fit to View, Minimap, Fullscreen
 */
function CanvasToolbar({ onFitToView }) {
  const { activeTool, setActiveTool, minimapVisible, toggleMinimap } = useCanvasStore();

  const tools = [
    {
      id: 'select',
      icon: MousePointer2,
      label: 'Selection',
      action: () => setActiveTool('select'),
    },
    {
      id: 'pan',
      icon: Hand,
      label: 'Pan',
      action: () => setActiveTool('pan'),
    },
    {
      id: 'add-node',
      icon: Plus,
      label: 'Add Node',
      action: () => {
        // Open node creation modal
        console.log('Add node');
      },
    },
    {
      id: 'add-annotation',
      icon: MessageSquare,
      label: 'Add Annotation',
      action: () => {
        // Create text annotation
        console.log('Add annotation');
      },
    },
    {
      id: 'fit-view',
      icon: Maximize2,
      label: 'Fit to View',
      action: onFitToView,
    },
    {
      id: 'minimap',
      icon: MapIcon,
      label: 'Minimap',
      action: toggleMinimap,
      isActive: minimapVisible,
    },
    {
      id: 'fullscreen',
      icon: Maximize,
      label: 'Fullscreen',
      action: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      },
    },
  ];

  return (
    <motion.div
      className="canvas-toolbar"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = tool.id === activeTool || tool.isActive;

        return (
          <motion.button
            key={tool.id}
            className={`toolbar-button ${isActive ? 'toolbar-button-active' : ''}`}
            onClick={tool.action}
            aria-label={tool.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Icon size={16} strokeWidth={1.2} />
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export default CanvasToolbar;
