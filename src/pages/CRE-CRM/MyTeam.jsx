import React, { useEffect, useMemo, useState } from 'react';
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

  // Per-member metrics for the selected reportDate (today by default)
  const perMemberDailyMetrics = useMemo(() => {
    const map = {};
    if (!reportDate) return map;

    const start = new Date(reportDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid) continue;

      // 1) If there are follow-ups, use the latest follow-up date
      let latestFU = null;
      let fuDate = null;
      if (Array.isArray(a.followUps) && a.followUps.length > 0) {
        // Match backend logic: pick latest follow-up by updatedAt/createdAt
        latestFU = a.followUps.reduce((latest, curr) => {
          const latestDate = latest.updatedAt || latest.createdAt || latest.followUpDate;
          const currDate = curr.updatedAt || curr.createdAt || curr.followUpDate;
          if (!latestDate) return curr;
          if (!currDate) return latest;
          return new Date(currDate) > new Date(latestDate) ? curr : latest;
        }, a.followUps[0]);

        fuDate = latestFU?.followUpDate ? new Date(latestFU.followUpDate) : null;
      }

      // 2) Derive the activity date for this assignment for daily metrics
      let activityDate = fuDate;
      let isFromFollowUp = !!fuDate;

      // If no follow-up for this assignment, fall back to assignedAt / createdAt
      if (!activityDate) {
        if (a.assignedAt) {
          activityDate = new Date(a.assignedAt);
          isFromFollowUp = false;
        } else if (a.createdAt) {
          activityDate = new Date(a.createdAt);
          isFromFollowUp = false;
        }
      }

      if (!activityDate || activityDate < start || activityDate >= end) continue;

      if (!map[uid]) {
        map[uid] = {
          total: 0,
          pending: 0,
          positive: 0,
          negative: 0,
          closureProspects: 0,
          todaysFollowups: 0,
          conduction: 0,
          closed: 0,
          rnr: 0,
        };
      }

      const entry = map[uid];
      entry.total += 1;

      // Only count as today's follow-up if the activity came from a follow-up
      if (isFromFollowUp) {
        entry.todaysFollowups += 1;
      }

      const st = (a.currentStatus || '').toLowerCase();
      if (st === 'pending') entry.pending += 1;
      else if (st === 'positive') entry.positive += 1;
      else if (st === 'negative') entry.negative += 1;
      else if (st === 'closure prospects') entry.closureProspects += 1;
      else if (st === 'rnr') entry.rnr += 1;

      if (a?.conductionDone === true) entry.conduction += 1;
      if (a?.closureStatus === 'Closed') entry.closed += 1;
    }

    return map;
  }, [teamLeadsData, reportDate]);

  const teamTotals = useMemo(() => {
    const sum = {
      closed: 0,
      closureProspects: 0,
      conduction: 0,
      positive: 0,
      pending: 0,
      negative: 0,
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
      sum.negative += Number(daily.negative || 0);
      sum.rnr += Number(daily.rnr || 0);
      sum.pending += Number(daily.pending || 0);
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
          <button onClick={() => navigate('/cre/team-stats')} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-white text-xs hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">My Team Report</button>
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
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">RNR</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Pending</th>
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
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{teamTotals.rnr}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-100">{teamTotals.pending}</span>
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
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{daily.rnr ?? 0}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-100">{daily.pending ?? 0}</span>
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
              <option value="Pending">Pending</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/cre/lead/${a._id}`, { state: { assignment: a } })}
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
                              <option value="Pending">Pending</option>
                              <option value="Positive">Positive</option>
                              <option value="Negative">Negative</option>
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
