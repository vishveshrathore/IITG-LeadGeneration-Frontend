import React, { useState, useEffect, useMemo, useRef } from 'react';

// Diagram-style menu with connectors, matching the provided sketch
// Props:
// - isLeader, teamMembers, scope, selectedUserId
// - onSelectAll, onSelectUser
// - meLabel, allLabel, title
export default function TeamScopeMenu({
  isLeader,
  teamMembers = [],
  scope = 'self',
  selectedUserId = '',
  onSelectAll,
  onSelectUser,
  onSelectMe,
  meLabel = 'Me',
  allLabel = 'All',
  title = 'Scope',
  persist = false
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1); // -1: All, 0..N-1: team member index
  const ref = useRef(null);
  const searchRef = useRef(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Persist and restore last selected scope for leaders (safe, only once, after members are available)
  useEffect(() => {
    if (!persist || !isLeader || restoredRef.current) return;
    let parsed = null;
    try {
      const saved = localStorage.getItem('team_scope_selection');
      if (!saved) return;
      parsed = JSON.parse(saved);
    } catch (_) { return; }
    if (!parsed) return;
    if (parsed.type === 'self') {
      onSelectMe && onSelectMe();
      restoredRef.current = true;
      return;
    }
    if (parsed.type === 'team') {
      onSelectAll && onSelectAll();
      restoredRef.current = true;
      return;
    }
    if (parsed.type === 'user' && parsed.id) {
      const exists = Array.isArray(teamMembers) && teamMembers.some(u => String(u._id) === String(parsed.id));
      if (exists) {
        onSelectUser && onSelectUser(parsed.id);
        restoredRef.current = true;
      }
    }
  }, [persist, isLeader, teamMembers, onSelectAll, onSelectUser, onSelectMe]);

  const currentLabel = () => {
    if (scope === 'team') return allLabel;
    if (scope === 'user' && selectedUserId) {
      const u = teamMembers.find(t => String(t._id) === String(selectedUserId));
      return u?.name || u?.email || 'Member';
    }
    return meLabel;
  };

  const TreeConnector = ({ isFirst, isLast }) => (
    <div className="relative w-6 flex-shrink-0">
      <div className={`absolute left-1/2 -translate-x-1/2 ${isFirst ? 'top-1/2' : 'top-0'} ${isLast ? 'h-3' : 'h-full'} border-l border-slate-300`}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-3 border-t border-slate-300"></div>
    </div>
  );

  const filteredMembers = useMemo(() => {
    const f = (filter || '').trim().toLowerCase();
    if (!f) return teamMembers;
    return teamMembers.filter(tm =>
      (tm.name || '').toLowerCase().includes(f) || (tm.email || '').toLowerCase().includes(f)
    );
  }, [filter, teamMembers]);

  const colorFromString = (s = '') => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 90%)`; // light pastel background
  };

  const isActiveAll = scope === 'team';
  const isActiveMe = scope === 'self';
  const isActiveUser = (id) => scope === 'user' && String(selectedUserId) === String(id);

  const handleOpen = () => {
    if (!isLeader) return;
    setOpen(o => !o);
    setTimeout(() => searchRef.current && searchRef.current.focus(), 0);
  };

  const handleSelectAll = () => {
    if (persist) { try { localStorage.setItem('team_scope_selection', JSON.stringify({ type: 'team' })); } catch (_) {} }
    onSelectAll && onSelectAll();
    setOpen(false);
  };

  const handleSelectMe = () => {
    if (persist) { try { localStorage.setItem('team_scope_selection', JSON.stringify({ type: 'self' })); } catch (_) {} }
    onSelectMe && onSelectMe();
    setOpen(false);
  };

  const handleSelectUser = (id) => {
    if (persist) { try { localStorage.setItem('team_scope_selection', JSON.stringify({ type: 'user', id })); } catch (_) {} }
    onSelectUser && onSelectUser(id);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    const maxIndex = filteredMembers.length - 1;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(prev => (prev < maxIndex ? prev + 1 : maxIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIndex === -1) handleSelectAll();
      else if (focusIndex >= 0 && focusIndex <= maxIndex) handleSelectUser(filteredMembers[focusIndex]._id);
    }
  };

  return (
    <div className="relative" ref={ref} onKeyDown={onKeyDown}>
      {isLeader ? (
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-slate-200 bg-white shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          onClick={handleOpen}
          title={title}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="font-medium">{currentLabel()}</span>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-slate-500"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
        </button>
      ) : (
        <div className="text-xs px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200" title="Only your data is shown">{meLabel}</div>
      )}

      {isLeader && open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 origin-top-right animate-[fadeIn_120ms_ease-out]" role="menu" aria-label="Team scope menu">
          {/* Sticky header with search */}
          <div className="sticky top-0 bg-white p-3 border-b border-slate-200">
            <input
              ref={searchRef}
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setFocusIndex(-1); }}
              placeholder="Search team..."
              className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* ALL node */}
          <div className="p-3">
            <button
              className={`w-full text-left px-3 py-2 rounded-lg border relative ${isActiveAll ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} group`}
              onClick={handleSelectAll}
              role="menuitem"
              aria-current={isActiveAll}
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: colorFromString('all') }}>A</div>
                <div className="text-sm font-semibold text-slate-800">{allLabel}</div>
                {isActiveAll && <span className="ml-auto text-[11px] text-indigo-700">selected</span>}
              </div>
              {isActiveAll && (<span className="absolute left-0 top-0 bottom-0 w-1 rounded-l bg-indigo-400/70" />)}
            </button>
          </div>

          {/* Me node */}
          <div className="px-3">
            <button
              className={`w-full text-left px-3 py-2 rounded-lg border relative ${isActiveMe ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} group`}
              onClick={handleSelectMe}
              role="menuitem"
              aria-current={isActiveMe}
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: colorFromString('me') }}>M</div>
                <div className="text-sm font-semibold text-slate-800">{meLabel}</div>
                {isActiveMe && <span className="ml-auto text-[11px] text-indigo-700">selected</span>}
              </div>
              {isActiveMe && (<span className="absolute left-0 top-0 bottom-0 w-1 rounded-l bg-indigo-400/70" />)}
            </button>
          </div>

          {/* My Team tree */}
          <div className="px-3 pb-3">
            <div className="px-1 text-xs font-semibold text-slate-500 uppercase mb-2">My Team</div>
            <div className="relative max-h-72 overflow-auto">
              {/* Vertical trunk line */}
              <div className="pointer-events-none absolute top-0 bottom-0 left-4 border-l border-slate-300/80" />
              {filteredMembers.length === 0 ? (
                <div className="px-3 py-6 text-sm text-slate-500 text-center">No team members</div>
              ) : (
                filteredMembers.map((tm, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === (filteredMembers.length - 1);
                  const active = isActiveUser(tm._id);
                  const initials = (tm.name || tm.email || '?').slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={tm._id}
                      className={`w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 group relative ${active ? 'bg-indigo-50/60' : ''}`}
                      onClick={() => handleSelectUser(tm._id)}
                      role="menuitem"
                      aria-current={active}
                    >
                      <div className="flex items-center">
                        <TreeConnector isFirst={isFirst} isLast={isLast} />
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: colorFromString(tm.name || tm.email) }}>
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-slate-800 truncate">{tm.name || tm.email}</span>
                            {tm.name && <span className="text-xs text-slate-500 truncate">{tm.email}</span>}
                          </div>
                          {/* Right-side badges slot (optional counts) */}
                          {tm.counts && (
                            <div className="ml-auto flex items-center gap-1">
                              {typeof tm.counts.followups === 'number' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">FU {tm.counts.followups}</span>
                              )}
                              {typeof tm.counts.positive === 'number' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700">PL {tm.counts.positive}</span>
                              )}
                              {typeof tm.counts.closures === 'number' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] bg-indigo-100 text-indigo-700">CL {tm.counts.closures}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {active && (<span className="absolute left-0 top-0 bottom-0 w-1 rounded-l bg-indigo-400/70" />)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
