import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../../config';
import AdminNavbar from '../../../components/AdminNavbar';

const PositionMIS = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/getallpostjobs`, { withCredentials: true });
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setJobs(list);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load jobs';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return jobs;
    const needle = q.toLowerCase();
    return jobs.filter(j => {
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
    const total = jobs.length;
    const active = jobs.filter(j => String(j?.status).toLowerCase() === 'active').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [jobs]);

  const StatusPill = ({ value }) => {
    const v = String(value || '').toLowerCase();
    const classes = v === 'active'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-gray-100 text-gray-700 border-gray-200';
    const label = value || 'Inactive';
    return <span className={`px-2 py-0.5 rounded text-xs border ${classes}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <AdminNavbar />
      <main className="w-full mx-auto px-4 pt-20 pb-6 max-w-7xl">
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
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Company</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Position</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Job Location</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Department</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Experience</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Openings</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">CTC Upper</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Posted</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-gray-500">Loading…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-gray-500">No jobs found</td>
                  </tr>
                ) : (
                  filtered.map((j, idx) => {
                    const c = j?.createdBy || {};
                    const companyLabel = [
                      (c.companyName || c.CompanyName || 'Company'),
                      (c.hrName || c.name ? `— ${c.hrName || c.name}` : ''),
                      (c.email ? `· ${c.email}` : ''),
                      (c.mobile ? `· ${c.mobile}` : ''),
                    ].filter(Boolean).join(' ');
                    return (
                      <tr key={j?._id || idx} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50">
                        <td className="px-3 py-2 border-b align-top text-gray-700">{idx + 1}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{companyLabel}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800 whitespace-pre-wrap">{j?.position || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{j?.jobLocation || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{j?.department || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{[j?.expFrom, j?.expTo].filter(Boolean).join(' – ') || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{j?.positionRole || '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{typeof j?.positionsCount === 'number' ? j.positionsCount : (j?.positionsCount ?? '-')}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">{typeof j?.ctcUpper === 'number' ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(j.ctcUpper) : (j?.ctcUpper || '-')}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800"><StatusPill value={j?.status} /></td>
                        <td className="px-3 py-2 border-b align-top text-gray-600">{j?.createdAt ? new Date(j.createdAt).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2 border-b align-top text-gray-800">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/recruitment/position/${j?._id}`, { state: { job: j } })}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                          >
                            View
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

export default PositionMIS;

