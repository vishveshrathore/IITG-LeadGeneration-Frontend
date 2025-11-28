import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';
import AdminNavbar from '../../components/AdminNavbar';
import { motion } from 'framer-motion';

const LGStats = () => {
  const { authToken } = useAuth();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`${BASE_URL}/api/admin/lg/stats${qs}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load LG stats');
      }
      setSummary(data.summary || null);
      setDaily(Array.isArray(data.daily) ? data.daily : []);
    } catch (e) {
      console.error(e);
      setSummary(null);
      setDaily([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="pt-20 px-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">LG Stats</h1>
        <p className="text-sm text-gray-600 mb-4">
          LG Till Date, Wrong Number, Rejected, and Data Not Filled Properly. Use date filter for detailed stats.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'LG Till Date', value: summary.lgTillDate },
              { label: 'Wrong Number', value: summary.wrongNumber },
              { label: 'Rejected', value: summary.rejected },
              { label: 'Data Not Filled Properly', value: summary.badData },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -2, scale: 1.01 }}
                className="bg-white border rounded-lg p-4 shadow-sm"
              >
                <p className="text-xs uppercase text-gray-500 mb-1">{item.label}</p>
                <p className="text-xl font-semibold text-gray-900">{item.value ?? 0}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Daily table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : daily.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No data for selected period.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">LG Till Date</th>
                  <th className="px-4 py-2 text-right">Wrong Number</th>
                  <th className="px-4 py-2 text-right">Rejected</th>
                  <th className="px-4 py-2 text-right">Data Not Filled Properly</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date} className="border-t">
                    <td className="px-4 py-2">{row.date}</td>
                    <td className="px-4 py-2 text-right">{row.lgTillDate}</td>
                    <td className="px-4 py-2 text-right">{row.wrongNumber}</td>
                    <td className="px-4 py-2 text-right">{row.rejected}</td>
                    <td className="px-4 py-2 text-right">{row.badData}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LGStats;