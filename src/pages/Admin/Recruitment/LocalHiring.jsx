import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../../components/AdminNavbar';
import { useAuth } from '../../../context/AuthContext';
import { BASE_URL } from '../../../config';

const STATUS_OPTIONS = ['Pending', 'Positive', 'Negative', 'Wrong Number', 'RNR', 'Line up', 'Blacklist'];

const AdminLocalHiring = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');

  const [summary, setSummary] = useState({
    total: 0,
    assigned: 0,
    unassigned: 0,
    generalTotal: 0,
    generalAssigned: 0,
    generalUnassigned: 0,
    byPosition: [],
  });

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState('');
  const [creatingPosition, setCreatingPosition] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [positionForm, setPositionForm] = useState({
    name: '',
    requiredExp: '',
    location: '',
    ctcRange: '',
    jdText: '',
    requiredKeySkills: '',
    jdFile: null,
  });

  const [hrRecruiters, setHrRecruiters] = useState([]);
  const [hrOperations, setHrOperations] = useState([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrError, setHrError] = useState('');

  const [teamDrafts, setTeamDrafts] = useState({});
  const [teamSavingId, setTeamSavingId] = useState('');
  const [positionStatusLoadingId, setPositionStatusLoadingId] = useState('');
  const [positionsFilter, setPositionsFilter] = useState('all');

  const fetchSummary = async () => {
    if (!token) return;
    setSummaryLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/local-hiring/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.success) {
        setSummary({
          total: data.total || 0,
          assigned: data.assigned || 0,
          unassigned: data.unassigned || 0,
          generalTotal: data.generalTotal || 0,
          generalAssigned: data.generalAssigned || 0,
          generalUnassigned: data.generalUnassigned || 0,
          byPosition: Array.isArray(data.byPosition) ? data.byPosition : [],
        });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchPositions = async () => {
    if (!token) return;
    setPositionsLoading(true);
    setPositionsError('');
    try {
      const { data } = await axios.get(`${BASE_URL}/api/local-hiring/admin/positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = Array.isArray(data?.data) ? data.data : [];
      setPositions(items);
      const map = {};
      items.forEach((p) => {
        const id = String(p?._id || '');
        if (!id) return;
        const rec = Array.isArray(p.assignedHRRecruiters)
          ? p.assignedHRRecruiters.map((u) => String(u?._id || u?.id || u))
          : [];
        const ops = Array.isArray(p.assignedHROperations)
          ? p.assignedHROperations.map((u) => String(u?._id || u?.id || u))
          : [];
        map[id] = { hrRecruiters: rec, hrOperations: ops };
      });
      setTeamDrafts(map);
    } catch (e) {
      setPositionsError(e?.response?.data?.message || 'Failed to load positions');
    } finally {
      setPositionsLoading(false);
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
    fetchSummary();
    fetchPositions();
    fetchHRUsers();
  }, [token]);

  const handlePositionInputChange = (field, value) => {
    setPositionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreatePosition = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    const name = String(positionForm.name || '').trim();
    if (!name) {
      toast.error('Position Name is required');
      return;
    }

    try {
      setCreatingPosition(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('requiredExp', String(positionForm.requiredExp || '').trim());
      formData.append('location', String(positionForm.location || '').trim());
      formData.append('ctcRange', String(positionForm.ctcRange || '').trim());
      formData.append('jdText', String(positionForm.jdText || '').trim());
      formData.append('requiredKeySkills', String(positionForm.requiredKeySkills || '').trim());
      if (positionForm.jdFile) {
        formData.append('jdFile', positionForm.jdFile);
      }

      const { data } = await axios.post(`${BASE_URL}/api/local-hiring/admin/positions`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!data?.success) {
        toast.error(data?.message || 'Failed to create position');
        return;
      }

      const created = data.data;
      setPositions((prev) => [created, ...prev]);
      const id = created && created._id ? String(created._id) : '';
      if (id) {
        setTeamDrafts((prev) => ({
          ...prev,
          [id]: { hrRecruiters: [], hrOperations: [] },
        }));
      }

      setPositionForm({
        name: '',
        requiredExp: '',
        location: '',
        ctcRange: '',
        jdText: '',
        requiredKeySkills: '',
        jdFile: null,
      });
      toast.success('Position created');
      setCreateModalOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to create position');
    } finally {
      setCreatingPosition(false);
    }
  };

  const handleTeamToggle = (positionId, field, userId) => {
    setTeamDrafts((prev) => {
      const id = String(positionId);
      const current = prev[id] || { hrRecruiters: [], hrOperations: [] };
      const list = Array.isArray(current[field]) ? current[field] : [];
      const exists = list.includes(userId);
      const nextList = exists ? list.filter((v) => v !== userId) : [...list, userId];
      return {
        ...prev,
        [id]: {
          hrRecruiters: field === 'hrRecruiters' ? nextList : current.hrRecruiters || [],
          hrOperations: field === 'hrOperations' ? nextList : current.hrOperations || [],
        },
      };
    });
  };

  const handleSaveTeam = async (positionId) => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }
    const id = String(positionId || '');
    if (!id) return;
    const draft = teamDrafts[id] || { hrRecruiters: [], hrOperations: [] };
    try {
      setTeamSavingId(id);
      const { data } = await axios.patch(
        `${BASE_URL}/api/local-hiring/admin/positions/${id}`,
        {
          hrRecruiters: draft.hrRecruiters || [],
          hrOperations: draft.hrOperations || [],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!data?.success) {
        toast.error(data?.message || 'Failed to update team');
        return;
      }

      const updated = data.data;
      setPositions((prev) =>
        prev.map((p) => (String(p._id) === String(updated._id) ? updated : p))
      );
      toast.success('Team updated');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update team');
    } finally {
      setTeamSavingId('');
    }
  };

  const handleTogglePositionStatus = async (positionId, currentStatus) => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }
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
      if (!data?.success) {
        toast.error(data?.message || 'Failed to update status');
        return;
      }
      const updated = data.data;
      setPositions((prev) => prev.map((p) => (String(p._id) === String(updated._id) ? updated : p)));
      toast.success(nextStatus === 'Active' ? 'Position activated' : 'Position deactivated');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setPositionStatusLoadingId('');
    }
  };

  const filteredPositions = useMemo(() => {
    if (positionsFilter === 'active') {
      return positions.filter((p) => String(p.status || '').toLowerCase() === 'active');
    }
    return positions;
  }, [positions, positionsFilter]);

  const handleCurrentPositionsClick = () => {
    navigate('/admin/recruitment/local-hiring/current-positions');
  };

  const handleClearPositionsFilter = () => setPositionsFilter('all');

  const stats = [
    { label: 'Total Leads', value: summary.total, accent: 'from-slate-900 to-slate-700' },
    { label: 'Unassigned', value: summary.unassigned, accent: 'from-amber-500 to-orange-500' },
    { label: 'Assigned', value: summary.assigned, accent: 'from-emerald-500 to-emerald-600' },
  ];

  const reportTiles = [
    {
      title: 'Worksheet',
      description: 'View Your Lead',
      metricLabel: 'Live leads',
      metricValue: summary.total?.toLocaleString('en-IN') || '0',
      primary: {
        label: 'Open Worksheet',
        action: () => navigate('/admin/recruitment/local-hiring/worksheet'),
      },
      secondary: {
        label: 'Refresh Summary',
        action: fetchSummary,
      },
    },
    {
      title: 'User Report',
      description: 'Track recruiter & operations productivity with date-wise metrics.',
      metricLabel: 'Active users',
      metricValue: (hrRecruiters.length + hrOperations.length).toLocaleString('en-IN'),
      primary: {
        label: 'View Teams Report',
        action: () => navigate('/admin/recruitment/local-hiring/user-report'),
      },
      secondary: {
        label: 'Manage Teams',
        
      },
    },
    
  ];

  const COLOR_MAP = {
    emerald: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    indigo: {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      icon: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <AdminNavbar />
      <Toaster position="top-right" />

      <div className="pt-20 px-4 sm:px-6 lg:px-8 pb-12 w-full space-y-8">
        {/* Hero */}
        <section className="bg-white/80 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-indigo-600">
              <span className="h-2 w-1.5 rounded-full bg-indigo-600" />
              Local Hiring
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Admin Center</h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                A compact console to scan open roles, activate new positions, and jump into user productivity reports in one click.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleCurrentPositionsClick}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm transition border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Current Positions
            </button>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm transition border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Position
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/recruitment/local-hiring/worksheet')}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm transition border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20l9-16H3z" />
              </svg>
              Line Up Sheet
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/recruitment/local-hiring/user-report')}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm transition border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h6m-6-4h6m-6 8h6" />
              </svg>
              Reruiters Report
            </button>
            <button
              type="button"
              onClick={() => setDataModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm transition border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m6 4H9m12 4H3m18-8H3m18-8H3m18 16V4m-18 0v16" />
              </svg>
              Data
            </button>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Reports & Actions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {reportTiles.map((tile) => (
                <article key={tile.title} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">{tile.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">{tile.metricLabel}</span>
                    </div>
                    <p className="text-xs text-slate-600">{tile.description}</p>
                    <p className="text-2xl font-bold text-indigo-700">{tile.metricValue}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={tile.primary.action}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white font-semibold px-3.5 py-2 shadow-sm hover:bg-indigo-700 transition"
                    >
                      {tile.primary.label}
                    </button>
                    {tile.secondary?.action && tile.secondary?.label && (
                      <button
                        type="button"
                        onClick={tile.secondary.action}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold px-3.5 py-2 shadow-sm hover:bg-slate-50 transition"
                      >
                        {tile.secondary.label}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>


  
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create Local Hiring Position</h2>
                <p className="text-sm text-slate-600 mt-1">Capture the essentials so recruiters can start immediately.</p>
              </div>
              <button
                type="button"
                onClick={() => !creatingPosition && setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
                disabled={creatingPosition}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="flex-1 px-6 py-5 space-y-5 overflow-y-auto text-sm" onSubmit={handleCreatePosition}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Position Name</label>
                  <input
                    type="text"
                    value={positionForm.name}
                    onChange={(e) => handlePositionInputChange('name', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. CRM Executive"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Required Experience</label>
                  <input
                    type="text"
                    value={positionForm.requiredExp}
                    onChange={(e) => handlePositionInputChange('requiredExp', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. 1–3 Years"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Location</label>
                  <input
                    type="text"
                    value={positionForm.location}
                    onChange={(e) => handlePositionInputChange('location', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. Jabalpur"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">CTC Range</label>
                  <input
                    type="text"
                    value={positionForm.ctcRange}
                    onChange={(e) => handlePositionInputChange('ctcRange', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. 2–4 LPA"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Required Key Skills</label>
                <input
                  type="text"
                  value={positionForm.requiredKeySkills}
                  onChange={(e) => handlePositionInputChange('requiredKeySkills', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Excel, CRM, Communication"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Job Description (Written)</label>
                <textarea
                  rows={4}
                  value={positionForm.jdText}
                  onChange={(e) => handlePositionInputChange('jdText', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Short JD summary for this position"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">JD File (PDF / Word)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    setPositionForm((prev) => ({ ...prev, jdFile: file || null }));
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-xs text-slate-400">Optional. Upload a full JD for sharing externally.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => !creatingPosition && setCreateModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  disabled={creatingPosition}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPosition}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 shadow-sm hover:bg-indigo-700 transition"
                >
                  {creatingPosition ? 'Creating…' : 'Create Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dataModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-semibold">Position Leads</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-1">Data Overview</h2>
              </div>
              <button
                type="button"
                onClick={() => setDataModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              {summaryLoading && <div className="text-sm text-slate-500">Refreshing latest stats…</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((item) => (
                  <article
                    key={item.label}
                    className="relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${item.accent}`} />
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{item.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {summaryLoading ? <span className="text-slate-300">…</span> : item.value}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-2 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Position-wise leads</h3>
                {(!summary.byPosition || summary.byPosition.length === 0) ? (
                  <p className="text-xs text-slate-500">No position-wise lead data available yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Position</th>
                          <th className="px-4 py-2 text-left font-semibold">Status</th>
                          <th className="px-4 py-2 text-right font-semibold">Total Leads</th>
                          <th className="px-4 py-2 text-right font-semibold">Unassigned</th>
                          <th className="px-4 py-2 text-right font-semibold">Assigned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summary.byPosition.map((row) => {
                          const status = String(row.status || '').trim() || 'Active';
                          const isActive = status.toLowerCase() === 'active';
                          return (
                            <tr key={row.positionId} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2 align-middle text-slate-900 font-medium">{row.name || 'Untitled position'}</td>
                              <td className="px-4 py-2 align-middle">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    isActive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-300'
                                  }`}
                                >
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-2 align-middle text-right tabular-nums text-slate-900">{row.total}</td>
                              <td className="px-4 py-2 align-middle text-right tabular-nums text-amber-700">{row.unassigned}</td>
                              <td className="px-4 py-2 align-middle text-right tabular-nums text-emerald-700">{row.assigned}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLocalHiring;
