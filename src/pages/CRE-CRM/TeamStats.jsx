import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import CRENavbar from '../../components/CreNavbar';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';

const TeamStats = () => {
  const { authToken, role, user } = useAuth();
  const token = authToken || localStorage.getItem('token');
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
    if (!token || !isLeader) return;
    const headers = { Authorization: `Bearer ${token}` };
    const run = async () => {
      try {
        setLoading(true);
        const [membersRes, leadsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/cre/team/members`, { headers }),
          axios.get(`${BASE_URL}/api/cre/team/leads`, { headers }),
        ]);
        setTeamMembers(membersRes?.data?.data || []);
        setTeamLeadsData(leadsRes?.data?.data || []);
      } catch (e) {
        setTeamMembers([]);
        setTeamLeadsData([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, isLeader]);

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

  // Filters
  const membersFiltered = useMemo(() => {
    if (!hideZeroMembers) return teamMembers;
    return teamMembers.filter((m) => {
      const t = totalsByMember[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
      return (t.conduction + t.prospects + t.closed) > 0;
    });
  }, [teamMembers, totalsByMember, hideZeroMembers]);

  const monthDaysFiltered = useMemo(() => {
    if (!hideZeroDays) return [...monthDays].reverse();
    const arr = [];
    for (const d of [...monthDays].reverse()) {
      const dm = dailyByMember[d] || {};
      let sum = 0;
      for (const uid of Object.keys(dm)) {
        const v = dm[uid];
        sum += (v.conduction || 0) + (v.prospects || 0) + (v.closed || 0);
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
    const members = teamMembers;
    const header1 = ['S.no', 'Date', ...members.flatMap((m) => [m.name || '—', '', ''])];
    const header2 = ['', '', ...members.flatMap(() => ['Conduction', 'Closure Prospects', 'Closed'])];

    const rows = [header1, header2];
    // Totals at top
    const totalsRow = [
      'Total',
      '',
      ...members.flatMap((m) => {
        const t = totalsByMember[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
        return [String(t.conduction), String(t.prospects), String(t.closed)];
      })
    ];
    rows.push(totalsRow);

    // Daily rows
    monthDays.forEach((d, idx) => {
      rows.push([
        String(idx + 1),
        new Date(d).toLocaleDateString(),
        ...members.flatMap((m) => {
          const dm = (dailyByMember[d] || {})[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
          return [String(dm.conduction), String(dm.prospects), String(dm.closed)];
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
            Team Stats
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
                    {teamMembers.map((m) => (
                      <th key={m._id} className="px-3 py-2 border-b border-r text-center font-semibold text-slate-800" colSpan={3}>
                        <div className="truncate max-w-[12rem] mx-auto">{m.name || '—'}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/70">
                    <th className="px-3 py-2 border-b border-r"></th>
                    <th className="px-3 py-2 border-b border-r"></th>
                    {teamMembers.map((m) => (
                      <React.Fragment key={m._id}>
                        <th className="px-3 py-2 border-b border-r text-center text-slate-600">Conduction</th>
                        <th className="px-3 py-2 border-b border-r text-center text-slate-600">Closure Prospects</th>
                        <th className="px-3 py-2 border-b border-r text-center text-slate-600">Closed</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-semibold">
                    <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r sticky left-0 bg-white z-10`}>Total</td>
                    <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r sticky`} style={{left: compact ? 48 : 64, background: 'white', zIndex: 10}}></td>
                    {teamMembers.map((m) => {
                      const t = totalsByMember[String(m._id)] || { conduction: 0, prospects: 0, closed: 0 };
                      return (
                        <React.Fragment key={m._id}>
                          <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r text-center`}>
                            <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full bg-slate-100 text-slate-700`}>{t.conduction}</span>
                          </td>
                          <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r text-center`}>
                            <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full bg-slate-100 text-slate-700`}>{t.prospects}</span>
                          </td>
                          <td className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} border-t border-r text-center`}>
                            <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full bg-slate-100 text-slate-700`}>{t.closed}</span>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  <tr>
                    <td colSpan={2 + (membersFiltered.length * 3)} className="p-0">
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
                              <span className={`inline-flex items-center justify-center ${compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[11px]' : 'min-w-[2rem] px-2 py-0.5'} rounded-full ${sunday && dm.prospects === 0 ? 'bg-rose-100 text-rose-900' : chipClass(dm.prospects)}`}>{sunday && dm.prospects === 0 ? 'Sunday' : dm.prospects}</span>
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
      </div>
    </div>
  );
};

export default TeamStats;
