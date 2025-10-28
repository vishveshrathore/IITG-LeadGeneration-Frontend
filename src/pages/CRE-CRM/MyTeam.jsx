import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import CRENavbar from '../../components/CreNavbar';
import { BASE_URL } from '../../config';

const MyTeam = () => {
  const { role, user, authToken } = useAuth();
  const token = authToken || localStorage.getItem('token');
  const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);

  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [teamLeadsData, setTeamLeadsData] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Filters & pagination for leads table
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [followUpTodayOnly, setFollowUpTodayOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLead, setViewLead] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!token || !isLeader) return;
    const headers = { Authorization: `Bearer ${token}` };
    const run = async () => {
      try {
        setLoadingMembers(true);
        const res = await axios.get(`${BASE_URL}/api/cre/team/members`, { headers });
        setTeamMembers(res?.data?.data || []);
      } catch (_) {
        setTeamMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };
    run();
  }, [token, isLeader]);

  useEffect(() => {
    if (!token || !isLeader) return;
    const headers = { Authorization: `Bearer ${token}` };
    const run = async () => {
      try {
        setLoadingLeads(true);
        const res = await axios.get(`${BASE_URL}/api/cre/team/leads`, { headers });
        setTeamLeadsData(res?.data?.data || []);
      } catch (_) {
        setTeamLeadsData([]);
      } finally {
        setLoadingLeads(false);
      }
    };
    run();
  }, [token, isLeader]);

  // Derive per-member closures (closureStatus === 'Closed') from teamLeadsData
  const memberClosedCounts = useMemo(() => {
    const map = {};
    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid) continue;
      if (a?.closureStatus === 'Closed') {
        map[uid] = (map[uid] || 0) + 1;
      }
    }
    return map;
  }, [teamLeadsData]);

  const teamTotals = useMemo(() => {
    const sum = {
      closed: 0,
      closureProspects: 0,
      positive: 0,
      pending: 0,
      negative: 0,
      total: 0,
      todaysFollowups: 0,
    };
    for (const m of teamMembers) {
      const id = String(m._id);
      sum.closed += Number(memberClosedCounts[id] || 0);
      sum.closureProspects += Number(m?.metrics?.closureProspects || 0);
      sum.positive += Number(m?.metrics?.positive || 0);
      sum.pending += Number(m?.metrics?.pending || 0);
      sum.negative += Number(m?.metrics?.negative || 0);
      sum.total += Number(m?.metrics?.total || 0);
      sum.todaysFollowups += Number(m?.metrics?.todaysFollowups || 0);
    }
    return sum;
  }, [teamMembers, memberClosedCounts]);

  const filteredLeads = useMemo(() => {
    let rows = [...teamLeadsData];
    if (selectedUserId) rows = rows.filter(a => String(a.Calledbycre?._id || a.Calledbycre) === String(selectedUserId));
    if (statusFilter) {
      if (statusFilter === 'Closed') {
        rows = rows.filter(a => a?.closureStatus === 'Closed');
      } else {
        rows = rows.filter(a => (a.currentStatus || '').toLowerCase() === statusFilter.toLowerCase());
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(a => {
        const lead = a.lead || {};
        const company = lead.company || {};
        const text = [
          lead.name,
          lead.designation,
          lead.location,
          company.CompanyName,
          lead.productLine,
          lead.email,
          Array.isArray(lead.mobile) ? lead.mobile.join(',') : lead.mobile,
          a.Calledbycre?.name,
          a.reportingManager?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      });
    }
    if (followUpTodayOnly) {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      rows = rows.filter(a => {
        if (!a.followUps || a.followUps.length === 0) return false;
        const fu = a.followUps[a.followUps.length - 1];
        const d = fu?.followUpDate ? new Date(fu.followUpDate) : null;
        return d && d >= start && d < end;
      });
    }
    return rows;
  }, [teamLeadsData, selectedUserId, statusFilter, search, followUpTodayOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Render all fields systematically (no raw JSON)
  const prettyLabel = (k) => {
    if (!k) return '';
    return String(k)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_.-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
  };
  const excludedCompanyKeys = new Set(['Address','City','State','Pin','GST']);
  const isLikelyId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
  const isIdKey = (k) => {
    if (!k) return false;
    const kk = String(k).toLowerCase();
    return kk === 'id' || kk === '_id' || kk.endsWith('id');
  };
  const renderEntries = (value, path = []) => {
    if (value === null || value === undefined) {
      return (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-slate-500 col-span-1">{prettyLabel(path[path.length-1])}</div>
          <div className="col-span-2">—</div>
        </div>
      );
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          {value.length === 0 ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-slate-500 col-span-1">{prettyLabel(path[path.length-1])}</div>
              <div className="col-span-2">—</div>
            </div>
          ) : (
            value.map((v, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500 mb-2">{prettyLabel(path[path.length-1])} #{i+1}</div>
                {typeof v === 'object' && v !== null ? (
                  <div className="space-y-1">{Object.entries(v)
                    .filter(([k, vv]) => !(isIdKey(k) || isLikelyId(vv)))
                    .map(([k, vv], idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-slate-500 col-span-1">{prettyLabel(k)}</div>
                        <div className="col-span-2">{typeof vv === 'object' ? JSON.stringify(vv) : String(vv ?? '—')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-slate-500 col-span-1">Value</div>
                    <div className="col-span-2">{String(v ?? '—')}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      );
    }
    if (typeof value === 'object') {
      const isCompany = path[path.length-1] === 'company' || path.includes('company');
      const entries = Object.entries(value).filter(([k, v]) => {
        if (isCompany && excludedCompanyKeys.has(k)) return false;
        if (isIdKey(k)) return false;
        if (isLikelyId(v)) return false;
        return true;
      });
      if (entries.length === 0) return null;
      return (
        <div className="space-y-1">
          {entries.map(([k, v], idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-slate-500 col-span-1">{prettyLabel(k)}</div>
              <div className="col-span-2">{typeof v === 'object' ? (
                <div className="space-y-1">{renderEntries(v, [...path, k])}</div>
              ) : (
                String(v ?? '—')
              )}</div>
            </div>
          ))}
        </div>
      );
    }
    if (isLikelyId(value) || isIdKey(path[path.length-1])) {
      return null;
    }
    return (
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-slate-500 col-span-1">{prettyLabel(path[path.length-1])}</div>
        <div className="col-span-2">{String(value ?? '—')}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <CRENavbar />
      <div className="pt-20 px-6 w-full">
        <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-2xl font-bold mb-4">My Team</motion.h1>

        {/* Team members */}
        <div className="mb-8">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Closed</th>
                    <th className="px-4 py-3 text-left">Closure Prospects</th>
                    <th className="px-4 py-3 text-left">Positive</th>
                    <th className="px-4 py-3 text-left">Pending</th>
                    <th className="px-4 py-3 text-left">Negative</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">FU Today</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMembers ? (
                    <tr><td className="px-4 py-4" colSpan={10}>Loading team members…</td></tr>
                  ) : (
                    <>
                      <tr className="bg-green-100 font-semibold">
                        <td className="px-4 py-3">{`${user?.name || 'Reporting Manager'} (Total: ${teamTotals.total})`}</td>
                        <td className="px-4 py-3">{role || user?.role || '—'}</td>
                        <td className="px-4 py-3">{user?.email || '—'}</td>
                        <td className="px-4 py-3">{teamTotals.closed}</td>
                        <td className="px-4 py-3">{teamTotals.closureProspects}</td>
                        <td className="px-4 py-3">{teamTotals.positive}</td>
                        <td className="px-4 py-3">{teamTotals.pending}</td>
                        <td className="px-4 py-3">{teamTotals.negative}</td>
                        <td className="px-4 py-3">{teamTotals.total}</td>
                        <td className="px-4 py-3">{teamTotals.todaysFollowups}</td>
                      </tr>
                      {teamMembers.length === 0 ? (
                        <tr><td className="px-4 py-6 text-slate-500" colSpan={10}>No team members found.</td></tr>
                      ) : (
                        teamMembers.map(m => (
                          <tr key={m._id} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer" onClick={() => { setSelectedUserId(m._id); setPage(1); }}>
                            <td className="px-4 py-3">{m.name || '—'}</td>
                            <td className="px-4 py-3">{m.role || '—'}</td>
                            <td className="px-4 py-3">{m.email || '—'}</td>
                            <td className="px-4 py-3">{memberClosedCounts[String(m._id)] || 0}</td>
                            <td className="px-4 py-3">{m.metrics?.closureProspects ?? 0}</td>
                            <td className="px-4 py-3">{m.metrics?.positive ?? 0}</td>
                            <td className="px-4 py-3">{m.metrics?.pending ?? 0}</td>
                            <td className="px-4 py-3">{m.metrics?.negative ?? 0}</td>
                            <td className="px-4 py-3">{m.metrics?.total ?? 0}</td>
                            <td className="px-4 py-3">{m.metrics?.todaysFollowups ?? 0}</td>
                          </tr>
                        ))
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Team Leads controls */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Filter by member</label>
            <select value={selectedUserId} onChange={(e)=>{ setSelectedUserId(e.target.value); setPage(1); }} className="border rounded-md px-2 py-1 text-sm">
              <option value="">All</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Status</label>
            <select value={statusFilter} onChange={(e)=>{ setStatusFilter(e.target.value); setPage(1); }} className="border rounded-md px-2 py-1 text-sm">
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Closure Prospects">Closure Prospects</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Follow-up Today</label>
            <input type="checkbox" checked={followUpTodayOnly} onChange={(e)=>{ setFollowUpTodayOnly(e.target.checked); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1); }} placeholder="Search lead/company/CRE…" className="w-64 border rounded-md px-3 py-1 text-sm" />
            <label className="text-xs text-slate-600">Page size</label>
            <select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded-md px-2 py-1 text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Team leads table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Lead Name</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Product Line</th>
                  <th className="px-4 py-3 text-left">Turnover</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Mobile</th>
                  <th className="px-4 py-3 text-left">Assigned CRE</th>
                  <th className="px-4 py-3 text-left">Follow-up</th>
                  <th className="px-4 py-3 text-left">Manager</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeads ? (
                  <tr><td className="px-4 py-4" colSpan={13}>Loading team leads…</td></tr>
                ) : (pageData.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={13}>No leads found.</td></tr>
                ) : (
                  pageData.map(a => {
                    const latestFU = (a.followUps && a.followUps.length > 0) ? a.followUps[a.followUps.length - 1] : null;
                    const fuDate = latestFU?.followUpDate ? new Date(latestFU.followUpDate) : null;
                    const status = a.currentStatus || (a.statusHistory && a.statusHistory.length > 0 ? a.statusHistory[a.statusHistory.length - 1]?.status : '—');
                    const lead = a.lead || {};
                    const company = lead.company || {};
                    return (
                      <tr key={a._id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3">{lead.name || '—'}</td>
                        <td className="px-4 py-3">{lead.designation || '—'}</td>
                        <td className="px-4 py-3">{lead.location || '—'}</td>
                        <td className="px-4 py-3">{company.CompanyName || '—'}</td>
                        <td className="px-4 py-3">{status}</td>
                        <td className="px-4 py-3">{lead.productLine || '—'}</td>
                        <td className="px-4 py-3">{lead.turnover || lead.turnOver || '—'}</td>
                        <td className="px-4 py-3">{lead.email || '—'}</td>
                        <td className="px-4 py-3">{Array.isArray(lead.mobile) ? lead.mobile.join(', ') : (lead.mobile || '—')}</td>
                        <td className="px-4 py-3">{a.Calledbycre?.name || '—'}</td>
                        <td className="px-4 py-3">{fuDate ? fuDate.toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">
                          {Array.isArray(a.reportingManagers) && a.reportingManagers.length > 0
                            ? a.reportingManagers.map(rm => `${rm?.name || ''}${rm?.email ? ` (${rm.email})` : ''}`).filter(Boolean).join(', ')
                            : (a.reportingManager?.name || '—')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setViewLead(a); setViewOpen(true); }}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-white text-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
            <div className="text-xs text-slate-500">Page {currentPage} of {totalPages} · {filteredLeads.length} result(s)</div>
            <div className="flex gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={currentPage<=1} className="px-3 py-1.5 text-xs rounded-md bg-white border border-slate-300 text-slate-700 disabled:opacity-50">Prev</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={currentPage>=totalPages} className="px-3 py-1.5 text-xs rounded-md bg-white border border-slate-300 text-slate-700 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => { setViewOpen(false); setViewLead(null); }} />
          <motion.div initial={{opacity:0, y:12}} animate={{opacity:1, y:0}} className="relative z-10 w-[90vw] max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="min-w-0">
                <div className="text-base font-semibold truncate">Lead Details</div>
                <div className="text-xs text-slate-500 truncate">{viewLead?.lead?.name || '—'}{viewLead?.lead?.email ? ` • ${viewLead.lead.email}` : ''}</div>
              </div>
              <button onClick={() => { setViewOpen(false); setViewLead(null); }} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Close</button>
            </div>
            <div className="p-5 overflow-y-auto" style={{maxHeight: 'calc(85vh - 48px)'}}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                    {(viewLead?.lead?.name || '—').slice(0,1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{viewLead?.lead?.name || '—'}</div>
                    <div className="text-xs text-slate-500 truncate">{viewLead?.lead?.designation || '—'} {viewLead?.lead?.company?.CompanyName ? `• ${viewLead.lead.company.CompanyName}` : ''}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{viewLead?.currentStatus || '—'}</span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">Closure: {viewLead?.closureStatus || '—'}</span>
                </div>
              </div>
              <div className="border-b border-slate-200 mb-4">
                <nav className="-mb-px flex gap-4 text-xs">
                  {['overview','history','followups','all'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`${activeTab===tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap border-b-2 px-2.5 py-2 font-medium`}>{
                      tab === 'overview' ? 'Overview' : tab === 'history' ? 'History' : tab === 'followups' ? 'Follow-ups' : 'All Details'
                    }</button>
                  ))}
                </nav>
              </div>
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200">
                      <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">Lead</div>
                      <div className="p-4 text-xs space-y-1">
                        <div><span className="text-slate-500">Name:</span> {viewLead?.lead?.name || '—'}</div>
                        <div><span className="text-slate-500">Designation:</span> {viewLead?.lead?.designation || '—'}</div>
                        <div><span className="text-slate-500">Location:</span> {viewLead?.lead?.location || '—'}</div>
                        <div><span className="text-slate-500">Email:</span> {viewLead?.lead?.email || '—'}</div>
                        <div><span className="text-slate-500">Mobile:</span> {Array.isArray(viewLead?.lead?.mobile) ? viewLead.lead.mobile.join(', ') : (viewLead?.lead?.mobile || '—')}</div>
                        <div><span className="text-slate-500">Product Line:</span> {viewLead?.lead?.productLine || '—'}</div>
                        <div><span className="text-slate-500">Turnover:</span> {viewLead?.lead?.turnover || viewLead?.lead?.turnOver || '—'}</div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200">
                      <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">Company</div>
                      <div className="p-4 text-xs space-y-1">
                        <div><span className="text-slate-500">Name:</span> {viewLead?.lead?.company?.CompanyName || '—'}</div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200">
                      <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">Assignment</div>
                      <div className="p-4 text-xs space-y-1">
                        <div><span className="text-slate-500">Assigned CRE:</span> {viewLead?.Calledbycre?.name || '—'}</div>
                        <div><span className="text-slate-500">Manager(s):</span> {Array.isArray(viewLead?.reportingManagers) && viewLead.reportingManagers.length > 0 ? viewLead.reportingManagers.map(rm => `${rm?.name || ''}${rm?.email ? ` (${rm.email})` : ''}`).filter(Boolean).join(', ') : (viewLead?.reportingManager?.name || '—')}</div>
                        <div><span className="text-slate-500">Current Status:</span> {viewLead?.currentStatus || (Array.isArray(viewLead?.statusHistory) && viewLead.statusHistory.length > 0 ? viewLead.statusHistory[viewLead.statusHistory.length - 1]?.status : '—')}</div>
                        <div><span className="text-slate-500">Closure Status:</span> {viewLead?.closureStatus || '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="rounded-lg border border-slate-200">
                      <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">Status History</div>
                      <div className="p-4">
                        {Array.isArray(viewLead?.statusHistory) && viewLead.statusHistory.length > 0 ? (
                          <ul className="space-y-2 text-xs">
                            {viewLead.statusHistory.map((s, idx) => (
                              <li key={idx} className="rounded-md border border-slate-200 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{s?.status || '—'}</div>
                                  <div className="text-slate-500">{s?.date ? new Date(s.date).toLocaleString() : '—'}</div>
                                </div>
                                <div className="mt-1 text-slate-600">{s?.remarks || s?.note || '—'}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-slate-500">No status history.</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200">
                      <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">Follow-ups</div>
                      <div className="p-4">
                        {Array.isArray(viewLead?.followUps) && viewLead.followUps.length > 0 ? (
                          <ul className="space-y-2 text-xs">
                            {viewLead.followUps.map((fu, idx) => (
                              <li key={idx} className="rounded-md border border-slate-200 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{fu?.status || fu?.type || '—'}</div>
                                  <div className="text-slate-500">{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleString() : (fu?.date ? new Date(fu.date).toLocaleString() : '—')}</div>
                                </div>
                                <div className="mt-1 text-slate-600">{fu?.remarks || fu?.note || '—'}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-slate-500">No follow-ups.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'history' && (
                <div className="rounded-lg border border-slate-200">
                  <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">Status History</div>
                  <div className="p-4">
                    {Array.isArray(viewLead?.statusHistory) && viewLead.statusHistory.length > 0 ? (
                      <ul className="space-y-2 text-xs">
                        {viewLead.statusHistory.map((s, idx) => (
                          <li key={idx} className="rounded-md border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{s?.status || '—'}</div>
                              <div className="text-slate-500">{s?.date ? new Date(s.date).toLocaleString() : '—'}</div>
                            </div>
                            <div className="mt-1 text-slate-600">{s?.remarks || s?.note || '—'}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-500">No status history.</div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'followups' && (
                <div className="rounded-lg border border-slate-200">
                  <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">Follow-ups</div>
                  <div className="p-4">
                    {Array.isArray(viewLead?.followUps) && viewLead.followUps.length > 0 ? (
                      <ul className="space-y-2 text-xs">
                        {viewLead.followUps.map((fu, idx) => (
                          <li key={idx} className="rounded-md border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{fu?.status || fu?.type || '—'}</div>
                              <div className="text-slate-500">{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleString() : (fu?.date ? new Date(fu.date).toLocaleString() : '—')}</div>
                            </div>
                            <div className="mt-1 text-slate-600">{fu?.remarks || fu?.note || '—'}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-500">No follow-ups.</div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'all' && (
                <div className="rounded-lg border border-slate-200">
                  <div className="px-4 py-2 text-sm font-medium bg-slate-50 border-b border-slate-200">All Details</div>
                  <div className="p-4">
                    {renderEntries(viewLead || {}, ['root'])}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MyTeam;
