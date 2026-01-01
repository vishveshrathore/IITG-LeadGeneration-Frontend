import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../../components/AdminNavbar';
import { useAuth } from '../../../context/AuthContext';
import { BASE_URL } from '../../../config';

const AdminLocalHiringUserReport = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');

  const [hrRecruiters, setHrRecruiters] = useState([]);
  const [hrOperations, setHrOperations] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [dailyMetrics, setDailyMetrics] = useState({});
  const [dailyLoading, setDailyLoading] = useState(false);

  const fetchUsers = async () => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError('');
    try {
      const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/hr-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hrData = data?.data || {};
      setHrRecruiters(Array.isArray(hrData.hrRecruiters) ? hrData.hrRecruiters : []);
      setHrOperations(Array.isArray(hrData.hrOperations) ? hrData.hrOperations : []);
    } catch (e) {
      setUsersError(e?.response?.data?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchDailyMetrics = async (date) => {
    if (!token) return;
    const targetDate = date || reportDate;
    if (!targetDate) return;

    const users = Array.isArray(allUsers) ? allUsers : [];
    if (!users.length) {
      setDailyMetrics({});
      return;
    }

    try {
      setDailyLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const requests = users
        .map((u) => {
          const id = String(u?._id || u?.id || '');
          if (!id) return null;
          const params = new URLSearchParams();
          params.append('userId', id);
          params.append('from', targetDate);
          params.append('to', targetDate);
          const url = `${BASE_URL}/api/local-hiring/admin/user-report?${params.toString()}`;
          return axios
            .get(url, { headers })
            .then((res) => {
              const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
              const day = rows[0] || {};
              return [id, {
                pitched: Number(day?.pitched || 0),
                lineUps: Number(day?.lineUp?.count || 0),
                positive: Number(day?.positive || 0),
                negative: Number(day?.negative || 0),
                rnr: Number(day?.rnr || 0),
              }];
            })
            .catch(() => [id, {
              pitched: 0,
              lineUps: 0,
              positive: 0,
              negative: 0,
              rnr: 0,
            }]);
        })
        .filter(Boolean);

      const results = await Promise.all(requests);
      const map = {};
      for (const [id, metrics] of results) {
        map[id] = metrics;
      }
      setDailyMetrics(map);
    } finally {
      setDailyLoading(false);
    }
  };

  const allUsers = useMemo(() => {
    const joined = [
      ...(Array.isArray(hrRecruiters) ? hrRecruiters : []),
      ...(Array.isArray(hrOperations) ? hrOperations : []),
    ];

    const map = new Map();
    for (const u of joined) {
      const id = String(u?._id || u?.id || '');
      if (!id) continue;
      if (!map.has(id)) map.set(id, u);
    }

    return Array.from(map.values()).sort((a, b) => {
      const an = String(a?.name || '').toLowerCase();
      const bn = String(b?.name || '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [hrRecruiters, hrOperations]);

  const filteredUsers = useMemo(() => {
    const q = String(userSearch || '').trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) => {
      const text = [u?.name, u?.email, u?.role, Array.isArray(u?.mobile) ? u.mobile.join(' ') : u?.mobile]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [allUsers, userSearch]);

  useEffect(() => {
    if (!token) return;
    if (!reportDate) return;
    if (!allUsers.length) return;
    fetchDailyMetrics(reportDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reportDate, allUsers.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <AdminNavbar />

      <div className="pt-20 px-4 sm:px-6 lg:px-10 pb-16 space-y-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/admin/recruitment/local-hiring')}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin
            </button>
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] uppercase text-indigo-600">
                <span className="h-2 w-1.5 rounded-full bg-indigo-600" />
                User Report
              </p>
              <h1 className="text-3xl font-bold text-slate-900">Local Hiring Daily Report</h1>
              <p className="text-sm text-slate-600 max-w-3xl mt-2">
                Select a recruiter / operations user, then review date-wise performance with pitched volume and outcomes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/recruitment/local-hiring')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-slate-50 transition"
            >
              Admin Center
            </button>
            <button
              type="button"
              onClick={fetchUsers}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-slate-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Users
            </button>
          </div>
        </header>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Recruiters & Operations</h2>
              <p className="text-xs text-slate-500">Daily metrics for the selected report date. Click on a user to open detailed date-wise report.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">Report Date</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name / email / role…"
                  className="w-full sm:w-72 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
                {dailyLoading && (
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">Loading daily metrics…</span>
                )}
              </div>
            </div>
          </div>

          {usersError && (
            <div className="px-6 py-4 text-sm text-red-600 border-b border-red-100 bg-red-50">{usersError}</div>
          )}

          <div className="overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Mobile</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Pitched</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Line ups</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Positive</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Negative</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">RNR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersLoading ? (
                  <tr>
                    <td className="px-6 py-8 text-slate-500" colSpan={9}>Loading users…</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-slate-500" colSpan={9}>No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const id = String(u?._id || u?.id || '');
                    const mobile = Array.isArray(u?.mobile) ? u.mobile.join(', ') : (u?.mobile || '—');
                    const metrics = dailyMetrics[id] || {};

                    return (
                      <tr key={id} className="hover:bg-slate-50/70 transition align-top">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{u?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{u?.role || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{u?.email || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{mobile}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="inline-flex min-w-[2.25rem] justify-end font-semibold text-slate-800">{metrics.pitched ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="inline-flex min-w-[2.25rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{metrics.lineUps ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="inline-flex min-w-[2.25rem] justify-end rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">{metrics.positive ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="inline-flex min-w-[2.25rem] justify-end rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">{metrics.negative ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="inline-flex min-w-[2.25rem] justify-end rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">{metrics.rnr ?? 0}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLocalHiringUserReport;
