import React from 'react';
import {
  Brain,
  Database,
  FileText,
  GitBranch,
  Globe,
  Layers,
  MessageSquare,
  Radar,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Zap,
} from 'lucide-react';

const ICONS = {
  brain: Brain,
  database: Database,
  'file-text': FileText,
  'git-branch': GitBranch,
  globe: Globe,
  layers: Layers,
  'message-square': MessageSquare,
  radar: Radar,
  search: Search,
  send: Send,
  shield: Shield,
  'shield-check': ShieldCheck,
  shuffle: Shuffle,
  sparkles: Sparkles,
  zap: Zap,
};

function FlowIcon({ name, size = 18, className = '' }) {
  const IconComponent = ICONS[name] || Sparkles;
  return <IconComponent size={size} className={className} strokeWidth={1.8} />;
}

export default FlowIcon;
