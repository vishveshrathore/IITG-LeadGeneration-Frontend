import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import AnimatedHRNavbar from '../../components/HRNavbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { BASE_URL } from '../../config';

const navItems = [
  { name: 'Dashboard', path: '/hr-operations/dashboard' },
  { name: 'Position MIS', path: '/hr-operations/positions' },
  { name: 'Local Hiring', path: '/hr-operations/local-hiring' },
];

const STATUS_OPTIONS = ['RNR', 'Wrong Number', 'Positive', 'Negative', 'Line up'];

const HROperationsLocalHiringWorksheet = () => {
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');

  const [loading, setLoading] = useState(false);
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [completionFilter, setCompletionFilter] = useState('');
  const [search, setSearch] = useState('');

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const [positionFilter, setPositionFilter] = useState('all');

  const getPositionMeta = (item) => {
    const lead = item?.lead || {};
    const pos = lead.position;

    if (!pos) {
      return { id: 'no-position', name: 'No Position', location: '' };
    }

    if (typeof pos === 'string') {
      return { id: pos, name: pos, location: '' };
    }

    if (typeof pos === 'object') {
      const id = String(pos._id || pos.id || '') || 'no-position';
      return {
        id,
        name: pos.name || 'Position',
        location: pos.location || '',
        status: pos.status || '',
      };
    }

    return { id: 'no-position', name: 'No Position', location: '' };
  };

  const positionOptions = useMemo(() => {
    const map = new Map();

    allRows.forEach((item) => {
      const meta = getPositionMeta(item);
      if (!meta.id) return;

      const existing = map.get(meta.id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(meta.id, { ...meta, count: 1 });
      }
    });

    return Array.from(map.values());
  }, [allRows]);

  const fetchWorksheet = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/local-hiring/my/worksheet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setAllRows(list);
      setRows(list);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load worksheet');
      setAllRows([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorksheet();
  }, [token]);

  useEffect(() => {
    let data = [...allRows];
    if (positionFilter && positionFilter !== 'all') {
      data = data.filter((a) => {
        const meta = getPositionMeta(a);
        return meta.id === positionFilter;
      });
    }
    if (statusFilter) {
      data = data.filter((a) => (a.currentStatus || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (completionFilter === 'completed') {
      data = data.filter((a) => !!a.completed);
    } else if (completionFilter === 'pending') {
      data = data.filter((a) => !a.completed);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((a) => {
        const l = a?.lead || {};
        const p = l.profile || {};
        const mobile = Array.isArray(l.mobile) ? l.mobile.join(', ') : '';
        const text = [
          l.name,
          p.name,
          l.email,
          p.email,
          mobile,
          l.location,
          p.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      });
    }
    setRows(data);
  }, [allRows, statusFilter, completionFilter, search, positionFilter]);

  const stats = useMemo(() => {
    const total = allRows.length;
    const completed = allRows.filter((a) => a.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [allRows]);

  const renderProfileDetails = (l) => {
    const p = l?.profile || {};
    const prev = Array.isArray(p.previous_roles)
      ? (p.previous_roles.every((it) => it && typeof it === 'object' && ('designation' in it || 'company' in it))
          ? p.previous_roles
              .map((it) => `${it?.designation || ''}${it?.company ? ' at ' + it.company : ''}`.trim())
              .filter(Boolean)
              .join(' | ')
          : p.previous_roles.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', '))
      : (p.previous_roles || '—');

    const fields = [
      { label: 'Name', value: l?.name || p.name || '—' },
      { label: 'Experience', value: p.experience || '—' },
      { label: 'CTC', value: p.ctc || '—' },
      { label: 'Location', value: l?.location || p.location || '—' },
      { label: 'Current Designation', value: p.current_designation || '—' },
      { label: 'Current Company', value: p.current_company || '—' },
      { label: 'Preferred Locations', value: p.preferred_locations || '—' },
      { label: 'Mobile', value: Array.isArray(l?.mobile) ? l.mobile.join(', ') : (p.mobile || '—') },
      { label: 'Email', value: l?.email || p.email || '—' },
      { label: 'Skills', value: p.skills || '—', wide: true },
      { label: 'May Also Know', value: p.may_also_know || '—', wide: true },
      { label: 'Education', value: p.education || '—', wide: true },
      { label: 'Summary', value: p.summary || '—', wide: true },
      { label: 'Previous Roles', value: prev || '—', full: true },
    ];

    return (
      <div className="bg-slate-50 rounded-3xl border border-slate-100 p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Candidate Profile</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fields.map((f) => (
            <div
              key={f.label}
              className={`bg-white rounded-2xl border border-slate-100 p-4 ${f.full ? 'md:col-span-2 lg:col-span-4' : f.wide ? 'md:col-span-2' : ''}`}
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">{f.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 break-words whitespace-pre-wrap">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9ff] via-[#eef4ff] to-[#fbfcff]">
      <AnimatedHRNavbar title="Manager Operation" navItems={navItems} />
      <Toaster position="top-right" />

      <main className="pt-20 pb-14 px-4 sm:px-6 lg:px-12 w-full">
        <div className="space-y-8">
          <section className="bg-white/90 backdrop-blur rounded-4xl border border-slate-200 shadow-sm px-6 md:px-10 py-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Local Hiring Worksheet
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Review your Local Hiring leads</h1>
                <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed">
                  Filter through all leads assigned to you, check outcomes, and open full profiles when needed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:max-w-2xl">
              <div className="bg-slate-900 text-white rounded-3xl p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-90 bg-gradient-to-br from-slate-900 to-slate-700" />
                <div className="relative space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/70">Total Assigned</p>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                </div>
              </div>
              <div className="bg-emerald-600 text-white rounded-3xl p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-90 bg-gradient-to-br from-emerald-500 to-emerald-600" />
                <div className="relative space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/70">Completed</p>
                  <p className="text-2xl font-semibold">{stats.completed}</p>
                </div>
              </div>
              <div className="bg-amber-500 text-white rounded-3xl p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-90 bg-gradient-to-br from-amber-400 to-orange-500" />
                <div className="relative space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/70">Pending</p>
                  <p className="text-2xl font-semibold">{stats.pending}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6 space-y-6">
            {positionOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setPositionFilter('all')}
                  className={positionFilter === 'all'
                    ? 'px-3 py-1.5 rounded-2xl text-xs font-semibold bg-indigo-600 text-white shadow'
                    : 'px-3 py-1.5 rounded-2xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'}
                >
                  All Positions ({allRows.length})
                </button>
                {positionOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPositionFilter(p.id)}
                    className={positionFilter === p.id
                      ? 'px-3 py-1.5 rounded-2xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                      : 'px-3 py-1.5 rounded-2xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'}
                  >
                    <span>{p.name || 'Position'}{p.location ? ` • ${p.location}` : ''}</span>
                    <span className="ml-1 text-[11px] text-slate-500">({p.count})</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-2 w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                >
                  <option value="">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Completion</label>
                <select
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                  className="mt-2 w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, mobile, or location"
                  className="mt-2 w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-100">
              {loading ? (
                <div className="p-4 text-sm text-slate-500">Loading worksheet…</div>
              ) : rows.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No leads found for the selected filters.</div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Name', 'Mobile', 'Email', 'Location', 'Position', 'Status', 'Remarks', 'Completed', 'Actions'].map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((a) => {
                      const l = a?.lead || {};
                      const completed = !!a.completed;
                      const positionMeta = getPositionMeta(a);
                      return (
                        <tr key={a._id} className="hover:bg-slate-50">
                          <td className="px-3 py-3">{l.name || l?.profile?.name || '—'}</td>
                          <td className="px-3 py-3">{Array.isArray(l.mobile) ? l.mobile.join(', ') : '—'}</td>
                          <td className="px-3 py-3 break-all">{l.email || l?.profile?.email || '—'}</td>
                          <td className="px-3 py-3">{l.location || l?.profile?.location || '—'}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => setPositionFilter(positionMeta.id)}
                              className={positionFilter === positionMeta.id
                                ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'}
                            >
                              {positionMeta.name || '—'}
                            </button>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-800">{a.currentStatus || '—'}</td>
                          <td className="px-3 py-3">{a.remarks || '—'}</td>
                          <td className="px-3 py-3">
                            <span className={completed ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200' : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200'}>
                              {completed ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => { setViewItem(a); setViewOpen(true); }}
                              className="px-3 py-1.5 rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {viewOpen && viewItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Lead Profile</h3>
                <p className="text-sm text-slate-600">Full details from the assigned lead</p>
              </div>
              <button
                type="button"
                onClick={() => { setViewOpen(false); setViewItem(null); }}
                className="rounded-full px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            {renderProfileDetails(viewItem?.lead || viewItem)}
          </div>
        </div>
      )}
    </div>
  );
};

export default HROperationsLocalHiringWorksheet;
