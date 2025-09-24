import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import { FiCheckCircle, FiRefreshCw, FiCheckSquare } from "react-icons/fi";
import { BASE_URL } from "../../config";

const API_BASE = `${BASE_URL}/api/admin/getallleads/CRE`;

const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const buttonBase =
  "px-3 py-2 rounded-xl text-sm font-medium transition focus:outline-none focus:ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1";

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

export default function CRELeadsApprovalDashboard() {
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
  });
  const [industryQuery, setIndustryQuery] = useState("");
  const [industrySearchResults, setIndustrySearchResults] = useState([]);
  const [industryLoading, setIndustryLoading] = useState(false);

  // Fetch leads
  const fetchLeads = async (page = 1, searchTerm = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchTerm) params.set("search", searchTerm);

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
      const { data } = await axios.get(
        `${BASE_URL}/api/admin/cre/lead-counts?onlyWithMobile=true`
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
  }, [page, debouncedSearch, limit]);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  // When debounced search changes, reset to first page
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Approve lead
  const approveLead = async (lead) => {
    const id = lead._id;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await axios.put(`${BASE_URL}/api/admin/leads/approve/forcre/${id}`, {
        type: lead.type || "RawLead",
      });
      toast.success("Lead approved successfully");
      fetchLeads(page, debouncedSearch);
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
      fetchLeads(page, debouncedSearch);
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
  const totalPages = Math.ceil(globalStats.total / limit);
  const handlePrevPage = () => setPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setPage((p) => Math.min(p + 1, totalPages));

  return (
    <div className="p-6 bg-gray-50 min-h-screen my-12">
      <Toaster position="top-right" />
      <AdminNavbar />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800">
          CRE Dashboard for Lead Approval
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="rounded-3xl bg-gradient-to-r from-blue-200 to-blue-400 flex flex-col items-start gap-2 p-6"
        >
          <div className="text-sm font-medium text-blue-900 uppercase tracking-wide">
            Total Leads for Approval
          </div>
          <div className="text-3xl md:text-4xl font-bold text-blue-900">
            {globalStats.total}
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
          className="rounded-3xl bg-gradient-to-r from-yellow-200 to-yellow-400 flex flex-col items-start gap-2 p-6"
        >
          <div className="text-sm font-medium text-yellow-900 uppercase tracking-wide">
            Unassigned Data CRE
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
            {[5, 10, 20, 50].map((n) => (
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
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-500">
          No leads found.
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
                    checked={leads.every((i) => selected.has(i._id))}
                  />
                </th>
                {[
                  "Name",
                  "Company",
                  "Industry",
                  "Designation",
                  "Actions",
                  "Mobile",
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
              {leads.map((lead) => {
                const id = lead._id;
                const isBusy = busyIds.has(id);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={`${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.companyName || "—"}
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

                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.designation}
                    </td>
                      <td className="px-4 py-3 text-center">
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
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.mobile.join(", ")}
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
