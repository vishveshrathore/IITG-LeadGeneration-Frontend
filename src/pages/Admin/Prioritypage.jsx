import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import AdminNavbar from "../../components/AdminNavbar";
import { FiFilter } from "react-icons/fi";

const PriorityAssignLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const leadsPerPage = 25;

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v && v.trim() !== "")
      );
      const { data } = await axios.get(
        "http://localhost:3000/api/admin/getApprovedForCallingLeads",
        { params: { ...cleanFilters, page: currentPage, limit: leadsPerPage } }
      );
      setLeads(data.leads || []);
      setTotalLeads(data.total || 0);
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
        "http://localhost:3000/api/admin/getallcre"
      );
      setCres(data.cres || []);
    } catch (err) {
      console.error("Error fetching CREs:", err);
      toast.error("Failed to fetch CREs");
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchCREs();
  }, [currentPage]);

  const handleAssign = async () => {
    if (!selectedCre) return toast.error("Please select a CRE");
    if (selectedLeads.length === 0)
      return toast.error("Please select at least one lead");

    try {
      await axios.post(
        "http://localhost:3000/api/admin/assignPriorityLeadsToCRE",
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

  const totalPages = Math.ceil(totalLeads / leadsPerPage);

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
        className="p-6 max-w-7xl mx-auto w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-3xl font-bold mb-6 text-gray-800 my-16">
          Approved Leads for Calling & Prioritize Lead
        </h2>

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
              onClick={() => setCurrentPage(1) || fetchLeads()}
              className="col-span-1 md:col-span-1 bg-blue-600 text-white px-5 py-3 rounded shadow hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <p className="p-4 text-gray-500 text-center">Loading leads...</p>
          ) : leads.length === 0 ? (
            <p className="p-4 text-gray-400 text-center">No leads found</p>
          ) : (
            <table className="w-full text-left text-sm table-auto">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Industry</th>
                  <th className="p-3">Product Line</th>
                  <th className="p-3">Employee Strength</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">CRE</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, index) => (
                  <tr
                    key={lead._id}
                    className={`${
                      index % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } hover:bg-blue-50 transition cursor-pointer ${
                      selectedLeads.includes(lead._id)
                        ? "bg-blue-100 border-l-4 border-blue-500"
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
                    <td className="p-3">{lead.name}</td>
                    <td className="p-3">{lead.designation}</td>
                    <td className="p-3">{lead.mobile?.join(", ") || "-"}</td>
                    <td className="p-3">{lead.email || "-"}</td>
                    <td className="p-3">{lead.company?.CompanyName || "-"}</td>
                    <td className="p-3">{lead.industry?.name || "-"}</td>
                    <td className="p-3">{lead.productLine || "-"}</td>
                    <td className="p-3">{lead.employeeStrength || "-"}</td>
                    <td className="p-3">{lead.location || "-"}</td>
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
                    <td className="p-3">
                      {cres.find(
                        (cre) => cre._id === lead.exclusiveToSpecificCRE
                      )?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {leads.length} of {totalLeads} leads
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PriorityAssignLeads;
