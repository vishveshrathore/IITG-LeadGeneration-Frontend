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

const LinkedInPParser = () => {
  // Read params passed from CorporateAccountApproval
  const searchParams = new URLSearchParams(window.location.search);
  const companyFromUrl = searchParams.get('company');
  const fromCorporate = searchParams.get('fromCorporate') === 'true';

  const [rawData, setRawData] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [query, setQuery] = useState("");
  // Upload/selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  // Must be a company _id for upload
  const [selectedCompany, setSelectedCompany] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState(null); // { count, source, companyId, ts }
  // Add company inline form
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);

  const STORAGE_KEY = "linkedin_profiles_v1";

  // Columns to show/export (as requested)
  const columns = [
    "S. No.",
    "Name",
    "Experience",
    "CTC",
    "Location",
    "Preferred Location",
    "Current Company",
    "Current Designation",
    "Education",
    "Email",
    "Mobile",
    "Skills",
    "Remarks",
  ];

  // Helpers to derive fields from parsed LinkedIn data
  const getCurrentRole = (experience = []) => {
    if (!Array.isArray(experience)) return { company: "", title: "" };
    // Prefer entry with to === 'Present', otherwise first item
    const curr = experience.find((e) => /present/i.test(e?.to || "")) || experience[0];
    return curr ? { company: curr.company || "", title: curr.title || "" } : { company: "", title: "" };
  };
  const getExperienceText = (experience = []) => {
    if (!Array.isArray(experience) || !experience.length) return "";
    const items = experience.slice(0, 3).map((e) => `${e.title || ''}${e.company ? ' at ' + e.company : ''}${e.from || e.to ? ` (${e.from || ''} – ${e.to || ''})` : ''}`.trim()).filter(Boolean);
    const more = experience.length - items.length;
    return items.join(" | ") + (more > 0 ? ` (+${more} more)` : "");
  };
  const getEducationText = (education = []) => {
    if (!Array.isArray(education) || !education.length) return "";
    return education
      .slice(0, 3)
      .map((e) => `${e.institution || ''}${e.degree ? ', ' + e.degree : ''}${e.duration ? ' · ' + e.duration : ''}`.trim())
      .filter(Boolean)
      .join(" | ");
  };
  const getStateFromLocation = (location = "") => {
    // Try to extract middle token as state: "City, State, Country"
    const parts = String(location).split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[1];
    return location || "";
  };

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
      console.warn("Failed to load saved LinkedIn profiles", e);
    }
  }, []);

  // Persist profiles on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn("Failed to save LinkedIn profiles", e);
    }
  }, [profiles]);

  // Fetch companies for dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/api/recruitment/getCompanies/all`);
        const list = Array.isArray(data?.data) ? data.data : [];
        setCompanies(list);
      } catch (e) {
        console.error(e);
        showToast("Failed to load companies", "error");
      } finally {
        setCompaniesLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // When landed from Corporate, map company NAME in URL to actual company _id
  useEffect(() => {
    if (!fromCorporate || !companyFromUrl || !companies.length) return;
    const byName = companies.find(c => (c.CompanyName || c.companyName || c.name || '').toLowerCase() === companyFromUrl.toLowerCase());
    if (byName?._id) {
      setSelectedCompany(byName._id);
    }
  }, [companies, fromCorporate, companyFromUrl]);

  const handleParse = async () => {
    if (!rawData.trim()) return showToast("Please paste LinkedIn data first.", "error");

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/recruitment/parse/linkedin`, { rawData });
      if (res.data.success) {
        const added = res.data.profiles || [];
        setProfiles((prev) => [...prev, ...added]);
        setRawData("");
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
    const rows = profiles.map((p, idx) => {
      const curr = getCurrentRole(p.experience);
      return {
        "S. No.": String(idx + 1),
        "Name": p.name || "",
        "Experience": getExperienceText(p.experience),
        "CTC": "", // Not available in LinkedIn list view
        "Location": p.location || "",
        "Preferred Location": "", // Not available in LinkedIn list view
        "Current Company": curr.company || "",
        "Current Designation": curr.title || "",
        "Education": getEducationText(p.education),
        "Email": "", // Not available in LinkedIn list view
        "Mobile": "", // Not available in LinkedIn list view
        "Skills": "", // Not parsed from LinkedIn list view
        "Remarks": "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LinkedIn Profiles");
    XLSX.writeFile(wb, "LinkedIn_Profiles.xlsx");
    showToast("Excel exported successfully!");
  };

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
            <h1 className="text-lg font-semibold text-gray-900">Table 12</h1>
            <p className="text-xs text-gray-600">Paste LinkedIn Recruiter results to extract structured profile information.</p>
          </header>

          <div className="bg-white p-3 border border-gray-200 flex flex-col gap-3">
            <textarea
              className="w-full h-48 p-2 text-gray-800 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 resize-y text-sm"
              placeholder="Paste LinkedIn recruiter results here..."
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
            </div>
          </div>

          {/* Upload/Save Section */}
          {profiles.length > 0 && (
            <div className="mt-4 p-3 border border-gray-200 bg-white rounded">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Upload Parsed Profiles</h3>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSelectedIds(profiles.map((_, idx) => idx))}
                  className="py-1 px-2 rounded border border-gray-300 bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="py-1 px-2 rounded border border-gray-300 bg-gray-200 text-gray-800 text-xs hover:bg-gray-300"
                >
                  Clear Selection
                </button>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-700">Company:</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className={`text-xs px-2 py-1 border border-gray-300 rounded min-w-[220px] ${fromCorporate && selectedCompany ? 'bg-gray-100' : ''}`}
                    disabled={companiesLoading || !companies.length || (fromCorporate && !!selectedCompany)}
                  >
                    {fromCorporate && selectedCompany ? (
                      <option value={selectedCompany}>
                        {companies.find((c) => c._id === selectedCompany)?.CompanyName ||
                          companies.find((c) => c._id === selectedCompany)?.companyName ||
                          companyFromUrl || 'Selected Company'}
                      </option>
                    ) : (
                      <>
                        <option value="" disabled>
                          {companiesLoading ? "Loading companies..." : "Select company"}
                        </option>
                        {companies.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.CompanyName || c.companyName || c.name || "Unnamed Company"}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCompany((s) => !s)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50"
                  >
                    {showAddCompany ? 'Close' : 'Add Company'}
                  </button>
                </div>

                {showAddCompany && (
                  <div className="w-full flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Company Name"
                      className="text-xs px-2 py-1 border border-gray-300 rounded flex-1 min-w-[200px]"
                    />
                    <input
                      type="text"
                      value={newIndustry}
                      onChange={(e) => setNewIndustry(e.target.value)}
                      placeholder="Industry"
                      className="text-xs px-2 py-1 border border-gray-300 rounded flex-1 min-w-[200px]"
                    />
                    <button
                      type="button"
                      disabled={addingCompany || !newCompanyName.trim() || !newIndustry.trim()}
                      onClick={async () => {
                        try {
                          if (!newCompanyName.trim() || !newIndustry.trim()) return;
                          setAddingCompany(true);
                          const res = await axios.post(`${BASE_URL}/api/recruitment/add/company`, {
                            companyName: newCompanyName.trim(),
                            industry: newIndustry.trim(),
                          });
                          if (res?.data?.success && res?.data?.data?._id) {
                            showToast('Company added');
                            // Refresh companies
                            const { data } = await axios.get(`${BASE_URL}/api/recruitment/getCompanies/all`);
                            const list = Array.isArray(data?.data) ? data.data : [];
                            setCompanies(list);
                            setSelectedCompany(res.data.data._id);
                            setShowAddCompany(false);
                            setNewCompanyName("");
                            setNewIndustry("");
                          } else {
                            const msg = res?.data?.message || 'Failed to add company';
                            showToast(msg, 'error');
                          }
                        } catch (e) {
                          console.error('[Add Company] error', e);
                          const msg = e?.response?.data?.message || e?.message || 'Failed to add company';
                          showToast(msg, 'error');
                        } finally {
                          setAddingCompany(false);
                        }
                      }}
                      className={`text-xs px-2 py-1 rounded ${addingCompany || !newCompanyName.trim() || !newIndustry.trim() ? 'bg-emerald-600/60 cursor-not-allowed text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    >
                      {addingCompany ? 'Adding…' : 'Save Company'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedIds.length) return showToast("Please select at least one profile", "error");
                    if (!selectedCompany) return showToast("Please select a company", "error");
                    setConfirmOpen(true);
                  }}
                  disabled={!selectedIds.length || !selectedCompany || uploading}
                  className={`py-1 px-2 rounded border border-gray-300 text-white text-xs ${(!selectedIds.length || !selectedCompany || uploading) ? 'bg-emerald-600/60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {uploading ? 'Uploading...' : 'Submit Selected'}
                </button>

                <span className="text-[11px] bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded">
                  Selected: {selectedIds.length}
                </span>
              </div>
            </div>
          )}

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
                    placeholder="Search name, headline, location, industry..."
                    className="text-xs px-2 py-1 border border-gray-300 rounded w-60"
                  />
                  <span className="text-[11px] bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded">Total: {profiles.length}</span>
                </div>
              </div>
              <div className="max-h-[70vh] overflow-auto border border-gray-200">
                <table className="w-full table-auto text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 sticky left-0 bg-gray-50 z-10">S. No.</th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">Select</th>
                      {columns.slice(1).map((key) => (
                        <th
                          key={key}
                          className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-normal"
                          style={key === 'Experience' || key === 'Education' ? { minWidth: '20rem', width: 'auto' } : { width: 'auto' }}
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profiles
                      // Drop obvious UI/noise blocks as extra safety
                      .filter((p) => {
                        const isNoiseName = /see\s+search\s+breakdown/i.test(p?.name || "");
                        const noContent = (!Array.isArray(p?.experience) || p.experience.length === 0) && (!Array.isArray(p?.education) || p.education.length === 0);
                        if ((p?.name || "N/A") === "N/A" && noContent) return false;
                        if (isNoiseName && noContent) return false;
                        if (!query.trim()) return true;
                        const hay = [
                          p.name,
                          getExperienceText(p.experience),
                          p.location,
                          getEducationText(p.education),
                          (getCurrentRole(p.experience).company || ''),
                          (getCurrentRole(p.experience).title || ''),
                          Array.isArray(p.skills) ? p.skills.join(' ') : ''
                        ].join(' ').toLowerCase();
                        return hay.includes(query.toLowerCase());
                      })
                      .map((p, i) => {
                        const derived = {
                          "S. No.": String(i + 1),
                          "Name": p.name || "",
                          "Experience": getExperienceText(p.experience),
                          "CTC": "",
                          "Location": p.location || "",
                          "Preferred Location": "",
                          "Current Company": getCurrentRole(p.experience).company || "",
                          "Current Designation": getCurrentRole(p.experience).title || "",
                          "Education": getEducationText(p.education),
                          "Email": "",
                          "Mobile": "",
                          "Skills": Array.isArray(p.skills) ? p.skills.join(', ') : "",
                          "Remarks": "",
                        };
                        return (
                          <tr key={i} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50">
                            <td className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 sticky left-0 bg-white">{i + 1}</td>
                            <td className="px-2 py-1 align-top text-gray-800 border-b border-gray-100">
                              <input
                                type="checkbox"
                                className="cursor-pointer"
                                checked={selectedIds.includes(i)}
                                onChange={(e) => {
                                  setSelectedIds((prev) => {
                                    if (e.target.checked) return Array.from(new Set([...prev, i]));
                                    return prev.filter((id) => id !== i);
                                  });
                                }}
                              />
                            </td>
                            {columns.slice(1).map((key) => {
                              // Special readable render for Experience and Education
                              if (key === 'Experience') {
                                const exp = Array.isArray(p.experience) ? p.experience : [];
                                return (
                                  <td key={key} className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal" style={{ minWidth: '20rem', width: 'auto' }}>
                                    {exp.length ? (
                                      <ol className="list-decimal list-inside space-y-1 leading-5">
                                        {exp.map((eItem, idx2) => (
                                          <li key={idx2}>
                                            <span className="font-medium">{eItem.title || ''}</span>
                                            {eItem.company ? <span>{` at ${eItem.company}`}</span> : null}
                                            {(eItem.from || eItem.to) ? (
                                              <span className="text-gray-600">{` (${eItem.from || ''} – ${eItem.to || ''})`}</span>
                                            ) : null}
                                          </li>
                                        ))}
                                      </ol>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </td>
                                );
                              }
                              if (key === 'Education') {
                                const edu = Array.isArray(p.education) ? p.education : [];
                                return (
                                  <td key={key} className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal" style={{ minWidth: '20rem', width: 'auto' }}>
                                    {edu.length ? (
                                      <ol className="list-decimal list-inside space-y-1 leading-5">
                                        {edu.map((edItem, idx3) => (
                                          <li key={idx3}>
                                            <span className="font-medium">{edItem.institution || ''}</span>
                                            {edItem.degree ? <span>{`, ${edItem.degree}`}</span> : null}
                                            {edItem.duration ? <span className="text-gray-600">{` · ${edItem.duration}`}</span> : null}
                                          </li>
                                        ))}
                                      </ol>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </td>
                                );
                              }
                              if (key === 'Skills') {
                                const arr = Array.isArray(p.skills) ? p.skills : [];
                                return (
                                  <td key={key} className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal">
                                    {arr.length ? (
                                      <div className="flex flex-wrap gap-1">
                                        {arr.map((s, idx) => (
                                          <span key={idx} className="px-1.5 py-0.5 bg-gray-50 text-gray-700 border border-gray-200 rounded">{s}</span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </td>
                                );
                              }
                              const val = derived[key];
                              return (
                                <td key={key} title={typeof val === 'string' ? val : ''} className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal">
                                  {String(val || '')}
                                </td>
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
        {/* Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
              <h4 className="text-base font-semibold text-gray-900 mb-2">Confirm Upload</h4>
              <p className="text-sm text-gray-700 mb-4">
                You are about to upload <span className="font-semibold">{selectedIds.length}</span> profile(s)
                to company:
                <br />
                <span className="font-medium">
                  {companies.find((c) => c._id === selectedCompany)?.CompanyName ||
                    companies.find((c) => c._id === selectedCompany)?.companyName ||
                    companies.find((c) => c._id === selectedCompany)?.name ||
                    "Selected Company"}
                </span>
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-800 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      setUploading(true);
                      const toUpload = selectedIds.map((idx) => profiles[idx]);
                      const payload = {
                        companyId: selectedCompany,
                        source: 'linkedin',
                        profiles: toUpload,
                      };
                      console.log('[LinkedIn] Upload payload', payload);
                      const res = await axios.post(`${BASE_URL}/api/recruitment/save/parsed-profiles`, payload);
                      console.log('[LinkedIn] Upload response', res?.data);
                      if (res?.data?.success) {
                        showToast(`Profiles uploaded successfully (saved: ${res.data.count})`);
                        setLastUpload({ count: res.data.count, source: 'linkedin', companyId: selectedCompany, ts: Date.now() });
                        setConfirmOpen(false);
                        setSelectedIds([]);
                      } else {
                        const msg = res?.data?.message || 'Failed to upload profiles';
                        showToast(msg, 'error');
                      }
                    } catch (e) {
                      console.error('[LinkedIn] Upload error', e);
                      const msg = e?.response?.data?.message || e?.message || 'Failed to upload profiles';
                      showToast(msg, 'error');
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                  className={`px-3 py-1.5 rounded border border-gray-300 text-sm text-white ${uploading ? 'bg-emerald-600/60 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {uploading ? 'Uploading…' : 'Confirm'}
                </button>
              </div>
              {lastUpload && (
                <div className="mt-2 text-xs px-3 py-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-800">
                  Uploaded {lastUpload.count} profile(s) successfully.
                </div>
              )}
            </div>
          </div>
        )}
        </main>
      </div>
    </AuthProvider>
  );
};

export default LinkedInPParser;

