import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [conductionDone, setConductionDone] = useState({});
  const navigate = useNavigate();
  const [confirmToggle, setConfirmToggle] = useState({ open: false, id: null, next: false });
  const [statusUpdate, setStatusUpdate] = useState({ open: false, id: null, status: '' });
  const [viewDetails, setViewDetails] = useState({ open: false, assignment: null });

  const currentAssignment = viewDetails.assignment;
  const currentLead = currentAssignment?.lead || {};
  const currentCompany = currentLead.company || {};
  const currentIndustry = currentCompany.industry || {};
  const currentLatestFU = Array.isArray(currentAssignment?.followUps) && currentAssignment.followUps.length > 0
    ? currentAssignment.followUps[currentAssignment.followUps.length - 1]
    : null;
  const currentFuDate = currentLatestFU?.followUpDate ? new Date(currentLatestFU.followUpDate) : null;
  const currentStatusRaw = currentAssignment?.currentStatus || (
    Array.isArray(currentAssignment?.statusHistory) && currentAssignment.statusHistory.length > 0
      ? currentAssignment.statusHistory[currentAssignment.statusHistory.length - 1]?.status
      : ''
  );
  const currentStatusLabel = currentStatusRaw && currentStatusRaw.toLowerCase() !== 'pending' ? currentStatusRaw : '';
  const currentManagersLabel = Array.isArray(currentAssignment?.reportingManagers) && currentAssignment.reportingManagers.length > 0
    ? currentAssignment.reportingManagers
        .map(rm => `${rm?.name || ''}${rm?.email ? ` (${rm.email})` : ''}`)
        .filter(Boolean)
        .join(', ')
    : (currentAssignment?.reportingManager?.name || '—');

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
    if (!Array.isArray(teamLeadsData)) return;
    setConductionDone(prev => {
      const next = { ...prev };
      for (const lead of teamLeadsData) {
        const id = String(lead?._id || '');
        if (!id) continue;
        const backendVal = typeof lead?.conductionDone === 'boolean' ? lead.conductionDone : undefined;
        if (backendVal !== undefined) next[id] = backendVal;
        else if (next[id] === undefined) next[id] = false;
      }
      return next;
    });
  }, [teamLeadsData]);

  const persistConductionDone = async (assignmentId, value) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${BASE_URL}/api/cre/lead/${assignmentId}`, { conductionDone: value }, { headers });
    } catch (e) {
      // rollback on failure
      setConductionDone(prev => ({ ...prev, [String(assignmentId)]: !value }));
    }
  };

  const persistStatusUpdate = async (assignmentId, newStatus) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${BASE_URL}/api/cre/lead/${assignmentId}`, { currentStatus: newStatus }, { headers });
      // Update local state
      setTeamLeadsData(prev => prev.map(lead => 
        lead._id === assignmentId ? { ...lead, currentStatus: newStatus } : lead
      ));
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const fetchTeamLeads = useCallback(async () => {
    if (!token || !isLeader) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      setLoadingLeads(true);
      const res = await axios.get(`${BASE_URL}/api/cre/team/leads`, { headers });
      setTeamLeadsData(res?.data?.data || []);
    } catch (_) {
      setTeamLeadsData([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [token, isLeader]);

  useEffect(() => {
    fetchTeamLeads();
  }, [fetchTeamLeads]);

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

  // Derive per-member conduction counts (conductionDone === true) from teamLeadsData
  const memberConductionCounts = useMemo(() => {
    const map = {};
    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid) continue;
      if (a?.conductionDone === true) {
        map[uid] = (map[uid] || 0) + 1;
      }
    }
    return map;
  }, [teamLeadsData]);

  // Derive per-member RNR counts from teamLeadsData (currentStatus === 'RNR')
  const memberRnrCounts = useMemo(() => {
    const map = {};
    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid) continue;
      const status = (a.currentStatus || '').toLowerCase();
      if (status === 'rnr') {
        map[uid] = (map[uid] || 0) + 1;
      }
    }
    return map;
  }, [teamLeadsData]);

  const ymd = (d) => {
    if (!d) return null;
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (!dt || Number.isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Per-member metrics for the selected reportDate (today by default)
  const perMemberDailyMetrics = useMemo(() => {
    const map = {};
    if (!reportDate) return map;

    const target = reportDate;

    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid) continue;

      if (!map[uid]) {
        map[uid] = {
          total: 0,
          nostatus: 0,
          positive: 0,
          negative: 0,
          wrongNumber: 0,
          closureProspects: 0,
          todaysFollowups: 0,
          conduction: 0,
          closed: 0,
          rnr: 0,
        };
      }

      const entry = map[uid];

      // 1) Partition today's new pitches by latest status (one bucket per lead)
      const assigned = ymd(a.assignedAt || a.createdAt);
      if (assigned && assigned === target) {
        entry.total += 1;

        // Resolve latest known status for this assignment
        let statusStr = (a.currentStatus || '').toLowerCase();
        if (!statusStr) {
          const hist = Array.isArray(a.statusHistory) ? a.statusHistory : [];
          if (hist.length > 0) {
            statusStr = (hist[hist.length - 1].status || '').toLowerCase();
          }
        }

        if (statusStr === 'positive') entry.positive += 1;
        else if (statusStr === 'negative') entry.negative += 1;
        else if (statusStr === 'wrong number') entry.wrongNumber += 1;
        else if (statusStr === 'rnr') entry.rnr += 1;
        else if (statusStr === 'closure prospects' || statusStr === 'closure prospect') entry.closureProspects += 1;
        else entry.nostatus += 1; // includes initial Pending or missing status
      }

      // 2) Activity metrics on this date (independent of assignment date)
      const cd = ymd(a.conductionDoneAt);
      if (cd && cd === target && a?.conductionDone === true) {
        entry.conduction += 1;
      }

      const closedAt = ymd(a.closureStatusAt);
      if (closedAt && closedAt === target && a?.closureStatus === 'Closed') {
        entry.closed += 1;
      }

      const fuList = Array.isArray(a.followUps) ? a.followUps : [];
      for (const fu of fuList) {
        const fd = ymd(fu.followUpDate);
        if (fd && fd === target) {
          entry.todaysFollowups += 1;
        }
      }
    }

    return map;
  }, [teamLeadsData, reportDate]);

  const teamTotals = useMemo(() => {
    const sum = {
      closed: 0,
      closureProspects: 0,
      conduction: 0,
      positive: 0,
      nostatus: 0,
      negative: 0,
      wrongNumber: 0,
      rnr: 0,
      total: 0,
      todaysFollowups: 0,
    };

    // Aggregate only over explicit team members so totals match the visible rows
    for (const m of teamMembers) {
      const id = String(m._id);
      const daily = perMemberDailyMetrics[id] || {};
      sum.closed += Number(daily.closed || 0);
      sum.closureProspects += Number(daily.closureProspects || 0);
      sum.conduction += Number(daily.conduction || 0);
      sum.positive += Number(daily.positive || 0);
      sum.nostatus += Number(daily.nostatus || 0);
      sum.negative += Number(daily.negative || 0);
      sum.wrongNumber += Number(daily.wrongNumber || 0);
      sum.rnr += Number(daily.rnr || 0);
      sum.total += Number(daily.total || 0);
      sum.todaysFollowups += Number(daily.todaysFollowups || 0);
    }
    return sum;
  }, [teamMembers, perMemberDailyMetrics]);

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
    return rows;
  }, [teamLeadsData, selectedUserId, statusFilter, search]);

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
  const excludedCompanyKeys = new Set(['Address', 'City', 'State', 'Pin', 'GST']);
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
          <div className="text-slate-500 col-span-1">{prettyLabel(path[path.length - 1])}</div>
          <div className="col-span-2">—</div>
        </div>
      );
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          {value.length === 0 ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-slate-500 col-span-1">{prettyLabel(path[path.length - 1])}</div>
              <div className="col-span-2">—</div>
            </div>
          ) : (
            value.map((v, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500 mb-2">{prettyLabel(path[path.length - 1])} #{i + 1}</div>
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
      const isCompany = path[path.length - 1] === 'company' || path.includes('company');
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
    if (isLikelyId(value) || isIdKey(path[path.length - 1])) {
      return null;
    }
    return (
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-slate-500 col-span-1">{prettyLabel(path[path.length - 1])}</div>
        <div className="col-span-2">{String(value ?? '—')}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <CRENavbar />
      <div className="pt-20 px-6 w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">My Team</motion.h1>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-600">Report Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => { setReportDate(e.target.value); setPage(1); }}
                className="border rounded-md px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchTeamLeads}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={loadingLeads}
            >
              {loadingLeads ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/cre/team-stats')}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-white text-xs hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              My Team Report
            </button>
          </div>
        </div>

        {/* Team members */}
        <div className="mb-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100 text-slate-600 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">New Pitches</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Positive</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Negative</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Wrong No.</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">RNR</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">No status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">FU Today</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Conduction</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Closure Prospects</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Closed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMembers ? (
                    <tr>
                      <td className="px-4 py-5 text-sm text-slate-500" colSpan={12}>Loading team members…</td>
                    </tr>
                  ) : (
                    <>
                      <tr className="bg-emerald-50/80 font-semibold text-slate-800">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{user?.name || 'Reporting Manager'}</span>
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              TLC: {teamTotals.total}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">{role || user?.role || '–'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">{user?.email || '–'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end font-semibold text-slate-800">{teamTotals.total}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">{teamTotals.positive}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">{teamTotals.negative}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">{teamTotals.wrongNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{teamTotals.rnr}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-100">{teamTotals.nostatus}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100">{teamTotals.todaysFollowups}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">{teamTotals.conduction}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-100">{teamTotals.closureProspects}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-red-600 text-white px-2 py-0.5 text-[11px] font-semibold">{teamTotals.closed}</span>
                        </td>
                      </tr>
                      {teamMembers.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-slate-500 text-sm" colSpan={12}>No team members found.</td>
                        </tr>
                      ) : (
                        teamMembers.map((m, idx) => {
                          const id = String(m._id);
                          const daily = perMemberDailyMetrics[id] || {};
                          return (
                            <tr
                              key={m._id}
                              className={`border-t border-slate-100 hover:bg-slate-50/70 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                              onClick={() => { setSelectedUserId(m._id); setPage(1); }}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                                    {(m.name || '—').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-800 text-xs md:text-sm">{m.name || '—'}</span>
                                    <span className="text-[10px] text-slate-500">{m.email || '—'}</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/cre/team-stats?memberId=${m._id}`);
                                    }}
                                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Detailed Stats
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-600">{m.role || '—'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-500 md:table-cell hidden">{m.email || '—'}</td>
                              <td className="px-4 py-3 text-right text-slate-800">
                                <span className="inline-flex min-w-[2.5rem] justify-end font-semibold">{daily.total ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">{daily.positive ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">{daily.negative ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">{daily.wrongNumber ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{daily.rnr ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-100">{daily.nostatus ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100">{daily.todaysFollowups ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">{daily.conduction ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-100">{daily.closureProspects ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-red-600 text-white px-2 py-0.5 text-[11px] font-semibold">{daily.closed ?? 0}</span>
                              </td>
                            </tr>
                          );
                        })
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
            <select value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); setPage(1); }} className="border rounded-md px-2 py-1 text-sm">
              <option value="">All</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded-md px-2 py-1 text-sm">
              <option value="">All</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Wrong Number">Wrong Number</option>
              <option value="RNR">RNR</option>
              <option value="Closure Prospects">Closure Prospects</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search lead/company/CRE…" className="w-64 border rounded-md px-3 py-1 text-sm" />
            <label className="text-xs text-slate-600">Page size</label>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded-md px-2 py-1 text-sm">
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
                    // Display-friendly status: hide internal 'Pending' as blank
                    const rawStatus = a.currentStatus || (a.statusHistory && a.statusHistory.length > 0 ? a.statusHistory[a.statusHistory.length - 1]?.status : '');
                    const status = rawStatus && rawStatus.toLowerCase() !== 'pending' ? rawStatus : '';
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewDetails({ open: true, assignment: a })}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-white text-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              View
                            </button>
                            <select
                              value={status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus && newStatus !== status) {
                                  setStatusUpdate({ open: true, id: a._id, status: newStatus });
                                }
                              }}
                              className="border rounded-md px-2 py-1 text-xs bg-white text-slate-700 border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Change Status</option>
                              <option value="Positive">Positive</option>
                              <option value="Negative">Negative</option>
                              <option value="Wrong Number">Wrong Number</option>
                              <option value="RNR">RNR</option>
                              <option value="Closure Prospects">Closure Prospects</option>
                              <option value="Closed">Closed</option>
                            </select>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-600">Conduction done</span>
                              <button
                                onClick={() => {
                                  const curr = Boolean(conductionDone[String(a._id)]);
                                  const nextVal = !curr;
                                  setConfirmToggle({ open: true, id: a._id, next: nextVal });
                                }}
                                className={`relative inline-flex items-center h-6 rounded-full px-1 transition-colors duration-200 ${conductionDone[String(a._id)] ? 'bg-green-600' : 'bg-slate-300'}`}
                                aria-label="Toggle Conduction done"
                              >
                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform duration-200 ${conductionDone[String(a._id)] ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                <span className={`ml-2 min-w-[26px] text-[10px] font-medium ${conductionDone[String(a._id)] ? 'text-white' : 'text-slate-700'}`}>{conductionDone[String(a._id)] ? 'Yes' : 'No'}</span>
                              </button>
                            </div>
                          </div>
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="px-3 py-1.5 text-xs rounded-md bg-white border border-slate-300 text-slate-700 disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 text-xs rounded-md bg-white border border-slate-300 text-slate-700 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
      {viewDetails.open && viewDetails.assignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setViewDetails({ open: false, assignment: null })}
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/80">
              <div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>{currentLead.name || 'Lead Details'}</span>
                  {currentCompany.CompanyName && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200">
                      {currentCompany.CompanyName}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Assigned to {currentAssignment?.Calledbycre?.name || '—'}
                  {currentFuDate && (
                    <span className="ml-2">· Next follow-up: {currentFuDate.toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewDetails({ open: false, assignment: null })}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-6 text-sm">
              {/* Lead & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Lead</div>
                  <div><span className="font-medium text-slate-700">Name:</span> {currentLead.name || '—'}</div>
                  <div><span className="font-medium text-slate-700">Designation:</span> {currentLead.designation || '—'}</div>
                  <div><span className="font-medium text-slate-700">Location:</span> {currentLead.location || '—'}</div>
                  <div><span className="font-medium text-slate-700">Industry:</span> {currentIndustry.name || '—'}</div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Company & Contact</div>
                  <div><span className="font-medium text-slate-700">Company:</span> {currentCompany.CompanyName || '—'}</div>
                  <div><span className="font-medium text-slate-700">Email:</span> {currentLead.email || '—'}</div>
                  <div>
                    <span className="font-medium text-slate-700">Mobile:</span>{' '}
                    {Array.isArray(currentLead.mobile)
                      ? currentLead.mobile.join(', ')
                      : (currentLead.mobile || '—')}
                  </div>
                  <div><span className="font-medium text-slate-700">Product Line:</span> {currentLead.productLine || '—'}</div>
                </div>
              </div>

              {/* Status & Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Status</div>
                  <div><span className="font-medium text-slate-700">Current Status:</span> {currentStatusLabel || '—'}</div>
                  <div><span className="font-medium text-slate-700">Closure Status:</span> {currentAssignment?.closureStatus || '—'}</div>
                  <div><span className="font-medium text-slate-700">Completed:</span> {currentAssignment?.completed ? 'Yes' : 'No'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Assignment</div>
                  <div><span className="font-medium text-slate-700">CRE:</span> {currentAssignment?.Calledbycre?.name || '—'}</div>
                  <div><span className="font-medium text-slate-700">Reporting Manager(s):</span> {currentManagersLabel}</div>
                  <div>
                    <span className="font-medium text-slate-700">Latest Follow-up:</span>{' '}
                    {currentFuDate
                      ? `${currentFuDate.toLocaleDateString()}${currentLatestFU?.remarks ? ` · ${currentLatestFU.remarks}` : ''}`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Raw assignment data for deep inspection */}
              <div className="mt-2 border-t border-slate-200 pt-4">
                <div className="text-sm font-semibold text-slate-800 mb-2">All Assignment Fields</div>
                <div className="space-y-1 text-xs max-h-64 overflow-y-auto pr-1">
                  {renderEntries(currentAssignment, ['assignment'])}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {confirmToggle.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setConfirmToggle({ open: false, id: null, next: false })} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-[90vw] max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="text-base font-semibold">Confirm</div>
              <button onClick={() => setConfirmToggle({ open: false, id: null, next: false })} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-700">Are you sure you want to mark Conduction done to {confirmToggle.next ? 'Yes' : 'No'}?</div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmToggle({ open: false, id: null, next: false })} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Cancel</button>
                <button
                  onClick={() => {
                    const id = confirmToggle.id;
                    const val = confirmToggle.next;
                    setConductionDone(prev => ({ ...prev, [String(id)]: val }));
                    persistConductionDone(id, val);
                    setConfirmToggle({ open: false, id: null, next: false });
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-white text-xs hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >Confirm</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {statusUpdate.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setStatusUpdate({ open: false, id: null, status: '' })} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-[90vw] max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="text-base font-semibold">Confirm Status Change</div>
              <button onClick={() => setStatusUpdate({ open: false, id: null, status: '' })} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-700">Are you sure you want to change the status to <span className="font-semibold text-indigo-600">{statusUpdate.status}</span>?</div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setStatusUpdate({ open: false, id: null, status: '' })} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Cancel</button>
                <button
                  onClick={() => {
                    const id = statusUpdate.id;
                    const newStatus = statusUpdate.status;
                    persistStatusUpdate(id, newStatus);
                    setStatusUpdate({ open: false, id: null, status: '' });
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-white text-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >Confirm</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MyTeam;
