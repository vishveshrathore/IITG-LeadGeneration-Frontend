import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CRENavbar from '../../components/CreNavbar';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';

const ClosureTillDate = () => {
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${BASE_URL}/api/cre/myleads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const closed = rows.filter((r) => (r?.closureStatus === 'Closed'));
      setItems(closed);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  return (
    <div className="min-h-screen bg-gray-100">
      <CRENavbar />
      <div className="p-4 my-14 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Closures Till Date
            <span className="ml-2 text-sm font-medium text-gray-500">({items.length})</span>
          </h1>
          <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✅ Closed</div>
        </div>

        {loading ? (
          <div className="bg-white rounded shadow-md p-6 text-gray-600">Loading...</div>
        ) : error ? (
          <div className="bg-white rounded shadow-md p-6 text-rose-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center p-10 text-center border border-dashed border-gray-300">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-lg font-semibold">No closures yet</div>
            <div className="text-gray-500">Closed leads will appear here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-sm">Lead Name</th>
                  <th className="px-3 py-2 text-left text-sm">Designation</th>
                  <th className="px-3 py-2 text-left text-sm">Company</th>
                  <th className="px-3 py-2 text-left text-sm">Industry</th>
                  <th className="px-3 py-2 text-left text-sm">Location</th>
                  <th className="px-3 py-2 text-left text-sm">Mobile</th>
                  <th className="px-3 py-2 text-left text-sm">Email</th>
                  <th className="px-3 py-2 text-left text-sm">Status</th>
                  <th className="px-3 py-2 text-left text-sm">Closure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item._id} className="bg-emerald-50/40 hover:bg-white transition-colors">
                    <td className="px-3 py-2 text-sm">
                      <span className="mr-2 align-middle text-emerald-600">✅</span>
                      <span className="font-semibold text-slate-900">{item?.lead?.name || 'N/A'}</span>
                    </td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.designation || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.company?.CompanyName || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.company?.industry?.name || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.location || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{Array.isArray(item?.lead?.mobile) ? item.lead.mobile.join(', ') : item?.lead?.mobile || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.email || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                        {item?.currentStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">✅ Closed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClosureTillDate;

