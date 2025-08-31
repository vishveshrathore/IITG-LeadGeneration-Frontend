import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import {
  FiUpload,
  FiSearch,
  FiCheckCircle,
  FiRefreshCw,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
} from "react-icons/fi";
import { BASE_URL } from "../../config";

// ================== CONFIG ==================
const API_BASE = `${BASE_URL}/api/admin/temp-rawleads`;
const APPROVE_REJECT_METHOD = "PUT";
const INDUSTRY_API = `${BASE_URL}/api/admin/industries`;
// ============================================

const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const buttonBase =
  "px-3 py-2 rounded-xl text-sm font-medium transition focus:outline-none focus:ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1";

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

export default function TempRawLeadsDashboard() {
  const [file, setFile] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [selected, setSelected] = useState(new Set());

  // industries + single global industry selection
  const [industries, setIndustries] = useState([]);
  const [industryFilter, setIndustryFilter] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [globalStats, setGlobalStats] = useState({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
});

  // pagination state from backend
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: pageSize,
  });

  // Helpers
  const normalizeListResponse = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.leads && Array.isArray(data.leads)) return data.leads;
    return [];
  };

  const fetchStats = async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/count`);
    setGlobalStats(data);
  } catch (e) {
    console.error("Failed to fetch global counts", e);
  }
};


  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_BASE, {
        params: {
          page,
          limit: pageSize,
          search,
          industry: industryFilter,
        },
      });

      setLeads(normalizeListResponse(data));
      setPagination(data.pagination || { total: 0, totalPages: 1, limit: pageSize });
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch temp leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      const { data } = await axios.get(INDUSTRY_API);
      if (Array.isArray(data?.industries)) setIndustries(data.industries);
      else if (Array.isArray(data)) setIndustries(data);
      else if (Array.isArray(data?.data)) setIndustries(data.data);
      else setIndustries([]);
    } catch (e) {
      console.error("Failed to fetch industries", e);
      setIndustries([]);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchIndustries();
    fetchStats();
  }, [page, search, industryFilter]);

  // Actions
  const handleUpload = async () => {
    if (!file) return toast.error("Please choose an Excel file");

    const form = new FormData();
    form.append("file", file);

    const t = toast.loading("Uploading file...");
    try {
      await axios.post(`${API_BASE}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.dismiss(t);
      toast.success("Uploaded! Leads pending approval.");
      setFile(null);
      await fetchLeads();
    } catch (e) {
      toast.dismiss(t);
      toast.error(e?.response?.data?.message || "Upload failed");
    }
  };

  const approveOne = async (id) => {
  if (!selectedIndustry) return toast.error("Select an industry first");

  setBusyIds((s) => new Set([...s, id]));

  try {
    await axios({
      url: `${API_BASE}/approve/${id}`,
      method: APPROVE_REJECT_METHOD,
      data: { industryId: selectedIndustry },
    });

    toast.success("Lead approved");

    // ✅ Instead of refetching, remove the approved lead from local state
    setLeads((prev) => prev.filter((lead) => lead._id !== id));
    fetchStats();
  } catch (e) {
    toast.error(e?.response?.data?.message || "Approve failed");
  } finally {
    setBusyIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }
};


  const markPending = async (id) => {
    setBusyIds((s) => new Set([...s, id]));
    try {
      await axios.put(`${API_BASE}/pending/${id}`);
      toast.success("Lead marked as pending");
       setLeads((prev) => prev.filter((lead) => lead._id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Pending failed");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return toast("Select leads first");
    if (!selectedIndustry) return toast.error("Select an industry first");

    const t = toast.loading("Approving...");
    try {
      for (const id of selected) {
        await axios({
          url: `${API_BASE}/approve/${id}`,
          method: APPROVE_REJECT_METHOD,
          data: { industryId: selectedIndustry },
        });
      }
      toast.dismiss(t);
      toast.success("Approved selected");
      await fetchLeads();
      fetchStats();
    } catch (e) {
      toast.dismiss(t);
      toast.error(e?.response?.data?.message || "Bulk approve failed");
    }
  };

  const toggleSelect = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllOnPage = () => {
    const newSet = new Set(selected);
    leads.forEach((i) => newSet.add(i._id));
    setSelected(newSet);
  };

  const clearSelection = () => setSelected(new Set());

  // Stats
  const stats = {
    total: pagination.total,
    pending: leads.filter((l) => (l.status || "pending") === "pending").length,
    approved: leads.filter((l) => l.status === "approved").length,
  };

  // Helpers: render industry <option>s
  const IndustryOptions = () => (
    <>
      <option value="">Select industry…</option>
      {industries.map((ind) => (
        <option key={ind._id} value={ind._id}>
          {ind.name}
        </option>
      ))}
    </>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen my-12">
      <Toaster position="top-right" />
      <AdminNavbar />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800">
          Temporary RawLeads Manager
        </h1>
        <button
          onClick={fetchLeads}
          className={`${buttonBase} bg-white border border-gray-300 hover:bg-gray-100 shadow-sm text-gray-700`}
          title="Refresh"
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Stats + Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Pending Leads Card */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r flex flex-col items-start gap-2"
        >
          <div className="text-sm font-medium text-yellow-800 uppercase tracking-wide">
            Pending Leads
          </div>
          <div className="text-3xl md:text-4xl font-bold text-yellow-900">
  {globalStats.pending}
</div>

          <div className="text-xs mt-1">
            Total pending leads awaiting approval
          </div>
        </motion.div>

        {/* Important Note Card */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r bg-blue-100 flex flex-col md:flex-row items-start md:items-center gap-4 p-2"
        >
          <div className="flex-shrink-0">
            <FiAlertCircle className="text-5xl text-red-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="text-lg md:text-xl font-bold text-red-600 mb-2">
              Important Note
            </div>
            <div className="text-sm md:text-base text-gray-700 leading-relaxed">
              ⚠️ In the Excel file, the header <span className="font-semibold">must</span> include:
              <br />
              <span className="font-bold text-blue-700">
                Name, Company, Designation, Current Location
              </span>
              .
              <br />
              Only then can you upload the file for proper parsing.
            </div>
          </div>
        </motion.div>

        {/* Upload */}
        <div className="flex items-center gap-2">
          <label className="block w-48 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-blue-700 hover:file:bg-blue-100">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="file:cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            onClick={handleUpload}
            className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}
            disabled={!file}
          >
            <FiUpload /> Upload {file && `(${file.name})`}
          </button>
        </div>
      </div>

      <hr className="my-8" />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={bulkApprove}
            className={`${buttonBase} bg-green-600 text-white hover:bg-green-700`}
            disabled={selected.size === 0}
          >
            <FiCheckSquare /> Approve ({selected.size})
          </button>
          <button
            onClick={clearSelection}
            className={`${buttonBase} bg-white border border-gray-300 hover:bg-gray-50 text-gray-700`}
            disabled={selected.size === 0}
          >
            Clear Selection
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:ring focus:ring-blue-200"
          >
            <IndustryOptions />
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-xl border border-gray-300 px-9 py-2 text-sm focus:ring focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            className={`${buttonBase} bg-white border border-gray-300 hover:bg-gray-50 text-gray-700`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <FiChevronLeft />
          </button>
          <Badge className="bg-gray-100 text-gray-800">
            Page {page} / {pagination.totalPages}
          </Badge>
          <button
            className={`${buttonBase} bg-white border border-gray-300 hover:bg-gray-50 text-gray-700`}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
          >
            <FiChevronRight />
          </button>
          <button
            className={`${buttonBase} bg-white border border-gray-300 hover:bg-gray-50 text-gray-700`}
            onClick={selectAllOnPage}
            disabled={leads.length === 0}
            title="Select all on this page"
          >
            <FiCheckSquare /> Select all
          </button>
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-600">
        Showing <b>{leads.length}</b> of <b>{pagination.total}</b> result(s)
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-500">
          Loading leads...
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-500 flex items-center justify-center gap-2">
          <FiAlertCircle className="text-xl" />
          No leads found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) selectAllOnPage();
                      else clearSelection();
                    }}
                    checked={leads.every((i) => selected.has(i._id))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => {
                const id = lead._id;
                const isBusy = busyIds.has(id);
                const isSelected = selected.has(id);

                let statusColorClass = "bg-gray-100 text-gray-800";
                const leadStatus = (lead.status || "pending").toLowerCase();
                if (leadStatus === "approved") {
                  statusColorClass = "bg-green-100 text-green-800";
                } else if (leadStatus === "pending") {
                  statusColorClass = "bg-yellow-100 text-yellow-800";
                }

                return (
                  <tr key={id} className={isSelected ? "bg-blue-50" : ""}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {lead.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.designation || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.location || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusColorClass}>
                        {lead.status || "pending"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.companyName || lead.company?.CompanyName || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => approveOne(id)}
                          disabled={isBusy}
                          className={`${buttonBase} bg-green-600 text-white hover:bg-green-700`}
                        >
                          <FiCheckCircle /> Approve
                        </button>
                        <button
                          onClick={() => markPending(id)}
                          disabled={isBusy}
                                                    className={`${buttonBase} bg-gray-400 text-white hover:bg-gray-500`}
                        >
                          <FiRefreshCw /> Pending
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

