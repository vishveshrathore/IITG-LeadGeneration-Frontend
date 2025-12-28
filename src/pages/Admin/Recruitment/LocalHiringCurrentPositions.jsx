import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import AdminNavbar from '../../../components/AdminNavbar';
import { useAuth } from '../../../context/AuthContext';
import { BASE_URL } from '../../../config';

const AdminLocalHiringCurrentPositions = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token')
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [positionStatusLoadingId, setPositionStatusLoadingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPosition, setEditingPosition] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    requiredExp: '',
    location: '',
    ctcRange: '',
    requiredKeySkills: '',
    jdText: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState('');

  const fetchPositions = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${BASE_URL}/api/local-hiring/admin/positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = Array.isArray(data?.data) ? data.data : [];
      setPositions(items);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (position) => {
    if (!position) return;
    setEditingPosition(position);
    setEditForm({
      name: position?.name || '',
      requiredExp: position?.requiredExp || '',
      location: position?.location || '',
      ctcRange: position?.ctcRange || '',
      requiredKeySkills: position?.requiredKeySkills || '',
      jdText: position?.jdText || '',
    });
  };

  const handleEditInputChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;
    const id = editingPosition && editingPosition._id ? String(editingPosition._id) : '';
    if (!id) return;

    const payload = {
      name: String(editForm.name || '').trim(),
      requiredExp: String(editForm.requiredExp || '').trim(),
      location: String(editForm.location || '').trim(),
      ctcRange: String(editForm.ctcRange || '').trim(),
      requiredKeySkills: String(editForm.requiredKeySkills || '').trim(),
      jdText: String(editForm.jdText || '').trim(),
    };

    try {
      setSavingEdit(true);
      const { data } = await axios.patch(
        `${BASE_URL}/api/local-hiring/admin/positions/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data?.success) {
        const message = data?.message || 'Failed to update position';
        setError(message);
        toast.error(message);
        return;
      }

      const updated = data.data;
      setPositions((prev) => prev.map((p) => (String(p._id) === String(updated._id) ? updated : p)));
      setEditingPosition(null);
      toast.success('Position updated');
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to update position';
      setError(message);
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePosition = async (positionId) => {
    if (!token) return;
    const id = String(positionId || '');
    if (!id) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this position?');
    if (!confirmDelete) return;

    try {
      setDeleteLoadingId(id);
      const { data } = await axios.delete(
        `${BASE_URL}/api/local-hiring/admin/positions/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data && data.success === false) {
        const message = data?.message || 'Failed to delete position';
        setError(message);
        toast.error(message);
        return;
      }

      setPositions((prev) => prev.filter((p) => String(p._id) !== id));
      toast.success('Position deleted');
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to delete position';
      setError(message);
      toast.error(message);
    } finally {
      setDeleteLoadingId('');
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [token]);

  const filteredPositions = useMemo(() => {
    let list = positions;

    list = list.filter((p) => {
      const status = String(p.status || '').toLowerCase();
      if (statusFilter === 'active') return status === 'active';
      if (statusFilter === 'inactive') return status === 'inactive';
      return true;
    });

    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter((p) => {
      const text = [
        p?.name,
        p?.location,
        p?.requiredExp,
        p?.ctcRange,
        p?.requiredKeySkills,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
  }, [positions, statusFilter, search]);

  const handleTogglePositionStatus = async (positionId, currentStatus) => {
    if (!token) return;
    const id = String(positionId || '');
    if (!id) return;
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      setPositionStatusLoadingId(id);
      const { data } = await axios.patch(
        `${BASE_URL}/api/local-hiring/admin/positions/${id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.success) {
        const updated = data.data;
        setPositions((prev) => prev.map((p) => (String(p._id) === String(updated._id) ? updated : p)));
        toast.success(nextStatus === 'Active' ? 'Position activated' : 'Position deactivated');
      }
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to update status';
      setError(message);
      toast.error(message);
    } finally {
      setPositionStatusLoadingId('');
    }
  };

  const handleSetPositionStatus = async (positionId, nextStatus) => {
    if (!token) return;
    const id = String(positionId || '');
    if (!id) return;
    try {
      setPositionStatusLoadingId(id);
      const { data } = await axios.patch(
        `${BASE_URL}/api/local-hiring/admin/positions/${id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.success) {
        const updated = data.data;
        setPositions((prev) => prev.map((p) => (String(p._id) === String(updated._id) ? updated : p)));
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setPositionStatusLoadingId('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <AdminNavbar />
      <Toaster position="top-right" />
      <div className="pt-20 px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
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
                Current Positions
              </p>
              <h1 className="text-3xl font-bold text-slate-900">Local Hiring Roles</h1>
              <p className="text-sm text-slate-600 max-w-2xl mt-2">
                Browse every mandate with quick actions to change status, edit details, review public applications,
                and open sourcing tools.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, location, skills..."
              className="w-full sm:w-80 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white"
            />
            <button
              type="button"
              onClick={fetchPositions}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-slate-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh List
            </button>
          </div>
        </header>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Local hiring positions</p>
              <p className="text-xs text-slate-500">View and manage both active and deactivated roles.</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs sm:text-sm">
              <div className="inline-flex items-center gap-2 font-semibold text-slate-700">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600">
                  {loading ? '…' : filteredPositions.length}
                </span>
                <span>positions</span>
              </div>
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 overflow-hidden text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 font-semibold transition ${
                    statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 font-semibold transition border-l border-slate-200 ${
                    statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 font-semibold transition border-l border-slate-200 ${
                    statusFilter === 'inactive' ? 'bg-rose-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Deactivated
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="px-6 py-6 text-sm text-red-600">{error}</div>
          ) : loading ? (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">Loading positions…</div>
          ) : filteredPositions.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">
              No positions match the current filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPositions.map((p) => {
                const id = String(p._id || '');
                const jdHref = p?.jdFileUrl
                  ? (String(p.jdFileUrl).startsWith('http')
                      ? String(p.jdFileUrl)
                      : `${BASE_URL}${String(p.jdFileUrl).startsWith('/') ? '' : '/'}${String(p.jdFileUrl)}`)
                  : '';

                const rawStatus = String(p.status || 'Active');
                const statusLower = rawStatus.toLowerCase();
                const isActive = statusLower === 'active';

                return (
                  <article key={id} className="p-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between hover:bg-slate-50/70 transition">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900 truncate">{p.name || 'Position'}</h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {rawStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        {p.requiredExp && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {p.requiredExp}
                          </span>
                        )}
                        {p.location && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {p.location}
                          </span>
                        )}
                        {p.ctcRange && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {p.ctcRange}
                          </span>
                        )}
                      </div>
                      {p.requiredKeySkills && (
                        <p className="text-xs text-slate-600">
                          <span className="font-medium text-slate-800">Key skills:</span> {p.requiredKeySkills}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">Status:</span>
                      <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden text-xs">
                        <button
                          type="button"
                          disabled={positionStatusLoadingId === id || isActive}
                          onClick={() => handleSetPositionStatus(id, 'Active')}
                          className={`px-3 py-2 font-semibold transition ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-slate-700 hover:bg-slate-50'
                          } ${positionStatusLoadingId === id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          disabled={positionStatusLoadingId === id || statusLower === 'inactive'}
                          onClick={() => handleSetPositionStatus(id, 'Inactive')}
                          className={`px-3 py-2 font-semibold transition border-l border-slate-200 ${
                            statusLower === 'inactive'
                              ? 'bg-rose-600 text-white'
                              : 'bg-white text-slate-700 hover:bg-slate-50'
                          } ${positionStatusLoadingId === id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          Deactivate
                        </button>
                      </div>
                      {jdHref && (
                        <a
                          href={jdHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 px-3 py-2 shadow-sm hover:bg-slate-50 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          JD
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/naukri-parser?localHiring=true&localHiringPositionId=${id}`)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 px-3 py-2 shadow-sm hover:bg-slate-50 transition"
                      >
                        Table 14
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/linkedin-parser?localHiring=true&localHiringPositionId=${id}`)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 px-3 py-2 shadow-sm hover:bg-slate-50 transition"
                      >
                        Table 12
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/recruitment/local-hiring/public-applications/${id}`)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-indigo-700 px-3 py-2 shadow-sm hover:bg-indigo-50 transition"
                      >
                        Public Applications
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 px-3 py-2 shadow-sm hover:bg-slate-50 transition"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePosition(id)}
                        disabled={deleteLoadingId === id}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white text-xs font-semibold text-rose-700 px-3 py-2 shadow-sm hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        {deleteLoadingId === id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {editingPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit Position</h2>
                <p className="text-xs text-slate-600 mt-1">Update the key details for this local hiring role.</p>
              </div>
              <button
                type="button"
                onClick={() => !savingEdit && setEditingPosition(null)}
                disabled={savingEdit}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex-1 px-6 py-5 space-y-4 overflow-y-auto text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Position Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleEditInputChange('name', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. CRM Executive"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Required Experience</label>
                  <input
                    type="text"
                    value={editForm.requiredExp}
                    onChange={(e) => handleEditInputChange('requiredExp', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. 1-3 Years"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => handleEditInputChange('location', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. Jabalpur"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">CTC Range</label>
                  <input
                    type="text"
                    value={editForm.ctcRange}
                    onChange={(e) => handleEditInputChange('ctcRange', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. 2-4 LPA"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Required Key Skills</label>
                <input
                  type="text"
                  value={editForm.requiredKeySkills}
                  onChange={(e) => handleEditInputChange('requiredKeySkills', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Excel, CRM, Communication"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Job Description (Written)</label>
                <textarea
                  rows={4}
                  value={editForm.jdText}
                  onChange={(e) => handleEditInputChange('jdText', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Short JD summary for this position"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => !savingEdit && setEditingPosition(null)}
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 shadow-sm hover:bg-indigo-700 transition"
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLocalHiringCurrentPositions;
