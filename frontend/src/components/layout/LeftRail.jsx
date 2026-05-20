import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import useStore from '../../store/useStore';
import { useSessionContext } from '../../context/SessionContext';
import { DEMO_SKILL_LIBRARY } from '../../store/demoData';
import FlowIcon from '../common/FlowIcon';
import { filterLiveConnectedAgents } from '../../utils/agentPresence';
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

function categoriesFromIndexPayload(categoriesPayload) {
  if (!categoriesPayload || typeof categoriesPayload !== 'object') {
    return [];
  }

  return Object.entries(categoriesPayload)
    .map(([id, ids]) => ({
      id,
      label: formatCategoryLabel(id),
      icon: resolveCategoryIcon(id),
      count: Array.isArray(ids) ? ids.length : 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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
  const { accessToken, session } = useSessionContext();
  const buildSessionHeaders = useCallback((extra = {}) => {
    const headers = { ...extra };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else if (session?.anonymousToken) {
      headers['X-Syniq-Anonymous-Token'] = session.anonymousToken;
    }
    return headers;
  }, [accessToken, session?.anonymousToken]);
  const [searchValue, setSearchValue] = useState('');
  const [liveResults, setLiveResults] = useState(null);
  const [liveSkills, setLiveSkills] = useState([]);
  const [categoryIndexStats, setCategoryIndexStats] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);

  const historyItems = useMemo(
    () => sessions.filter((s) => s.id !== activeSession?.id).slice(0, 4),
    [sessions, activeSession]
  );

  const searchSkills = useCallback(async (query) => {
    if (!query.trim()) {
      setLiveResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`${backendUrl}/skills/search`, {
        method: 'POST',
        credentials: 'include',
        headers: buildSessionHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiveResults((data.results || []).map(toCompactSkillRecord));
      }
    } catch {
      setLiveResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [backendUrl, buildSessionHeaders]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSkills(searchValue), 200);
    return () => clearTimeout(debounceRef.current);
  }, [searchValue, searchSkills]);

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      try {
        const res = await fetch(`${backendUrl}/skills`, {
          headers: buildSessionHeaders(),
          credentials: 'include',
        });
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
  }, [backendUrl, buildSessionHeaders]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const res = await fetch(`${backendUrl}/skills/categories`, {
          headers: buildSessionHeaders(),
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error('categories unavailable');
        }
        const data = await res.json();
        if (!cancelled) {
          setCategoryIndexStats(categoriesFromIndexPayload(data.categories));
        }
      } catch {
        if (!cancelled) {
          setCategoryIndexStats(null);
        }
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, buildSessionHeaders]);

  const fallbackGrouped = useMemo(() => {
    const groupedLive = groupSkillsByCategory(liveSkills);
    return groupedLive.length > 0 ? groupedLive : DEMO_SKILL_LIBRARY;
  }, [liveSkills]);

  const categoryChips = useMemo(() => {
    if (liveResults && liveResults.length > 0) {
      return groupSkillsByCategory(liveResults).map((cat) => ({
        id: cat.id,
        label: cat.label,
        icon: resolveCategoryIcon(cat.id),
        count: cat.items.length,
      }));
    }

    const query = searchValue.trim().toLowerCase();
    if (categoryIndexStats && categoryIndexStats.length > 0) {
      if (!query) {
        return categoryIndexStats;
      }
      return categoryIndexStats.filter(
        (c) => c.label.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)
      );
    }

    return fallbackGrouped.map((cat) => ({
      id: cat.id,
      label: cat.label,
      icon: resolveCategoryIcon(cat.id),
      count: cat.items.length,
    })).filter((c) => {
      if (!query) return true;
      return c.label.toLowerCase().includes(query) || c.id.toLowerCase().includes(query);
    });
  }, [liveResults, searchValue, categoryIndexStats, fallbackGrouped]);

  const totalSkillsInSynIQ = useMemo(
    () => categoryChips.reduce((sum, c) => sum + c.count, 0),
    [categoryChips]
  );

  const liveConnectedAgents = useMemo(
    () => filterLiveConnectedAgents(connectedAgents),
    [connectedAgents]
  );

  const librarySummary = useMemo(() => {
    const categoryCount = categoryChips.length;
    const topGroup = categoryChips[0] || null;
    return {
      totalSkills: totalSkillsInSynIQ,
      categoryCount,
      topGroupLabel: topGroup?.label || '—',
      topGroupCount: topGroup?.count || 0,
    };
  }, [categoryChips, totalSkillsInSynIQ]);

  return (
    <aside className="left-rail">
      <div className="left-rail-session-switcher">
        <div>
          <span className="rail-kicker">Workspace</span>
          <strong>{activeSession?.name || 'Untitled Session'}</strong>
        </div>
      </div>

      <label className="left-rail-search">
        <Search size={16} />
        <input
          aria-label="Search skills and categories"
          placeholder="Search categories or skills…"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
      </label>

      <section className="rail-panel" data-tour="agents">
        <div className="rail-panel-head">
          <span className="rail-panel-title">Connected agents</span>
          <span className="rail-panel-count">{liveConnectedAgents.length}</span>
        </div>
        <div className="rail-panel-body">
          <div className="agent-stack agent-stack--compact">
            {liveConnectedAgents.length === 0 ? (
              <p className="rail-empty-hint">No agent connected yet. Use Connect agent to attach one.</p>
            ) : null}
            {liveConnectedAgents.map((agent) => (
              <div
                key={agent.id}
                className={`agent-row ${agent.status === 'connected' ? 'is-connected' : ''}`}
              >
                <span className={`status-dot status-dot-${agent.status}`} />
                <div className="agent-row-copy">
                  <strong>{agent.name}</strong>
                  <span>{agent.lastSeen}</span>
                </div>
                <span className="agent-row-badge">{agent.type}</span>
              </div>
            ))}
          </div>
          <button type="button" className="rail-add-button" onClick={() => setConnectModalOpen(true)}>
            <Plus size={14} />
            Connect agent
          </button>
        </div>
      </section>

      <section className="rail-panel rail-panel--grow" data-tour="library">
        <div className="rail-panel-head">
          <span className="rail-panel-title">Syniq library</span>
          <span className="rail-panel-count" title="Total skills/tools in catalog">
            {totalSkillsInSynIQ}{isSearching ? '…' : ''}
          </span>
        </div>
        <div className="rail-panel-body rail-panel-body--chips">
          <div className="library-summary-grid" aria-label="Syniq library totals">
            <div className="library-stat-card">
              <strong className="library-stat-value">{librarySummary.totalSkills}</strong>
              <span className="library-stat-label">Skills indexed</span>
            </div>
            <div className="library-stat-card">
              <strong className="library-stat-value">{librarySummary.categoryCount}</strong>
              <span className="library-stat-label">Groups</span>
            </div>
          </div>
          {categoryChips.length === 0 ? (
            <p className="rail-empty-hint">No categories match this search.</p>
          ) : (
            <div className="library-group-grid" aria-busy={isSearching}>
              {categoryChips.map((cat) => (
                <div key={cat.id} className="library-group-card" title={`${cat.count} skills in ${cat.label}`}>
                  <div className="library-group-card-head">
                    <FlowIcon name={cat.icon} size={18} className="library-group-card-icon" />
                    <span className="library-group-card-label">{cat.label}</span>
                  </div>
                  <strong className="library-group-card-count">{cat.count}</strong>
                  <span className="library-group-card-meta">skills in group</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rail-panel rail-panel--bottom">
        <div className="rail-panel-head">
          <span className="rail-panel-title">Session history</span>
          <span className="rail-panel-count">{historyItems.length}</span>
        </div>
        <div className="rail-panel-body">
          <div className="history-list history-list--compact">
            {historyItems.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`history-row ${activeSession?.id === s.id ? 'is-active' : ''}`}
                onClick={() => setActiveSession(s)}
              >
                <div className="history-row-copy">
                  <strong>{s.name}</strong>
                  <div className="history-row-meta">
                    <span className={`history-row-status history-row-status-${s.status || 'completed'}`} />
                    <span>{s.elapsed}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}

export default LeftRail;
