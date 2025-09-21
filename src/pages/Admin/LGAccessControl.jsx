import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import { FiCheckCircle, FiRefreshCw, FiCheckSquare } from "react-icons/fi";
import { BASE_URL } from "../../config";



export default function LGAccessControl() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState({}); // { [id]: boolean }

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

  // no memoized columns; table is rendered inline below

  return (
    <div style={{ padding: 0 }}>
      <AdminNavbar />
      <Toaster position="top-right" />
      <div style={{ padding: 16, marginTop: 64 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 10 }}>LG Access Control</h2>
            <p style={{ marginTop: 4, color: "#666" }}>Manage access for Local Guides. Use the toggle to enable/disable accounts.</p>
          </div>
          <button onClick={fetchAll} disabled={loading} style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <FiRefreshCw style={{ rotate: loading ? "180deg" : "0deg", transition: "transform 0.2s ease" }} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
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
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Status</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, fontSize: 13, color: "#444" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: "#666" }}>Loading LG accounts...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: "#666" }}>No LG accounts found.</td>
                </tr>
              ) : (
                items.map((r) => {
                  const id = r?._id || r?.id;
                  const enabled = !!(r?.enabled ?? r?.isEnabled ?? r?.active ?? r?.status === "enable");
                  const busy = !!toggling[id];
                  return (
                    <motion.tr key={id} style={{ borderBottom: "1px solid #f3f3f3" }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>{r?.name || r?.fullName || "-"}</td>
                      <td style={{ padding: "10px 8px", fontSize: 14 }}>{r?.email || "-"}</td>
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
                          }}
                        >
                          <FiCheckSquare />
                          {busy ? "Updating..." : enabled ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

