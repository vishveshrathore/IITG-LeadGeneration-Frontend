import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import { FiCheckCircle, FiRefreshCw, FiCheckSquare, FiMail, FiPhone, FiSmartphone, FiHome, FiUser } from "react-icons/fi";
import { FaIdCard } from "react-icons/fa";
import { BASE_URL } from "../../config";



export default function LGAccessControl() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState({}); // { [id]: boolean }
  const [detailItem, setDetailItem] = useState(null); // modal data
  const ROLE_OPTIONS = [
    { value: 'LG', label: 'LG' },
    { value: 'AdminTeam', label: 'AdminTeam' },
    { value: 'CRE-CRM', label: 'CRE-CRM' },
    { value: 'CRM-TeamLead', label: 'CRM-TeamLead' },
    { value: 'DeputyCRMTeamLead', label: 'DeputyCRMTeamLead' },
    { value: 'RegionalHead', label: 'RegionalHead' },
    { value: 'DeputyRegionalHead', label: 'DeputyRegionalHead' },
    { value: 'NationalHead', label: 'NationalHead' },
    { value: 'DeputyNationalHead', label: 'DeputyNationalHead' },
    { value: 'DataAnalyst', label: 'DataAnalyst' },
    // HR roles: keep stored values, update display labels
    { value: 'HR Operations', label: 'Manager Operation' },
    { value: 'HR Recruiter', label: 'Recruiter' },
    { value: 'Recruitment / QC Manager', label: 'QC Manager' },
  ];
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Helper: initials for avatar fallback
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || '').join('') || '?';
  };

  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text || ''); toast.success('Copied'); } catch { toast.error('Copy failed'); }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const primaryUrl = `${BASE_URL}/api/getall/accounts/lg`;
      let res;
      try {
        res = await axios.get(primaryUrl);
      } catch (err) {
        // If production doesn't have the route yet, fallback to local dev server
        if (err?.response?.status === 404) {
          const fallbackUrl = `http://localhost:3000/api/getall/accounts/lg`;
          try {
            res = await axios.get(fallbackUrl);
            toast("Using local API fallback for LG list", { icon: "ℹ️" });
          } catch (e2) {
            throw new Error(`404 on ${primaryUrl} and fallback failed on ${fallbackUrl}`);
          }
        } else {
          throw err;
        }
      }
      const data = res?.data;
      // Try to normalize different possible shapes
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setItems(list);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Something went wrong while loading LG accounts.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateRole = async (id, role) => {
    try {
      await axios.put(`${BASE_URL}/api/role/${id}`, { role });
      toast.success('Role updated');
      fetchAll();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to update role';
      toast.error(msg);
    }
  };

  const onToggle = async (item) => {
    const id = item?._id || item?.id;
    if (!id) return;

    // Determine current enabled flag; support multiple possible field names
    const currentEnabled = !!(item?.enabled ?? item?.isEnabled ?? item?.active ?? item?.status === "enable");
    const nextEnabled = !currentEnabled;

    // Optimistic update
    setToggling((t) => ({ ...t, [id]: true }));
    const prevItems = items;
    setItems((prev) =>
      prev.map((it) => (it._id === id || it.id === id ? { ...it, enabled: nextEnabled, isEnabled: nextEnabled, active: nextEnabled, status: nextEnabled ? "enable" : "disable" } : it))
    );

    try {
      const primaryUrl = `${BASE_URL}/api/getall/accounts/lg/${id}`;
      try {
        await axios.put(primaryUrl, { enabled: nextEnabled });
      } catch (err) {
        if (err?.response?.status === 404) {
          const fallbackUrl = `http://localhost:3000/api/getall/accounts/lg/${id}`;
          try {
            await axios.put(fallbackUrl, { enabled: nextEnabled });
            toast("Using local API fallback for status update", { icon: "ℹ️" });
          } catch (e2) {
            throw new Error(`404 on ${primaryUrl} and fallback failed on ${fallbackUrl}`);
          }
        } else {
          throw err;
        }
      }
      toast.success(`LG ${nextEnabled ? "enabled" : "disabled"} successfully.`);
    } catch (e) {
      // Rollback
      setItems(prevItems);
      const msg = e?.response?.data?.message || e?.message || "Failed to update access status.";
      setError(msg);
      toast.error(msg);
    } finally {
      setToggling((t) => ({ ...t, [id]: false }));
      // Refresh to ensure we have server truth
      fetchAll();
    }
  };

  // Derived list with filters applied
  const filteredItems = items.filter((r) => {
    const txt = search.trim().toLowerCase();
    if (txt) {
      const hay = [r?.name, r?.fullName, r?.email, r?.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(txt)) return false;
    }
    if (roleFilter) {
      if ((r?.role || "") !== roleFilter) return false;
    }
    return true;
  });

  // no memoized columns; table is rendered inline below

  return (
    <div style={{ padding: 0 }}>
      <AdminNavbar />
      <Toaster position="top-right" />
      <div style={{ padding: 16, marginTop: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 10 }}>Access Control</h2>
              <p style={{ marginTop: 4, color: "#666" }}>Manage access for Local Guides. Use the toggle to enable/disable accounts.</p>
            </div>
            <button onClick={fetchAll} disabled={loading} style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <FiRefreshCw style={{ rotate: loading ? "180deg" : "0deg", transition: "transform 0.2s ease" }} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, mobile..."
              style={{ minWidth: 220, padding: "6px 10px", borderRadius: 8, border: "1px solid #d4d4d4", fontSize: 13 }}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ minWidth: 180, padding: "6px 10px", borderRadius: 8, border: "1px solid #d4d4d4", fontSize: 13 }}
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {(search || roleFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setRoleFilter(""); }}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d4d4d4", background: "#f9fafb", fontSize: 13 }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div style={{ color: "#b00020", marginTop: 12 }}>Error: {error}</div>
        ) : null}

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Name</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Email</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Mobile</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Role</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Status</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: "#666" }}>Loading accounts...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: "#666" }}>No accounts found.</td>
                </tr>
              ) : (
                filteredItems.map((r) => {
                  const id = r?._id || r?.id;
                  const enabled = !!(r?.enabled ?? r?.isEnabled ?? r?.active ?? r?.status === "enable");
                  const busy = !!toggling[id];
                  return (
                    <motion.tr key={id} style={{ borderBottom: "1px solid #f3f3f3" }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>{r?.name || r?.fullName || "-"}</td>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>{r?.email || "-"}</td>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>{r?.mobile || ""}</td>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>
                        {(() => {
                          const currentRole = r?.role || '';
                          const hasCurrentInList = currentRole && ROLE_OPTIONS.some((opt) => opt.value === currentRole);
                          return (
                            <select
                              value={currentRole}
                              onChange={(e) => updateRole(id, e.target.value)}
                              style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #ccc' }}
                            >
                              <option value="">Select role...</option>
                              {!hasCurrentInList && currentRole && (
                                <option value={currentRole}>{currentRole}</option>
                              )}
                              {ROLE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 12,
                            background: enabled ? "#e6ffed" : "#fff5f5",
                            color: enabled ? "#137333" : "#a50e0e",
                            border: `1px solid ${enabled ? "#a6f3c8" : "#ffc6c6"}`,
                          }}
                        >
                          <FiCheckCircle />
                          {enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>
                        <button
                          onClick={() => onToggle(r)}
                          disabled={busy}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #ccc",
                            background: busy ? "#eee" : enabled ? "#fff5f5" : "#e6ffed",
                            color: enabled ? "#a50e0e" : "#137333",
                            cursor: busy ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            marginRight: 6,
                          }}
                        >
                          <FiCheckSquare />
                          {busy ? "Updating..." : enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => setDetailItem(r)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #ccc",
                            background: "#f8fafc",
                            color: "#0f172a",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          View Details
                        </button>
                        {/* Role editing is now inline via the Role select */}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Details Modal */}
        {detailItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', width: 'min(980px, 96vw)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
              {/* Header */}
              <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 5, padding: 18, borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Passport-size image / avatar */}
                  <div style={{ width: 150, height: 150, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {detailItem?.profilePic ? (
                      <img src={detailItem.profilePic} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontWeight: 700, fontSize: 22, color: '#334155' }}>{getInitials(detailItem?.name || detailItem?.fullName)}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>{detailItem?.name || detailItem?.fullName || '-'}</div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiMail />
                      <span>{detailItem?.email || '-'}</span>
                      {detailItem?.email && (
                        <button onClick={() => copyToClipboard(detailItem.email)} style={{ fontSize: 11, border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: 999, background: '#f8fafc' }}>Copy</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>{detailItem?.role || '-'}</span>
                      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: (detailItem?.status === 'enable' || detailItem?.enabled) ? '#dcfce7' : '#fee2e2', color: (detailItem?.status === 'enable' || detailItem?.enabled) ? '#166534' : '#991b1b', border: '1px solid #bbf7d0' }}>
                        {(detailItem?.status || (detailItem?.enabled ? 'enable' : 'disable'))}
                      </span>
                      {detailItem?.employeeId && (
                        <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#fafaf9', color: '#1f2937', border: '1px solid #e5e7eb' }}>Employee ID: {detailItem.employeeId}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => window.print()} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#0f172a' }}>Print</button>
                  <button onClick={() => setDetailItem(null)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#0ea5e9', color: '#fff' }}>Close</button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Basic Info Card */}
                  <div style={{ border: '1px solid #eef2f7', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}><FiUser /> Basic Info</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 6, columnGap: 8, fontSize: 14 }}>
                      <div style={{ color: '#64748b' }}>Email</div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiMail /> {detailItem?.email || '-'} {detailItem?.email && (<button onClick={() => copyToClipboard(detailItem.email)} style={{ fontSize: 11, border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: 999, background: '#f8fafc' }}>Copy</button>)}</div>
                      <div style={{ color: '#64748b' }}>Mobile</div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiPhone /> {detailItem?.mobile || '-'} {detailItem?.mobile && (<button onClick={() => copyToClipboard(detailItem.mobile)} style={{ fontSize: 11, border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: 999, background: '#f8fafc' }}>Copy</button>)}</div>
                      <div style={{ color: '#64748b' }}>Alt Mobile</div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiSmartphone /> {detailItem?.altMobile || '-'}</div>
                      <div style={{ color: '#64748b' }}>Lead Quota</div><div>{detailItem?.leadQuota ?? 0}</div>
                    </div>
                  </div>

                  {/* IDs Card */}
                  <div style={{ border: '1px solid #eef2f7', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}><FaIdCard /> Company / IDs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 6, columnGap: 8, fontSize: 14 }}>
                      <div style={{ color: '#64748b' }}>Employee ID</div><div>{detailItem?.employeeId || '-'}</div>
                    </div>
                  </div>

                  {/* Addresses Card */}
                  <div style={{ border: '1px solid #eef2f7', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}><FiHome /> Addresses</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 6, columnGap: 8, fontSize: 14 }}>
                      <div style={{ color: '#64748b' }}>Current</div><div>{detailItem?.currentAddress || detailItem?.address || '-'}</div>
                      <div style={{ color: '#64748b' }}>Permanent</div><div>{detailItem?.permanentAddress || '-'}</div>
                    </div>
                  </div>

                  {/* Nominees Card */}
                  <div style={{ border: '1px solid #eef2f7', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Nominees</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {/* Nominee 1 */}
                      <div style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 10 }}>
                        <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Nominee 1</div>
                        {detailItem?.nominee1 ? (
                          <ul style={{ marginLeft: 14, lineHeight: 1.6 }}>
                            <li><strong>Name:</strong> {detailItem.nominee1.name || '-'}</li>
                            <li><strong>Email:</strong> {detailItem.nominee1.email || '-'}</li>
                            <li><strong>Mobile:</strong> {detailItem.nominee1.mobile || '-'}</li>
                            <li><strong>Relation:</strong> {detailItem.nominee1.relation || '-'}</li>
                          </ul>
                        ) : (
                          <div style={{ color: '#94a3b8' }}>—</div>
                        )}
                      </div>
                      {/* Nominee 2 */}
                      <div style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 10 }}>
                        <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Nominee 2</div>
                        {detailItem?.nominee2 ? (
                          <ul style={{ marginLeft: 14, lineHeight: 1.6 }}>
                            <li><strong>Name:</strong> {detailItem.nominee2.name || '-'}</li>
                            <li><strong>Email:</strong> {detailItem.nominee2.email || '-'}</li>
                            <li><strong>Mobile:</strong> {detailItem.nominee2.mobile || '-'}</li>
                            <li><strong>Relation:</strong> {detailItem.nominee2.relation || '-'}</li>
                          </ul>
                        ) : (
                          <div style={{ color: '#94a3b8' }}>—</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
