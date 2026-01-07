import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from '../../../components/AdminNavbar';
import { BASE_URL } from '../../../config';
import StageSheet from './StageSheet.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';

const tabs = [
  { key: 'boolean', label: '1) Boolean Data Sheet' },
  { key: 'booleanC', label: '2) Boolean Data Sheet (C)' },
  { key: 'fqc', label: '3) First QC Sheet' },
  { key: 'firstLineup', label: '4) Final QC' },
  { key: 'office', label: '5) First Lineup Sheet For Client ShortListing' },
  { key: 'finalLineup', label: '6) Final Lineup Sheet' },
  { key: 'status', label: '7) Interview Status' },
  { key: 'selection', label: '8) Selection Sheet' },
  { key: 'joining', label: '9) Joining Sheet' },
  { key: 'joiningStatus', label: '10) Joining Status' },
  { key: 'billing', label: '11) Forward to Billing' },
];

const roleTabVisibility = {
  recruitmentqcmanager: [
    'firstLineup',
    'office',
    'finalLineup',
    'status',
    'selection',
    'joining',
    'joiningStatus',
  ],
  hrrecruiter: [
    'fqc',
    'finalLineup',
    'status',
    'selection',
    'joining',
  ],
};

const tabGroups = [
  {
    id: 'client',
    label: 'Client',
    items: ['booleanC', 'firstLineup', 'finalLineup', 'selection', 'joiningStatus'],
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    items: ['fqc', 'firstLineup', 'finalLineup', 'selection'],
  },
  {
    id: 'operations',
    label: 'HR Operations',
    items: ['boolean', 'booleanC', 'fqc', 'firstLineup', 'office', 'finalLineup', 'status', 'interviewStatus', 'selection', 'joining', 'joiningStatus', 'billing'],
  },
];

const Pill = ({ children, tone = 'slate' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-${tone}-50 text-${tone}-700 border-${tone}-200`}>{children}</span>
);

const HeaderStat = ({ title, value }) => (
  <div className="p-3 rounded-xl border bg-white">
    <div className="text-[11px] text-gray-500">{title}</div>
    <div className="text-base font-semibold text-gray-900">{value || '-'}</div>
  </div>
);

const PositionDashboard = () => {
  const { state } = useLocation();
  const { id } = useParams();
  const { authToken, role } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(state?.job || null);
  const [loading, setLoading] = useState(!state?.job);
  const [activeTab, setActiveTab] = useState('boolean');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  // Create Team modal state
  const [teamModalOpen, setTeamModalOpen] = useState(false);
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
  const [resetting, setResetting] = useState(false);

  const rawRole = role || localStorage.getItem('role') || sessionStorage.getItem('role') || '';
  const roleNorm = rawRole.toLowerCase().replace(/[^a-z]/g, '');
  const isRecruitmentQC = roleNorm === 'recruitmentqcmanager';
  const allowedTabs = roleTabVisibility[roleNorm] || null;

  useEffect(() => {
    if (!allowedTabs || allowedTabs.length === 0) return;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  useEffect(() => {
    if (state?.job) return; // already have job via navigation state
    if (!authToken) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Fallback: fetch all jobs and locate by id
        const { data } = await axios.get(`${BASE_URL}/api/admin/getallpostjobs`, {
          withCredentials: true,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        const found = list.find(j => String(j?._id) === String(id));
        setJob(found || null);
        if (!found) setError('Position not found');
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load position');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [state?.job, id, authToken]);

  // Map activeTab to stageKey and title
  const activeStage = useMemo(() => {
    switch (activeTab) {
      case 'boolean': return { stageKey: 'BooleanDataSheet', title: '1) Boolean Data Sheet' };
      case 'booleanC': return { stageKey: 'BooleanDataSheet(C)', title: '2) Boolean Data Sheet (C)' };
      case 'fqc': return { stageKey: 'FQC', title: '3) First QC Sheet' };
      case 'firstLineup': return { stageKey: 'FirstLineup', title: '4) Final QC' };
      case 'office': return { stageKey: 'OfficeInterview', title: '5) First Lineup Sheet For Client ShortListing' };
      case 'finalLineup': return { stageKey: 'FinalLineup', title: '6) Final Lineup Sheet' };
      case 'status': return { stageKey: 'InterviewStatus', title: '7) Interview Status' };
      case 'selection': return { stageKey: 'Selection', title: '8) Selection Sheet' };
      case 'joining': return { stageKey: 'Joining', title: '9) Joining Sheet' };
      case 'joiningStatus': return { stageKey: 'JoiningStatus', title: '10) Joining Status' };
      case 'billing': return { stageKey: 'Billing', title: '11) Forward to Billing' };
      default: return { stageKey: 'BooleanDataSheet', title: '1) Boolean Data Sheet' };
    }
  }, [activeTab]);

  const pipeline = [
    'BooleanDataSheet',
    'BooleanDataSheet(C)',
    'FQC',
    'FirstLineup',
    'OfficeInterview',
    'FinalLineup',
    'InterviewStatus',
    'Selection',
    'Joining',
    'JoiningStatus',
    'Billing',
  ];
  const normalizeStage = (s) => {
    const v = String(s || '').trim();
    if (v === 'Boolean') return 'BooleanDataSheet';
    if (v === 'Boolean (C)') return 'BooleanDataSheet(C)';
    if (v === '') return 'BooleanDataSheet';
    return pipeline.includes(v) ? v : v;
  };

  // Compute counts per stage for tab chips (per position, by jobId only)
  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (!job?._id || !authToken) return;
        const { data } = await axios.get(
          `${BASE_URL}/api/admin/recruitment/parsed-profiles`,
          {
            params: { jobId: job._id },
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );
        const list = Array.isArray(data?.data) ? data.data : [];
        const map = {};
        for (const p of list) {
          const ns = normalizeStage(p?.currentStage);
          map[ns] = (map[ns] || 0) + 1;
        }
        setCounts(map);
      } catch (_) {
        // ignore counts errors
      }
    };
    loadCounts();
  }, [job, authToken]);

  // Open Create Team modal and load HR users + current assignments for this job
  const openTeamModal = async () => {
    if (!job?._id || !authToken) return;
    setTeamModalOpen(true);
    setTeamError('');
    setTeamLoading(true);
    try {
      if (!hrRecruiters.length && !hrOperations.length && !recruitmentQCManagers.length) {
        const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/hr-users`, {
          withCredentials: true,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const hrData = data?.data || {};
        setHrRecruiters(Array.isArray(hrData.hrRecruiters) ? hrData.hrRecruiters : []);
        setHrOperations(Array.isArray(hrData.hrOperations) ? hrData.hrOperations : []);
        setRecruitmentQCManagers(Array.isArray(hrData.recruitmentQCManagers) ? hrData.recruitmentQCManagers : []);
      }

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
    if (!authToken || !job?._id) return;
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
        `${BASE_URL}/api/admin/post-job/${job._id}/assign-team`,
        payload,
        {
          withCredentials: true,
          headers,
        }
      );
      const updated = data?.data || null;
      if (updated && updated._id) {
        setJob((prev) => {
          if (!prev) return updated;
          return String(prev._id) === String(updated._id) ? updated : prev;
        });
      }
      setTeamModalOpen(false);
    } catch (e) {
      setTeamError(e?.response?.data?.message || e?.message || 'Failed to update team assignment');
    } finally {
      setTeamSaving(false);
    }
  };

  const handleResetToBoolean = async () => {
    if (!authToken || !job?._id) return;
    const ok = window.confirm('Reset all candidates for this position back to Boolean Data Sheet?');
    if (!ok) return;
    try {
      setResetting(true);
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/recruitment/job/${job._id}/reset-to-boolean`,
        {},
        {
          withCredentials: true,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      const deltas = data?.data?.deltas || {};
      if (deltas && typeof deltas === 'object' && Object.keys(deltas).length) {
        window.dispatchEvent(new CustomEvent('recruitment:countsDelta', { detail: { deltas } }));
      }
      setActiveTab('boolean');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to reset profiles');
    } finally {
      setResetting(false);
    }
  };

  const getCountForTab = (key) => {
    switch (key) {
      case 'boolean':
        return counts['BooleanDataSheet'] || 0;
      case 'booleanC':
        return counts['BooleanDataSheet(C)'] || 0;
      case 'fqc':
        return counts['FQC'] || 0;
      case 'firstLineup':
        return counts['FirstLineup'] || 0;
      case 'office':
        return counts['OfficeInterview'] || 0;
      case 'finalLineup':
        return counts['FinalLineup'] || 0;
      case 'status':
        return counts['InterviewStatus'] || 0;
      case 'selection':
        return counts['Selection'] || 0;
      case 'joining':
        return counts['Joining'] || 0;
      case 'joiningStatus':
        return counts['JoiningStatus'] || 0;
      case 'billing':
        return counts['Billing'] || 0;
      default:
        return 0;
    }
  };

  // Live updates: listen to StageSheet events and adjust counts in-place
  useEffect(() => {
    const onDelta = (e) => {
      const detail = e?.detail || {};
      const deltas = detail.deltas || {};
      if (!deltas || typeof deltas !== 'object') return;
      setCounts(prev => {
        const next = { ...prev };
        Object.entries(deltas).forEach(([stage, d]) => {
          next[stage] = Math.max(0, (next[stage] || 0) + Number(d || 0));
        });
        return next;
      });
    };
    window.addEventListener('recruitment:countsDelta', onDelta);
    return () => window.removeEventListener('recruitment:countsDelta', onDelta);
  }, []);

  const company = job?.createdBy || {};
  const companyLine = useMemo(() => {
    const name = company.companyName || company.CompanyName || 'Company';
    const extras = [company.hrName || company.name, company.email, company.mobile].filter(Boolean);
    return [name, ...extras].join(' • ');
  }, [company]);

  const orgName = useMemo(() => {
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
  }, [job]);

  const jobLocationLabel = useMemo(() => {
    if (!job) return 'Location —';
    if (job.jobLocation && String(job.jobLocation).trim()) {
      return String(job.jobLocation).trim();
    }
    const parts = [];
    if (job.jobCity && String(job.jobCity).trim()) parts.push(String(job.jobCity).trim());
    if (job.jobCityOther && String(job.jobCityOther).trim()) parts.push(String(job.jobCityOther).trim());
    if (job.jobState && String(job.jobState).trim()) parts.push(String(job.jobState).trim());
    return parts.length ? parts.join(', ') : 'Location —';
  }, [job]);

  const clientName = orgName || company.companyName || company.CompanyName || company.name || company.hrName || '';
  const clientMobile = company.mobile || '';
  const clientEmail = company.email || '';

  const exp = [job?.expFrom, job?.expTo].filter(Boolean).join(' – ');
  const ctcUpper = typeof job?.ctcUpper === 'number'
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(job.ctcUpper)
    : (job?.ctcUpper || '-');

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <AdminNavbar />
      <main className="pt-20 pb-6 w-full">
        <div className="px-4 md:px-6">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Position Details</h1>
            <p className="text-sm text-gray-600">End-to-end tracking and actions for this position</p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
          )}

          {!error && job?._id && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(`/naukri-parser?jobId=${job._id}`)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 transition"
              >
                Open Table 14 (Naukri)
              </button>
              <button
                type="button"
                onClick={() => navigate(`/linkedin-parser?jobId=${job._id}`)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-sky-600 bg-sky-600 text-white hover:bg-sky-700 hover:border-sky-700 transition"
              >
                Open Table 12 (LinkedIn)
              </button>
              <button
                type="button"
                onClick={openTeamModal}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition"
              >
                Create Team
              </button>
              <button
                type="button"
                onClick={handleResetToBoolean}
                disabled={resetting}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700 disabled:opacity-60 transition"
              >
                {resetting ? 'Resetting…' : 'Reset Data'}
              </button>
            </div>
          )}
        </div>

        {/* Summary: Full-width grid */}
        <section className="w-full">
          <div className="bg-white border-y md:border rounded-none md:rounded-2xl md:mx-4 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 border-b">
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-12 lg:col-span-7 xl:col-span-8">
                  <div className="text-sm text-gray-500">{companyLine}</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900 leading-tight">{job?.position || '—'}</div>
                  <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-3">
                    {orgName && (
                      <span>Organisation: <span className="font-medium text-gray-800">{orgName}</span></span>
                    )}
                    {jobLocationLabel && (
                      <span>Job Location: <span className="font-medium text-gray-800">{jobLocationLabel}</span></span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill tone="indigo">{job?.department || 'Dept —'}</Pill>
                    <Pill tone="emerald">{jobLocationLabel}</Pill>
                    <Pill tone="amber">{job?.positionRole || 'Role —'}</Pill>
                    <Pill tone="slate">{job?.status || 'Inactive'}</Pill>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-5 xl:col-span-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-3">
                    <HeaderStat title="Openings" value={(job?.positionsCount ?? '-')}/>
                    <HeaderStat title="Experience" value={exp || '-'}/>
                    <HeaderStat title="CTC Upper" value={ctcUpper}/>
                    <HeaderStat title="Posted" value={job?.createdAt ? new Date(job.createdAt).toLocaleDateString() : '-'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Tabs */}
            <div className="sticky top-16 z-30 bg-white/90 backdrop-blur border-b">
              <div className="px-4 md:px-6 py-3">
                <div className="flex flex-wrap gap-x-2 gap-y-2">
                  {(allowedTabs && allowedTabs.length ? allowedTabs : tabs.map(t => t.key)).map((key) => {
                    const t = tabs.find(tab => tab.key === key);
                    if (!t) return null;
                    const isActive = activeTab === key;
                    const count = getCountForTab(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          isActive
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t.label}
                        <span
                          className={`ml-2 inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded-full text-[10px] border ${
                            isActive
                              ? 'bg-white/15 border-white/20 text-white'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-0">
              <div className="px-4 md:px-6 py-4">
                {loading ? (
                  <div className="text-sm text-gray-600">Loading…</div>
                ) : (
                  <div className="bg-white border rounded-xl p-3 md:p-4 min-h-[60vh]">
                    <StageSheet job={job} stageKey={activeStage.stageKey} title={activeStage.title} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {teamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4">
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
                <div className="font-semibold">{job?.position || 'Position'}</div>
                <div className="text-[11px] text-gray-500">Position ID: {job?.positionId || '-'}</div>
              </div>

              <div className="mb-3 text-gray-700">
                <div className="text-[11px] font-semibold text-gray-900">Client</div>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] text-gray-500 mr-1">Name:</span>
                    <span className="text-[11px] font-medium text-gray-900">{clientName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 mr-1">Mobile:</span>
                    <span className="text-[11px] font-medium text-gray-900">{clientMobile || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 mr-1">Email:</span>
                    <span className="text-[11px] font-medium text-gray-900">{clientEmail || '-'}</span>
                  </div>
                </div>
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
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-900 mb-1">Manager Operations</h3>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md px-2 py-2">
                      {hrOperations.length === 0 ? (
                        <span className="text-[11px] text-gray-500">No Manager Operations users</span>
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
                                title={`${u.name || ''} ${u.mobile || ''} ${u.email || ''}`.trim()}
                              >
                                <span className="font-medium">{u.name}</span>
                                {(u.mobile || u.email) && (
                                  <span className="ml-1 text-[10px] text-gray-500">
                                    {u.mobile || '-'}
                                    {u.mobile && u.email ? ' / ' : ' '}
                                    {u.email || '-'}
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

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
                            {u.name}
                            {(u.mobile || u.email) && ` - ${u.mobile || '-'} / ${u.email || '-'}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                                title={`${u.name || ''} ${u.mobile || ''} ${u.email || ''}`.trim()}
                              >
                                <span className="font-medium">{u.name}</span>
                                {(u.mobile || u.email) && (
                                  <span className="ml-1 text-[10px] text-gray-500">
                                    {u.mobile || '-'}
                                    {u.mobile && u.email ? '  ' : ' '}
                                    {u.email || '-'}
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })
                      )}
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

export default PositionDashboard;
