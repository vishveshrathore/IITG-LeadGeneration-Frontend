import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { BASE_URL } from "../../config";
import { toast, Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import AdminNavbar from "../../components/AdminNavbar";
import { FiFilter } from "react-icons/fi";

const PriorityAssignLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef(null);
  const [filters, setFilters] = useState({
    name: "",
    designation: "",
    email: "",
    location: "",
    remarks: "",
    division: "",
    productLine: "",
    turnOver: "",
    employeeStrength: "",
    industry: "",
    company: "",
  });
  const [cres, setCres] = useState([]);
  const [selectedCre, setSelectedCre] = useState("");
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const leadsPerPage = 50;
  const [excludeCalled, setExcludeCalled] = useState(true);
  const [excludeAlreadyAssigned, setExcludeAlreadyAssigned] = useState(false);
  const [activeTab, setActiveTab] = useState('assigned');

  const updateLeadInState = (updated) => {
    setLeads((prev) => prev.map((l) => (l._id === updated._id ? { ...l, ...updated } : l)));
  };

  const toggleBlockStatus = async (lead) => {
    try {
      const nextStatus = lead.blockStatus === 'block' ? 'unblock' : 'block';
      const { data } = await axios.put(`${BASE_URL}/api/admin/leads/block-status`, {
        leadId: lead._id,
        leadType: lead.leadType,
        blockStatus: nextStatus,
      });
      if (data?.success && data?.data) {
        updateLeadInState({ ...lead, blockStatus: nextStatus });
        toast.success(`Lead ${nextStatus}ed`);
      } else {
        toast.error('Failed to update block status');
      }
    } catch (err) {
      console.error('Error updating block status:', err);
      toast.error('Error updating block status');
    }
  };

  const fetchLeads = async (pageOverride = 1, append = false) => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v && v.trim() !== "")
      );
      // Fetch all approved leads from backend for accurate per-tab counts
      const { data } = await axios.get(
        `${BASE_URL}/api/admin/getApprovedForCallingLeads`,
        {
          params: {
            ...cleanFilters,
            fetchAll: true, // Get all approved leads
          },
        }
      );
      const allLeads = data.leads || [];
      setLeads((prev) => (append ? [...prev, ...allLeads] : allLeads));
      setTotalLeads(data.total || 0);
      setHasMore(false); // No more pages when fetching all
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching leads:", err);
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchCREs = async () => {
    try {
      const { data } = await axios.get(
        `${BASE_URL}/api/admin/getallcre`
      );
      setCres(data.cres || []);
    } catch (err) {
      console.error("Error fetching CREs:", err);
      toast.error("Failed to fetch CREs");
    }
  };

  // Reset and fetch leads when filters, tab, or exclude flags change
  useEffect(() => {
    setLeads([]);
    setHasMore(false);
    setCurrentPage(1);
    fetchLeads(1, false);
  }, [excludeCalled, excludeAlreadyAssigned, activeTab]);

  // Initial load
  useEffect(() => {
    fetchCREs();
  }, []);

  const handleAssign = async () => {
    if (!selectedCre) return toast.error("Please select a CRE");
    if (selectedLeads.length === 0)
      return toast.error("Please select at least one lead");

    try {
      await axios.post(
        `${BASE_URL}/api/admin/assignPriorityLeadsToCRE`,
        { leadIds: selectedLeads, creId: selectedCre }
      );
      toast.success("Leads assigned successfully!");
      setSelectedLeads([]);
      fetchLeads();
    } catch (err) {
      console.error("Error assigning leads:", err);
      toast.error("Failed to assign leads");
    }
  };

  const toggleLeadSelection = (id) => {
    setSelectedLeads((prev) =>
      prev.includes(id)
        ? prev.filter((leadId) => leadId !== id)
        : [...prev, id]
    );
  };

  const filteredLeads = leads.filter((l) =>
    activeTab === 'assigned'
      ? (l.exclusiveToSpecificCRE || l.calledByCre)
      : (!l.exclusiveToSpecificCRE && !l.calledByCre)
  );
  const displayLeads = filteredLeads;

  const resetFilters = () => {
    setFilters({
      name: "",
      designation: "",
      email: "",
      location: "",
      remarks: "",
      division: "",
      productLine: "",
      turnOver: "",
      employeeStrength: "",
      industry: "",
      company: "",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <Toaster position="top-right" />

      <motion.div
        className="p-6 w-full mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-3xl font-bold mb-6 text-gray-800 my-16">
          Approved Leads for Calling & Prioritize Lead
        </h2>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 rounded-lg border ${activeTab === 'assigned' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            CRE (Priority) & Called
          </button>
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`px-4 py-2 rounded-lg border ${activeTab === 'unassigned' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            Unassigned
          </button>
        </div>

        {/* Filters and CRE Assign Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4 flex-wrap">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow transition"
          >
            <FiFilter /> {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={resetFilters}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg shadow transition"
          >
            Reset Filters
          </button>

          {/* Exclude toggles */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={excludeCalled}
              onChange={(e) => { setExcludeCalled(e.target.checked); setCurrentPage(1); }}
            />
            Exclude already called (assigned to CRE)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={excludeAlreadyAssigned}
              onChange={(e) => { setExcludeAlreadyAssigned(e.target.checked); setCurrentPage(1); }}
            />
            Exclude already priority-assigned
          </label>

          {/* CRE Dropdown + Assign Button */}
          <select
            value={selectedCre}
            onChange={(e) => setSelectedCre(e.target.value)}
            className="p-3 border rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full md:w-auto"
          >
            <option value="">Select CRE</option>
            {cres.map((cre) => (
              <option key={cre._id} value={cre._id}>
                {cre.name} ({cre.email})
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedCre || selectedLeads.length === 0}
            className={`px-6 py-3 rounded-lg text-white font-semibold transition w-full md:w-auto ${
              !selectedCre || selectedLeads.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Assign to CRE
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.keys(filters).map((key) => (
              <input
                key={key}
                type="text"
                placeholder={`Filter by ${key}`}
                value={filters[key]}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
                className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            ))}
            <button
              onClick={() => { setCurrentPage(1); fetchLeads(1); }}
              className="col-span-1 md:col-span-1 bg-blue-600 text-white px-5 py-3 rounded shadow hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* Leads Table */}
        <div
          ref={scrollContainerRef}
          className="bg-white rounded-xl shadow overflow-hidden"
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          {loading && leads.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">Loading leads...</p>
          ) : displayLeads.length === 0 && !loading ? (
            <p className="p-4 text-gray-400 text-center">No leads found</p>
          ) : (
            <div className="w-full">
              <table className="min-w-full w-full table-auto text-left text-xs md:text-sm">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
                <tr>
                  <th className="p-3 whitespace-normal break-words">#</th>
                  <th className="p-3 whitespace-normal break-words">Name</th>
                  <th className="p-3 whitespace-normal break-words">Designation</th>
                  <th className="p-3 whitespace-normal break-words">Company</th>
                  <th className="p-3 whitespace-normal break-words">Mobile</th>
                  <th className="p-3 whitespace-normal break-words">Email</th>
                  <th className="p-3 whitespace-normal break-words">Industry</th>
                  <th className="p-3 whitespace-normal break-words">Product Line</th>
                  <th className="p-3 whitespace-normal break-words">Employee Strength</th>
                  <th className="p-3 whitespace-normal break-words">Location</th>
                  <th className="p-3 whitespace-normal break-words">Status</th>
                  <th className="p-3 whitespace-normal break-words">CRE (Priority)</th>
                  <th className="p-3 whitespace-normal break-words">Called By CRE</th>
                  <th className="p-3 whitespace-normal break-words">Block Status</th>
                </tr>
                </thead>
                <tbody>
                {displayLeads.map((lead, index) => (
                  <tr
                    key={lead._id}
                    style={{ backgroundColor: lead.exclusiveToSpecificCRE ? '#46e251ff' : (lead.calledByCre ? '#46e251ff' : undefined) }}
                    className={`${
                      index % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } ${ (!lead.exclusiveToSpecificCRE && !lead.calledByCre && lead.blockStatus === 'block') ? 'bg-red-50' : '' } ${ (!lead.exclusiveToSpecificCRE && !lead.calledByCre) ? 'hover:bg-blue-50' : '' } transition cursor-pointer ${
                      selectedLeads.includes(lead._id)
                        ? "border-l-4 border-blue-500"
                        : ""
                    }`}
                    onClick={() => toggleLeadSelection(lead._id)}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => toggleLeadSelection(lead._id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3 whitespace-normal break-words">{lead.name}
                      {(lead.exclusiveToSpecificCRE || lead.calledByCre) && (
                        <span className="ml-2 inline-flex gap-1 align-middle">
                          {lead.exclusiveToSpecificCRE && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">Priority</span>
                          )}
                          {lead.calledByCre && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px]">Called</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-normal break-words">{lead.designation}</td>
                    <td className="p-3 whitespace-normal break-words">{lead.company?.CompanyName || "-"}</td>
                    <td className="p-3 whitespace-normal break-words">{lead.mobile?.join(", ") || "-"}</td>
                    <td className="p-3 whitespace-normal break-words">{lead.email || "-"}</td>
                    <td className="p-3 whitespace-normal break-words">{lead.industry?.name || "-"}</td>
                    <td className="p-3 whitespace-normal break-words">{lead.productLine || "-"}</td>
                    <td className="p-3 whitespace-normal break-words">{lead.employeeStrength || "-"}</td>
                    <td className="p-3 whitespace-normal break-words">{lead.location || "-"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          lead.status === "approved for calling"
                            ? "bg-green-100 text-green-700"
                            : lead.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {lead.status || "N/A"}
                      </span>
                    </td>
                    <td className="p-3 whitespace-normal break-words">
                      {lead.exclusiveToSpecificCRE?.name ||
                        cres.find((cre) => String(cre._id) === String(lead.exclusiveToSpecificCRE?._id || lead.exclusiveToSpecificCRE))?.name ||
                        "-"}
                    </td>
                    <td className="p-3 whitespace-normal break-words">{lead.calledByCre?.name || "-"}</td>
                    <td className="p-3 whitespace-normal break-words">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mr-2 ${
                        lead.blockStatus === 'block' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {lead.blockStatus || 'unblock'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBlockStatus(lead); }}
                        className={`px-3 py-1 rounded text-white text-xs ${
                          lead.blockStatus === 'block' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {lead.blockStatus === 'block' ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {displayLeads.length} of {totalLeads} leads
          </div>
          {displayLeads.length > 0 && (
            <div className="text-sm text-gray-500">
              {activeTab === 'assigned' ? 'Assigned' : 'Unassigned'} tab
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PriorityAssignLeads;
