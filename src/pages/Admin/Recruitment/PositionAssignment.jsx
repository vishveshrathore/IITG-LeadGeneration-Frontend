import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../../config';
import AdminNavbar from '../../../components/AdminNavbar';
import RecruitmentQCNavbar from '../../../components/RecruitmentQCNavbar.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';

const PositionAssignment = () => {
  const { authToken, role, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hrRecruiters, setHrRecruiters] = useState([]);
  const [hrOperations, setHrOperations] = useState([]);
  const [recruitmentQCManagers, setRecruitmentQCManagers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [savingJobId, setSavingJobId] = useState('');

  useEffect(() => {
    if (!authToken) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
        const [jobsRes, hrRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/admin/getallpostjobs`, {
            withCredentials: true,
            headers,
          }),
          axios.get(`${BASE_URL}/api/admin/recruitment/hr-users`, {
            withCredentials: true,
            headers,
          }),
        ]);

        const list = Array.isArray(jobsRes?.data?.data)
          ? jobsRes.data.data
          : Array.isArray(jobsRes?.data)
          ? jobsRes.data
          : [];

        setJobs(list);

        const hrData = hrRes?.data?.data || {};
        setHrRecruiters(Array.isArray(hrData.hrRecruiters) ? hrData.hrRecruiters : []);
        setHrOperations(Array.isArray(hrData.hrOperations) ? hrData.hrOperations : []);
        setRecruitmentQCManagers(Array.isArray(hrData.recruitmentQCManagers) ? hrData.recruitmentQCManagers : []);

        const map = {};
        list.forEach((j) => {
          const id = String(j?._id || '');
          if (!id) return;
          map[id] = {
            hrRecruiters: Array.isArray(j.assignedHRRecruiters)
              ? j.assignedHRRecruiters.map((u) => String(u._id || u.id || u))
              : [],
            hrOperations: Array.isArray(j.assignedHROperations)
              ? j.assignedHROperations.map((u) => String(u._id || u.id || u))
              : [],
            recruitmentQCManager: j.assignedRecruitmentQCManager
              ? String(j.assignedRecruitmentQCManager?._id || j.assignedRecruitmentQCManager?.id || j.assignedRecruitmentQCManager)
              : '',
          };
        });
        setAssignments(map);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load positions or HR users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authToken]);

  const handleAssignmentChange = (jobId, field, values) => {
    setAssignments((prev) => ({
      ...prev,
      [jobId]: {
        hrRecruiters: prev[jobId]?.hrRecruiters || [],
        hrOperations: prev[jobId]?.hrOperations || [],
        recruitmentQCManager: prev[jobId]?.recruitmentQCManager || '',
        ...(field === 'hrRecruiters' ? { hrRecruiters: values } : {}),
        ...(field === 'hrOperations' ? { hrOperations: values } : {}),
      },
    }));
  };

  const handleRecruitmentQCManagerChange = (jobId, value) => {
    setAssignments((prev) => ({
      ...prev,
      [jobId]: {
        hrRecruiters: prev[jobId]?.hrRecruiters || [],
        hrOperations: prev[jobId]?.hrOperations || [],
        recruitmentQCManager: value,
      },
    }));
  };

  const handleSaveTeam = async (jobId) => {
    if (!authToken || !jobId) return;
    const draft = assignments[jobId] || { hrRecruiters: [], hrOperations: [], recruitmentQCManager: '' };
    try {
      setSavingJobId(jobId);
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const payload = {
        hrRecruiters: draft.hrRecruiters,
        hrOperations: draft.hrOperations,
      };
      if (showRecruitmentQCColumn) {
        payload.recruitmentQCManager = draft.recruitmentQCManager || null;
      }
      const { data } = await axios.patch(
        `${BASE_URL}/api/admin/post-job/${jobId}/assign-team`,
        payload,
        {
          withCredentials: true,
          headers,
        }
      );
      const updated = data?.data || null;
      if (updated && updated._id) {
        setJobs((prev) => prev.map((j) => (String(j._id) === String(updated._id) ? updated : j)));
        setAssignments((prev) => ({
          ...prev,
          [String(updated._id)]: {
            hrRecruiters: Array.isArray(updated.assignedHRRecruiters)
              ? updated.assignedHRRecruiters.map((u) => String(u._id || u.id || u))
              : [],
            hrOperations: Array.isArray(updated.assignedHROperations)
              ? updated.assignedHROperations.map((u) => String(u._id || u.id || u))
              : [],
            recruitmentQCManager: updated.assignedRecruitmentQCManager
              ? String(updated.assignedRecruitmentQCManager?._id || updated.assignedRecruitmentQCManager?.id || updated.assignedRecruitmentQCManager)
              : '',
          },
        }));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update team assignment');
    } finally {
      setSavingJobId('');
    }
  };

  const getOrganisationName = (job) => {
    if (!job) return '';
    const rawOrg = job.organisation;
    if (rawOrg && typeof rawOrg === 'object') {
      return rawOrg.CompanyName || rawOrg.companyName || rawOrg.name || '';
    }
    if (typeof rawOrg === 'string') {
      const trimmed = rawOrg.trim();
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

  const getExperienceLabel = (job) => {
    if (!job) return '-';
    const text = [job.expFrom, job.expTo].filter(Boolean).join(' – ');
    return text || '-';
  };

  const StatusPill = ({ value }) => {
    const v = String(value || '').toLowerCase();
    const classes = v === 'active'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-gray-100 text-gray-700 border-gray-200';
    const label = value || 'Inactive';
    return <span className={`px-2 py-0.5 rounded text-[11px] border ${classes}`}>{label}</span>;
  };

  const visibleJobs = useMemo(() => {
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

    return base;
  }, [jobs, role, user]);

  const sortedJobs = useMemo(() => {
    const list = [...visibleJobs];
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [visibleJobs]);

  const rawRole = role || localStorage.getItem('role') || sessionStorage.getItem('role') || '';
  const roleNorm = rawRole.toLowerCase().replace(/[^a-z]/g, '');
  const isRecruitmentQC = roleNorm === 'recruitmentqcmanager';
  const Navbar = isRecruitmentQC ? RecruitmentQCNavbar : AdminNavbar;
  const showRecruitmentQCColumn = !isRecruitmentQC;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <Navbar />
      <main className="w-full mx-auto px-2 sm:px-4 pt-20 pb-6">
        <header className="mb-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create Team</h1>
              <p className="text-sm text-gray-600">
                Assign Recruiters and Manager Operation team members to each position.
              </p>
            </div>
          </div>
        </header>

        {!isRecruitmentQC && (
          <section className="mb-4 bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-700">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">QC Managers</h2>
                <p className="text-[11px] text-gray-600">
                  Admin can select from the following QC Managers when coordinating assignments.
                </p>
              </div>
              <span className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                Total: {recruitmentQCManagers.length}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 min-h-[32px]">
              {recruitmentQCManagers.length === 0 ? (
                <span className="text-[11px] text-gray-500">No QC Managers found.</span>
              ) : (
                recruitmentQCManagers.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-[11px] text-indigo-800"
                    title={`${u.name || ''} ${u.email || u.mobile || ''}`.trim()}
                  >
                    <span className="font-semibold">{u.name || 'User'}</span>
                    {u.email && <span className="opacity-80">({u.email})</span>}
                  </span>
                ))
              )}
            </div>
          </section>
        )}

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
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Openings</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Status</th>
                  {showRecruitmentQCColumn && (
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">QC Manager</th>
                  )}
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Recruiters</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Manager Operation</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={showRecruitmentQCColumn ? 13 : 12} className="px-3 py-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : sortedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={showRecruitmentQCColumn ? 13 : 12} className="px-3 py-6 text-center text-gray-500">
                      No positions found
                    </td>
                  </tr>
                ) : (
                  sortedJobs.map((job, idx) => {
                    const id = String(job._id);
                    const assign = assignments[id] || { hrRecruiters: [], hrOperations: [] };
                    return (
                      <tr key={id} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50">
                        <td className="px-3 py-2 border-b align-top text-gray-700">{idx + 1}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800 font-mono text-xs">
                          {job.positionId || '-'}
                        </td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">
                          {getOrganisationName(job) || '-'}
                        </td>
                        <td className="px-3 py-2 border-b align-top text-gray-800 whitespace-pre-wrap">
                          {job.position || '-'}
                        </td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{getLocationLabel(job)}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{job.department || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{getExperienceLabel(job)}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{typeof job.positionsCount === 'number' ? job.positionsCount : (job.positionsCount ?? '-')}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800"><StatusPill value={job.status} /></td>
                        {showRecruitmentQCColumn && (
                          <td className="px-3 py-2 border-b align-top text-gray-800">
                            <select
                              value={assign.recruitmentQCManager || ''}
                              onChange={(e) => handleRecruitmentQCManagerChange(id, e.target.value)}
                              className="w-full border border-gray-300 rounded px-1 py-1 text-[11px] bg-white"
                            >
                              <option value="">Select QC Manager</option>
                              {recruitmentQCManagers.map((u) => (
                                <option key={u._id} value={String(u._id)}>
                                  {u.name} {u.email ? `(${u.email})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="px-3 py-2 border-b align-top text-gray-800">
                          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                            {hrRecruiters.length === 0 ? (
                              <span className="text-[11px] text-gray-500">No Recruiters</span>
                            ) : (
                              hrRecruiters.map((u) => {
                                const uid = String(u._id);
                                const checked = (assign.hrRecruiters || []).includes(uid);
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
                                        const current = assign.hrRecruiters || [];
                                        const exists = current.includes(uid);
                                        const values = exists
                                          ? current.filter((x) => x !== uid)
                                          : [...current, uid];
                                        handleAssignmentChange(id, 'hrRecruiters', values);
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
                        </td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">
                          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                            {hrOperations.length === 0 ? (
                              <span className="text-[11px] text-gray-500">No Manager Operation users</span>
                            ) : (
                              hrOperations.map((u) => {
                                const uid = String(u._id);
                                const checked = (assign.hrOperations || []).includes(uid);
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
                                        const current = assign.hrOperations || [];
                                        const exists = current.includes(uid);
                                        const values = exists
                                          ? current.filter((x) => x !== uid)
                                          : [...current, uid];
                                        handleAssignmentChange(id, 'hrOperations', values);
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
                        </td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">
                          <button
                            type="button"
                            onClick={() => handleSaveTeam(id)}
                            disabled={savingJobId === id}
                            className={`px-2.5 py-1.5 text-xs rounded-md text-white shadow-sm transition ${
                              savingJobId === id
                                ? 'bg-indigo-400 cursor-wait'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            {savingJobId === id ? 'Saving…' : 'Save Team'}
                          </button>
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
    </div>
  );
};

export default PositionAssignment;
