import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../config';
import StageSheet from '../Admin/Recruitment/StageSheet.jsx';
import AnimatedHRNavbar from '../../components/HRNavbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const tabs = [
  { key: 'fqc', label: '3) First QC Sheet' },
  { key: 'finalLineup', label: '6) Final Lineup Sheet' },
  { key: 'status', label: '7) Interview Status' },
  { key: 'selection', label: '8) Selection Sheet' },
  { key: 'joining', label: '9) Joining Sheet' },
];

const tabGroups = [
  {
    id: 'recruiter',
    label: 'Recruiter',
    items: ['fqc', 'finalLineup', 'status', 'selection', 'joining'],
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

const HRRecruiterStageSheet = () => {
  const { state } = useLocation();
  const { id } = useParams();
  const { authToken, user } = useAuth();
  const [job, setJob] = useState(state?.job || null);
  const [loading, setLoading] = useState(!state?.job);
  const [activeTab, setActiveTab] = useState('fqc');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (state?.job) return;
    if (!authToken) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
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

  const activeStage = useMemo(() => {
    switch (activeTab) {
      case 'fqc':
        return { stageKey: 'FQC', title: '3) First QC Sheet' };
      case 'finalLineup':
        return { stageKey: 'FinalLineup', title: '6) Final Lineup Sheet' };
      case 'status':
        return { stageKey: 'InterviewStatus', title: '7) Interview Status' };
      case 'selection':
        return { stageKey: 'Selection', title: '8) Selection Sheet' };
      case 'joining':
        return { stageKey: 'Joining', title: '9) Joining Sheet' };
      default:
        return { stageKey: 'FQC', title: '3) First QC Sheet' };
    }
  }, [activeTab]);

  const pipeline = [
    'BooleanDataSheet',
    'BooleanDataSheet(C)',
    'FQC',
    'FirstLineup',
    'OfficeInterview',
    'FinalLineup',
    'FinalInterview',
    'InterviewSheet',
    'InterviewStatus',
    'Selection',
    'Joining',
    'JoiningStatus',
    'Billing'
  ];

  const normalizeStage = (s) => {
    const v = String(s || '').trim();
    if (v === 'Boolean') return 'BooleanDataSheet';
    if (v === 'Boolean (C)') return 'BooleanDataSheet(C)';
    if (v === '') return 'BooleanDataSheet';
    return pipeline.includes(v) ? v : v;
  };

  useEffect(() => {
    if (!authToken) return;
    const loadCounts = async () => {
      try {
        if (!job?._id) return;
        const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/parsed-profiles`, {
          params: { jobId: job._id },
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const list = Array.isArray(data?.data) ? data.data : [];
        const recruiterId = user?.id || user?._id;
        const source = recruiterId
          ? list.filter(p => String(p?.assignedtoRecruiters) === String(recruiterId))
          : list;
        const map = {};
        for (const p of source) {
          const ns = normalizeStage(p?.currentStage);
          map[ns] = (map[ns] || 0) + 1;
        }
        setCounts(map);
      } catch (_) {
        // ignore counts errors
      }
    };
    loadCounts();
  }, [job, authToken, user]);

  const getCountForTab = (key) => {
    switch (key) {
      case 'fqc':
        return counts['FQC'] || 0;
      case 'finalLineup':
        return counts['FinalLineup'] || 0;
      case 'status':
        return counts['InterviewStatus'] || 0;
      case 'selection':
        return counts['Selection'] || 0;
      case 'joining':
        return counts['Joining'] || 0;
      default:
        return 0;
    }
  };

  useEffect(() => {
    const onDelta = (e) => {
      const detail = e?.detail || {};
      const deltas = detail.deltas || {};
      if (!deltas || typeof deltas !== 'object') return;

      const markerId = detail.markerId;
      const recruiterId = user?.id || user?._id;
      if (markerId && recruiterId && String(markerId) !== String(recruiterId)) {
        return;
      }

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
  }, [user]);

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

  const exp = [job?.expFrom, job?.expTo].filter(Boolean).join(' – ');
  const ctcUpper = typeof job?.ctcUpper === 'number'
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(job.ctcUpper)
    : (job?.ctcUpper || '-');

  const recruiterNavItems = [
    { name: 'Dashboard', path: '/hr-recruiter/dashboard' },
    { name: 'Position MIS', path: '/hr-recruiter/positions' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <AnimatedHRNavbar title="Recruiter" navItems={recruiterNavItems} />
      <main className="pt-20 pb-6 w-full">
        <div className="px-4 md:px-6">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Position Details (Recruiter)</h1>
            <p className="text-sm text-gray-600">Work on your stages for this position</p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
          )}
        </div>

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

            <div className="sticky top-16 z-30 bg-white/90 backdrop-blur border-b">
              <div className="px-4 md:px-6 py-3 space-y-3">
                {tabGroups.map(group => (
                  <div key={group.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        {group.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-2">
                      {group.items.map((key) => {
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
                ))}
              </div>
            </div>

            <div className="p-0">
              <div className="px-4 md:px-6 py-4">
                {loading ? (
                  <div className="text-sm text-gray-600">Loading…</div>
                ) : (
                  <div className="bg-white border rounded-xl p-3 md:p-4 min-h-[60vh]">
                    <StageSheet
                      job={job}
                      stageKey={activeStage.stageKey}
                      title={activeStage.title}
                      recruiterFQC={activeStage.stageKey === 'FQC'}
                      recruiterView={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HRRecruiterStageSheet;

