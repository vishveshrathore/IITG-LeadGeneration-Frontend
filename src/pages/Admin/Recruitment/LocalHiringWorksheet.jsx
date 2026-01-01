import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../../components/AdminNavbar';
import { useAuth } from '../../../context/AuthContext';
import { BASE_URL } from '../../../config';

const STATUS_OPTIONS = ['Pending', 'Positive', 'Negative', 'Wrong Number', 'RNR', 'Line up', 'Blacklist'];
const LIMIT_OPTIONS = [10, 25, 50, 100];

const AdminLocalHiringWorksheet = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');

  const [worksheet, setWorksheet] = useState([]);
  const [worksheetLoading, setWorksheetLoading] = useState(false);
  const [worksheetError, setWorksheetError] = useState('');
  const [worksheetStatus, setWorksheetStatus] = useState('');
  const [worksheetSearch, setWorksheetSearch] = useState('');
  const [lineUpFrom, setLineUpFrom] = useState('');
  const [lineUpTo, setLineUpTo] = useState('');
  const [worksheetPage, setWorksheetPage] = useState(1);
  const [worksheetLimit, setWorksheetLimit] = useState(25);
  const [worksheetTotal, setWorksheetTotal] = useState(0);
  const [worksheetTotalPages, setWorksheetTotalPages] = useState(1);
  const [meetDoneRemarkById, setMeetDoneRemarkById] = useState({});
  const [selectedRemarkById, setSelectedRemarkById] = useState({});
  const [savingRemark, setSavingRemark] = useState({});

  const fetchWorksheet = async (options = {}) => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    const nextPage = Number.isFinite(options.page) ? options.page : worksheetPage;
    const nextLimit = Number.isFinite(options.limit) ? options.limit : worksheetLimit;
    const statusFilter = Object.prototype.hasOwnProperty.call(options, 'status') ? options.status : worksheetStatus;
    const lineUpFromFilter = Object.prototype.hasOwnProperty.call(options, 'lineUpFrom') ? options.lineUpFrom : lineUpFrom;
    const lineUpToFilter = Object.prototype.hasOwnProperty.call(options, 'lineUpTo') ? options.lineUpTo : lineUpTo;
    const searchFilter = Object.prototype.hasOwnProperty.call(options, 'search') ? options.search : worksheetSearch;

    if (Number.isFinite(options.page)) {
      setWorksheetPage(options.page);
    }
    if (Number.isFinite(options.limit)) {
      setWorksheetLimit(options.limit);
    }

    setWorksheetLoading(true);
    setWorksheetError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (lineUpFromFilter) params.append('lineUpFrom', lineUpFromFilter);
      if (lineUpToFilter) params.append('lineUpTo', lineUpToFilter);
      if (searchFilter) params.append('q', searchFilter);
      params.append('page', nextPage);
      params.append('limit', nextLimit);

      const url = `${BASE_URL}/api/local-hiring/admin/worksheet${params.toString() ? `?${params.toString()}` : ''}`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = Array.isArray(data?.data) ? data.data : [];
      setWorksheet(list);

      const pagination = data?.pagination || {};
      setWorksheetTotal(Number.isFinite(pagination.total) ? pagination.total : list.length);
      setWorksheetTotalPages(Number.isFinite(pagination.totalPages) && pagination.totalPages > 0 ? pagination.totalPages : 1);

      if (Number.isFinite(pagination.page) && pagination.page >= 1) {
        setWorksheetPage(pagination.page);
      }
      if (Number.isFinite(pagination.limit) && pagination.limit >= 1) {
        setWorksheetLimit(pagination.limit);
      }
    } catch (e) {
      setWorksheet([]);
      setWorksheetTotal(0);
      setWorksheetTotalPages(1);
      const message = e?.response?.data?.message || 'Failed to load worksheet';
      setWorksheetError(message);
      toast.error(message);
    } finally {
      setWorksheetLoading(false);
    }
  };

  const handleWorksheetPageChange = (nextPage) => {
    if (worksheetLoading) return;
    if (nextPage < 1 || nextPage > worksheetTotalPages) return;
    fetchWorksheet({ page: nextPage });
  };

  const handleWorksheetLimitChange = (event) => {
    const nextLimit = parseInt(event.target.value, 10);
    if (Number.isNaN(nextLimit)) return;
    fetchWorksheet({ page: 1, limit: nextLimit });
  };

  const handleWorksheetSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      fetchWorksheet({ page: 1 });
    }
  };

  const handleSaveAssignmentRemark = async (assignmentId, type) => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    const key = `${assignmentId}:${type}`;
    const remarkMap = type === 'meetDone' ? meetDoneRemarkById : selectedRemarkById;
    const remark = String(remarkMap[assignmentId] ?? '').trim();

    if (!remark) {
      toast.error('Remark is required');
      return;
    }

    try {
      setSavingRemark((prev) => ({ ...prev, [key]: true }));
      const url = `${BASE_URL}/api/local-hiring/admin/assignment/${assignmentId}/remark`;
      const { data } = await axios.put(
        url,
        { type, remark },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (data?.success) {
        toast.success(data?.message || 'Remark saved');
        const payload = data.data || {};
        setWorksheet((prev) =>
          Array.isArray(prev)
            ? prev.map((item) =>
                String(item?._id) === String(assignmentId)
                  ? {
                      ...item,
                      meetDoneRemark: payload.meetDoneRemark ?? item.meetDoneRemark,
                      selectedRemark: payload.selectedRemark ?? item.selectedRemark,
                    }
                  : item,
              )
            : prev,
        );
      }
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to save remark';
      toast.error(message);
    } finally {
      setSavingRemark((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchWorksheet({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const showingAssignments = worksheet;
  const showingCount = showingAssignments.length;
  const hasPrevPage = worksheetPage > 1;
  const hasNextPage = worksheetPage < worksheetTotalPages;
  const showingFrom = worksheetTotal === 0 ? 0 : (worksheetPage - 1) * worksheetLimit + 1;
  const showingTo = showingCount === 0 ? 0 : showingFrom + showingCount - 1;

  const summaryPills = useMemo(() => {
    const totalLineUps = showingAssignments.filter((item) => item.currentStatus === 'Line up').length;
    const totalPositives = showingAssignments.filter((item) => item.currentStatus === 'Positive').length;
    const totalNegatives = showingAssignments.filter((item) => item.currentStatus === 'Negative').length;

    return [
      { label: 'Displaying', value: showingCount.toLocaleString('en-IN'), accent: 'from-indigo-500 to-indigo-600' },
      { label: 'Line-ups in view', value: totalLineUps.toLocaleString('en-IN'), accent: 'from-amber-400 to-orange-500' },
      { label: 'Positive outcomes', value: totalPositives.toLocaleString('en-IN'), accent: 'from-emerald-400 to-emerald-600' },
      { label: 'Negative outcomes', value: totalNegatives.toLocaleString('en-IN'), accent: 'from-rose-400 to-rose-600' },
    ];
  }, [showingAssignments, showingCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <AdminNavbar />
      <Toaster position="top-right" />

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
              Back to Admin Center
            </button>
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] uppercase text-indigo-600">
                <span className="h-2 w-1.5 rounded-full bg-indigo-600" />
                Worksheet
              </p>
              <h1 className="text-3xl font-bold text-slate-900">Local Hiring Worksheet</h1>
              <p className="text-sm text-slate-600 max-w-3xl mt-2">
                Analyse every assignment with industrial filters, quick insights, and paginated navigation tuned for large datasets.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchWorksheet({ page: worksheetPage })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-slate-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/recruitment/local-hiring/user-report')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-slate-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h2m0 0l-3-3m3 3l-3 3M3 7h10M3 12h6" />
              </svg>
              User Report
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryPills.map((item) => (
            <article
              key={item.label}
              className="relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${item.accent}`} />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search (Name / Email / Mobile)</label>
                <input
                  type="text"
                  value={worksheetSearch}
                  onChange={(e) => setWorksheetSearch(e.target.value)}
                  onKeyDown={handleWorksheetSearchKeyDown}
                  placeholder="Type to search…"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <select
                  value={worksheetStatus}
                  onChange={(e) => setWorksheetStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Line-up Date (From)</label>
                <input
                  type="date"
                  value={lineUpFrom}
                  onChange={(e) => setLineUpFrom(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Line-up Date (To)</label>
                <input
                  type="date"
                  value={lineUpTo}
                  onChange={(e) => setLineUpTo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => fetchWorksheet({ page: 1 })}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-indigo-700 transition"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetStatus('');
                    setWorksheetSearch('');
                    setLineUpFrom('');
                    setLineUpTo('');
                    setWorksheetPage(1);
                    fetchWorksheet({ page: 1, status: '', search: '', lineUpFrom: '', lineUpTo: '' });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
              </div>
              <div className="text-xs text-slate-500">
                {worksheetLoading
                  ? 'Loading…'
                  : worksheetTotal > 0
                    ? `Showing ${showingFrom.toLocaleString('en-IN')}–${showingTo.toLocaleString('en-IN')} of ${worksheetTotal.toLocaleString('en-IN')} records`
                    : 'No records'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {worksheetError && (
              <div className="px-6 py-4 text-sm text-red-600 border-b border-red-100 bg-red-50">{worksheetError}</div>
            )}

            {worksheetLoading ? (
              <div className="p-12 flex items-center justify-center text-slate-500 text-sm">Loading worksheet…</div>
            ) : showingAssignments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No assignments found for the selected filters.</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Candidate', 'Mobile', 'Email', 'Status', 'Line-up', 'Interview Type', 'Assigned To', 'Updated At', 'Remarks', 'Meet Done Remark', 'Selected Remark'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {showingAssignments.map((a) => {
                      const l = a.lead || {};
                      const user = a.assignedTo || {};
                      const mobile = Array.isArray(l.mobile) ? l.mobile.join(', ') : (l.mobile || '—');
                      const email = l.email || (l.profile && l.profile.email) || '—';
                      const statusLabel = a.currentStatus || '—';
                      const lineUpLabel = a.currentStatus === 'Line up' && a.lineUpDateTime
                        ? new Date(a.lineUpDateTime).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '—';
                      const assignmentId = a._id;
                      const meetDoneValue =
                        meetDoneRemarkById[assignmentId] !== undefined
                          ? meetDoneRemarkById[assignmentId]
                          : a.meetDoneRemark || '';
                      const selectedValue =
                        selectedRemarkById[assignmentId] !== undefined
                          ? selectedRemarkById[assignmentId]
                          : a.selectedRemark || '';
                      const isSavingMeet = !!savingRemark[`${assignmentId}:meetDone`];
                      const isSavingSelected = !!savingRemark[`${assignmentId}:selected`];
                      const assignedName = user.name || user.fullName || '—';
                      const updatedAtLabel = a.updatedAt
                        ? new Date(a.updatedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '—';

                      return (
                        <tr key={a._id} className="border-b border-slate-100 hover:bg-slate-50/60">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 text-xs md:text-sm">{l.name || (l.profile && l.profile.name) || '—'}</div>
                            <div className="text-[11px] text-slate-500">{l.location || (l.profile && l.profile.location) || '—'}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{mobile}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{email}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{lineUpLabel}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{a.interviewType || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{assignedName}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{updatedAtLabel}</td>
                          <td className="px-3 py-2 max-w-xs">
                            <span className="block truncate" title={a.remarks || '—'}>{a.remarks || '—'}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex flex-col gap-1 min-w-[220px]">
                              <input
                                type="text"
                                value={meetDoneValue}
                                onChange={(e) =>
                                  setMeetDoneRemarkById((prev) => ({
                                    ...prev,
                                    [assignmentId]: e.target.value,
                                  }))
                                }
                                className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                                placeholder="Meet Done remark"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveAssignmentRemark(assignmentId, 'meetDone')}
                                className="self-start inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1 shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                                disabled={isSavingMeet || !String(meetDoneValue).trim()}
                              >
                                {isSavingMeet ? 'Saving…' : 'Meet Done'}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex flex-col gap-1 min-w-[220px]">
                              <input
                                type="text"
                                value={selectedValue}
                                onChange={(e) =>
                                  setSelectedRemarkById((prev) => ({
                                    ...prev,
                                    [assignmentId]: e.target.value,
                                  }))
                                }
                                className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                                placeholder="Selected remark"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveAssignmentRemark(assignmentId, 'selected')}
                                className="self-start inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1 shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                                disabled={isSavingSelected || !String(selectedValue).trim()}
                              >
                                {isSavingSelected ? 'Saving…' : 'Selected'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!worksheetLoading && showingAssignments.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-slate-500">
                  Showing {showingFrom.toLocaleString('en-IN')}–{showingTo.toLocaleString('en-IN')} of {worksheetTotal.toLocaleString('en-IN')} records
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Rows per page</span>
                    <select
                      value={worksheetLimit}
                      onChange={handleWorksheetLimitChange}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    >
                      {LIMIT_OPTIONS.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleWorksheetPageChange(worksheetPage - 1)}
                      disabled={!hasPrevPage || worksheetLoading}
                      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500">
                      Page {worksheetTotalPages === 0 ? 0 : worksheetPage} of {worksheetTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleWorksheetPageChange(worksheetPage + 1)}
                      disabled={!hasNextPage || worksheetLoading}
                      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLocalHiringWorksheet;
