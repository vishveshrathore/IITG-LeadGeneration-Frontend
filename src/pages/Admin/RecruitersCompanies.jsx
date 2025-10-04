import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import AdminNavbar from '../../components/AdminNavbar';
import { BASE_URL } from '../../config';

export default function RecruitersCompanies() {
  const [companyName, setCompanyName] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [companies, setCompanies] = useState([]);

  const industryMap = useMemo(() => {
    const m = new Map();
    industries.forEach((i) => m.set(String(i._id), i.name));
    return m;
  }, [industries]);

  const fetchIndustries = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/recruitment/recruiters/industries`);
      const items = Array.isArray(data) ? data : (Array.isArray(data?.industries) ? data.industries : []);
      setIndustries(items);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load industries');
    }
  };

  const fetchCompanies = async () => {
    setListLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/recruitment/recruiters/companies`);
      const items = Array.isArray(data) ? data : (Array.isArray(data?.companies) ? data.companies : []);
      setCompanies(items);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load companies');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustries();
    fetchCompanies();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return toast.error('Enter company name');
    if (!industryId) return toast.error('Select an industry');
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/recruitment/recruiters/companies`, {
        companyName: companyName.trim(),
        industryId,
      });
      toast.success('Company created');
      setCompanyName('');
      setIndustryId('');
      fetchCompanies();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create company';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <Toaster position="top-right" />
      <div className="p-6 max-w-5xl mx-auto mt-16">
        <h1 className="text-2xl font-bold mb-4">Manage Companies for BDE & Recruitment</h1>

        <form onSubmit={onSubmit} className="bg-white shadow rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-sm text-gray-600 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Acme Corp"
            />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-sm text-gray-600 mb-1">Industry</label>
            <select
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select industry...</option>
              {industries.map((ind) => (
                <option key={ind._id} value={ind._id}>{ind.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {loading ? 'Adding...' : 'Add Company'}
          </button>
        </form>

        <div className="bg-white shadow rounded-xl p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All Companies</h2>
            <button
              onClick={fetchCompanies}
              disabled={listLoading}
              className="border px-3 py-1 rounded-lg"
            >
              {listLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {companies.length === 0 ? (
            <p className="text-gray-500">No companies found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-left">Industry</th>
                    <th className="px-3 py-2 text-left">Industry ID</th>
                    <th className="px-3 py-2 text-left">Company ID</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c, idx) => (
                    <tr key={c._id || idx} className="border-b">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{c.CompanyName || c.companyName}</td>
                      <td className="px-3 py-2">{industryMap.get(String(c.industry)) || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{String(c.industry)}</td>
                      <td className="px-3 py-2 text-gray-500">{c._id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
