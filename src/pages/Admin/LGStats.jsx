import React, { useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';
import AdminNavbar from '../../components/AdminNavbar';
import { motion } from 'framer-motion';

const LGStats = () => {
  const { authToken } = useAuth();
  const [lgRows, setLgRows] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('enable');

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedLG, setSelectedLG] = useState(null);
  const [detailDaily, setDetailDaily] = useState([]);
  const [error, setError] = useState('');
  const [badDataLeads, setBadDataLeads] = useState([]);
  const [badDataPage, setBadDataPage] = useState(1);
  const [badDataLimit] = useState(100);
  const [badDataTotal, setBadDataTotal] = useState(0);
  const [badDataLoading, setBadDataLoading] = useState(false);
  const [showBadDataModal, setShowBadDataModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchList = async () => {
    if (!authToken) return;
    setLoadingList(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('view', 'list');
      params.append('status', statusFilter);

      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const qs = `?${params.toString()}`;

      const res = await fetch(`${BASE_URL}/api/admin/lg/stats${qs}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load LG stats');
      }
      setLgRows(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load LG stats');
      setLgRows([]);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchDetail = async (lg) => {
    if (!authToken || !lg) return;
    setSelectedLG(lg);
    setLoadingDetail(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('view', 'detail');
      params.append('lgId', lg.id);
      params.append('status', statusFilter);

      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const qs = `?${params.toString()}`;

      const res = await fetch(`${BASE_URL}/api/admin/lg/stats${qs}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load LG detail stats');
      }
      setDetailDaily(Array.isArray(data.daily) ? data.daily : []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load LG detail stats');
      setDetailDaily([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDetailsClick = (lg) => {
    if (!lg) return;
    setShowDetailModal(true);
    fetchDetail(lg);
  };

  const mandatoryFields = [
    'name',
    'designation',
    'location',
    'division',
    'productLine',
    'turnOver',
    'industry',
    'company',
    'mobile',
  ];

  const missingFieldsForLead = (lead) => {
    return mandatoryFields.filter((field) => {
      if (field === 'industry') return !lead.industry;
      if (field === 'company') return !lead.company;
      if (field === 'mobile') return !Array.isArray(lead.mobile) || lead.mobile.length === 0;
      return !lead[field] || (typeof lead[field] === 'string' && !lead[field].trim());
    });
  };

  const cleanDate = (value) => {
    if (!value) return '—';
    const text = new Date(value).toISOString().slice(0, 10);
    return text === '1970-01-01' ? '—' : new Date(value).toLocaleString();
  };

  const fetchBadDataLeads = async (lg, page = 1) => {
    if (!authToken || !lg) return;
    setBadDataLoading(true);
    setShowBadDataModal(true);
    setBadDataLeads([]);
    try {
      const params = new URLSearchParams();
      params.append('lgId', lg.id);
      params.append('page', page);
      params.append('limit', badDataLimit);
      params.append('status', statusFilter);

      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`${BASE_URL}/api/admin/lg/bad-data?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load bad-data leads');
      }
      setBadDataLeads(Array.isArray(data.data) ? data.data : []);
      setBadDataTotal(data.total || 0);
      setBadDataPage(data.page || 1);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load bad-data leads');
      setBadDataLeads([]);
    } finally {
      setBadDataLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const handleApplyFilters = () => {
    fetchList();
    if (selectedLG) {
      fetchDetail(selectedLG);
    }
  };

  const sortedDetailDaily = detailDaily
    .slice()
    .sort((a, b) => (new Date(b.date) > new Date(a.date) ? 1 : new Date(b.date) < new Date(a.date) ? -1 : 0));

  // Calculate totals from raw detail values (no special-case adjustments)
  const detailTotalsRaw = sortedDetailDaily.reduce(
    (totals, row) => {
      const lgTillDate = Number(row.lgTillDate || 0);
      const wrongNumber = Number(row.wrongNumber || 0);
      const rejected = Number(row.rejected || 0);
      const badData = Number(row.badData || 0);

      return {
        lgTillDate: totals.lgTillDate + lgTillDate,
        wrongNumber: totals.wrongNumber + wrongNumber,
        rejected: totals.rejected + rejected,
        badData: totals.badData + badData,
        total: totals.total + lgTillDate + wrongNumber + rejected + badData,
      };
    },
    { lgTillDate: 0, wrongNumber: 0, rejected: 0, badData: 0, total: 0 }
  );

  // Use the calculated totals directly
  const detailTotals = detailTotalsRaw;

  const detailRowTotal = (row) => {
    const lgTillDate = Number(row.lgTillDate || 0);
    const wrongNumber = Number(row.wrongNumber || 0);
    const rejected = Number(row.rejected || 0);
    const badData = Number(row.badData || 0);
    return lgTillDate + wrongNumber + rejected + badData;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="pt-20 px-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">LG Stats</h1>
        <p className="text-sm text-gray-600 mb-4">
          View all LGs with total counts and open date-wise details for a specific LG.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">LG Status</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="enable">Enabled</option>
              <option value="disable">Disabled</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* LG list table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto mb-8">
          {loadingList ? (
            <div className="p-6 text-center text-gray-500">Loading LG list...</div>
          ) : lgRows.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No LG data found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">LG Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-right">LG Till Date</th>
                  <th className="px-4 py-2 text-right">Wrong Number</th>
                  <th className="px-4 py-2 text-right">Rejected</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {lgRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2">{row.email}</td>
                    <td className="px-4 py-2 text-right">{row.lgTillDate}</td>
                    <td className="px-4 py-2 text-right">{row.wrongNumber}</td>
                    <td className="px-4 py-2 text-right">{row.rejected}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        className="px-3 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                        onClick={() => handleDetailsClick(row)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail modal (triggered by Details button) */}
        {showDetailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowDetailModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <p className="text-lg font-semibold text-slate-900">Detail Report</p>
                  {selectedLG && (
                    <p className="text-xs text-slate-500">{selectedLG.name} • {selectedLG.email}</p>
                  )}
                </div>
                <button
                  className="px-3 py-1 rounded border bg-slate-50 text-xs text-slate-600 hover:bg-slate-100"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px)' }}>
                                {loadingDetail ? (
                  <div className="py-10 text-center text-sm text-slate-500">Loading detail report…</div>
                ) : !selectedLG ? (
                  <div className="py-10 text-center text-sm text-slate-500">Select an LG to view details.</div>
                ) : detailDaily.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">No detail data for the selected period.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-right">LG Till Date</th>
                          <th className="px-4 py-2 text-right">Wrong Number</th>
                          <th className="px-4 py-2 text-right">Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Totals row as first row */}
                        <tr className="border-t bg-slate-50 font-semibold text-slate-800">
                          <td className="px-4 py-2">Totals</td>
                          <td className="px-4 py-2 text-right">{detailTotals.lgTillDate}</td>
                          <td className="px-4 py-2 text-right">{detailTotals.wrongNumber}</td>
                          <td className="px-4 py-2 text-right">{detailTotals.rejected}</td>
                        </tr>
                        {sortedDetailDaily.map((row, idx) => (
                          <React.Fragment key={row.date}>
                            <tr className="border-t">
                              <td className="px-4 py-2 text-slate-600">{row.date}</td>
                              <td className="px-4 py-2 text-right">{row.lgTillDate}</td>
                              <td className="px-4 py-2 text-right">{row.wrongNumber}</td>
                              <td className="px-4 py-2 text-right">{row.rejected}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Bad-data leads panel */}
        {showBadDataModal && (
          <div className="mt-8 bg-white border rounded-lg shadow-sm overflow-x-auto">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Data Not Filled Properly - Leads</p>
                <p className="text-xs text-gray-500">
                  {selectedLG ? selectedLG.name : 'Selected LG'} • {from || 'All time'} - {to || 'All time'}
                </p>
              </div>
              <button
                className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                onClick={() => setShowBadDataModal(false)}
              >
                Close
              </button>
            </div>
            {badDataLoading ? (
              <div className="p-6 text-center text-gray-500">Loading leads...</div>
            ) : badDataLeads.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No bad-data leads found.</div>
            ) : (
              <div className="p-4">
                <div className="text-xs text-gray-500 mb-2">
                  Total: {badDataTotal} • Page: {badDataPage}
                </div>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Lead</th>
                      <th className="px-3 py-2 text-left">Missing Fields</th>
                      <th className="px-3 py-2 text-left">Company</th>
                      <th className="px-3 py-2 text-left">Industry</th>
                      <th className="px-3 py-2 text-left">Division</th>
                      <th className="px-3 py-2 text-left">Product Line</th>
                      <th className="px-3 py-2 text-left">Turnover</th>
                      <th className="px-3 py-2 text-left">Location</th>
                      <th className="px-3 py-2 text-left">Mobile</th>
                      <th className="px-3 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {badDataLeads.map((lead) => (
                      <tr key={lead._id} className="border-t hover:bg-indigo-50 transition-colors">
                        <td className="px-3 py-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wide text-gray-600">{lead.leadType}</span>
                            <span className="font-semibold text-slate-800">{lead.name || 'No name'}</span>
                          </div>
                          <div className="text-xs text-gray-500">{lead.designation || 'No designation'}</div>
                        </td>
                        <td className="px-3 py-2">{missingFieldsForLead(lead).map((field) => (
                          <span
                            key={field}
                            className="inline-flex items-center px-2 py-0.5 mr-1 mb-1 rounded-full border border-red-200 text-[11px] text-red-700 bg-red-50"
                          >
                            {field}
                          </span>
                        ))}</td>
                        <td className="px-3 py-2">{lead.company?.CompanyName || '—'}</td>
                        <td className="px-3 py-2">{lead.industry?.name || '—'}</td>
                        <td className="px-3 py-2">{lead.division || '—'}</td>
                        <td className="px-3 py-2">{lead.productLine || '—'}</td>
                        <td className="px-3 py-2">{lead.turnOver || '—'}</td>
                        <td className="px-3 py-2">{lead.location || '—'}</td>
                        <td className="px-3 py-2">{(lead.mobile || []).join(', ') || '—'}</td>
                        <td className="px-3 py-2">{cleanDate(lead.date || lead.createdAt || lead.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex justify-between text-xs text-gray-600">
                  <button
                    disabled={badDataPage <= 1}
                    onClick={() => fetchBadDataLeads(selectedLG, badDataPage - 1)}
                    className={`px-3 py-1 rounded border ${badDataPage <= 1 ? 'border-gray-200 text-gray-400' : 'border-gray-300'}`}
                  >
                    Prev
                  </button>
                  <button
                    disabled={badDataTotal <= badDataPage * badDataLimit}
                    onClick={() => fetchBadDataLeads(selectedLG, badDataPage + 1)}
                    className={`px-3 py-1 rounded border ${badDataTotal <= badDataPage * badDataLimit ? 'border-gray-200 text-gray-400' : 'border-gray-300'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LGStats;