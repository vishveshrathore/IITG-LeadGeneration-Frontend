import React, { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { BASE_URL } from "../config";
import AdminNavbar from "./AdminNavbar.jsx";

// --- Auth Context ---
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);
const AuthProvider = ({ children }) => {
  const user = { name: "Admin", email: "admin@example.com" };
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};



// (Removed copy to clipboard utility)

// --- Main Component ---
const NaukriParser = () => {
  const [rawData, setRawData] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [query, setQuery] = useState("");
  const STORAGE_KEY = "naukri_profiles_v1";
  const columns = [
    "name",
    "experience",
    "ctc",
    "location",
    "current_designation",
    "current_company",
    "previous_roles",
    "education",
    "preferred_locations",
    "skills",
    "mobile",
    "email",
    // removed: summary, verified_phone_email, similar_profiles, activity fields
  ];

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "success" }), 3000);
  };

  // Load saved profiles on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setProfiles(parsed);
      }
    } catch (e) {
      console.warn("Failed to load saved profiles", e);
    }
  }, []);

  // Persist profiles on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn("Failed to save profiles", e);
    }
  }, [profiles]);

  // (Removed loadSample helper)

  const handleParse = async () => {
    if (!rawData.trim()) return showToast("Please paste Naukri data first.", "error");

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/recruitment/parse/naukri`, { rawData });
      if (res.data.success) {
        const added = res.data.profiles || [];
        setProfiles((prev) => [...prev, ...added]);
        setRawData(""); // Clear textarea for next slot
        const addedCount = res.data.count || added.length;
        showToast(`${addedCount} profiles added. Total: ${addedCount + (profiles?.length || 0)}`);
      } else {
        showToast(res.data.message || "Parsing failed.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error while parsing data.", "error");
    }
    setLoading(false);
  };

  const handleExport = () => {
    if (!profiles.length) return showToast("No profiles to export.", "error");
    // Export only selected columns
    const rows = profiles.map((p) => {
      const out = {};
      const getVal = (obj, path) => path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : ''), obj);
      const mergeSkills = (a, b) => {
        const parts = [a, b]
          .filter(Boolean)
          .flatMap(v => String(v).split(/,\s*|\|\s*/))
          .map(s => s.trim())
          .filter(Boolean);
        // de-duplicate, preserve order
        const seen = new Set();
        const out = [];
        for (const s of parts) {
          const key = s.toLowerCase();
          if (!seen.has(key)) { seen.add(key); out.push(s); }
        }
        return out.join(", ");
      };
      const renderVal = (v) => {
        if (Array.isArray(v)) {
          // If array of designation/company objects, format nicely
          const isRoleArray = v.every(item => item && typeof item === 'object' && ('designation' in item || 'company' in item));
          if (isRoleArray) {
            return v.map(item => `${item.designation || ''}${item.company ? ' at ' + item.company : ''}`.trim()).filter(Boolean).join(' | ');
          }
          return v.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' | ');
        }
        if (v && typeof v === 'object') {
          if ('designation' in v || 'company' in v) {
            return `${v.designation || ''}${v.company ? ' at ' + v.company : ''}`.trim();
          }
          return JSON.stringify(v);
        }
        return v !== undefined && v !== null ? String(v) : '';
      };
      columns.forEach((key) => {
        if (key === 'skills') {
          out['skills'] = mergeSkills(getVal(p, 'skills'), getVal(p, 'may_also_know'));
        } else {
          out[key.replace('activity.', '')] = renderVal(getVal(p, key));
        }
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Naukri Profiles");
    XLSX.writeFile(wb, "Naukri_Profiles.xlsx");
    showToast("Excel exported successfully!");
  };

  // Clear results and storage
  const handleClear = () => {
    setProfiles([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    showToast("Cleared parsed results");
  };

  return (
    <AuthProvider>
      {/* Toast */}
      <div className={`fixed top-2 right-2 z-50 ${toast.visible ? '' : 'hidden'}`}>
        <div className={`px-2 py-1 rounded text-white text-xs ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      </div>

      <div className="min-h-screen bg-white font-sans">
        <AdminNavbar />
        <main className="w-full mx-auto p-4 my-15">
          <header className="mb-4">
            <h1 className="text-lg font-semibold text-gray-900">Naukri Profile Parser</h1>
            <p className="text-xs text-gray-600">Paste recruiter data below to extract structured profile information.</p>
          </header>

          <div className="bg-white p-3 border border-gray-200 flex flex-col gap-3">
            <textarea
              className="w-full h-48 p-2 text-gray-800 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 resize-y text-sm"
              placeholder="Paste Naukri recruiter data here..."
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              disabled={loading}
            />
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <div>Tip: Paste one slot, Parse, then paste next. Results append below.</div>
              <div>
                Chars: {rawData.length} | Size: {Math.ceil(new Blob([rawData]).size / 1024)} KB
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleParse}
                disabled={loading}
                className={`py-1 px-2 rounded border border-gray-300 bg-indigo-600 text-white text-xs ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
              >
                {loading ? "Parsing..." : "Parse Data"}
              </button>

              <button
                onClick={handleExport}
                disabled={!profiles.length}
                className="py-1 px-2 rounded border border-gray-300 bg-green-600 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
              >
                Export to Excel
              </button>

              <button
                onClick={handleClear}
                disabled={!profiles.length}
                className="py-1 px-2 rounded border border-gray-300 bg-gray-200 text-gray-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                Clear Results
              </button>

              {/* Removed Copy JSON button */}
            </div>
          </div>

          {/* Profile Table */}
          {profiles.length > 0 && (
            <div className="mt-4 bg-white p-0.5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-800">Parsed Profiles</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, location, skills..."
                    className="text-xs px-2 py-1 border border-gray-300 rounded w-60"
                  />
                  <span className="text-[11px] bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded">Total: {profiles.length}</span>
                </div>
              </div>
              <div className="max-h-[70vh] overflow-auto border border-gray-200">
                <table className="w-full table-fixed text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 sticky left-0 bg-gray-50 z-10">S.No.</th>
                    {columns.map((key) => (
                      <th key={key} className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                        {key.replace('activity.', '').replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                  </thead>
                  <tbody>
                  {profiles
                    .filter((p) => {
                      if (!query.trim()) return true;
                      const hay = [
                        p.name,
                        p.location,
                        p.current_designation,
                        p.current_company,
                        p.education,
                        p.preferred_locations,
                        p.mobile,
                        p.email,
                        typeof p.skills === 'string' ? p.skills : '',
                      ].join(' ').toLowerCase();
                      return hay.includes(query.toLowerCase());
                    })
                    .map((p, i) => {
                    const getVal = (obj, path) => path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : ''), obj);
                    const renderVal = (v) => {
                      if (Array.isArray(v)) {
                        const isRoleArray = v.every(item => item && typeof item === 'object' && ('designation' in item || 'company' in item));
                        if (isRoleArray) {
                          // Render previous roles as badges
                          return (
                            <div className="flex flex-wrap gap-1">
                              {v.map((item, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">{`${item.designation || ''}${item.company ? ' at ' + item.company : ''}`.trim()}</span>
                              ))}
                            </div>
                          );
                        }
                        return v.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' | ');
                      }
                      if (v && typeof v === 'object') {
                        if ('designation' in v || 'company' in v) {
                          return `${v.designation || ''}${v.company ? ' at ' + v.company : ''}`.trim();
                        }
                        return JSON.stringify(v);
                      }
                      return v !== undefined && v !== null ? String(v) : '';
                    };
                    return (
                      <tr key={i} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50">
                        <td className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 sticky left-0 bg-white">{i + 1}</td>
                        {columns.map((key) => {
                          const val = getVal(p, key);
                          if (key === 'skills' && typeof val === 'string') {
                            const items = val.split(/,\s*/).filter(Boolean);
                            const shown = items.slice(0, 6);
                            const more = items.length - shown.length;
                            return (
                              <td key={key} className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal">
                                <div className="flex flex-wrap gap-1">
                                  {shown.map((s, idx) => (
                                    <span key={idx} title={s} className="px-1.5 py-0.5 bg-gray-50 text-gray-700 border border-gray-200 rounded">{s}</span>
                                  ))}
                                  {more > 0 && (
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded">+{more} more</span>
                                  )}
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td key={key} title={typeof val === 'string' ? val : ''} className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal">{renderVal(val)}</td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthProvider>
  );
};

export default NaukriParser;
