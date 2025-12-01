import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import { BASE_URL } from "../../config";
import { useAuth } from "../../context/AuthContext";

const STATUS_LABELS = {
  enable: "Enabled",
  disable: "Disabled",
};

const roleOptions = [
  "All",
  "CRE-CRM",
  "CRM-TeamLead",
  "DeputyCRMTeamLead",
  "RegionalHead",
  "DeputyRegionalHead",
  "NationalHead",
  "DeputyNationalHead",
  "LG",
  "AdminTeam",
  "DataAnalyst",
];

export default function FrontendAccounts() {
  const { authToken } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [leadUsage, setLeadUsage] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ role: "All", status: "All", search: "" });
  const [transferPayload, setTransferPayload] = useState({
    fromUserId: "",
    toUserId: "",
    includeTypes: ["raw", "hr", "cre"],
  });
  const [transferInProgress, setTransferInProgress] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const [accountsRes, usageRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/getall/accounts`),
        axios.get(`${BASE_URL}/api/admin/cre/current-usage`, {
          headers: { Authorization: authToken ? `Bearer ${authToken}` : undefined },
        }),
      ]);
      setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
      setLeadUsage((usageRes.data && usageRes.data.data) || {});
    } catch (err) {
      console.error(err);
      toast.error("Failed to load frontend accounts or lead counts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return accounts.filter((user) => {
      if (filters.role !== "All" && user.role !== filters.role) return false;
      if (filters.status !== "All" && (user.status || "").toLowerCase() !== filters.status) return false;
      if (!query) return true;
      return `${user.name || ""} ${user.email || ""}`.toLowerCase().includes(query);
    });
  }, [accounts, filters]);

  const totalLeads = useMemo(() => Object.values(leadUsage).reduce((sum, value) => sum + (Number(value) || 0), 0), [leadUsage]);
  const totalUsers = accounts.length;

  const topAccounts = useMemo(() => {
    return filtered
      .map((user) => ({
        ...user,
        leads: Number(leadUsage[user._id]) || 0,
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 3);
  }, [filtered, leadUsage]);

  const toggleStatus = async (user) => {
    const nextStatus = (user.status || "disable") === "enable" ? "disable" : "enable";
    try {
      await axios.put(`${BASE_URL}/api/admin/access/${user._id}`, { status: nextStatus });
      toast.success(`User ${nextStatus === "enable" ? "enabled" : "disabled"}`);
      setAccounts((prev) => prev.map((acct) => (String(acct._id) === String(user._id) ? { ...acct, status: nextStatus } : acct)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const { fromUserId, toUserId, includeTypes } = transferPayload;
    if (!fromUserId || !toUserId) {
      toast.error("Select both source and destination users.");
      return;
    }
    if (fromUserId === toUserId) {
      toast.error("Source and destination must be different.");
      return;
    }
    if (!authToken) {
      toast.error("You must be logged in to transfer leads.");
      return;
    }
    setTransferInProgress(true);
    try {
      await axios.post(`${BASE_URL}/api/admin/users/leads/transfer`, {
        fromUserId,
        toUserId,
        includeTypes,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Leads/accounts transferred successfully.");
      setTransferPayload((prev) => ({ ...prev, fromUserId: "", toUserId: "" }));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Transfer failed.");
    } finally {
      setTransferInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <Toaster position="top-right" />
      <div className="pt-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-900 text-white p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-wide text-indigo-200/80">Manage CRE/CRM accounts</p>
                <h1 className="text-3xl font-semibold">Accounts Transfer</h1>
                <p className="text-indigo-100 text-sm mt-1">Visualize lead ownership and move data as people change roles.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-white/70">Total accounts</p>
                  <p className="text-2xl font-semibold">{totalUsers}</p>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-white/70">Total Leads Consumed</p>
                  <p className="text-2xl font-semibold">{totalLeads}</p>
                </div>
          
              </div>
            </div>
          
          </div>
          <div className="flex flex-wrap gap-3 text-sm mb-4">
            <select
              value={filters.role}
              onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
              className="border rounded-lg px-3 py-2 bg-white"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="border rounded-lg px-3 py-2 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="enable">Enabled</option>
              <option value="disable">Disabled</option>
            </select>
            <input
              type="text"
              placeholder="Search name or email"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="border rounded-lg px-3 py-2 bg-white w-full md:w-64"
            />
          </div>
          <form onSubmit={handleTransfer} className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 space-y-3 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block text-sm font-medium text-gray-600">From (departing user)</label>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={transferPayload.fromUserId}
                  onChange={(e) => setTransferPayload((prev) => ({ ...prev, fromUserId: e.target.value }))}
                  className="border rounded-lg px-3 py-2 bg-white w-full"
                >
                  <option value="">Select source user</option>
                  {accounts.map((acct) => (
                    <option key={acct._id} value={acct._id}>
                      {acct.name} ({acct.role})
                    </option>
                  ))}
                </select>
                <select
                  value={transferPayload.toUserId}
                  onChange={(e) => setTransferPayload((prev) => ({ ...prev, toUserId: e.target.value }))}
                  className="border rounded-lg px-3 py-2 bg-white w-full"
                >
                  <option value="">Select destination user</option>
                  {accounts.filter((acct) => acct._id !== transferPayload.fromUserId).map((acct) => (
                    <option key={acct._id} value={acct._id}>
                      {acct.name} ({acct.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center text-sm text-gray-600">
              {[{ key: "cre", label: "CRE assignments" }].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={transferPayload.includeTypes.includes(opt.key)}
                    onChange={(e) => {
                      setTransferPayload((prev) => {
                        const has = prev.includeTypes.includes(opt.key);
                        const next = has
                          ? prev.includeTypes.filter((t) => t !== opt.key)
                          : [...prev.includeTypes, opt.key];
                        return { ...prev, includeTypes: next };
                      });
                    }}
                  />
                  {opt.label}
                </label>
              ))}
              <button
                type="submit"
                disabled={transferInProgress}
                className="ml-auto bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                {transferInProgress ? "Transferring..." : "Transfer Leads"}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        Loading accounts...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No accounts match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => (
                      <tr key={user._id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-900">{user.name || "—"}</td>
                        <td className="px-4 py-3">{user.email || "—"}</td>
                        <td className="px-4 py-3">{user.role || "—"}</td>
                        <td className="px-4 py-3 font-semibold">{leadUsage[user._id] ?? 0}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${user.status === "enable" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
                          >
                            {STATUS_LABELS[(user.status || "disable").toLowerCase()] || "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => toggleStatus(user)}
                            className="text-sm font-semibold text-slate-900 hover:underline"
                          >
                            {user.status === "enable" ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
