import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import AnimatedLGNavbar from "../../components/LgNavBar";
import { BASE_URL } from "../../config";

const DisabledLGRejectedLeads = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [editType, setEditType] = useState(null); // 'RawLead' or 'HR'
  const [editMobiles, setEditMobiles] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDivision, setEditDivision] = useState("");
  const [editProductLine, setEditProductLine] = useState("");
  const [editTurnOver, setEditTurnOver] = useState("");
  const [editEmployeeStrength, setEditEmployeeStrength] = useState("");
  const [editIndustryId, setEditIndustryId] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");

  const openEdit = (lead) => {
    setEditLead(lead);
    const type = lead.type || (lead.createdBy ? 'HR' : 'RawLead');
    setEditType(type);
    setEditName(lead.name || "");
    setEditDesignation(lead.designation || "");
    setEditEmail(lead.email || "");
    setEditLocation(lead.location || "");
    setEditRemarks(lead.remarks || "");
    setEditDivision(lead.division || "");
    setEditProductLine(lead.productLine || "");
    setEditTurnOver(lead.turnOver || "");
    setEditEmployeeStrength(lead.employeeStrength || "");
    setEditMobiles(Array.isArray(lead.mobile) ? lead.mobile.join(',') : "");
    setEditIndustryId(lead.industry?._id || lead.industry || "");
    setEditCompanyId(lead.company?._id || lead.company || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const mobileArr = editMobiles.split(',').map(s=>s.trim()).filter(Boolean);

      if (editType === 'RawLead') {
        const payload = {
          name: editName,
          designation: editDesignation,
          company: editCompanyId,
          location: editLocation,
          mobile: mobileArr,
          industry: editIndustryId,
          productLine: editProductLine,
          turnOver: editTurnOver,
          employeeStrength: editEmployeeStrength,
          email: editEmail,
          remarks: editRemarks,
        };
        const resp = await fetch(`${BASE_URL}/api/lg/rawlead/${editLead._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || 'Update failed');
        const serverDoc = data.lead || data.data || {};
        setRows(prev => prev.map(x => {
          if (x._id !== editLead._id) return x;
          const merged = { ...x, ...payload, ...serverDoc };
          merged.company = serverDoc.company || x.company;
          merged.companyName = serverDoc.companyName || x.companyName;
          merged.industry = serverDoc.industry || x.industry;
          merged.industryName = serverDoc.industryName || x.industryName;
          return merged;
        }));
      } else {
        const payload = {
          name: editName,
          designation: editDesignation,
          mobile: mobileArr,
          email: editEmail,
          location: editLocation,
          remarks: editRemarks,
          division: editDivision,
          productLine: editProductLine,
          turnOver: editTurnOver,
          employeeStrength: editEmployeeStrength,
        };
        const resp = await fetch(`${BASE_URL}/api/lg/hr/update/${editLead._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || 'Update failed');
        const serverDoc = data.data || {};
        setRows(prev => prev.map(x => {
          if (x._id !== editLead._id) return x;
          const merged = { ...x, ...payload, ...serverDoc };
          merged.company = x.company;
          merged.companyName = x.companyName;
          merged.industry = x.industry;
          merged.industryName = x.industryName;
          return merged;
        }));
      }

      setEditOpen(false);
      toast.success('Lead updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update');
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!authToken) return;
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/admin/disabled-lg/rejected?page=${page}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to fetch');
        setRows(Array.isArray(data.data) ? data.data : []);
        setTotal(data.total || 0);
      } catch (e) {
        console.error(e);
        toast.error(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authToken, page, limit]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <AnimatedLGNavbar onLogout={() => {}} />
      <Toaster position="top-right" />

      <div className="pt-20 px-6 w-full mb-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Rejected Leads (LG Disabled)</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border bg-white hover:bg-slate-50" onClick={()=>navigate('/adminteam/dashboard')}>Admin Team Dashboard</button>
            <AnimatePresence>
        {editOpen && (
          <motion.div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h4 className="text-lg font-semibold mb-4">Edit Lead ({editType})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Name</label>
                  <input className="w-full border rounded px-3 py-2" value={editName} onChange={e=>setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Designation</label>
                  <input className="w-full border rounded px-3 py-2" value={editDesignation} onChange={e=>setEditDesignation(e.target.value)} />
                </div>
                {editType === 'RawLead' && (
                  <>
                    <div>
                      <label className="block text-sm mb-1">Industry</label>
                      <input className="w-full border rounded px-3 py-2 bg-slate-100" value={editLead?.industry?.name || editLead?.industryName || ''} disabled />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Company</label>
                      <input className="w-full border rounded px-3 py-2 bg-slate-100" value={editLead?.company?.CompanyName || editLead?.companyName || ''} disabled />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm mb-1">Mobile (comma separated)</label>
                  <input className="w-full border rounded px-3 py-2" value={editMobiles} onChange={e=>setEditMobiles(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input className="w-full border rounded px-3 py-2" value={editEmail} onChange={e=>setEditEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Location</label>
                  <input className="w-full border rounded px-3 py-2" value={editLocation} onChange={e=>setEditLocation(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Division</label>
                  <input className="w-full border rounded px-3 py-2" value={editDivision} onChange={e=>setEditDivision(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Product Line</label>
                  <input className="w-full border rounded px-3 py-2" value={editProductLine} onChange={e=>setEditProductLine(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Turn Over</label>
                  <input className="w-full border rounded px-3 py-2" value={editTurnOver} onChange={e=>setEditTurnOver(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Employee Strength</label>
                  <input className="w-full border rounded px-3 py-2" value={editEmployeeStrength} onChange={e=>setEditEmployeeStrength(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Remarks</label>
                  <textarea className="w-full border rounded px-3 py-2" rows={3} value={editRemarks} onChange={e=>setEditRemarks(e.target.value)} />
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
                    <React.Fragment key={l._id}>
                      <tr className="border-t">
                        <td className="px-4 py-2">{l.name}</td>
                        <td className="px-4 py-2">{l.company?.CompanyName || l.companyName || '—'}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${l.type==='RawLead'?'bg-orange-100 text-orange-700':'bg-indigo-100 text-indigo-700'}`}>{l.type}</span></td>
                        <td className="px-4 py-2">{Array.isArray(l.mobile)? l.mobile.join(', ') : '—'}</td>
                        <td className="px-4 py-2">{l.email || '—'}</td>
                        <td className="px-4 py-2">{l.location || '—'}</td>
                        <td className="px-4 py-2 flex gap-2">
                          <button
                            onClick={() => setExpandedId(expandedId === l._id ? null : l._id)}
                            className="px-3 py-1 text-sm rounded border bg-white hover:bg-slate-50"
                          >{expandedId === l._id ? 'Hide' : 'View'}</button>
                          <button
                            onClick={() => openEdit(l)}
                            className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                          >Edit</button>
                        </td>
                      </tr>
                      {expandedId === l._id && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div><span className="text-slate-500">Designation:</span> {l.designation || '—'}</div>
                              <div><span className="text-slate-500">Industry:</span> {l.industry?.name || l.industryName || '—'}</div>
                              <div><span className="text-slate-500">Division:</span> {l.division || '—'}</div>
                              <div><span className="text-slate-500">Product Line:</span> {l.productLine || '—'}</div>
                              <div><span className="text-slate-500">Turn Over:</span> {l.turnOver || '—'}</div>
                              <div><span className="text-slate-500">Employee Strength:</span> {l.employeeStrength || '—'}</div>
                              <div className="md:col-span-3"><span className="text-slate-500">Remarks:</span> {l.remarks || '—'}</div>
                              <div><span className="text-slate-500">Status:</span> {l.status || '—'}</div>
                              <div><span className="text-slate-500">Block Status:</span> {l.blockStatus || '—'}</div>
                              <div><span className="text-slate-500">Updated:</span> {l.updatedAt ? new Date(l.updatedAt).toLocaleString() : '—'}</div>
                              <div className="md:col-span-3">
                                <span className="text-slate-500">Rejection Reasons:</span>
                                {l.rejectionReason ? (
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {(l.rejectionReason || '')
                                      .split(';')
                                      .map(r => r.trim())
                                      .filter(Boolean)
                                      .map((r, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs">
                                          {r}
                                        </span>
                                      ))}
                                  </div>
                                ) : (
                                  <span> —</span>
                                )}
                              </div>
                              <div className="md:col-span-3"><span className="text-slate-500">Rejection Note:</span> {l.rejectionNote || '—'}</div>
                              <div><span className="text-slate-500">Rejected By Role:</span> {l.rejectedByRole || '—'}</div>
                              <div><span className="text-slate-500">Rejected At:</span> {l.rejectedAt ? new Date(l.rejectedAt).toLocaleString() : '—'}</div>
                              {l.type === 'RawLead' ? (
                                <div><span className="text-slate-500">Assigned To (LG):</span> {l.assignedTo?.name || '—'}</div>
                              ) : (
                                <div><span className="text-slate-500">Created By (LG):</span> {l.createdBy?.name || '—'}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisabledLGRejectedLeads;
