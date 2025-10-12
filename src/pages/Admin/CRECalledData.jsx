import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../config";
import AdminNavbar from '../../components/AdminNavbar';
import { useAuth } from "../../context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

const STATUS_OPTIONS = ["Pending", "Positive", "Negative", "Closure Prospects"];
const CLOSURE_OPTIONS = ["In Progress", "Closed", "Pending"];
const LEAD_MODELS = ["RawLead", "Leads"];

const CRECalledData = () => {
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem("token") || sessionStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [rows, setRows] = useState([]);

  const [filters, setFilters] = useState({
    status: "",
    closureStatus: "",
    whatsappSent: "",
    mailer1Sent: "",
    mailer2Sent: "",
    calledBy: "",
    reportingManager: "",
    leadModel: "",
    completed: "",
    from: "",
    to: "",
    // Additional lead attribute filters (client-side for now)
    leadName: "",
    designation: "",
    company: "",
    location: "",
    mobile: "",
    email: "",
    productLine: "",
    turnover: "",
    industry: "",
  });

  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Load users for dropdowns
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/admin/users`);
        setUsers(res.data || []);
      } catch (e) {
        // not critical
      }
    };
    fetchUsers();
  }, []);

  const normalize = (a) => {
    const l = a?.lead || {};
    const company = l.company || {};
    const industry = l.industry || company.industry || {};
    const leadName = l.name || l.fullName || 'N/A';
    const designation = l.designation || l.title || 'N/A';
    const companyName = company.CompanyName || company.name || 'N/A';
    const industryName = industry.name || 'N/A';
    const location = l.location || l.city || l.address || 'N/A';
    const mobile = Array.isArray(l.mobile) ? l.mobile.join(', ') : (l.mobile || 'N/A');
    const email = l.email || 'N/A';
    const productLine = l.productLine || 'N/A';
    const turnover = l.turnover || l.turnOver || 'N/A';
    const followUps = Array.isArray(a?.followUps) ? a.followUps : [];
    const meeting = Array.isArray(a?.meeting) ? a.meeting : [];
    const meetingDisplay = meeting.length > 0
      ? meeting.map(m => `Link: ${m?.link || 'N/A'}, Date: ${m?.date ? new Date(m.date).toLocaleDateString() : 'N/A'}`).join('; ')
      : 'N/A';
    return {
      leadName, designation, companyName, industryName, location, mobile, email, productLine, turnover,
      currentStatus: a?.currentStatus || 'Pending',
      closureStatus: a?.closureStatus || 'In Progress',
      completed: !!a?.completed,
      followUpsCount: followUps.length,
      meetingDisplay,
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sortBy", sortBy);
      params.set("order", order);
      // Send only API-supported filters to backend
      const { leadName, designation, company, location, mobile, email, productLine, turnover, industry, ...apiFilters } = filters;
      Object.entries(apiFilters).forEach(([k, v]) => {
        if (v !== "" && v != null) params.set(k, String(v));
      });

      const res = await axios.get(`${BASE_URL}/api/admin/cre/called-data?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = res.data || {};
      setRows(Array.isArray(body.data) ? body.data : []);
      setTotal(Number(body.total || 0));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load data");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, order]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, limit))), [total, limit]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    fetchData();
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      closureStatus: "",
      whatsappSent: "",
      mailer1Sent: "",
      mailer2Sent: "",
      calledBy: "",
      reportingManager: "",
      leadModel: "",
      completed: "",
      from: "",
      to: "",
      leadName: "",
      designation: "",
      company: "",
      location: "",
      mobile: "",
      email: "",
      productLine: "",
      turnover: "",
      industry: "",
    });
    setPage(1);
    fetchData();
  };

  const renderLeadCell = (lead) => {
    if (!lead) return "-";
    const name = lead.name || lead.hrName || "-";
    const designation = lead.designation || "";
    const company = lead.company?.CompanyName || "";
    const industry = lead.industry?.name || "";
    return `${name}${designation ? `, ${designation}` : ""}${company ? ` | ${company}` : ""}${industry ? ` | ${industry}` : ""}`;
  };

  return (
    <div className="p-4 md:p-6">
        <AdminNavbar/>  

      <Toaster position="top-center" />
      <h1 className="text-2xl font-bold mb-4">CRE Leads Working Dashboard</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-xl p-4 shadow mb-4">
        <div>
          <label className="block text-sm mb-1">Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Closure Status</label>
          <select name="closureStatus" value={filters.closureStatus} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            {CLOSURE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Lead Model</label>
          <select name="leadModel" value={filters.leadModel} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            {LEAD_MODELS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Completed</label>
          <select name="completed" value={filters.completed} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">WhatsApp Sent</label>
          <select name="whatsappSent" value={filters.whatsappSent} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Mailer1 Sent</label>
          <select name="mailer1Sent" value={filters.mailer1Sent} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Mailer2 Sent</label>
          <select name="mailer2Sent" value={filters.mailer2Sent} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Called By (CRE)</label>
          <select name="calledBy" value={filters.calledBy} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Reporting Manager</label>
          <select name="reportingManager" value={filters.reportingManager} onChange={handleFilterChange} className="w-full border rounded px-3 py-2">
            <option value="">All</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="flex items-end gap-2">
          <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white rounded">Apply</button>
          <button onClick={clearFilters} className="px-4 py-2 border rounded">Clear</button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div>
          <label className="text-sm mr-2">Sort By</label>
          <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="border rounded px-2 py-1">
            <option value="createdAt">Created At</option>
            <option value="updatedAt">Updated At</option>
            <option value="currentStatus">Status</option>
          </select>
        </div>
        <div>
          <label className="text-sm mr-2">Order</label>
          <select value={order} onChange={(e)=>setOrder(e.target.value)} className="border rounded px-2 py-1">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div>
          <label className="text-sm mr-2">Rows</label>
          <select value={limit} onChange={(e)=>{ setLimit(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm">Total: {total}</div>
      </div>

      {/* Table */}
      <div className="overflow-auto bg-white rounded-xl shadow border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Lead</th>
              <th className="text-left px-4 py-2">Lead Model</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Closure</th>
              <th className="text-left px-4 py-2">WhatsApp</th>
              <th className="text-left px-4 py-2">Mailer1</th>
              <th className="text-left px-4 py-2">Mailer2</th>
              <th className="text-left px-4 py-2">Called By</th>
              <th className="text-left px-4 py-2">Managers</th>
              <th className="text-left px-4 py-2">Created</th>
              <th className="text-left px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={11}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={11}>No data</td></tr>
            ) : (
              rows.map(row => {
                const m1 = row.mailers?.find?.(m => m.type === 'mailer1');
                const m2 = row.mailers?.find?.(m => m.type === 'mailer2');
                return (
                  <tr key={row._id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{renderLeadCell(row.lead)}</td>
                    <td className="px-4 py-2">{row.leadModel || '-'}</td>
                    <td className="px-4 py-2">{row.currentStatus || '-'}</td>
                    <td className="px-4 py-2">{row.closureStatus || '-'}</td>
                    <td className="px-4 py-2">{row.whatsapp?.sent ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{m1?.sent ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{m2?.sent ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{row.Calledbycre?.name || '-'}</td>
                    <td className="px-4 py-2">{(row.reportingManagers||[]).map(rm => rm.name).join(', ')}</td>
                    <td className="px-4 py-2">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end mt-3">
        <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <span className="text-sm">Page {page} / {totalPages}</span>
        <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>
    </div>
  );
};

export default CRECalledData;
