// ADD IMPORT
import { FaSitemap, FaUser, FaCheckCircle, FaTimesCircle, FaToggleOn, FaToggleOff } from "react-icons/fa";
import React, { useEffect, useState } from "react";
import AdminNavbar from "../../components/AdminNavbar";
import { motion } from "framer-motion";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { BASE_URL } from "../../config";

// New import
import OrgChartNode from '../../utils/OrgChartNode';

export default function AccountsApproval() {
  const [accounts, setAccounts] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: "All", status: "All" });

  const roleLevels = {
    "CRE-CRM": 1,
    "CRM-TeamLead": 2,
    "RegionalHead": 3,
    "NationalHead": 4,
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BASE_URL}/api/getall/accounts`);
      setAccounts(data);
    } catch (err) {
      toast.error("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/admin/hierarchy`);
      setHierarchy(data);
    } catch (err) {
      toast.error("Failed to fetch hierarchy");
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchHierarchy();
  }, []);

  const updateRole = async (id, role) => {
    try {
      await axios.put(`${BASE_URL}/api/role/${id}`, { role });
      toast.success("Role updated successfully");
      fetchAccounts();
      fetchHierarchy();
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  const updateAccessForCRE = async (id, leadQuota, status) => {
    try {
      const body = {};
      if (leadQuota !== undefined) body.leadQuota = leadQuota;
      if (status) body.status = status;

      await axios.put(`${BASE_URL}/api/admin/access/${id}`, body);
      toast.success("User updated successfully");
      fetchAccounts();
      fetchHierarchy();
    } catch (err) {
      toast.error("Failed to update user access");
    }
  };

  const assignUser = async (id, reportsTo) => {
    try {
      const reportsToValue = reportsTo === "" ? null : reportsTo;
      await axios.put(`${BASE_URL}/api/admin/reports/to/${id}`, { reportsTo: reportsToValue });
      toast.success("User assigned successfully");
      fetchAccounts();
      fetchHierarchy();
    } catch (err) {
      toast.error("Assignment failed");
    }
  };

  const filteredAccounts = accounts.filter((user) => {
    return (
      (filters.role === "All" || user.role === filters.role || user.as === filters.role) &&
      (filters.status === "All" || user.status === filters.status)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <Toaster position="top-right" />

      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">User Accounts</h1>

        {/* HIERARCHY VIEW */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-2">
            <FaSitemap /> Organization Hierarchy
          </h2>
          <div className="mt-2 bg-white shadow rounded-xl p-4 overflow-x-auto">
            {hierarchy.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hierarchy data available</p>
            ) : (
              <div className="flex justify-center items-start pt-8 pb-12">
                {hierarchy.map((node) => (
                  <OrgChartNode key={node._id} node={node} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filters.role}
            onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="All">All Roles</option>
            <option value="LG">LG</option>
            <option value="AdminTeam">AdminTeam</option>
            <option value="CRE-CRM">CRE-CRM</option>
            <option value="CRM-TeamLead">CRM-TeamLead</option>
            <option value="RegionalHead">RegionalHead</option>
            <option value="NationalHead">NationalHead</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="All">All Status</option>
            <option value="enable">Enabled</option>
            <option value="disable">Disabled</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading accounts...</p>
        ) : filteredAccounts.length === 0 ? (
          <p className="text-center text-gray-500">No accounts found</p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="overflow-x-auto bg-white shadow rounded-xl"
          >
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Reports To</th>
                  <th className="px-4 py-3 text-left">Lead Quota</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((user, i) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b hover:bg-gray-50"
                  >
                    {/* USER */}
                    <td className="px-4 py-3 flex items-center gap-3">
                      <FaUser className="text-blue-500 text-lg" />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>

                    {/* ROLE */}
                    <td className="px-4 py-3">
                      <select
                        value={user.role || ""}
                        onChange={(e) => updateRole(user._id, e.target.value)}
                        className="border rounded-lg px-2 py-1 text-sm w-full"
                      >
                        <option value="">Select role...</option>
                        {["CRE-CRM", "CRM-TeamLead", "RegionalHead", "NationalHead"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>

                    {/* REPORTS TO */}
                    <td className="px-4 py-3">
                      <select
                        value={user.reportsTo || ""}
                        onChange={(e) => assignUser(user._id, e.target.value)}
                        className="border rounded-lg px-2 py-1 text-sm w-full"
                      >
                        <option value="">None</option>
                        {accounts
                          .filter((u) => u._id !== user._id && roleLevels[u.role] > roleLevels[user.role])
                          .map((manager) => (
                            <option key={manager._id} value={manager._id}>
                              {manager.name} ({manager.role})
                            </option>
                          ))}
                      </select>
                    </td>

                    {/* LEAD QUOTA */}
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newQuota = (user.leadQuota || 0) - 1;
                          if (newQuota >= 0) updateAccessForCRE(user._id, newQuota, undefined);
                        }}
                        disabled={user.leadQuota <= 0}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-sm disabled:opacity-50"
                        title="Decrease Quota"
                      >
                        -
                      </button>

                      <span className="font-medium w-12 text-center">{user.leadQuota || 0}</span>

                      <button
                        onClick={() => updateAccessForCRE(user._id, (user.leadQuota || 0) + 1, undefined)}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-sm"
                        title="Increase Quota"
                      >
                        +
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={user.newLeadQuota ?? ""}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setAccounts((prev) =>
                            prev.map((u) => u._id === user._id ? { ...u, newLeadQuota: isNaN(value) ? "" : value } : u)
                          );
                        }}
                        className="border rounded-lg px-2 py-1 text-sm w-20"
                        placeholder="Add..."
                      />

                      <button
                        onClick={() => {
                          const increment = user.newLeadQuota || 0;
                          if (increment > 0) {
                            updateAccessForCRE(user._id, (user.leadQuota || 0) + increment, undefined);
                            setAccounts((prev) =>
                              prev.map((u) => (u._id === user._id ? { ...u, newLeadQuota: "" } : u))
                            );
                          }
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg text-sm"
                        title="Add custom quota"
                      >
                        Add
                      </button>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-lg font-medium ${
                          user.status === "enable" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    {/* ACTION BUTTONS */}
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      {user.status === "enable" ? (
                        <button
                          onClick={() => updateAccessForCRE(user._id, undefined, "disable")}
                          className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition"
                          title="Disable User"
                        >
                          <FaToggleOff /> Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => updateAccessForCRE(user._id, undefined, "enable")}
                          className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition"
                          title="Enable User"
                        >
                          <FaToggleOn /> Enable
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
