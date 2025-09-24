import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import CRENavbar from '../../components/CreNavbar';
import { BASE_URL } from '../../config';

const MyTeam = () => {
  const { role, user, authToken } = useAuth();
  const token = authToken || localStorage.getItem('token');
  const isLeader = ["CRM-TeamLead", "RegionalHead", "NationalHead"].includes(role || user?.role);

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

  const filteredLeads = useMemo(() => {
    let rows = [...teamLeadsData];
    if (selectedUserId) rows = rows.filter(a => String(a.Calledbycre?._id || a.Calledbycre) === String(selectedUserId));
    if (statusFilter) {
      rows = rows.filter(a => (a.currentStatus || '').toLowerCase() === statusFilter.toLowerCase());
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
                    <th className="px-4 py-3 text-left">Region</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Pending</th>
                    <th className="px-4 py-3 text-left">Positive</th>
                    <th className="px-4 py-3 text-left">Negative</th>
                    <th className="px-4 py-3 text-left">Closure</th>
                    <th className="px-4 py-3 text-left">FU Today</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMembers ? (
                    <tr><td className="px-4 py-4" colSpan={10}>Loading team members…</td></tr>
                  ) : (teamMembers.length === 0 ? (
                    <tr><td className="px-4 py-6 text-slate-500" colSpan={10}>No team members found.</td></tr>
                  ) : (
                    teamMembers.map(m => (
                      <tr key={m._id} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer" onClick={() => { setSelectedUserId(m._id); setPage(1); }}>
                        <td className="px-4 py-3">{m.name || '—'}</td>
                        <td className="px-4 py-3">{m.role || '—'}</td>
                        <td className="px-4 py-3">{m.region || '—'}</td>
                        <td className="px-4 py-3">{m.email || '—'}</td>
                        <td className="px-4 py-3">{m.metrics?.total ?? 0}</td>
                        <td className="px-4 py-3">{m.metrics?.pending ?? 0}</td>
                        <td className="px-4 py-3">{m.metrics?.positive ?? 0}</td>
                        <td className="px-4 py-3">{m.metrics?.negative ?? 0}</td>
                        <td className="px-4 py-3">{m.metrics?.closureProspects ?? 0}</td>
                        <td className="px-4 py-3">{m.metrics?.todaysFollowups ?? 0}</td>
                      </tr>
                    ))
                  ))}
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
                  <th className="px-4 py-3 text-left">Product Line</th>
                  <th className="px-4 py-3 text-left">Turnover</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Mobile</th>
                  <th className="px-4 py-3 text-left">Assigned CRE</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Follow-up</th>
                  <th className="px-4 py-3 text-left">Manager</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeads ? (
                  <tr><td className="px-4 py-4" colSpan={12}>Loading team leads…</td></tr>
                ) : (pageData.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={12}>No leads found.</td></tr>
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
                        <td className="px-4 py-3">{lead.productLine || '—'}</td>
                        <td className="px-4 py-3">{lead.turnover || lead.turnOver || '—'}</td>
                        <td className="px-4 py-3">{lead.email || '—'}</td>
                        <td className="px-4 py-3">{Array.isArray(lead.mobile) ? lead.mobile.join(', ') : (lead.mobile || '—')}</td>
                        <td className="px-4 py-3">{a.Calledbycre?.name || '—'}</td>
                        <td className="px-4 py-3">{status}</td>
                        <td className="px-4 py-3">{fuDate ? fuDate.toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">{a.reportingManager?.name || '—'}</td>
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
    </div>
  );
};

export default MyTeam;
