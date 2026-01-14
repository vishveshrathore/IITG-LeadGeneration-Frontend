import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import { useAuth } from "../../context/AuthContext";
import { FiCheckCircle, FiRefreshCw, FiCheckSquare, FiXCircle } from "react-icons/fi";
import { BASE_URL } from "../../config";

const API_BASE = `${BASE_URL}/api/admin/getallleads/CRE`;

const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const buttonBase =
  "px-3 py-2 rounded-xl text-sm font-medium transition focus:outline-none focus:ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1";

// Leader roles, treating Deputies same as their heads (shared with OrgChartNode)
const leaderRoles = [
  "CRM-TeamLead",
  "DeputyCRMTeamLead",
  "RegionalHead",
  "DeputyRegionalHead",
  "NationalHead",
  "DeputyNationalHead",
];

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

export default function CRELeadsApprovalDashboard() {
  const { authToken } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [globalStats, setGlobalStats] = useState({ total: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  
  const [industries, setIndustries] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creCounts, setCreCounts] = useState({
    approved: { total: 0 },
    freshUnassigned: { total: 0 },
    rejected: { total: 0 },
    nonApproved: { total: 0 },
    total: { total: 0 },
    assigned: { total: 0 },
    currentUsage: { total: 0 },
  });
  const [activeTab, setActiveTab] = useState('Unassigned');
  const [industryQuery, setIndustryQuery] = useState("");
  const [industrySearchResults, setIndustrySearchResults] = useState([]);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);

  // Reject UI state
  const [rejectForId, setRejectForId] = useState(null);
  const [rejectReasons, setRejectReasons] = useState([]); // array of selected reasons
  const [rejectNote, setRejectNote] = useState(''); // only used when "Other" is selected
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  const REJECT_OPTIONS = [
    'HR level is Below Senior Manager',
    'Industry type is not right',
    'Mobile Number is not right',
    'Productline not mentioned',
    'Employee Strength is not Mentioned',
    'Company Name Not mentioned',
    'Not from the targeted industry',
    'Other',
  ];

  // Fetch leads
  const fetchLeads = async (page = 1, searchTerm = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchTerm) params.set("search", searchTerm);
      if (activeTab) params.set('tab', activeTab);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const { data } = await axios.get(`${API_BASE}?${params.toString()}`);
      setLeads(data.data);
      setGlobalStats({ total: data.total });
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  // Mark Non-Approved (single row)
  const nonApproveLead = async (lead) => {
    const id = lead._id;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await axios.put(`${BASE_URL}/api/admin/leads/nonapproved/forcre/${id}`, {
        type: lead.type || "RawLead",
      });
      toast.success("Lead marked as Non-Approved");
      // Update locally to avoid full refetch and preserve current view
      setLeads((prev) => prev.map((l) => l._id === id ? { ...l, status: 'Non-Approved' } : l));
      fetchCounts();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Non-Approved action failed");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  

  // Reject lead -> send back to LG dashboard
  const rejectLead = async (lead, reason, note) => {
    const id = lead._id;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await axios.put(
        `${BASE_URL}/api/admin/leads/reject/forcre/${id}`,
        {
          type: lead.type || 'RawLead',
          reason,
          note,
        },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      toast.success("Lead rejected to LG");
      // Save selected remarks into UI state immediately
      setLeads(prev => prev.map(x => {
        if (x._id !== id) return x;
        return {
          ...x,
          status: 'rejected',
          rejectionReason: reason,
          rejectionNote: note,
        };
      }));
      fetchCounts();
      // Do not refetch immediately to preserve locally saved remarks visibility
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        toast.error('Session expired or invalid token. Please login again.');
      } else if (status === 403) {
        toast.error('Only Admin/AdminTeam can reject leads.');
      } else {
        toast.error(e?.response?.data?.message || 'Reject failed');
      }
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const openReject = (lead) => {
    setRejectForId(lead._id);
    // Preload from DB if already rejected
    const savedReasons = (lead.rejectionReason || '')
      .split(';')
      .map(r => r.trim())
      .filter(Boolean);
    setRejectReasons(savedReasons);
    setRejectNote(lead.rejectionNote || '');
  };

  const cancelReject = () => {
    setRejectForId(null);
    setRejectReasons([]);
    setRejectNote('');
  };

  // Bulk actions
  const getSelectedLeads = () => leads.filter(l => selected.has(l._id));

  const bulkApproveSelected = async () => {
    const chosen = getSelectedLeads();
    if (chosen.length === 0) return;
    const ids = chosen.map(l => l._id);
    // Remaining leads on current page that were NOT selected
    const selectedIdSet = new Set(ids);
    const remainingOnPage = filteredLeads.filter(l => !selectedIdSet.has(l._id));

    setBusyIds((s) => new Set([...s, ...ids, ...remainingOnPage.map(l => l._id)]));
    try {
      await Promise.all(chosen.map(async (lead) => {
        await axios.put(`${BASE_URL}/api/admin/leads/approve/forcre/${lead._id}`, {
          type: lead.type || 'RawLead',
        });
      }));
      // Now mark all remaining leads on this page as Non-Approved
      await Promise.all(remainingOnPage.map(async (lead) => {
        await axios.put(`${BASE_URL}/api/admin/leads/nonapproved/forcre/${lead._id}`, {
          type: lead.type || 'RawLead',
        });
      }));

      toast.success(`Approved ${chosen.length} lead(s); moved ${remainingOnPage.length} to Non-Approved`);

      // Update UI locally: selected -> approved, remainingOnPage -> Non-Approved
      const remainingIdSet = new Set(remainingOnPage.map(l => l._id));
      setLeads(prev => prev.map(l => {
        if (selected.has(l._id)) return { ...l, status: 'approved for calling' };
        if (remainingIdSet.has(l._id)) return { ...l, status: 'Non-Approved' };
        return l;
      }));
      fetchCounts();
      // Optionally refetch current page to sync
      fetchLeads(1, debouncedSearch);
      setPage(1);
      setSelected(new Set());
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Bulk approve failed');
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        [...ids, ...remainingOnPage.map(l => l._id)].forEach(id => n.delete(id));
        return n;
      });
    }
  };

  const bulkPendingSelected = async () => {
    const chosen = getSelectedLeads();
    if (chosen.length === 0) return;
    const ids = chosen.map(l => l._id);
    setBusyIds((s) => new Set([...s, ...ids]));
    try {
      await Promise.all(chosen.map(async (lead) => {
        await axios.put(`${BASE_URL}/api/admin/leads/pending/forcre/${lead._id}`, {
          type: lead.type || 'RawLead',
        });
      }));
      toast.success(`Marked ${chosen.length} lead(s) as pending`);
      setLeads(prev => prev.map(l => selected.has(l._id) ? { ...l, status: 'pending' } : l));
      fetchCounts();
      fetchLeads(1, debouncedSearch);
      setPage(1);
      setSelected(new Set());
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Bulk pending failed');
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        ids.forEach(id => n.delete(id));
        return n;
      });
    }
  };

  const bulkNonApprovedSelected = async () => {
    const chosen = getSelectedLeads();
    if (chosen.length === 0) return;
    const ids = chosen.map(l => l._id);
    setBusyIds((s) => new Set([...s, ...ids]));
    try {
      await Promise.all(chosen.map(async (lead) => {
        await axios.put(`${BASE_URL}/api/admin/leads/nonapproved/forcre/${lead._id}`, {
          type: lead.type || 'RawLead',
        });
      }));
      toast.success(`Marked ${chosen.length} lead(s) as Non-Approved`);
      setLeads(prev => prev.map(l => selected.has(l._id) ? { ...l, status: 'Non-Approved' } : l));
      fetchCounts();
      fetchLeads(1, debouncedSearch);
      setPage(1);
      setSelected(new Set());
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Bulk Non-Approved failed');
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        ids.forEach(id => n.delete(id));
        return n;
      });
    }
  };

  const openBulkReject = () => {
    setBulkRejectOpen(true);
    setRejectReasons([]);
    setRejectNote('');
  };
  const cancelBulkReject = () => {
    setBulkRejectOpen(false);
    setRejectReasons([]);
    setRejectNote('');
  };
  const submitBulkReject = async () => {
    const chosen = getSelectedLeads();
    if (chosen.length === 0) return;
    const selectedReasons = Array.isArray(rejectReasons) ? rejectReasons : [];
    const hasOther = selectedReasons.includes('Other');
    if (selectedReasons.length === 0 || (hasOther && !rejectNote.trim())) return;
    const reasonsString = selectedReasons.join('; ');
    const ids = chosen.map(l => l._id);
    setBusyIds((s) => new Set([...s, ...ids]));
    try {
      await Promise.all(chosen.map(async (lead) => {
        await axios.put(
          `${BASE_URL}/api/admin/leads/reject/forcre/${lead._id}`,
          { type: lead.type || 'RawLead', reason: reasonsString, note: hasOther ? (rejectNote || '') : '' },
          { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
        );
      }));
      toast.success(`Rejected ${chosen.length} lead(s)`);
      setLeads(prev => prev.map(l => selected.has(l._id) ? { ...l, status: 'rejected', rejectionReason: reasonsString, rejectionNote: hasOther ? (rejectNote || '') : '' } : l));
      fetchCounts();
      setSelected(new Set());
      setPage(1);
      fetchLeads(1, debouncedSearch);
      cancelBulkReject();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Bulk reject failed');
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        ids.forEach(id => n.delete(id));
        return n;
      });
    }
  };

  const submitReject = async (lead) => {
    const selected = Array.isArray(rejectReasons) ? rejectReasons : [];
    const hasOther = selected.includes('Other');
    const reasonsString = selected.join('; ');
    const note = hasOther ? (rejectNote || '') : '';
    await rejectLead(lead, reasonsString, note);
    cancelReject();
  };

  // Debounced industry async search (trending UX)
  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      try {
        setIndustryLoading(true);
        if (!industryQuery.trim()) {
          // empty query: fallback to first page industries already loaded
          setIndustrySearchResults([]);
          return;
        }
        const { data } = await axios.get(
          `${BASE_URL}/api/admin/industries/search?query=${encodeURIComponent(
            industryQuery.trim()
          )}`
        );
        if (!active) return;
        setIndustrySearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        console.error("Industry search failed", err);
      } finally {
        if (active) setIndustryLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [industryQuery]);

  // Fetch counts for approved and fresh-unassigned
  const fetchCounts = async () => {
    try {
      const params = new URLSearchParams();
      params.set('onlyWithMobile', 'true');
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const { data } = await axios.get(
        `${BASE_URL}/api/admin/cre/lead-counts?${params.toString()}`
      );
      if (data?.success) setCreCounts(data);
    } catch (err) {
      console.error(err);
      // do not toast to avoid noise on page load
    }
  };

  // Fetch industries
  const fetchIndustries = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/admin/industries`);
      setIndustries(data.industries || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch industries");
    }
  };

  useEffect(() => {
    fetchLeads(page, debouncedSearch);
    fetchIndustries();
    fetchCounts();
  }, [page, debouncedSearch, limit, activeTab, fromDate, toDate]);

  const handleExportAll = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const url = `${BASE_URL}/api/admin/getallleads/CRE/export?${params.toString()}`;
      const { data } = await axios.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      const href = window.URL.createObjectURL(blob);
      link.href = href;
      const safeTab = activeTab || 'All';
      const safeDate = new Date().toISOString().split('T')[0];
      link.download = `CRE_Leads_${safeTab}_${safeDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(href);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  // When debounced search changes, reset to first page
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate]);

  // Approve lead
  const approveLead = async (lead) => {
    const id = lead._id;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await axios.put(`${BASE_URL}/api/admin/leads/approve/forcre/${id}`, {
        type: lead.type || "RawLead",
      });
      toast.success("Lead approved successfully");
      // Update locally to avoid full refetch and preserve current view
      setLeads((prev) => prev.map((l) => l._id === id ? { ...l, status: 'approved for calling' } : l));
      fetchCounts();
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

  

  // Mark pending
  const markPending = async (lead) => {
    const id = lead._id;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await axios.put(`${BASE_URL}/api/admin/leads/pending/forcre/${id}`, {
        type: lead.type || "RawLead",
      });
      toast.success("Lead marked pending");
      // Update locally to avoid full refetch and preserve current view
      setLeads((prev) => prev.map((l) => l._id === id ? { ...l, status: 'pending' } : l));
      fetchCounts();
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

  // Always return to first page when switching tabs so data is visible from page 1
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const toggleSelect = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllOnPage = () => {
    const newSet = new Set(selected);
    filteredLeads.forEach((i) => newSet.add(i._id));
    setSelected(newSet);
  };

  const clearSelection = () => setSelected(new Set());
  const totalPages = Math.ceil(globalStats.total / limit);
  const handlePrevPage = () => setPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setPage((p) => Math.min(p + 1, totalPages));

  // Row click selection helper: ignore clicks on interactive controls
  const isClickOnInteractive = (target) => {
    if (!target) return false;
    const el = target.closest
      ? target.closest('button, a, input, select, textarea, label, [role="button"]')
      : null;
    return !!el;
  };

  // Tabbed filtering helpers
  const tabCounts = React.useMemo(() => ({
    Unassigned: creCounts.freshUnassigned?.total || 0,
    Rejected: creCounts.rejected?.total || 0,
    Approved: creCounts.approved?.total || 0,
    NonApproved: creCounts.nonApproved?.total || 0,
    CREGenerated: creCounts.creGenerated?.total || 0,
  }), [creCounts]);

  const filteredLeads = React.useMemo(() => {
    if (activeTab === 'Approved') {
      return leads.filter((l) => l.status === 'approved for calling');
    }
    if (activeTab === 'Rejected') {
      return leads.filter((l) => l.status === 'rejected');
    }
    if (activeTab === 'NonApproved') {
      // Explicit Non-Approved status from backend
      return leads.filter((l) => l.status === 'Non-Approved');
    }
    if (activeTab === 'CREGenerated') {
      // For CRE-generated tab, rely on backend filtering (tab=CREGenerated)
      return leads;
    }
    // Unassigned: status is neither approved, rejected, nor Non-Approved
    return leads.filter((l) => l.status !== 'approved for calling' && l.status !== 'rejected' && l.status !== 'Non-Approved');
  }, [leads, activeTab]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen my-12">
      <Toaster position="top-right" />
      <AdminNavbar />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800">
          CRE Dashboard for Lead Approval
        </h1>
        <button
          type="button"
          onClick={handleExportAll}
          disabled={exporting}
          className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {exporting ? (
            <>
              <FiRefreshCw className="animate-spin" /> Exporting...
            </>
          ) : (
            'Export All Data'
          )}
        </button>
      </div>

      {/* Tabs: Unassigned, Rejected, Approved, Non-Approved, CRE Generated */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { key: 'Unassigned', label: 'Unassigned' },
          { key: 'Rejected', label: 'Rejected' },
          { key: 'Approved', label: 'Approved for Calling' },
          { key: 'NonApproved', label: 'Non-Approved' },
          { key: 'CREGenerated', label: 'CRE-CRM Generated' },
        ].map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`${buttonBase} ${
                isActive
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
              <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-700'
              }`}>
                {tabCounts[t.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r from-blue-200 to-blue-400 flex flex-col items-start gap-2 p-6"
        >
          <div className="text-sm font-medium text-blue-900 uppercase tracking-wide">
            Total Leads
          </div>
          <div className="text-3xl md:text-4xl font-bold text-blue-900">
            {creCounts.total?.total || 0}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r from-green-200 to-green-400 flex flex-col items-start gap-2 p-6"
        >
          <div className="text-sm font-medium text-green-900 uppercase tracking-wide">
            Approved for Calling
          </div>
          <div className="text-3xl md:text-4xl font-bold text-green-900">
            {creCounts.approved?.total || 0}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r from-indigo-200 to-indigo-400 flex flex-col items-start gap-2 p-6"
        >
          <div className="text-sm font-medium text-indigo-900 uppercase tracking-wide">
            Current Usage number
          </div>
          <div className="text-3xl md:text-4xl font-bold text-indigo-900">
            {creCounts.currentUsage?.total || 0}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r from-red-200 to-red-400 flex flex-col items-start gap-2 p-6"
        >
          <div className="text-sm font-medium text-red-900 uppercase tracking-wide">
            Rejected Leads
          </div>
          <div className="text-3xl md:text-4xl font-bold text-red-900">
            {creCounts.rejected?.total || 0}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r from-yellow-200 to-yellow-400 flex flex-col items-start gap-2 p-6"
        >
          <div className="text-sm font-medium text-yellow-900 uppercase tracking-wide">
            Unassigned Leads
          </div>
          <div className="text-3xl md:text-4xl font-bold text-yellow-900">
            {creCounts.freshUnassigned?.total || 0}
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, designation..."
          className="w-full md:w-64 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring focus:ring-blue-200"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring focus:ring-blue-200"
          />
          <label className="text-sm text-gray-600">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring focus:ring-blue-200"
          />
        </div>
        <button
          onClick={selectAllOnPage}
          className={`${buttonBase} bg-white border border-gray-300 hover:bg-gray-50 text-gray-700`}
        >
          <FiCheckSquare /> Select all
        </button>
        <button
          onClick={clearSelection}
          className={`${buttonBase} bg-gray-200 hover:bg-gray-300`}
        >
          Clear Selection
        </button>

        {/* Page size selector */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page</span>
          <select
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value);
              setLimit(newLimit);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          >
            {[5, 10, 20, 50, 100, 150].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection summary */}
      {selected.size > 0 && (
        <div className="mb-4 text-sm text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg inline-flex items-center gap-3">
          <span className="font-medium">{selected.size} selected</span>
          <button onClick={clearSelection} className="underline">
            Clear
          </button>
        </div>
      )}

      {/* Leads Table */}
      {loading ? (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: 14 }).map((_, i) => (
                  <th key={i} className="px-4 py-3"></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: limit }).map((_, idx) => (
                <tr key={idx}>
                  {Array.from({ length: 14 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="animate-pulse h-3 bg-gray-200 rounded w-24"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-500">
          No leads in this tab.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      e.target.checked ? selectAllOnPage() : clearSelection()
                    }
                    checked={filteredLeads.length > 0 && filteredLeads.every((i) => selected.has(i._id))}
                  />
                </th>
                {[
                  "Name",
                  "Company",
                  "Designation",
                  "Mobile",
                  "Industry",
                  "Actions",
                  "Email",
                  "Location",
                  "Remarks",
                  "Division",
                  "Product Line",
                  "Turnover",
                  "Employee Strength",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => {
                const id = lead._id;
                const isBusy = busyIds.has(id);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    onClick={(e) => {
                      if (!isClickOnInteractive(e.target)) toggleSelect(id);
                    }}
                    className={`${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.companyName || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.designation}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.mobile.join(", ")}
                    </td>
                    {/* Industry Dropdown */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.isEditingIndustry ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={industryQuery}
                            onChange={(e) => setIndustryQuery(e.target.value)}
                            placeholder="Search industry..."
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-56"
                          />
                          <select
                            value={lead.industry || ""}
                            onChange={async (e) => {
                              const newIndustry = e.target.value;
                              if (newIndustry === lead.industry) return;

                              // Update local state immediately
                              setLeads((prev) =>
                                prev.map((l) =>
                                  l._id === lead._id
                                    ? { ...l, industry: newIndustry }
                                    : l
                                )
                              );

                              try {
                                // Send type to backend
                                await axios.put(
                                  `${BASE_URL}/api/admin/leads/industry/update/${lead._id}`,
                                  { industry: newIndustry, type: lead.type }
                                );
                                toast.success("Industry updated successfully");
                                // Update industryName locally to avoid full refetch and row flicker
                                const allIndustryOptions =
                                  industrySearchResults.length > 0
                                    ? industrySearchResults
                                    : industries;
                                const selectedIndustryObj =
                                  allIndustryOptions.find(
                                    (ind) => ind._id === newIndustry
                                  );
                                const newIndustryName = selectedIndustryObj
                                  ? selectedIndustryObj.name
                                  : lead.industryName;
                                setLeads((prev) =>
                                  prev.map((l) =>
                                    l._id === lead._id
                                      ? {
                                          ...l,
                                          industry: newIndustry,
                                          industryName: newIndustryName,
                                        }
                                      : l
                                  )
                                );
                              } catch (err) {
                                toast.error(
                                  err?.response?.data?.message ||
                                    "Failed to update industry"
                                );
                              } finally {
                                // Exit edit mode and clear search
                                setIndustryQuery("");
                                setLeads((prev) =>
                                  prev.map((l) =>
                                    l._id === lead._id
                                      ? { ...l, isEditingIndustry: false }
                                      : l
                                  )
                                );
                              }
                            }}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-56"
                          >
                            <option value="">Select Industry</option>
                            {(industrySearchResults.length > 0
                              ? industrySearchResults
                              : industries
                            ).map((ind) => (
                              <option key={ind._id} value={ind._id}>
                                {ind.name}
                              </option>
                            ))}
                          </select>
                          {industryLoading && (
                            <span className="text-xs text-gray-500">
                              Searching…
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer"
                          onClick={() => {
                            setIndustryQuery("");
                            setLeads((prev) =>
                              prev.map((l) =>
                                l._id === lead._id
                                  ? { ...l, isEditingIndustry: true }
                                  : l
                              )
                            );
                          }}
                        >
                          {lead.industryName || "—"}{" "}
                          {/* Show stored industry name */}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 items-start">
                        {lead.status !== 'approved for calling' && (
                          <div className="mb-1 text-xs text-gray-600">
                            Current Status:
                            <span
                              className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs ${
                                lead.status === 'approved for calling'
                                  ? 'bg-green-100 text-green-700'
                                  : lead.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {lead.status || '—'}
                            </span>
                          </div>
                        )}
                        {(lead.rejectionReason || lead.rejectionNote) && (
                          <div className="w-full">
                            {lead.rejectionReason && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                {(lead.rejectionReason || '')
                                  .split(';')
                                  .map(r => r.trim())
                                  .filter(Boolean)
                                  .map((r, idx) => (
                                    <span key={idx} className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs">
                                      {r}
                                    </span>
                                  ))}
                              </div>
                            )}
                            {lead.rejectionNote && (
                              <div className="mt-1 text-xs text-gray-600">Note: {lead.rejectionNote}</div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 justify-center items-center">
                        {lead.status === "approved for calling" ? (
                          <Badge className="bg-green-100 text-green-700">
                            Approved for calling
                          </Badge>
                        ) : (
                          <>
                            <button
                              onClick={() => approveLead(lead)}
                              disabled={isBusy}
                              className={`${buttonBase} bg-green-600 text-white hover:bg-green-700`}
                              title="Approve for calling"
                            >
                              <FiCheckCircle /> Approve
                            </button>
                            <button
                              onClick={() => markPending(lead)}
                              disabled={isBusy}
                              className={`${buttonBase} bg-gray-400 text-white hover:bg-gray-500`}
                              title="Move to bottom of pending"
                            >
                              <FiRefreshCw /> Pending
                            </button>
                            <button
                              onClick={() => nonApproveLead(lead)}
                              disabled={isBusy}
                              className={`${buttonBase} bg-yellow-500 text-white hover:bg-yellow-600`}
                              title="Move to Non-Approved bucket"
                            >
                              Non-Approved
                            </button>
                            <button
                              onClick={() => openReject(lead)}
                              disabled={isBusy}
                              className={`${buttonBase} bg-red-600 text-white hover:bg-red-700`}
                              title="Reject and send back to LG"
                            >
                              <FiXCircle /> Reject
                            </button>
                            {rejectForId === id && (
                              <div className="mt-2 p-3 border rounded-lg bg-white shadow-sm w-80">
                                <label className="block text-xs text-gray-600 mb-1">Select reasons</label>
                                <div className="space-y-1 mb-2">
                                  {REJECT_OPTIONS.map((opt) => (
                                    <label key={opt} className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={rejectReasons.includes(opt)}
                                        onChange={(e) => {
                                          setRejectReasons((prev) => {
                                            const set = new Set(prev);
                                            if (e.target.checked) set.add(opt); else set.delete(opt);
                                            return Array.from(set);
                                          });
                                        }}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                                {rejectReasons.includes('Other') && (
                                  <>
                                    <label className="block text-xs text-gray-600 mb-1">Details for "Other"</label>
                                    <input
                                      type="text"
                                      value={rejectNote}
                                      onChange={(e) => setRejectNote(e.target.value)}
                                      placeholder="Enter details"
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                    />
                                  </>
                                )}
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={cancelReject}
                                    className="px-3 py-1 text-sm rounded border bg-white hover:bg-slate-50"
                                  >Cancel</button>
                                  <button
                                    onClick={() => submitReject(lead)}
                                    disabled={rejectReasons.length === 0 || (rejectReasons.includes('Other') && !rejectNote.trim())}
                                    className="px-3 py-1 text-sm rounded bg-red-600 text-white disabled:opacity-50"
                                  >Submit</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.location || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.remarks || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.division || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.productLine || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.turnOver || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.employeeStrength || "—"}
                    </td>

                    

                    

                    
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 mt-4 bg-white border-t shadow-md p-3 flex items-center gap-3">
          <span className="text-sm text-gray-700">Bulk actions for {selected.size} selected</span>
          <button
            onClick={bulkApproveSelected}
            className={`${buttonBase} bg-green-600 text-white hover:bg-green-700`}
          >
            <FiCheckCircle /> Approve Selected
          </button>
          <button
            onClick={bulkPendingSelected}
            className={`${buttonBase} bg-gray-500 text-white hover:bg-gray-600`}
          >
            <FiRefreshCw /> Pending Selected
          </button>
          <button
            onClick={bulkNonApprovedSelected}
            className={`${buttonBase} bg-yellow-500 text-white hover:bg-yellow-600`}
          >
            Non-Approved Selected
          </button>
          <button
            onClick={openBulkReject}
            className={`${buttonBase} bg-red-600 text-white hover:bg-red-700`}
          >
            <FiXCircle /> Reject Selected
          </button>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {bulkRejectOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-4 w-[420px]">
            <div className="text-base font-semibold mb-2">Reject Selected Leads</div>
            <label className="block text-xs text-gray-600 mb-1">Select reasons</label>
            <div className="max-h-48 overflow-auto space-y-1 mb-2">
              {REJECT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rejectReasons.includes(opt)}
                    onChange={(e) => {
                      setRejectReasons((prev) => {
                        const set = new Set(prev);
                        if (e.target.checked) set.add(opt); else set.delete(opt);
                        return Array.from(set);
                      });
                    }}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {rejectReasons.includes('Other') && (
              <>
                <label className="block text-xs text-gray-600 mb-1">Details for "Other"</label>
                <input
                  type="text"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Enter details"
                  className="w-full border rounded px-2 py-1 text-sm mb-2"
                />
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={cancelBulkReject} className="px-3 py-1 text-sm rounded border bg-white hover:bg-slate-50">Cancel</button>
              <button
                onClick={submitBulkReject}
                disabled={rejectReasons.length === 0 || (rejectReasons.includes('Other') && !rejectNote.trim())}
                className="px-3 py-1 text-sm rounded bg-red-600 text-white disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-3 mt-6">
          <div className="text-sm text-gray-600">
            Showing {Math.min((page - 1) * limit + 1, globalStats.total)}–
            {Math.min(page * limit, globalStats.total)} of {globalStats.total}
          </div>
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      
    </div>
  );
}
