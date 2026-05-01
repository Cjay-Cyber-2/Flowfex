import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import useStore from '../../store/useStore';
import { DEMO_SKILL_LIBRARY } from '../../store/demoData';
import FlowIcon from '../common/FlowIcon';
import './LeftRail.css';

const CATEGORY_ICON_MAP = {
  ai: 'brain',
  agentTeam: 'radar',
  api: 'globe',
  automation: 'shuffle',
  backend: 'layers',
  code: 'zap',
  data: 'database',
  design: 'sparkles',
  devops: 'send',
  documentation: 'file-text',
  frontend: 'layers',
  general: 'sparkles',
  productivity: 'sparkles',
  rag: 'database',
  research: 'search',
  security: 'shield',
  testing: 'shield-check',
  voice: 'message-square',
};

function normalizeCategoryKey(value) {
  return String(value || 'general').replace(/[^a-z0-9]+(.)/gi, (_, letter) => letter.toUpperCase());
}

function formatCategoryLabel(value) {
  return String(value || 'general')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveCategoryIcon(value) {
  return CATEGORY_ICON_MAP[normalizeCategoryKey(value)] || 'sparkles';
}

function groupSkillsByCategory(skills) {
  const grouped = new Map();

  for (const skill of skills) {
    const category = skill.category || 'general';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }

    grouped.get(category).push({
      id: skill.id,
      label: skill.name,
      icon: resolveCategoryIcon(category),
      description: skill.description,
      score: skill.score,
    });
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .map(([category, items]) => ({
      id: category,
      label: formatCategoryLabel(category),
      items: items.sort((left, right) => {
        const scoreDelta = (right.score || 0) - (left.score || 0);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }
        return left.label.localeCompare(right.label);
      }),
    }));
}

function toCompactSkillRecord(skill) {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    score: skill.score,
  };
}

function LeftRail() {
  const {
    activeSession,
    connectedAgents,
    sessions,
    setActiveSession,
    setConnectModalOpen,
    backendUrl,
  } = useStore();
  const [searchValue, setSearchValue] = useState('');
  const [liveResults, setLiveResults] = useState(null);
  const [liveSkills, setLiveSkills] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState({
    agents: true,
    skills: true,
    history: true,
  });
  const [expandedCategories, setExpandedCategories] = useState({});

  const historyItems = useMemo(
    () => sessions.filter((session) => session.id !== activeSession?.id).slice(0, 3),
    [sessions, activeSession]
  );

  // Live skills search with debounce
  const searchSkills = useCallback(async (query) => {
    if (!query.trim()) {
      setLiveResults(null);
      return;
    }
    setIsSearching(true);
    try {
        const res = await fetch(`${backendUrl}/skills/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
      if (res.ok) {
        const data = await res.json();
        setLiveResults((data.results || []).map(toCompactSkillRecord));
      }
    } catch {
      // Backend unreachable — fall back to local filter
      setLiveResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSkills(searchValue), 200);
    return () => clearTimeout(debounceRef.current);
  }, [searchValue, searchSkills]);

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      try {
        const res = await fetch(`${backendUrl}/skills`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setLiveSkills(Array.isArray(data.tools) ? data.tools.map(toCompactSkillRecord) : []);
        }
      } catch {
        if (!cancelled) {
          setLiveSkills([]);
        }
      }
    };

    loadSkills();
    return () => {
      cancelled = true;
    };
  }, [backendUrl]);

  const skillLibrary = useMemo(() => {
    const groupedLiveSkills = groupSkillsByCategory(liveSkills);
    return groupedLiveSkills.length > 0 ? groupedLiveSkills : DEMO_SKILL_LIBRARY;
  }, [liveSkills]);

  // Falls back to local filtering when backend is unreachable
  const filteredCategories = useMemo(() => {
    if (liveResults && liveResults.length > 0) {
      return groupSkillsByCategory(liveResults);
    }

    const query = searchValue.trim().toLowerCase();
    if (!query) return skillLibrary;

    return skillLibrary.map((category) => ({
      ...category,
      items: category.items.filter((item) =>
        item.label.toLowerCase().includes(query)
        || item.description?.toLowerCase().includes(query)
        || category.label.toLowerCase().includes(query)
      ),
    })).filter((category) => category.items.length > 0);
  }, [searchValue, liveResults, skillLibrary]);

  useEffect(() => {
    if (filteredCategories.length === 0) return;

    setExpandedCategories((current) => {
      const next = { ...current };
      filteredCategories.slice(0, 4).forEach((category) => {
        if (typeof next[category.id] !== 'boolean') {
          next[category.id] = true;
        }
      });
      return next;
    });
  }, [filteredCategories]);

  const toggleSection = (section) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  };

  return (
    <aside className="left-rail">
      <div className="left-rail-session-switcher">
        <div>
          <span className="rail-kicker">Workspace</span>
          <strong>{activeSession?.name || 'Untitled Session'}</strong>
        </div>
        <ChevronDown size={16} />
      </div>

      <label className="left-rail-search">
        <Search size={16} />
        <input
          aria-label="Search skills, agents, connectors"
          placeholder="Search skills, agents, connectors..."
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
      </label>

      <section className="rail-section">
        <button className="rail-section-header" onClick={() => toggleSection('agents')}>
          {expandedSections.agents ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Connected Agents</span>
          <span className="rail-section-count">{connectedAgents.length}</span>
        </button>

        {expandedSections.agents && (
          <div className="rail-section-body">
            <div className="agent-stack">
              {connectedAgents.map((agent) => (
                <button
                  key={agent.id}
                  className={`agent-card ${agent.status === 'connected' ? 'is-connected' : ''}`}
                >
                  <span className={`status-dot status-dot-${agent.status}`} />
                  <div className="agent-card-copy">
                    <strong>{agent.name}</strong>
                    <span>{agent.lastSeen}</span>
                  </div>
                  <span className="agent-card-badge">{agent.type}</span>
                </button>
              ))}
            </div>

            <button className="rail-add-button" onClick={() => setConnectModalOpen(true)}>
              <Plus size={14} />
              Connect Agent
            </button>
          </div>
        )}
      </section>

      <section className="rail-section">
        <button className="rail-section-header" onClick={() => toggleSection('skills')}>
          {expandedSections.skills ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Skill Library</span>
          <span className="rail-section-count">
            {skillLibrary.reduce((total, category) => total + category.items.length, 0)}
          </span>
        </button>

        {expandedSections.skills && (
          <div className="rail-section-body rail-section-body-skills">
            {filteredCategories.map((category) => (
              <div key={category.id} className="skill-category">
                <button className="skill-category-header" onClick={() => toggleCategory(category.id)}>
                  {(expandedCategories[category.id] ?? true) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{category.label}</span>
                  <span className="skill-category-count">{category.items.length}</span>
                </button>

                {(expandedCategories[category.id] ?? true) && (
                  <div className="skill-tile-grid">
                    {category.items.map((item) => (
                      <button key={item.id} className="skill-tile" title={item.description || item.label}>
                        <FlowIcon name={item.icon} size={18} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rail-section rail-section-history">
        <button className="rail-section-header" onClick={() => toggleSection('history')}>
          {expandedSections.history ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Session History</span>
          <span className="rail-section-count">{historyItems.length}</span>
        </button>

        {expandedSections.history && (
          <div className="rail-section-body">
            <div className="history-list">
              {historyItems.map((session) => (
                <button
                  key={session.id}
                  className={`history-row ${activeSession?.id === session.id ? 'is-active' : ''}`}
                  onClick={() => setActiveSession(session)}
                >
                  <div className="history-row-copy">
                    <strong>{session.name}</strong>
                    <div className="history-row-meta">
                      <span className={`history-row-status history-row-status-${session.status || 'completed'}`} />
                      <span>{session.elapsed}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button className="rail-view-all">View all</button>
          </div>
        )}
      </section>
    </aside>
  );
}

export default LeftRail;
