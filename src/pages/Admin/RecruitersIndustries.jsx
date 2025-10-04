import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import AdminNavbar from '../../components/AdminNavbar';
import { BASE_URL } from '../../config';

export default function RecruitersIndustries() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [industries, setIndustries] = useState([]);

  const fetchIndustries = async () => {
    setListLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/recruitment/recruiters/industries`);
      // normalize: can be { industries: [...] } or array
      const items = Array.isArray(data) ? data : (Array.isArray(data?.industries) ? data.industries : []);
      setIndustries(items);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load industries');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustries();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Enter industry name');
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/recruitment/recruiters/industries`, { name: name.trim() });
      toast.success('Industry created');
      setName('');
      fetchIndustries();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create industry';
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
        <h1 className="text-2xl font-bold mb-4">Manage Industries for BDE & Recruitment</h1>

        <form onSubmit={onSubmit} className="bg-white shadow rounded-xl p-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Industry Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., IT, Manufacturing"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {loading ? 'Adding...' : 'Add Industry'}
          </button>
        </form>

        <div className="bg-white shadow rounded-xl p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All Industries</h2>
            <button
              onClick={fetchIndustries}
              disabled={listLoading}
              className="border px-3 py-1 rounded-lg"
            >
              {listLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {industries.length === 0 ? (
            <p className="text-gray-500">No industries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {industries.map((ind, idx) => (
                    <tr key={ind._id || idx} className="border-b">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{ind.name}</td>
                      <td className="px-3 py-2 text-gray-500">{ind._id}</td>
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
