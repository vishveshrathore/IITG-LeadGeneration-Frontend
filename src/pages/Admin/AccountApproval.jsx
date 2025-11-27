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

// Lightweight, self-contained searchable multi-select dropdown for managers
function ManagerMultiSelect({ user, accounts, roleLevels, valueIds, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // Eligible managers: strictly higher role and not the user
  const eligible = React.useMemo(() => (
    accounts.filter(u => String(u._id) !== String(user._id) && roleLevels[u.role] > roleLevels[user.role])
  ), [accounts, user._id, user.role, roleLevels]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(m => `${m.name||''} ${m.email||''} ${m.role||''}`.toLowerCase().includes(q));
  }, [eligible, query]);

  const selected = Array.isArray(valueIds) ? valueIds.map(String) : (valueIds ? [String(valueIds)] : []);
  const primaryId = selected[0];

  const toggle = (mid) => {
    const next = selected.includes(mid)
      ? selected.filter(id => id !== mid)
      : [...selected, mid];
    onChange(next);
  };

  const makePrimary = (mid) => {
    if (!selected.includes(mid)) return onChange([mid, ...selected]);
    const rest = selected.filter(id => id !== mid);
    onChange([mid, ...rest]);
  };

  const selectAll = () => onChange(filtered.map(m => String(m._id)));
  const clearAll = () => onChange([]);

  const primaryName = (() => {
    const m = accounts.find(a => String(a._id) === String(primaryId));
    return m ? `${m.name} (${m.role})` : null;
  })();
  const summary = selected.length === 0
    ? 'Select managers'
    : primaryName ? `Primary: ${primaryName} · +${selected.length - 1}` : `${selected.length} selected`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 flex items-center justify-between"
      >
        <span className="truncate text-gray-700">{summary}</span>
        <span className="ml-2 text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border bg-white shadow-lg">
          {/* Search */}
          <div className="p-2 border-b bg-gray-50 rounded-t-lg">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name/email/role"
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="px-2 py-1 flex items-center gap-2 text-xs text-gray-600">
            <button className="px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100" onClick={selectAll}>Select all</button>
            <button className="px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100" onClick={clearAll}>Clear</button>
            <span className="ml-auto">{filtered.length} option(s)</span>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-auto p-2">
            {filtered.length === 0 ? (
              <div className="text-xs text-gray-500 px-2 py-2">No results</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filtered.map(m => {
                  const mid = String(m._id);
                  const isSel = selected.includes(mid);
                  return (
                    <button
                      type="button"
                      key={mid}
                      onClick={() => toggle(mid)}
                      className={`text-xs px-2 py-1 rounded border transition ${isSel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      title={isSel ? 'Click to remove' : 'Click to add'}
                    >
                      {m.name} ({m.role})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer: selected preview with primary marker and set-primary */}
          {selected.length > 0 && (
            <div className="p-2 border-t bg-gray-50 rounded-b-lg">
              <div className="mb-1 text-[11px] text-gray-600">Primary determines where the user appears in the org chart.</div>
              <div className="flex flex-wrap gap-1">
                {selected.map(mid => {
                  const mm = accounts.find(a => String(a._id) === String(mid));
                  const isPrimary = String(mid) === String(primaryId);
                  return (
                    <span key={mid} className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${isPrimary ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-100'}`}>
                      {isPrimary ? '★' : '☆'} {mm ? `${mm.name} (${mm.role})` : mid}
                      {!isPrimary && (
                        <button className="text-blue-600 hover:underline" onClick={() => makePrimary(mid)}>Make primary</button>
                      )}
                      <button className="text-gray-500 hover:text-gray-700" onClick={() => toggle(mid)}>×</button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountsApproval() {
  const [accounts, setAccounts] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: "All", status: "All" });
  // Per-user search text for manager list
  const [managerSearch, setManagerSearch] = useState({});
  // Global search across name/email
  const [searchQuery, setSearchQuery] = useState("");
  const [creUsageByUser, setCreUsageByUser] = useState({});

  const roleLevels = {
    "CRE-CRM": 1,
    "CRM-TeamLead": 2,
    "DeputyCRMTeamLead": 2,
    "RegionalHead": 3,
    "DeputyRegionalHead": 3,
    "NationalHead": 4,
    "DeputyNationalHead": 4,
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BASE_URL}/api/getall/accounts`);
      setAccounts(data);
      try {
        const usageRes = await axios.get(`${BASE_URL}/api/admin/cre/current-usage`);
        if (usageRes?.data?.success && usageRes.data.data) {
          setCreUsageByUser(usageRes.data.data);
        } else {
          setCreUsageByUser({});
        }
      } catch {
        setCreUsageByUser({});
      }
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

  // Build hierarchy on client (single primary parent, keep managerRefs)
  const buildHierarchyClient = (usersRaw) => {
    try {
      const users = (usersRaw || [])
        .filter(u => u.role !== 'Admin')
        .map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          reportsTo: u.reportsTo
        }));
      const map = {};
      const tree = [];
      users.forEach(u => { map[String(u._id)] = { ...u, children: [], managerRefs: [] }; });
      const rootSet = new Set();
      users.forEach(u => {
        const id = String(u._id);
        const parentIds = Array.isArray(u.reportsTo)
          ? u.reportsTo.map(p => p && String(p)).filter(Boolean)
          : (u.reportsTo ? [String(u.reportsTo)] : []);
        const mgrRefs = parentIds
          .map(pid => map[pid])
          .filter(Boolean)
          .map(ref => ({ _id: ref._id, name: ref.name, role: ref.role }));
        map[id].managerRefs = mgrRefs;
        let attached = false;
        for (const pid of parentIds) {
          if (map[pid]) { map[pid].children.push(map[id]); attached = true; break; }
        }
        if (!attached && !rootSet.has(id)) { rootSet.add(id); tree.push(map[id]); }
      });
      return tree;
    } catch { return []; }
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

  const assignUser = async (id, reportsToArray) => {
    try {
      // Normalize: empty → null, string → [string], keep array otherwise
      let payload;
      if (Array.isArray(reportsToArray)) {
        payload = reportsToArray.filter(Boolean);
      } else if (!reportsToArray || reportsToArray === "") {
        payload = [];
      } else {
        payload = [String(reportsToArray)];
      }

      await axios.put(`${BASE_URL}/api/admin/reports/to/${id}`, { reportsTo: payload.length ? payload : null });
      toast.success("User assigned successfully");
      // Optimistic UI update for accounts and hierarchy (no refresh)
      setAccounts(prev => {
        const next = prev.map(u => (
          String(u._id) === String(id)
            ? { ...u, reportsTo: payload }
            : u
        ));
        setHierarchy(buildHierarchyClient(next));
        return next;
      });
    } catch (err) {
      toast.error("Assignment failed");
    }
  };

  const filteredAccounts = accounts.filter((user) => {
    const roleOk = (filters.role === "All" || user.role === filters.role || user.as === filters.role);
    const statusOk = (filters.status === "All" || user.status === filters.status);
    const q = searchQuery.trim().toLowerCase();
    const searchOk = !q || `${user.name||""} ${user.email||""} ${user.role||""}`.toLowerCase().includes(q);
    return roleOk && statusOk && searchOk;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <Toaster position="top-right" />

      <div className="p-4 md:p-6 max-w-none w-full">
        <h1 className="text-2xl font-bold mb-6">User Accounts</h1>

        {/* HIERARCHY VIEW */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-2">
            <FaSitemap /> Organization Hierarchy
          </h2>
          <div className="mt-2 bg-white shadow rounded-xl p-4 overflow-x-hidden w-full">
            {hierarchy.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hierarchy data available</p>
            ) : (
              <div className="flex justify-center items-start pt-8 pb-12 w-full">
                {hierarchy.map((node) => (
                  <OrgChartNode key={node._id} node={node} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={filters.role}
            onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="All">All Roles</option>
            <option value="CRE-CRM">CRE-CRM</option>
            <option value="CRM-TeamLead">CRM-TeamLead</option>
            <option value="DeputyCRMTeamLead">DeputyCRMTeamLead</option>
            <option value="RegionalHead">RegionalHead</option>
            <option value="DeputyRegionalHead">DeputyRegionalHead</option>
            <option value="NationalHead">NationalHead</option>
            <option value="DeputyNationalHead">DeputyNationalHead</option>
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

          <input
            value={searchQuery}
            onChange={(e)=> setSearchQuery(e.target.value)}
            placeholder="Search by name/email/role"
            className="border px-3 py-2 rounded-lg flex-1 min-w-[200px]"
          />
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
            className="overflow-x-auto bg-white shadow rounded-xl w-full"
          >
            <table className="min-w-full w-full table-fixed">
              <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left w-[22%]">User</th>
                  <th className="px-4 py-3 text-left w-[14%]">Role</th>
                  <th className="px-4 py-3 text-left w-[30%]">Reports To</th>
                  <th className="px-4 py-3 text-left w-[16%]">
                    <div className="flex flex-col">
                      <span>Lead Usage / Quota</span>
                      <span className="text-[11px] text-gray-500 font-normal">Current in use vs allowed</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left w-[10%]">Status</th>
                  <th className="px-4 py-3 text-center w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((user, i) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`border-b hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
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
                        {["CRE-CRM", "CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {user.role && (
                        <div className="mt-1 text-xs inline-flex items-center px-2 py-0.5 rounded bg-blue-50 border text-blue-700">
                          {user.role}
                        </div>
                      )}
                    </td>

                    {/* REPORTS TO (visible chips + editor dropdown) */}
                    <td className="px-4 py-3">
                      {/* Always-visible list of current managers */}
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 mb-1">Reporting to</div>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const ids = Array.isArray(user.reportsTo) ? user.reportsTo : (user.reportsTo ? [user.reportsTo] : []);
                            if (ids.length === 0) return <span className="text-xs text-gray-400">None</span>;
                            return ids.map((mid) => {
                              const m = accounts.find((a) => String(a._id) === String(mid));
                              return (
                                <span key={String(mid)} className="text-xs px-2 py-0.5 rounded bg-gray-100 border" title={m ? `${m.name} · ${m.role}` : String(mid)}>
                                  {m ? `${m.name} (${m.role})` : String(mid)}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Editor dropdown for changes */}
                      <ManagerMultiSelect
                        user={user}
                        accounts={accounts}
                        roleLevels={roleLevels}
                        valueIds={user.reportsTo}
                        onChange={(next) => assignUser(user._id, next)}
                      />
                    </td>

                    {/* LEAD QUOTA */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newQuota = (user.leadQuota || 0) - 1;
                            if (newQuota >= 0) updateAccessForCRE(user._id, newQuota, undefined);
                          }}
                          disabled={user.leadQuota <= 0}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs md:text-sm disabled:opacity-50"
                          title="Decrease Quota"
                        >
                          -
                        </button>

                        <div className="flex flex-col items-center justify-center px-2">
                          <span className="font-semibold text-sm">
                            {(creUsageByUser[String(user._id)] || 0)} / {user.leadQuota || 0}
                          </span>
                          <span className="text-[11px] text-gray-500">in use / allowed</span>
                        </div>

                        <button
                          onClick={() => updateAccessForCRE(user._id, (user.leadQuota || 0) + 1, undefined)}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-xs md:text-sm"
                          title="Increase Quota"
                        >
                          +
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
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
                          className="border rounded-lg px-2 py-1 text-xs md:text-sm w-20"
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
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs md:text-sm"
                          title="Add custom quota"
                        >
                          Add
                        </button>
                      </div>
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
