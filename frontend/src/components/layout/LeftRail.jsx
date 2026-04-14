import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import useStore from '../../store/useStore';
import { DEMO_SKILL_LIBRARY } from '../../store/demoData';
import FlowIcon from '../common/FlowIcon';
import './LeftRail.css';

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
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState({
    agents: true,
    skills: true,
    history: true,
  });
  const [expandedCategories, setExpandedCategories] = useState({
    reasoning: true,
    research: true,
    control: false,
  });

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
        setLiveResults(data.results || []);
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

  // Falls back to local filtering when backend is unreachable
  const filteredCategories = useMemo(() => {
    if (liveResults) {
      // Group live results into a single "Search Results" category
      return [{
        id: 'search-results',
        label: `Results (${liveResults.length})`,
        items: liveResults.map((r) => ({
          id: r.id,
          label: r.name,
          icon: 'sparkles',
          description: r.description,
          score: r.score,
        })),
      }];
    }

    const query = searchValue.trim().toLowerCase();
    if (!query) return DEMO_SKILL_LIBRARY;

    return DEMO_SKILL_LIBRARY.map((category) => ({
      ...category,
      items: category.items.filter((item) => item.label.toLowerCase().includes(query)),
    })).filter((category) => category.items.length > 0);
  }, [searchValue, liveResults]);

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
            {DEMO_SKILL_LIBRARY.reduce((total, category) => total + category.items.length, 0)}
          </span>
        </button>

        {expandedSections.skills && (
          <div className="rail-section-body rail-section-body-skills">
            {filteredCategories.map((category) => (
              <div key={category.id} className="skill-category">
                <button className="skill-category-header" onClick={() => toggleCategory(category.id)}>
                  {expandedCategories[category.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{category.label}</span>
                  <span className="skill-category-count">{category.items.length}</span>
                </button>

                {expandedCategories[category.id] && (
                  <div className="skill-tile-grid">
                    {category.items.map((item) => (
                      <button key={item.id} className="skill-tile">
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
