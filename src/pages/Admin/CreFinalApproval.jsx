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
  const [limit] = useState(10);
  const [industries, setIndustries] = useState([]);

  // Fetch leads
  const fetchLeads = async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}?page=${page}&limit=${limit}`);
      setLeads(data.data);
      setGlobalStats({ total: data.total });
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
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
    fetchLeads(page);
    fetchIndustries();
  }, [page]);

  // Approve lead
  const approveLead = async (lead) => {
    const id = lead._id;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await axios.put(`${BASE_URL}/api/admin/leads/approve/forcre/${id}`, {
        type: lead.type || "RawLead",
      });
      toast.success("Lead approved successfully");
      fetchLeads(page);
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
      fetchLeads(page);
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

      {/* Total Count */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="rounded-3xl bg-gradient-to-r from-blue-200 to-blue-400 flex flex-col items-start gap-2 p-6 mb-8"
      >
        <div className="text-sm font-medium text-blue-900 uppercase tracking-wide">
          Total Leads with Mobile
        </div>
        <div className="text-3xl md:text-4xl font-bold text-blue-900">
          {globalStats.total}
        </div>
      </motion.div>

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
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-500">
          Loading leads...
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-500">
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
                    onChange={(e) =>
                      e.target.checked ? selectAllOnPage() : clearSelection()
                    }
                    checked={leads.every((i) => selected.has(i._id))}
                  />
                </th>
                {[
                  "Name",
                  "Designation",
                  "Mobile",
                  "Email",
                  "Location",
                  "Remarks",
                  "Division",
                  "Product Line",
                  "Turnover",
                  "Employee Strength",
                  "Industry",
                  "Company",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads
                .filter(
                  (l) =>
                    l.name.toLowerCase().includes(search.toLowerCase()) ||
                    l.designation?.toLowerCase().includes(search.toLowerCase())
                )
                .map((lead) => {
                  const id = lead._id;
                  const isBusy = busyIds.has(id);
                  const isSelected = selected.has(id);
                  return (
                    <tr key={id} className={isSelected ? "bg-blue-50" : ""}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{lead.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.designation}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.mobile.join(", ")}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.email || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.location || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.remarks || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.division || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.productLine || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.turnOver || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.employeeStrength || "—"}</td>

                      {/* Industry Dropdown */}
              <td className="px-4 py-3 text-sm text-gray-600">
  {lead.isEditingIndustry ? (
    <select
      defaultValue={lead.industry || ""}
      onChange={async (e) => {
        const newIndustry = e.target.value;
        if (newIndustry === lead.industry) return;

        // Update local state immediately
        setLeads((prev) =>
          prev.map((l) =>
            l._id === lead._id ? { ...l, industry: newIndustry } : l
          )
        );

        try {
          // Send type to backend
          await axios.put(
            `${BASE_URL}/api/admin/leads/industry/update/${lead._id}`,
            { industry: newIndustry, type: lead.type } // <-- important for HR vs RawLead
          );
          toast.success("Industry updated successfully");

          // Optionally refresh leads to get updated industryName
          fetchLeads(page);
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to update industry");
        } finally {
          // Exit edit mode
          setLeads((prev) =>
            prev.map((l) =>
              l._id === lead._id ? { ...l, isEditingIndustry: false } : l
            )
          );
        }
      }}
      className="border border-gray-300 rounded px-2 py-1 text-sm"
    >
      <option value="">Select Industry</option>
      {industries.map((ind) => (
        <option key={ind._id} value={ind._id}>
          {ind.name}
        </option>
      ))}
    </select>
  ) : (
    <span
      className="cursor-pointer"
      onClick={() =>
        setLeads((prev) =>
          prev.map((l) =>
            l._id === lead._id ? { ...l, isEditingIndustry: true } : l
          )
        )
      }
    >
      {lead.industryName || "—"} {/* Show stored industry name */}
    </span>
  )}
</td>



                      <td className="px-4 py-3 text-sm text-gray-600">{lead.companyName || "—"}</td>

                      <td className="px-4 py-3 text-center flex gap-2 justify-center">
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
                            >
                              <FiCheckCircle /> Approve
                            </button>
                            <button
                              onClick={() => markPending(lead)}
                              disabled={isBusy}
                              className={`${buttonBase} bg-gray-400 text-white hover:bg-gray-500`}
                            >
                              <FiRefreshCw /> Pending
                            </button>
                          </>
                        )}
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
        <div className="flex justify-center items-center gap-4 mt-6">
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
