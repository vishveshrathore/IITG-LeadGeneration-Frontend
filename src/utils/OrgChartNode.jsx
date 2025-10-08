import React from 'react';
import { FaUserShield } from "react-icons/fa";   

const OrgChartNode = ({ node }) => {
  // Hide Admin node in the hierarchy tree
  if (node.role === "") return null;
  if (node.role === "Admin") return null;
  if (node.role === "LG") return null;
  if (node.role === "AdminTeam") return null;

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const managers = Array.isArray(node.reportsTo)
    ? node.reportsTo
    : (node.reportsTo ? [node.reportsTo] : []);

  // Leader roles, treating Deputies same as their heads
  const leaderRoles = [
    "CRM-TeamLead",
    "DeputyCRMTeamLead",
    "RegionalHead",
    "DeputyRegionalHead",
    "NationalHead",
    "DeputyNationalHead",
  ];
  const isLeader = leaderRoles.includes(node.role);

  const [expanded, setExpanded] = React.useState(true);
  // Auto-show links when there is more than one manager to make hierarchy obvious
  const [linksOn, setLinksOn] = React.useState(() => (Array.isArray(node.managerRefs) && node.managerRefs.length > 1));
  const connectorsRef = React.useRef([]);

  // Draw a temporary dashed connector between two nodes (this -> manager)
  const drawTempConnector = (fromEl, toEl) => {
    if (!fromEl || !toEl) return;
    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();
    const x1 = from.left + from.width / 2;
    const y1 = from.top + from.height;
    const x2 = to.left + to.width / 2;
    const y2 = to.top; // top of manager card
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const line = document.createElement('div');
    line.style.position = 'fixed';
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.width = `${length}px`;
    line.style.height = '0';
    line.style.borderTop = '2px dashed rgba(59,130,246,0.8)'; // blue-500 dashed
    line.style.transformOrigin = '0 0';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.zIndex = '50';
    document.body.appendChild(line);
    setTimeout(() => line.remove(), 1800);
  };

  const linkToManager = (mid) => {
    const me = document.getElementById(`node-${node._id}`);
    const mgr = document.getElementById(`node-${mid}`);
    drawTempConnector(me, mgr);
    if (mgr) mgr.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };

  const drawPersistentConnectors = () => {
    const me = document.getElementById(`node-${node._id}`);
    const created = [];
    if (!me || !Array.isArray(node.managerRefs)) return created;
    for (const m of node.managerRefs) {
      const mgr = document.getElementById(`node-${m._id}`);
      if (!mgr) continue;
      // replicate drawTempConnector but do not auto-remove
      const from = me.getBoundingClientRect();
      const to = mgr.getBoundingClientRect();
      const x1 = from.left + from.width / 2;
      const y1 = from.top + from.height;
      const x2 = to.left + to.width / 2;
      const y2 = to.top;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const line = document.createElement('div');
      line.style.position = 'fixed';
      line.style.left = `${x1}px`;
      line.style.top = `${y1}px`;
      line.style.width = `${length}px`;
      line.style.height = '0';
      line.style.borderTop = '2px dashed rgba(59,130,246,0.5)';
      line.style.transformOrigin = '0 0';
      line.style.transform = `rotate(${angle}deg)`;
      line.style.zIndex = '40';
      document.body.appendChild(line);
      created.push(line);
    }
    return created;
  };

  const clearPersistentConnectors = () => {
    connectorsRef.current.forEach(el => el && el.remove());
    connectorsRef.current = [];
  };

  React.useEffect(() => {
    clearPersistentConnectors();
    if (linksOn) {
      connectorsRef.current = drawPersistentConnectors();
    }
    const handler = () => {
      if (!linksOn) return;
      clearPersistentConnectors();
      connectorsRef.current = drawPersistentConnectors();
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      clearPersistentConnectors();
    };
  }, [linksOn, node._id, Array.isArray(node.managerRefs) ? node.managerRefs.map(m=>String(m._id)).join(',') : '']);

  // Dynamic card class for leaders vs others
  const cardClass = `flex flex-col items-center gap-1 p-3 rounded-xl border-2 ${isLeader ? 'border-indigo-400' : 'border-blue-200'} bg-white shadow-xl transition-all duration-300 w-36 md:w-48 lg:w-56 transform hover:scale-105 hover:shadow-2xl`;

  return (
    <div id={`node-${node._id}`} className="flex flex-col items-center relative z-10 p-2 md:p-4">
      {/* Node Card - Responsive and Enhanced */}
      <div className={cardClass}>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-full p-2 md:p-3 shadow-lg ring-1 ring-blue-300 ring-opacity-80">
          <FaUserShield className="text-xl md:text-2xl text-white" />
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm md:text-base">{node.name}</p>
          <p className="text-xs md:text-sm text-blue-700 font-semibold flex items-center justify-center gap-1">
            {node.role}
            {isLeader && (
              <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Leader
              </span>
            )}
          </p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{node.email}</p>
          {/* Reports-to chips (link to managers) */}
          {Array.isArray(node.managerRefs) && node.managerRefs.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
              <span className="text-[10px] md:text-[11px] text-gray-600">Reports to:</span>
              {node.managerRefs.map((m, idx) => (
                <button
                  key={String(m._id)}
                  type="button"
                  onClick={() => linkToManager(m._id)}
                  className={`text-[10px] md:text-[11px] px-2 py-0.5 rounded-full border ${idx===0 ? 'bg-yellow-50 border-yellow-300 text-yellow-900' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                  title={`${m.name} · ${m.role}${idx===0 ? ' (Primary)' : ''}`}
                >
                  {idx===0 ? '★ ' : ''}{m.name} ({m.role})
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {/* Expand/Collapse children toggle */}
          {hasChildren && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="text-[11px] px-2 py-0.5 rounded border bg-gray-50 hover:bg-gray-100"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse children' : 'Expand children'}
            >
              {expanded ? 'Hide Team' : 'Show Team'}
            </button>
          )}
          {/* Show links toggle (default ON if multiple managers) */}
          {Array.isArray(node.managerRefs) && node.managerRefs.length > 0 && (
            <button
              type="button"
              onClick={() => setLinksOn(v => !v)}
              className={`text-[11px] px-2 py-0.5 rounded border transition ${linksOn ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              {linksOn ? 'Hide Manager Links' : 'Show Manager Links'}
            </button>
          )}
        </div>
      </div>

      {/* Children & Connecting Lines */}
      {hasChildren && expanded && (
        <div className="relative w-full">
          {/* Main Vertical Line Down from Parent */}
          <div className="absolute top-0 left-1/2 h-8 w-0.5 bg-blue-400 -translate-x-1/2"></div>
          
          {/* Horizontal Connector Line for all children */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-blue-400"></div>

          {/* Children Nodes Container */}
          <div className="flex justify-center pt-10 md:pt-12 gap-6 md:gap-12 relative z-10">
            {node.children.map(child => (
              <div key={child._id} className="relative flex flex-col items-center">
                {/* Individual Vertical Line Up to Child */}
                <div className="absolute bottom-full left-1/2 h-6 w-0.5 bg-blue-400 -translate-x-1/2">
                  {/* Subtle dot at the connection point */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                </div>
                <OrgChartNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChartNode;