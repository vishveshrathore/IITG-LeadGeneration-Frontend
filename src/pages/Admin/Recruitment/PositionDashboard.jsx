import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from '../../../components/AdminNavbar';

const tabs = [
  { key: 'boolean', label: 'Boolean Data Sheet' },
  { key: 'fqc', label: 'FQC' },
  { key: 'office', label: 'Office Interview Sheet' },
  { key: 'final', label: 'Final Interview Sheet' },
  { key: 'status', label: 'Interview Status' },
  { key: 'joining', label: 'Joining Sheet' },
  { key: 'billing', label: 'Forward to Billing' },
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

  useEffect(() => {
    if (state?.job) return; // already have job via navigation state
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Fallback: fetch all jobs and locate by id
        const { data } = await axios.get('/api/admin/getallpostjobs', { withCredentials: true });
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
      <main className="px-4 pt-20 pb-8 max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Position Details</h1>
          <p className="text-sm text-gray-600">End-to-end tracking and actions for this position</p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
        )}

        {/* Summary Card */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-gradient-to-r from-indigo-50 via-white to-emerald-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">{companyLine}</div>
                <div className="mt-0.5 text-xl font-semibold text-gray-900">{job?.position || '—'}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Pill tone="indigo">{job?.department || 'Dept —'}</Pill>
                  <Pill tone="emerald">{job?.jobLocation || 'Location —'}</Pill>
                  <Pill tone="amber">{job?.positionRole || 'Role —'}</Pill>
                  <Pill tone="slate">{job?.status || 'Inactive'}</Pill>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[260px]">
                <HeaderStat title="Openings" value={(job?.positionsCount ?? '-')}/>
                <HeaderStat title="Experience" value={exp || '-'}/>
                <HeaderStat title="CTC Upper" value={ctcUpper}/>
                <HeaderStat title="Posted" value={job?.createdAt ? new Date(job.createdAt).toLocaleDateString() : '-'} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {tabs.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition ${activeTab===t.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Body */}
          <div className="p-4">
            {loading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : (
              <div className="bg-white rounded-xl border p-4 min-h-[40vh]">
                {activeTab === 'boolean' && (
                  <div className="text-sm text-gray-800">
                    <h3 className="font-semibold mb-2">Boolean Data Sheet</h3>
                    <p className="text-gray-600">Design inputs, parsing outputs and structured boolean data can be managed here.</p>
                  </div>
                )}
                {activeTab === 'fqc' && (
                  <div className="text-sm text-gray-800">
                    <h3 className="font-semibold mb-2">FQC</h3>
                    <p className="text-gray-600">First quality check workflows and validations.</p>
                  </div>
                )}
                {activeTab === 'office' && (
                  <div className="text-sm text-gray-800">
                    <h3 className="font-semibold mb-2">Office Interview Sheet</h3>
                    <p className="text-gray-600">Capture office interview details and outcomes.</p>
                  </div>
                )}
                {activeTab === 'final' && (
                  <div className="text-sm text-gray-800">
                    <h3 className="font-semibold mb-2">Final Interview Sheet</h3>
                    <p className="text-gray-600">Record final interview results and decisions.</p>
                  </div>
                )}
                {activeTab === 'status' && (
                  <div className="text-sm text-gray-800">
                    <h3 className="font-semibold mb-2">Interview Status</h3>
                    <p className="text-gray-600">Track candidates through the interview pipeline.</p>
                  </div>
                )}
                {activeTab === 'joining' && (
                  <div className="text-sm text-gray-800">
                    <h3 className="font-semibold mb-2">Joining Sheet</h3>
                    <p className="text-gray-600">Onboarding and joining documentation.</p>
                  </div>
                )}
                {activeTab === 'billing' && (
                  <div className="text-sm text-gray-800">
                    <h3 className="font-semibold mb-2">Forward to Billing</h3>
                    <p className="text-gray-600">Forward finalized placements for billing and MIS closure.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PositionDashboard;
