import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import AdminNavbar from '../../../components/AdminNavbar';
import { useAuth } from '../../../context/AuthContext';
import { BASE_URL } from '../../../config';

const AdminLocalHiringPublicApplications = () => {
  const navigate = useNavigate();
  const { positionId } = useParams();
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');

  const [position, setPosition] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [hrRecruiters, setHrRecruiters] = useState([]);
  const [hrOperations, setHrOperations] = useState([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrError, setHrError] = useState('');
  const [assignSelection, setAssignSelection] = useState({});
  const [assigning, setAssigning] = useState({});

  const fetchApplications = async (pageOverride) => {
    if (!token) return;
    const id = String(positionId || '');
    if (!id) return;

    const targetPage = pageOverride || pagination.page || 1;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', String(targetPage));
      params.append('limit', String(pagination.limit || 20));
      const url = `${BASE_URL}/api/local-hiring/admin/positions/${id}/public-applications?${params.toString()}`;
      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!data?.success) {
        setError(data?.message || 'Failed to load applications');
        return;
      }

      setPosition(data.position || null);
      const items = Array.isArray(data.data) ? data.data : [];
      setApplications(items);
      const pg = data.pagination || {};
      setPagination((prev) => ({
        page: Number(pg.page || targetPage || 1),
        totalPages: Number(pg.totalPages || 1),
        total: Number(pg.total || items.length || 0),
        limit: Number(pg.limit || prev.limit || 20),
      }));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchHRUsers = async () => {
    if (!token) return;
    setHrLoading(true);
    setHrError('');
    try {
      const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/hr-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hrData = data?.data || {};
      setHrRecruiters(Array.isArray(hrData.hrRecruiters) ? hrData.hrRecruiters : []);
      setHrOperations(Array.isArray(hrData.hrOperations) ? hrData.hrOperations : []);
    } catch (e) {
      setHrError(e?.response?.data?.message || 'Failed to load HR users');
    } finally {
      setHrLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(1);
    fetchHRUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, positionId]);

  const gotoPage = (nextPage) => {
    const p = Math.max(1, Math.min(nextPage, pagination.totalPages || 1));
    if (p === pagination.page) return;
    fetchApplications(p);
  };

  const handleAssignLead = async (leadId) => {
    if (!token) return;
    const selectedUserId = String(assignSelection[leadId] || '').trim();
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    try {
      setAssigning((prev) => ({ ...prev, [leadId]: true }));
      const url = `${BASE_URL}/api/local-hiring/admin/leads/${leadId}/assign`;
      const { data } = await axios.put(
        url,
        { userId: selectedUserId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!data?.success) {
        toast.error(data?.message || 'Failed to assign lead');
        return;
      }

      const payload = data.data || {};
      const assignedUser = payload.assignedTo;

      setApplications((prev) =>
        Array.isArray(prev)
          ? prev.map((item) =>
              String(item?._id || '') === String(leadId)
                ? {
                    ...item,
                    assignedTo: assignedUser || item.assignedTo || selectedUserId,
                  }
                : item,
            )
          : prev,
      );

      toast.success(data?.message || 'Lead assigned');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to assign lead');
    } finally {
      setAssigning((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
    }
  };

  const title = position?.name ? `Public Applications – ${position.name}` : 'Public Applications';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <AdminNavbar />
      <Toaster position="top-right" />

      <div className="pt-20 px-4 sm:px-6 lg:px-10 pb-16 space-y-8">
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
                Public Applications
              </p>
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              {position && (
                <p className="text-sm text-slate-600 max-w-3xl mt-2">
                  Showing candidates who applied via the public careers portal for this local hiring role.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {position && (
              <div className="flex flex-col text-right text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Status: {position.status}</span>
                {position.location && <span>Location: {position.location}</span>}
                {position.requiredExp && <span>Experience: {position.requiredExp}</span>}
              </div>
            )}
            <button
              type="button"
              onClick={() => fetchApplications(pagination.page || 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-slate-50 transition"
              disabled={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Applications</h2>
              <p className="text-xs text-slate-500">
                All public applications captured from the Careers page for this position.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{pagination.total}</span> total applications
            </div>
          </div>

          {error && (
            <div className="px-6 py-4 text-sm text-red-600 border-b border-red-100 bg-red-50">{error}</div>
          )}

          <div className="overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Assigned To</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Mobile</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Experience</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Current Company</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Skills</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Applied At</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-8 text-slate-500" colSpan={10}>Loading applications…</td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-slate-500" colSpan={10}>No public applications yet.</td>
                  </tr>
                ) : (
                  applications.map((app) => {
                    const id = String(app?._id || '');
                    const mobile = Array.isArray(app?.mobile)
                      ? app.mobile.join(', ')
                      : (app?.mobile || '—');
                    const profile = app?.profile || {};
                    const exp = profile.experience || '';
                    const company = profile.currentCompany || '';
                    const skills = profile.skills || '';
                    const resumeUrl = profile.resumeUrl || '';

                    // Derive a friendly label for assignment
                    const assigned = app?.assignedTo;
                    let assignedLabel = 'Unassigned';
                    if (assigned) {
                      if (typeof assigned === 'object') {
                        assignedLabel =
                          assigned.name ||
                          assigned.fullName ||
                          assigned.email ||
                          'Assigned';
                      } else {
                        // When backend returns just an id string
                        assignedLabel = 'Assigned';
                      }
                    }
                    let appliedAt = '—';
                    if (app?.createdAt) {
                      try {
                        appliedAt = new Date(app.createdAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      } catch (_) {
                        appliedAt = String(app.createdAt).slice(0, 19).replace('T', ' ');
                      }
                    }

                    return (
                      <tr key={id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{app?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {assigned ? (
                            assignedLabel
                          ) : (
                            <div className="flex flex-col gap-1 min-w-[220px]">
                              <div className="flex items-center gap-2">
                                <select
                                  value={assignSelection[id] || ''}
                                  onChange={(e) =>
                                    setAssignSelection((prev) => ({
                                      ...prev,
                                      [id]: e.target.value,
                                    }))
                                  }
                                  className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                                  disabled={hrLoading || !!assigning[id]}
                                >
                                  <option value="">Select user</option>
                                  {hrRecruiters.length > 0 && (
                                    <optgroup label="HR Recruiters">
                                      {hrRecruiters.map((u) => {
                                        const uid = String(u?._id || u?.id || '');
                                        if (!uid) return null;
                                        return (
                                          <option key={uid} value={uid}>
                                            {u.name || u.email || uid}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}
                                  {hrOperations.length > 0 && (
                                    <optgroup label="HR Operations">
                                      {hrOperations.map((u) => {
                                        const uid = String(u?._id || u?.id || '');
                                        if (!uid) return null;
                                        return (
                                          <option key={uid} value={uid}>
                                            {u.name || u.email || uid}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAssignLead(id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1 shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                                  disabled={!!assigning[id] || !assignSelection[id]}
                                >
                                  {assigning[id] ? 'Assigning…' : 'Assign'}
                                </button>
                              </div>
                              {hrError && (
                                <span className="text-[11px] text-rose-500">{hrError}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{app?.email || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{mobile}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{exp || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{company || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{app?.location || '—'}</td>
                        <td className="px-4 py-3 whitespace-pre-wrap text-slate-600 max-w-xs">{skills || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{appliedAt}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {resumeUrl ? (
                            <a
                              href={resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
                <span className="font-semibold text-slate-800">{pagination.totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => gotoPage(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => gotoPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminLocalHiringPublicApplications;
