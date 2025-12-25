import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../../config';
import AdminNavbar from '../../../components/AdminNavbar';
import RecruitmentQCNavbar from '../../../components/RecruitmentQCNavbar.jsx';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext.jsx';

const PositionMIS = () => {
  const navigate = useNavigate();
  const { authToken, role, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamJob, setTeamJob] = useState(null);
  const [hrRecruiters, setHrRecruiters] = useState([]);
  const [hrOperations, setHrOperations] = useState([]);
  const [recruitmentQCManagers, setRecruitmentQCManagers] = useState([]);
  const [teamDraft, setTeamDraft] = useState({
    hrRecruiters: [],
    hrOperations: [],
    recruitmentQCManager: '',
  });
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamError, setTeamError] = useState('');

  useEffect(() => {
    if (!authToken) return;
    const fetchJobs = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/getallpostjobs`, {
          withCredentials: true,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        // Sort latest first
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setJobs(list);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load jobs';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [authToken]);

  const filtered = useMemo(() => {
    let base = jobs;

    // If Recruitment / QC Manager, only show positions assigned to this manager
    const rawRoleLocal = role || localStorage.getItem('role') || sessionStorage.getItem('role') || '';
    const roleNormLocal = rawRoleLocal.toLowerCase().replace(/[^a-z]/g, '');
    if (roleNormLocal === 'recruitmentqcmanager') {
      const storedUser = (() => {
        try {
          return (
            user ||
            JSON.parse(localStorage.getItem('user') || 'null') ||
            JSON.parse(sessionStorage.getItem('user') || 'null')
          );
        } catch {
          return user || null;
        }
      })();
      const qcId = storedUser && storedUser.id ? String(storedUser.id) : null;
      if (qcId) {
        base = base.filter((j) => {
          const qc = j.assignedRecruitmentQCManager;
          if (!qc) return false;
          const jid = typeof qc === 'string' ? qc : (qc._id || qc.id);
          return String(jid) === qcId;
        });
      } else {
        base = [];
      }
    }

    if (!q.trim()) return base;
    const needle = q.toLowerCase();
    return base.filter(j => {
      const c = j?.createdBy || {};
      const hay = [
        j?.position,
        j?.jobLocation,
        j?.employmentType,
        j?.positionRole,
        j?.status,
        c?.companyName || c?.CompanyName,
        c?.hrName || c?.name,
        c?.email,
        c?.mobile,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [jobs, q]);

  const stats = useMemo(() => {
    let base = jobs;

    const rawRoleLocal = role || localStorage.getItem('role') || sessionStorage.getItem('role') || '';
    const roleNormLocal = rawRoleLocal.toLowerCase().replace(/[^a-z]/g, '');
    if (roleNormLocal === 'recruitmentqcmanager') {
      const storedUser = (() => {
        try {
          return (
            user ||
            JSON.parse(localStorage.getItem('user') || 'null') ||
            JSON.parse(sessionStorage.getItem('user') || 'null')
          );
        } catch {
          return user || null;
        }
      })();
      const qcId = storedUser && storedUser.id ? String(storedUser.id) : null;
      if (qcId) {
        base = base.filter((j) => {
          const qc = j.assignedRecruitmentQCManager;
          if (!qc) return false;
          const jid = typeof qc === 'string' ? qc : (qc._id || qc.id);
          return String(jid) === qcId;
        });
      } else {
        base = [];
      }
    }

    const total = base.length;
    const active = base.filter(j => String(j?.status).toLowerCase() === 'active').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [jobs, role, user]);

  const getOrganisationName = (job) => {
    if (!job) return '';
    const rawOrg = job.organisation;
    if (rawOrg && typeof rawOrg === 'object') {
      return rawOrg.CompanyName || rawOrg.companyName || rawOrg.name || '';
    }
    if (typeof rawOrg === 'string') {
      const trimmed = rawOrg.trim();
      // If it's not just an ObjectId-looking value, show it
      if (trimmed && !/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        return trimmed;
      }
    }
    if (job.organisationOther && String(job.organisationOther).trim()) {
      return String(job.organisationOther).trim();
    }
    const c = job.createdBy || {};
    return c.companyName || c.CompanyName || '';
  };

  const getLocationLabel = (job) => {
    if (!job) return '-';
    if (job.jobLocation && String(job.jobLocation).trim()) {
      return String(job.jobLocation).trim();
    }
    const parts = [];
    if (job.jobCity && String(job.jobCity).trim()) parts.push(String(job.jobCity).trim());
    if (job.jobCityOther && String(job.jobCityOther).trim()) parts.push(String(job.jobCityOther).trim());
    if (job.jobState && String(job.jobState).trim()) parts.push(String(job.jobState).trim());
    return parts.length ? parts.join(', ') : '-';
  };

  const renderJDPreview = (job) => {
    const text = job?.jobDescription || '';
    if (!text && !job?.jobDescriptionFileUrl) return '-';
    const snippet = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    return (
      <div className="max-w-xs">
        {snippet && (
          <div className="truncate" title={text}>
            {snippet}
          </div>
        )}
        {job?.jobDescriptionFileUrl && (
          <a
            href={job.jobDescriptionFileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline mt-0.5"
          >
            <span>View JD file</span>
          </a>
        )}
      </div>
    );
  };

  const StatusPill = ({ value }) => {
    const v = String(value || '').toLowerCase();
    const classes = v === 'active'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-gray-100 text-gray-700 border-gray-200';
    const label = value || 'Inactive';
    return <span className={`px-2 py-0.5 rounded text-xs border ${classes}`}>{label}</span>;
  };

  const handleToggleStatus = async (jobId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const previous = jobs;
    // Optimistic UI update
    setJobs(prev => prev.map(j => (j._id === jobId ? { ...j, status: newStatus } : j)));
    toast.loading('Updating status...');
    try {
      await axios.patch(
        `${BASE_URL}/api/admin/post-job/${jobId}/status`,
        { status: newStatus },
        {
          withCredentials: true,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      toast.success(`Status changed to ${newStatus}`);
    } catch (e) {
      // Revert on error
      setJobs(previous);
      const msg = e?.response?.data?.message || e?.message || 'Failed to update status';
      toast.error(msg);
    }
  };

  const rawRole = role || localStorage.getItem('role') || sessionStorage.getItem('role') || '';
  const roleNorm = rawRole.toLowerCase().replace(/[^a-z]/g, '');
  const isRecruitmentQC = roleNorm === 'recruitmentqcmanager';
  const Navbar = isRecruitmentQC ? RecruitmentQCNavbar : AdminNavbar;

  const ensureHRLists = async () => {
    if (hrRecruiters.length && hrOperations.length && recruitmentQCManagers.length) return;
    const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/hr-users`, {
      withCredentials: true,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const hrData = data?.data || {};
    setHrRecruiters(Array.isArray(hrData.hrRecruiters) ? hrData.hrRecruiters : []);
    setHrOperations(Array.isArray(hrData.hrOperations) ? hrData.hrOperations : []);
    setRecruitmentQCManagers(Array.isArray(hrData.recruitmentQCManagers) ? hrData.recruitmentQCManagers : []);
  };

  const openTeamModal = async (job) => {
    if (!authToken || !job?._id) return;
    setTeamModalOpen(true);
    setTeamError('');
    setTeamLoading(true);
    setTeamJob(job);
    try {
      await ensureHRLists();
      const draft = {
        hrRecruiters: Array.isArray(job.assignedHRRecruiters)
          ? job.assignedHRRecruiters.map((u) => String(u._id || u.id || u))
          : [],
        hrOperations: Array.isArray(job.assignedHROperations)
          ? job.assignedHROperations.map((u) => String(u._id || u.id || u))
          : [],
        recruitmentQCManager: job.assignedRecruitmentQCManager
          ? String(
              job.assignedRecruitmentQCManager?._id ||
                job.assignedRecruitmentQCManager?.id ||
                job.assignedRecruitmentQCManager
            )
          : '',
      };
      setTeamDraft(draft);
    } catch (e) {
      setTeamError(e?.response?.data?.message || e?.message || 'Failed to load team data');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleTeamChange = (field, values) => {
    setTeamDraft((prev) => ({
      hrRecruiters: prev.hrRecruiters || [],
      hrOperations: prev.hrOperations || [],
      recruitmentQCManager: prev.recruitmentQCManager || '',
      ...(field === 'hrRecruiters' ? { hrRecruiters: values } : {}),
      ...(field === 'hrOperations' ? { hrOperations: values } : {}),
      ...(field === 'recruitmentQCManager' ? { recruitmentQCManager: values } : {}),
    }));
  };

  const handleSaveTeam = async () => {
    if (!authToken || !teamJob?._id) return;
    try {
      setTeamSaving(true);
      setTeamError('');
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const payload = {
        hrRecruiters: teamDraft.hrRecruiters || [],
        hrOperations: teamDraft.hrOperations || [],
      };
      if (!isRecruitmentQC) {
        payload.recruitmentQCManager = teamDraft.recruitmentQCManager || null;
      }
      const { data } = await axios.patch(
        `${BASE_URL}/api/admin/post-job/${teamJob._id}/assign-team`,
        payload,
        { withCredentials: true, headers }
      );
      const updatedJob = data?.data || null;
      if (updatedJob && updatedJob._id) {
        setJobs((prev) =>
          prev.map((job) => (String(job._id) === String(updatedJob._id) ? updatedJob : job))
        );
        setTeamJob(updatedJob);
      }
      setTeamModalOpen(false);
    } catch (e) {
      setTeamError(e?.response?.data?.message || e?.message || 'Failed to update team assignment');
    } finally {
      setTeamSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <Navbar />
      <main className="w-full mx-auto px-2 sm:px-4 pt-20 pb-6">
        <header className="mb-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Position MIS</h1>
              <p className="text-sm text-gray-600">Listing of all posted jobs and quick insights</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <span className="px-2 py-1 text-[11px] rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Total: {stats.total}</span>
                <span className="px-2 py-1 text-[11px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active: {stats.active}</span>
                <span className="px-2 py-1 text-[11px] rounded-full bg-gray-100 text-gray-700 border border-gray-200">Inactive: {stats.inactive}</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search company, position, job location..."
                  className="text-xs pl-8 pr-3 py-2 border border-gray-300 rounded w-72 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <span className="absolute left-2 top-1.5 text-gray-400">🔎</span>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{error}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-visible">
            <table className="w-full table-auto text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Position ID</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Company</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Position</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Job Location</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Department</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Experience</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Openings</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">CTC Upper</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">JD</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Posted</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Total Data</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-gray-500">Loading…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-gray-500">No jobs found</td>
                  </tr>
                ) : (
                  filtered.map((j, idx) => {
                    const c = j?.createdBy || {};
                    const orgName = getOrganisationName(j);
                    const companyLabel = [
                      (c.companyName || c.CompanyName || 'Company'),
                      (c.hrName || c.name ? `— ${c.hrName || c.name}` : ''),
                      (c.email ? `· ${c.email}` : ''),
                      (c.mobile ? `· ${c.mobile}` : ''),
                    ].filter(Boolean).join(' ');
                    return (
                      <tr key={j?._id || idx} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50">
                        <td className="px-3 py-2 border-b align-top text-gray-700">{idx + 1}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800 font-mono text-xs">{j?.positionId || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-gray-900">{orgName || '-'}</span>
                            {companyLabel && (
                              <span className="text-[11px] text-gray-600">{companyLabel}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b align-top text-gray-800 whitespace-pre-wrap">{j?.position || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{getLocationLabel(j)}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{j?.department || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{[j?.expFrom, j?.expTo].filter(Boolean).join(' – ') || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{j?.positionRole || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{typeof j?.positionsCount === 'number' ? j.positionsCount : (j?.positionsCount ?? '-')}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{typeof j?.ctcUpper === 'number' ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(j.ctcUpper) : (j?.ctcUpper || '-')}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{renderJDPreview(j)}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800"><StatusPill value={j?.status} /></td>
                        <td className="px-3 py-2 border-b align-top text-gray-600">{j?.createdAt ? new Date(j.createdAt).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{typeof j?.totalProfiles === 'number' ? j.totalProfiles : (j?.totalProfiles || 0)}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">
                          <div className="flex flex-wrap items-center gap-2">
                            {!isRecruitmentQC && String(j?.status).toLowerCase() === 'active' && (
                              <button
                                type="button"
                                onClick={() => openTeamModal(j)}
                                className="px-2.5 py-1.5 text-xs rounded-md border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                              >
                                Create Team
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/recruitment/position/${j?._id}`, { state: { job: j } })}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(j._id, j.status)}
                              className={`px-2.5 py-1.5 text-xs rounded-md shadow-sm transition ${
                                j.status === 'Active'
                                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {j.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {teamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Create Team</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Assign QC Manager, Recruiters and Manager Operation for this position.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="mb-3 text-gray-700">
                <div className="font-semibold">{teamJob?.position || 'Position'}</div>
                <div className="text-[11px] text-gray-500">Position ID: {teamJob?.positionId || '-'}</div>
              </div>

              {teamError && (
                <div className="mb-3 text-[11px] text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
                  {teamError}
                </div>
              )}

              {teamLoading ? (
                <div className="text-[11px] text-gray-600">Loading team data…</div>
              ) : (
                <div className="space-y-4">
                  {!isRecruitmentQC && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[11px] font-semibold text-gray-900">QC Manager</h3>
                        <span className="text-[10px] text-gray-500">Optional</span>
                      </div>
                      <select
                        value={teamDraft.recruitmentQCManager || ''}
                        onChange={(e) => handleTeamChange('recruitmentQCManager', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-[11px] bg-white"
                      >
                        <option value="">Select QC Manager</option>
                        {recruitmentQCManagers.map((u) => (
                          <option key={u._id} value={String(u._id)}>
                            {u.name} {u.email ? `(${u.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-[11px] font-semibold text-gray-900 mb-1">Recruiters</h3>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md px-2 py-2">
                        {hrRecruiters.length === 0 ? (
                          <span className="text-[11px] text-gray-500">No Recruiters</span>
                        ) : (
                          hrRecruiters.map((u) => {
                            const uid = String(u._id);
                            const checked = (teamDraft.hrRecruiters || []).includes(uid);
                            return (
                              <label
                                key={uid}
                                className="flex items-center gap-2 text-[11px] text-gray-800"
                              >
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 rounded border-gray-300 text-indigo-600"
                                  checked={checked}
                                  onChange={() => {
                                    const current = teamDraft.hrRecruiters || [];
                                    const exists = current.includes(uid);
                                    const values = exists
                                      ? current.filter((x) => x !== uid)
                                      : [...current, uid];
                                    handleTeamChange('hrRecruiters', values);
                                  }}
                                />
                                <span
                                  className="truncate"
                                  title={`${u.name || ''} ${u.email || u.mobile || ''}`.trim()}
                                >
                                  {u.name}{' '}
                                  {u.email
                                    ? `(${u.email})`
                                    : u.mobile
                                    ? `(${u.mobile})`
                                    : ''}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[11px] font-semibold text-gray-900 mb-1">Manager Operation</h3>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md px-2 py-2">
                        {hrOperations.length === 0 ? (
                          <span className="text-[11px] text-gray-500">No Manager Operation users</span>
                        ) : (
                          hrOperations.map((u) => {
                            const uid = String(u._id);
                            const checked = (teamDraft.hrOperations || []).includes(uid);
                            return (
                              <label
                                key={uid}
                                className="flex items-center gap-2 text-[11px] text-gray-800"
                              >
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 rounded border-gray-300 text-indigo-600"
                                  checked={checked}
                                  onChange={() => {
                                    const current = teamDraft.hrOperations || [];
                                    const exists = current.includes(uid);
                                    const values = exists
                                      ? current.filter((x) => x !== uid)
                                      : [...current, uid];
                                    handleTeamChange('hrOperations', values);
                                  }}
                                />
                                <span
                                  className="truncate"
                                  title={`${u.name || ''} ${u.email || u.mobile || ''}`.trim()}
                                >
                                  {u.name}{' '}
                                  {u.email
                                    ? `(${u.email})`
                                    : u.mobile
                                    ? `(${u.mobile})`
                                    : ''}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTeam}
                disabled={teamSaving}
                className={`px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs ${
                  teamSaving ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {teamSaving ? 'Saving…' : 'Save Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionMIS;

