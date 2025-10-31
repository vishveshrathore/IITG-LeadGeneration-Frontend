import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import AnimatedLGNavbar from "../../components/LgNavBar";
import { BASE_URL } from "../../config";

const DisabledLGWrongNumber = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editMobiles, setEditMobiles] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!authToken) return;
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/admin/disabled-lg/wrong-number?page=${page}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to fetch');
        const arr = Array.isArray(data.data) ? data.data : [];
        const flat = arr.map(a => {
          const l = a.lead || {};
          return {
            _id: l._id || a.assignmentId,
            assignmentId: a.assignmentId,
            type: a.leadModel === 'Leads' ? 'HR' : 'RawLead',
            name: l.name || l.fullName || '',
            company: l.company,
            industry: l.industry,
            mobile: Array.isArray(l.mobile) ? l.mobile : [],
            email: l.email || '',
            location: l.location || '',
            remarks: l.remarks || '',
          };
        });
        setRows(flat);
        setTotal(data.total || flat.length || 0);
      } catch (e) {
        console.error(e);
        toast.error(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authToken, page, limit]);

  const openEdit = (row) => {
    setEditRow(row);
    setEditMobiles(Array.isArray(row.mobile) ? row.mobile.join(',') : '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      const mobileArr = (editMobiles || '').split(',').map(s=>s.trim()).filter(Boolean);
      if (mobileArr.length === 0) throw new Error('Enter at least one 10-digit number');
      // HR via Admin endpoint; RawLead via LG endpoint (supports mobileOnly)
      if (editRow.type === 'HR') {
        const resp = await fetch(`${BASE_URL}/api/admin/hr/update/${editRow._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ mobile: mobileArr })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || 'Update failed');
      } else {
        const resp = await fetch(`${BASE_URL}/api/lg/rawlead/${editRow._id}?preserveTs=true&mobileOnly=true`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ mobile: mobileArr })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || 'Update failed');
      }
      // Remove row after update
      setRows(prev => prev.filter(r => r._id !== editRow._id));
      setEditOpen(false);
      toast.success('Mobile updated');
    } catch (e) {
      toast.error(e?.message || 'Failed to update');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <AnimatedLGNavbar onLogout={() => {}} />
      <Toaster position="top-right" />

      <div className="pt-20 px-6 w-full mb-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Wrong Number (LG Disabled)</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border bg-white hover:bg-slate-50" onClick={()=>navigate('/adminteam/dashboard')}>Admin Team Dashboard</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">Total: {total}</div>
            <div className="flex items-center gap-2">
              <button disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 text-sm rounded border bg-white hover:bg-slate-50">Prev</button>
              <span className="text-sm">Page {page}</span>
              <button disabled={page*limit>=total || loading} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 text-sm rounded border bg-white hover:bg-slate-50">Next</button>
              <select value={limit} onChange={e=>{setPage(1); setLimit(parseInt(e.target.value)||20);}} className="ml-2 border rounded px-2 py-1 text-sm">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Company</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Mobile</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-6" colSpan={7}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className="px-4 py-6" colSpan={7}>No records</td></tr>
                ) : (
                  rows.map(l => (
                    <tr key={l._id} className="border-t">
                      <td className="px-4 py-2">{l.name || '—'}</td>
                      <td className="px-4 py-2">{l.company?.CompanyName || '—'}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${l.type==='RawLead'?'bg-orange-100 text-orange-700':'bg-indigo-100 text-indigo-700'}`}>{l.type}</span></td>
                      <td className="px-4 py-2">{Array.isArray(l.mobile)? l.mobile.join(', ') : '—'}</td>
                      <td className="px-4 py-2">{l.email || '—'}</td>
                      <td className="px-4 py-2">{l.location || '—'}</td>
                      <td className="px-4 py-2">
                        <button className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={()=>openEdit(l)}>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h4 className="text-lg font-semibold mb-4">Update Mobile ({editRow?.type})</h4>
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
};

export default DisabledLGWrongNumber;
