import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';
import AnimatedLGNavbar from '../../components/LgNavBar';
import { motion, AnimatePresence } from 'framer-motion';
import { MdAssignment } from 'react-icons/md';
import { toast, Toaster } from 'react-hot-toast';

export default function WrongNumberLeads() {
  const { authToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState(''); // 'HR' (Leads) or 'RawLead'
  const [editLead, setEditLead] = useState(null);
  const [editMobiles, setEditMobiles] = useState('');
  // Only mobile editing is allowed in this view

  const headers = useMemo(() => ({
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  }), [authToken]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${BASE_URL}/api/lg/wrong-number`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load');
      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (row) => {
    const lead = row.lead || {};
    setEditLead(row);
    setEditType(row.leadModel === 'Leads' ? 'HR' : 'RawLead');
    setEditMobiles(Array.isArray(lead.mobile) ? lead.mobile.join(',') : (lead.mobile || ''));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const lead = editLead?.lead || {};
      const mobileArr = (editMobiles || '').split(',').map(s=>s.trim()).filter(Boolean);

      if (editType === 'HR') {
        // Only update mobile for HR
        const payload = { mobile: mobileArr };
        const resp = await fetch(`${BASE_URL}/api/lg/hr/${lead._id}?preserveTs=true`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || 'Update failed');
        // Remove the item from list after successful update
        setItems(prev => prev.filter(r => r.assignmentId !== (editLead?.assignmentId)));
      } else {
        // Only update mobile for RawLead
        const payload = { mobile: mobileArr };
        const resp = await fetch(`${BASE_URL}/api/lg/rawlead/${lead._id}?preserveTs=true&mobileOnly=true`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || 'Update failed');
        // Remove the item from list after successful update
        setItems(prev => prev.filter(r => r.assignmentId !== (editLead?.assignmentId)));
      }

      setEditOpen(false);
      toast.success('Lead updated');
    } catch (e) {
      toast.error(e?.message || 'Failed to update');
    }
  };

  useEffect(() => { if (authToken) fetchData(); }, [authToken]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <AnimatedLGNavbar />
      <Toaster position="top-right" />

      <div className="pt-20 px-6 w-full max-w-7xl mx-auto">
        <motion.div
          className="relative overflow-hidden rounded-2xl p-6 shadow-xl border border-slate-200 bg-white"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <MdAssignment className="text-amber-600 text-3xl" />
            <h1 className="text-2xl font-extrabold tracking-tight">Wrong Number Leads</h1>
          </div>
          <p className="text-sm text-slate-600 mb-4">Leads marked as Wrong Number by CRE and returned to you. You can edit and resubmit.</p>
        </motion.div>

        <div className="mt-6 bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No Wrong Number leads.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Company</th>
                    <th className="px-4 py-2 text-left">Designation</th>
                    <th className="px-4 py-2 text-left">Mobile</th>
                    <th className="px-4 py-2 text-left">Source</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const lead = row.lead || {};
                    const mobiles = Array.isArray(lead.mobile) ? lead.mobile.join(', ') : (lead.mobile || '');
                    const companyName = lead?.company?.CompanyName || '';
                    return (
                      <tr key={row.assignmentId} className="border-t border-slate-200">
                        <td className="px-4 py-2">{lead.name || '-'}</td>
                        <td className="px-4 py-2">{companyName || '-'}</td>
                        <td className="px-4 py-2">{lead.designation || '-'}</td>
                        <td className="px-4 py-2">{mobiles || '-'}</td>
                        <td className="px-4 py-2">{row.leadModel}</td>
                        <td className="px-4 py-2">
                          <button
                            className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h4 className="text-lg font-semibold mb-4">Update Mobile ({editType})</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm mb-1">Mobile (comma separated)</label>
                  <input className="w-full border rounded px-3 py-2" value={editMobiles} onChange={e=>setEditMobiles(e.target.value)} />
                  <p className="text-xs text-slate-500 mt-1">Enter valid 10-digit numbers. Duplicates across HR/RawLead are prevented.</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button className="px-4 py-2 rounded border" onClick={()=>setEditOpen(false)}>Cancel</button>
                <button className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={saveEdit}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
