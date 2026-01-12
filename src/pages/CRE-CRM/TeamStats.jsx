import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import CRENavbar from '../../components/CreNavbar';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';

const TeamStats = () => {
  const { authToken, role, user } = useAuth();
  const token = authToken || localStorage.getItem('token');
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const scope = params.get('scope');
  const memberId = params.get('memberId');
  const forceSelf = scope === 'self';
  const isLeader = [
    'CRM-TeamLead',
    'DeputyCRMTeamLead',
    'RegionalHead',
    'DeputyRegionalHead',
    'NationalHead',
    'DeputyNationalHead',
  ].includes(role || user?.role);

  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLeadsData, setTeamLeadsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; // YYYY-MM
  });
  const [compact, setCompact] = useState(false);
  const [hideZeroDays, setHideZeroDays] = useState(false);
  const [hideZeroMembers, setHideZeroMembers] = useState(false);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const run = async () => {
      try {
        setLoading(true);
        if (isLeader && !forceSelf) {
          const [membersRes, leadsRes] = await Promise.all([
            axios.get(`${BASE_URL}/api/cre/team/members`, { headers }),
            axios.get(`${BASE_URL}/api/cre/team/leads`, { headers }),
          ]);
          setTeamMembers(membersRes?.data?.data || []);
          setTeamLeadsData(leadsRes?.data?.data || []);
        } else {
          const myLeadsRes = await axios.get(`${BASE_URL}/api/cre/myleads`, { headers });
          const me = user ? [{ _id: user._id, name: user.name }] : [];
          setTeamMembers(me);
          setTeamLeadsData(myLeadsRes?.data?.data || []);
        }
      } catch (e) {
        setTeamMembers([]);
        setTeamLeadsData([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, isLeader, user?._id, user?.name, forceSelf]);

  // Helpers
  const ymd = (d) => {
    if (!d) return null;
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt)) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };
  const isSunday = (dateStr) => {
    const dt = new Date(dateStr);
    return dt.getDay() === 0;
  };
  const monthDays = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && (now.getMonth() + 1) === m;
    const maxDay = isCurrentMonth ? now.getDate() : new Date(y, m, 0).getDate();
    const list = [];
    for (let d = 1; d <= maxDay; d++) {
      list.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    }
    return list;
  }, [month]);

  // Build per-day, per-member counts
  const dailyByMember = useMemo(() => {
    const data = {};
    for (const day of monthDays) data[day] = {};
    const inMonth = (dateStr) => dateStr && dateStr.startsWith(month);

    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid) continue;

      // Conduction by conductionDoneAt date
      const cd = ymd(a.conductionDoneAt);
      if (cd && inMonth(cd)) {
        data[cd][uid] = data[cd][uid] || { conduction: 0, prospects: 0, closed: 0 };
        data[cd][uid].conduction += 1;
      }

      // Closed by closureStatusAt date
      const closedAt = ymd(a.closureStatusAt);
      if (closedAt && inMonth(closedAt)) {
        data[closedAt][uid] = data[closedAt][uid] || { conduction: 0, prospects: 0, closed: 0 };
        data[closedAt][uid].closed += 1;
      }

      // Status history dates for prospects
      const hist = Array.isArray(a.statusHistory) ? a.statusHistory : [];
      for (const h of hist) {
        const st = (h?.status || '').toLowerCase();
        const hd = ymd(h?.date || h?.updatedAt || h?.createdAt);
        if (!hd || !inMonth(hd)) continue;
        if (st === 'closure prospects' || st === 'closure prospect') {
          data[hd][uid] = data[hd][uid] || { conduction: 0, prospects: 0, closed: 0 };
          data[hd][uid].prospects += 1;
        }
      }
    }
    return data;
  }, [teamLeadsData, monthDays, month]);

  const totalsByMember = useMemo(() => {
    const totals = {};
    for (const day of monthDays) {
      const dm = dailyByMember[day] || {};
      for (const uid of Object.keys(dm)) {
        const c = dm[uid];
        if (!totals[uid]) totals[uid] = { conduction: 0, prospects: 0, closed: 0 };
        totals[uid].conduction += c.conduction;
        totals[uid].prospects += c.prospects;
        totals[uid].closed += c.closed;
      }
    }
    return totals;
  }, [dailyByMember, monthDays]);

  // Per-member KPI summary for individual view (lifetime over teamLeadsData)
  const memberKpi = useMemo(() => {
    if (!memberId) return null;
    const idStr = String(memberId);
    const summary = {
      total: 0,
      positive: 0,
      negative: 0,
      rnr: 0,
      pending: 0,
      fuToday: 0,
      conduction: 0,
      closureProspects: 0,
      closed: 0,
    };

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);

    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid || uid !== idStr) continue;

      summary.total += 1;

      const status = (a.currentStatus || '').toLowerCase();
      if (status === 'positive') summary.positive += 1;
      else if (status === 'negative') summary.negative += 1;
      else if (status === 'rnr') summary.rnr += 1;
      else if (status === 'pending') summary.pending += 1;
      else if (status === 'closure prospects' || status === 'closure prospect') summary.closureProspects += 1;

      if (a?.conductionDone === true) summary.conduction += 1;
      if (a?.closureStatus === 'Closed') summary.closed += 1;

      if (Array.isArray(a.followUps) && a.followUps.length > 0) {
        const latestFU = a.followUps[a.followUps.length - 1];
        const d = latestFU?.followUpDate ? new Date(latestFU.followUpDate) : null;
        if (d && d >= start && d < end) summary.fuToday += 1;
      }
    }
    return summary;
  }, [memberId, teamLeadsData]);

  const memberDailyKpi = useMemo(() => {
    if (!memberId) return null;
    const idStr = String(memberId);
    const result = {};
    const inMonth = (dateStr) => dateStr && dateStr.startsWith(month);

    // Initialise all days in the selected month
    for (const d of monthDays) {
      result[d] = {
        total: 0,
        positive: 0,
        negative: 0,
        rnr: 0,
        pending: 0,
        fuToday: 0,
        wrongNumber: 0,
        conduction: 0,
        closureProspects: 0,
        closed: 0,
      };
    }

    for (const a of teamLeadsData) {
      const uid = String(a.Calledbycre?._id || a.Calledbycre || '');
      if (!uid || uid !== idStr) continue;

      // 1) Partition leads by assignment date and latest status (one bucket per lead)
      const assigned = ymd(a.assignedAt);
      if (assigned && inMonth(assigned) && result[assigned]) {
        const dayEntry = result[assigned];
        dayEntry.total += 1;

        // Latest known status (prefer currentStatus, fallback to last statusHistory)
        let statusStr = (a.currentStatus || '').toLowerCase();
        if (!statusStr) {
          const hist = Array.isArray(a.statusHistory) ? a.statusHistory : [];
          if (hist.length > 0) {
            statusStr = (hist[hist.length - 1].status || '').toLowerCase();
          }
        }

        if (statusStr === 'positive') dayEntry.positive += 1;
        else if (statusStr === 'negative') dayEntry.negative += 1;
        else if (statusStr === 'wrong number') dayEntry.wrongNumber += 1;
        else if (statusStr === 'rnr') dayEntry.rnr += 1;
        else if (statusStr === 'closure prospects' || statusStr === 'closure prospect') dayEntry.closureProspects += 1;
        else dayEntry.pending += 1; // includes initial Pending or missing status
      }

      // 2) Activity metrics on their own dates
      const cd = ymd(a.conductionDoneAt);
      if (cd && inMonth(cd) && result[cd]) {
        result[cd].conduction += 1;
      }

      const closedAt = ymd(a.closureStatusAt);
      if (closedAt && inMonth(closedAt) && result[closedAt]) {
        result[closedAt].closed += 1;
      }

      const fuList = Array.isArray(a.followUps) ? a.followUps : [];
      for (const fu of fuList) {
        const fd = ymd(fu.followUpDate);
        if (!fd || !inMonth(fd) || !result[fd]) continue;
        result[fd].fuToday += 1;
      }
    }

    return result;
  }, [memberId, teamLeadsData, month, monthDays]);

  const memberDailyDays = useMemo(() => {
    if (!memberDailyKpi) return [];
    if (!hideZeroDays) return [...monthDays].reverse();
    const arr = [];
    for (const d of [...monthDays].reverse()) {
      const v = memberDailyKpi[d];
      if (!v) continue;
      const sum =
        (v.total || 0) +
        (v.positive || 0) +
        (v.negative || 0) +
        (v.rnr || 0) +
        (v.pending || 0) +
        (v.fuToday || 0) +
        (v.wrongNumber || 0) +
        (v.conduction || 0) +
        (v.closureProspects || 0) +
        (v.closed || 0);
      if (sum > 0) arr.push(d);
    }
    return arr;
  }, [memberDailyKpi, monthDays, hideZeroDays]);

  const memberDailyTotal = useMemo(() => {
    if (!memberDailyKpi) return null;
    const total = {
      total: 0,
      positive: 0,
      negative: 0,
      rnr: 0,
      pending: 0,
      fuToday: 0,
      wrongNumber: 0,
      conduction: 0,
      closureProspects: 0,
      closed: 0,
    };
    const days = memberDailyDays.length > 0 ? memberDailyDays : [...monthDays];
    for (const d of days) {
      const v = memberDailyKpi[d];
      if (!v) continue;
      total.total += v.total || 0;
      total.positive += v.positive || 0;
      total.negative += v.negative || 0;
      total.rnr += v.rnr || 0;
      total.pending += v.pending || 0;
      total.fuToday += v.fuToday || 0;
      total.wrongNumber += v.wrongNumber || 0;
      total.conduction += v.conduction || 0;
      total.closureProspects += v.closureProspects || 0;
      total.closed += v.closed || 0;
    }
    return total;
  }, [memberDailyKpi, memberDailyDays, monthDays]);

  // Filters
  const baseMembers = useMemo(() => {
    if (!memberId) return teamMembers;
    return teamMembers.filter((m) => String(m._id) === String(memberId));
  }, [teamMembers, memberId]);

  const membersFiltered = useMemo(() => {
    if (!hideZeroMembers) return baseMembers;
    return baseMembers.filter((m) => {
      const t = totalsByMember[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
      return (t.conduction + t.prospects + t.closed) > 0;
    });
  }, [baseMembers, totalsByMember, hideZeroMembers]);

  const monthDaysFiltered = useMemo(() => {
    if (!hideZeroDays) return [...monthDays].reverse();
    const arr = [];
    for (const d of [...monthDays].reverse()) {
      const dm = dailyByMember[d] || {};
      let sum = 0;
      for (const uid of Object.keys(dm)) {
        const v = dm[uid];
        sum += (v.conduction || 0) + (v.closed || 0);
      }
      if (sum > 0) arr.push(d);
    }
    return arr;
  }, [monthDays, dailyByMember, hideZeroDays]);

  // Chip style helper with thresholds: 0=slate, 1=emerald, 2-3=amber, >=4=violet
  const chipClass = (val) => {
    if (val >= 4) return 'bg-violet-100 text-violet-900 font-medium';
    if (val >= 2) return 'bg-amber-100 text-amber-900 font-medium';
    if (val === 1) return 'bg-emerald-100 text-emerald-900';
    return 'bg-slate-100 text-slate-500';
  };

  const downloadCsv = () => {
    const members = baseMembers;
    const header1 = ['S.no', 'Date', ...members.flatMap((m) => [m.name || '—', ''])];
    const header2 = ['', '', ...members.flatMap(() => ['Gmeet Conduction', 'New Client Acquisition'])];

    const rows = [header1, header2];
    // Totals at top
    const totalsRow = [
      'Total',
      '',
      ...members.flatMap((m) => {
        const t = totalsByMember[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
        return [t.conduction === 0 ? 'NIL' : String(t.conduction), t.closed === 0 ? 'NIL' : String(t.closed)];
      })
    ];
    rows.push(totalsRow);

    // Daily rows
    const days = monthDaysFiltered;
    days.forEach((d, idx) => {
      rows.push([
        String(idx + 1),
        new Date(d).toLocaleDateString(),
        ...members.flatMap((m) => {
          const dm = (dailyByMember[d] || {})[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
          return [String(dm.conduction), String(dm.closed)];
        })
      ]);
    });

    const csv = rows
      .map((r) =>
        r
          .map((v) => (v ?? '').toString().replace(/\"/g, '""'))
          .map((v) => (/[",\n]/.test(v) ? `"${v}"` : v))
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-stats.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <CRENavbar />
      <div className="pt-20 px-6 w-full">
        <div className="mb-4 flex items-center justify-between">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
            {memberId && baseMembers.length === 1
              ? `Individual Stats - ${baseMembers[0].name || ''}`
              : 'Team Stats'}
          </motion.h1>
          <div className="flex items-center gap-2">
            <input type="month" value={month} onChange={(e)=> setMonth(e.target.value)} className="border rounded-md px-2 py-1 text-sm" />
            <label className="flex items-center gap-1 text-xs text-slate-700"><input type="checkbox" className="rounded" checked={compact} onChange={(e)=> setCompact(e.target.checked)} /> Compact</label>
            <label className="flex items-center gap-1 text-xs text-slate-700"><input type="checkbox" className="rounded" checked={hideZeroDays} onChange={(e)=> setHideZeroDays(e.target.checked)} /> Hide zero days</label>
            {/* <label className="flex items-center gap-1 text-xs text-slate-700"><input type="checkbox" className="rounded" checked={hideZeroMembers} onChange={(e)=> setHideZeroMembers(e.target.checked)} /> Hide zero members</label> */}
            <button onClick={downloadCsv} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
              Download CSV
            </button>
          </div>
        </div>

        {memberId && memberDailyKpi && baseMembers.length === 1 && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/70">
              <div>
                <div className="text-sm font-semibold text-slate-800">Date-wise Record</div>
                <div className="text-xs text-slate-500">Daily stats for {baseMembers[0].name || 'Selected CRE-CRM'}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Date</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Total Leads Consumed</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Positive</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Negative</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">RNR</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Pending</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">FU Today</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Wrong Number</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Conduction</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Closure Prospects</th>
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {memberDailyDays.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-center text-slate-500 text-xs" colSpan={10}>
                        No activity in the selected month.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {memberDailyTotal && (
                        <tr className="bg-emerald-50/60 border-b border-emerald-100 font-semibold">
                          <td className="px-3 py-2 text-left whitespace-nowrap">Total</td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end font-semibold text-slate-800">{memberDailyTotal.total}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">{memberDailyTotal.positive}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">{memberDailyTotal.negative}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{memberDailyTotal.rnr}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-100">{memberDailyTotal.pending}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100">{memberDailyTotal.fuToday}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-100">{memberDailyTotal.wrongNumber}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">{memberDailyTotal.conduction}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-100">{memberDailyTotal.closureProspects}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-red-600 text-white px-2 py-0.5 text-[11px] font-semibold">{memberDailyTotal.closed}</span>
                          </td>
                        </tr>
                      )}
                      {memberDailyDays.map((d) => {
                      const v = memberDailyKpi[d] || {
                        total: 0,
                        positive: 0,
                        negative: 0,
                        rnr: 0,
                        pending: 0,
                        fuToday: 0,
                        wrongNumber: 0,
                        conduction: 0,
                        closureProspects: 0,
                        closed: 0,
                      };
                      return (
                        <tr key={d} className="bg-white border-b border-slate-100">
                          <td className="px-3 py-2 text-left whitespace-nowrap">{new Date(d).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end font-semibold text-slate-800">{v.total}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">{v.positive}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">{v.negative}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{v.rnr}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-100">{v.pending}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100">{v.fuToday}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-100">{v.wrongNumber}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">{v.conduction}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 border border-violet-100">{v.closureProspects}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex min-w-[2.5rem] justify-end rounded-full bg-red-600 text-white px-2 py-0.5 text-[11px] font-semibold">{v.closed}</span>
                          </td>
                        </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!memberId && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 text-sm">Loading…</div>
              ) : (
                <table className={`min-w-full ${compact ? 'text-[11px]' : 'text-xs'} border-collapse` }>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-b from-slate-50 to-white">
                    <th className={`border-b border-r text-left align-bottom font-semibold text-slate-700 ${compact ? 'px-2 py-1 w-12' : 'px-3 py-2 w-16'} sticky left-0 bg-white z-20`}>S.no</th>
                    <th className={`border-b border-r text-left align-bottom font-semibold text-slate-700 ${compact ? 'px-2 py-1 w-24' : 'px-3 py-2 w-32'} sticky`} style={{left: compact ? 48 : 64, background: 'white', zIndex: 20}}>Date</th>
                    {baseMembers.map((m) => (
                      <th key={m._id} className="px-3 py-2 border-b border-r text-center font-semibold text-slate-800" colSpan={2}>
                        <div className="truncate max-w-[12rem] mx-auto">{m.name || '—'}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/70">
                    <th className="px-3 py-2 border-b border-r"></th>
                    <th className="px-3 py-2 border-b border-r"></th>
                    {baseMembers.map((m) => (
                      <React.Fragment key={m._id}>
                        <th className="px-3 py-2 border-b border-r text-center text-slate-600">Gmeet Conduction</th>
                        <th className="px-3 py-2 border-b border-r text-center text-slate-600">New Client Acquisition</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-semibold">
                    <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r sticky left-0 bg-white z-10`}>Total</td>
                    <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r sticky`} style={{left: compact ? 48 : 64, background: 'white', zIndex: 10}}></td>
                    {baseMembers.map((m) => {
                      const t = totalsByMember[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
                      return (
                        <React.Fragment key={m._id}>
                          <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r text-center ${t.conduction === 0 ? 'bg-rose-100' : ''}`}>
                            <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full ${t.conduction === 0 ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'}`}>{t.conduction === 0 ? 'NIL' : t.conduction}</span>
                          </td>
                          <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r text-center ${t.closed === 0 ? 'bg-rose-100' : ''}`}>
                            <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full ${t.closed === 0 ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'}`}>{t.closed === 0 ? 'NIL' : t.closed}</span>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  <tr>
                    <td colSpan={2 + (membersFiltered.length * 2)} className="p-0">
                      <div className="h-[1px] bg-slate-200" />
                    </td>
                  </tr>
                  {monthDaysFiltered.map((d, idx) => (
                    <tr key={d} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50 transition-colors`}>
                      <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-r align-middle sticky left-0 bg-white z-10`}>{idx + 1}</td>
                      <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-r align-middle sticky`} style={{left: compact ? 48 : 64, background: 'white', zIndex: 10}}>{new Date(d).toLocaleDateString()}</td>
                      {membersFiltered.map((m) => {
                        const dm = (dailyByMember[d] || {})[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
                        const sunday = isSunday(d);
                        return (
                          <React.Fragment key={m._id}>
                            <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-r text-center`}>
                              <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full ${sunday && dm.conduction === 0 ? 'bg-rose-100 text-rose-900' : chipClass(dm.conduction)}`}>{sunday && dm.conduction === 0 ? 'Sunday' : dm.conduction}</span>
                            </td>
                            <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-r text-center`}>
                              <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full ${sunday && dm.closed === 0 ? 'bg-rose-100 text-rose-900' : chipClass(dm.closed)}`}>{sunday && dm.closed === 0 ? 'Sunday' : dm.closed}</span>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamStats;
