import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from '../../../components/AdminNavbar';
import { BASE_URL } from '../../../config';
import StageSheet from './StageSheet.jsx';

const tabs = [
  { key: 'boolean', label: '1) Boolean Data Sheet' },
  { key: 'booleanC', label: '2) Boolean Data Sheet (C)' },
  { key: 'fqc', label: '3) FQC Sheet' },
  { key: 'firstLineup', label: '4) First Lineup' },
  { key: 'office', label: '5) Office Interview Sheet' },
  { key: 'finalLineup', label: '6) Final Lineup' },
  { key: 'final', label: '7) Final Interview' },
  { key: 'interviewSheet', label: '8) Interview Sheet' },
  { key: 'status', label: '9) Interview Status' },
  { key: 'selection', label: '10) Selection Sheet' },
  { key: 'joining', label: '11) Joining Sheet' },
  { key: 'joiningStatus', label: '12) Joining Status' },
  { key: 'billing', label: '13) Forward to Billing' },
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
  const [job, setJob] = useState(state?.job || null);
  const [loading, setLoading] = useState(!state?.job);
  const [activeTab, setActiveTab] = useState('boolean');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (state?.job) return; // already have job via navigation state
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Fallback: fetch all jobs and locate by id
        const { data } = await axios.get(`${BASE_URL}/api/admin/getallpostjobs`, { withCredentials: true });
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
  }, [state?.job, id]);

  // Map activeTab to stageKey and title
  const activeStage = useMemo(() => {
    switch (activeTab) {
      case 'boolean': return { stageKey: 'BooleanDataSheet', title: '1) Boolean Data Sheet' };
      case 'booleanC': return { stageKey: 'BooleanDataSheet(C)', title: '2) Boolean Data Sheet (C)' };
      case 'fqc': return { stageKey: 'FQC', title: '3) FQC Sheet' };
      case 'firstLineup': return { stageKey: 'FirstLineup', title: '4) First Lineup' };
      case 'office': return { stageKey: 'OfficeInterview', title: '5) Office Interview Sheet' };
      case 'finalLineup': return { stageKey: 'FinalLineup', title: '6) Final Lineup' };
      case 'final': return { stageKey: 'FinalInterview', title: '7) Final Interview' };
      case 'interviewSheet': return { stageKey: 'InterviewStatus', title: '8) Interview Sheet' };
      case 'status': return { stageKey: 'InterviewStatus', title: '9) Interview Status' };
      case 'selection': return { stageKey: 'Selection', title: '10) Selection Sheet' };
      case 'joining': return { stageKey: 'Joining', title: '11) Joining Sheet' };
      case 'joiningStatus': return { stageKey: 'JoiningStatus', title: '12) Joining Status' };
      case 'billing': return { stageKey: 'Billing', title: '13) Forward to Billing' };
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
    'FinalInterview',
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

  // Compute counts per stage for tab chips
  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (!job) return;
        const company = job?.createdBy || {};
        const name = company.companyName || company.CompanyName || '';
        if (!name) return;
        const compRes = await axios.get(`${BASE_URL}/api/recruitment/getCompanies/all`);
        const companies = Array.isArray(compRes?.data?.data) ? compRes.data.data : [];
        const match = companies.find((c) => String(c.CompanyName || c.companyName || c.name || '').toLowerCase() === String(name).toLowerCase());
        if (!match?._id) return;
        const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/parsed-profiles`, { params: { companyId: match._id } });
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
  }, [job]);

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
        </div>

        {/* Summary: Full-width grid */}
        <section className="w-full">
          <div className="bg-white border-y md:border rounded-none md:rounded-2xl md:mx-4 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 border-b">
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-12 lg:col-span-7 xl:col-span-8">
                  <div className="text-sm text-gray-500">{companyLine}</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900 leading-tight">{job?.position || '—'}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill tone="indigo">{job?.department || 'Dept —'}</Pill>
                    <Pill tone="emerald">{job?.jobLocation || 'Location —'}</Pill>
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
              <div className="px-4 md:px-6">
                <div className="flex flex-wrap gap-x-2 gap-y-2 py-2">
                  {tabs.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition ${activeTab===t.key ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {t.label}
                      <span className={`ml-2 inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded-full text-[10px] border ${activeTab===t.key ? 'bg-white/15 border-white/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        {(
                          t.key === 'boolean' ? (counts['BooleanDataSheet'] || 0) :
                          t.key === 'booleanC' ? (counts['BooleanDataSheet(C)'] || 0) :
                          t.key === 'fqc' ? (counts['FQC'] || 0) :
                          t.key === 'firstLineup' ? (counts['FirstLineup'] || 0) :
                          t.key === 'office' ? (counts['OfficeInterview'] || 0) :
                          t.key === 'finalLineup' ? (counts['FinalLineup'] || 0) :
                          t.key === 'final' ? (counts['FinalInterview'] || 0) :
                          t.key === 'interviewSheet' ? (counts['InterviewStatus'] || 0) :
                          t.key === 'status' ? (counts['InterviewStatus'] || 0) :
                          t.key === 'selection' ? (counts['Selection'] || 0) :
                          t.key === 'joining' ? (counts['Joining'] || 0) :
                          t.key === 'joiningStatus' ? (counts['JoiningStatus'] || 0) :
                          t.key === 'billing' ? (counts['Billing'] || 0) : 0
                        )}
                      </span>
                    </button>
                  ))}
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
    </div>
  );
};

export default PositionDashboard;
