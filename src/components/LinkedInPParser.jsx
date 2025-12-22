import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { BASE_URL } from "../config";
import AdminNavbar from "./AdminNavbar.jsx";
import { useAuth as useGlobalAuth } from "../context/AuthContext.jsx";

// --- Auth Context ---
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);
const AuthProvider = ({ children }) => {
  const user = { name: "Admin", email: "admin@example.com" };
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

const LinkedInPParser = () => {
  // Read params passed from CorporateAccountApproval / PositionDashboard
  const searchParams = new URLSearchParams(window.location.search);
  const companyFromUrl = searchParams.get('company');
  const fromCorporate = searchParams.get('fromCorporate') === 'true';
  const jobIdFromUrl = searchParams.get('jobId') || '';

  const [rawData, setRawData] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [query, setQuery] = useState("");
  // Upload/selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [recruitmentCompanies, setRecruitmentCompanies] = useState([]); // used as flat job list for recruitment
  const [recruitmentCompaniesLoading, setRecruitmentCompaniesLoading] = useState(false);
  const [recruitmentJobQuery, setRecruitmentJobQuery] = useState("");
  // In recruitment tab, selectedCompany holds jobId; in public tab, it holds companyId
  const [selectedCompany, setSelectedCompany] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toRecruitment, setToRecruitment] = useState(false);
  const [uploadTab, setUploadTab] = useState('public'); // 'public' | 'recruitment'
  const [lastUpload, setLastUpload] = useState(null); // { count, source, companyId, ts }
  // Add company inline form
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const excelInputRef = useRef(null);
  const [excelFileName, setExcelFileName] = useState("");

  const STORAGE_KEY = "linkedin_profiles_v1";

  const { authToken } = useGlobalAuth();

  // When opened from PositionDashboard with jobId in URL, default to Recruitment tab
  // and preselect that job in the Position dropdown so user doesn't have to pick it again.
  useEffect(() => {
    if (jobIdFromUrl) {
      setUploadTab('recruitment');
    }
  }, [jobIdFromUrl]);

  useEffect(() => {
    if (!jobIdFromUrl || uploadTab !== 'recruitment') return;
    if (!recruitmentCompanies || !recruitmentCompanies.length) return;
    const found = recruitmentCompanies.find(j => String(j.jobId) === String(jobIdFromUrl));
    if (found) {
      setSelectedCompany(found.jobId);
    }
  }, [jobIdFromUrl, uploadTab, recruitmentCompanies]);

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

  // Master select checkbox state
  const allSelected = profiles.length > 0 && selectedIds.length === profiles.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < profiles.length;
  const masterRef = useRef(null);
  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = someSelected;
  }, [someSelected, selectedIds.length, profiles.length]);

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

  // Fetch recruitment jobs when Recruitment tab is active
  useEffect(() => {
    const fetchRecruitmentCompanies = async () => {
      if (uploadTab !== 'recruitment') return;
      if (!authToken) return;
      setRecruitmentCompaniesLoading(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/getallpostjobs`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const allJobs = Array.isArray(data?.data) ? data.data : [];
        const jobs = jobIdFromUrl
          ? allJobs.filter(j => String(j?._id) === String(jobIdFromUrl))
          : allJobs;

        const list = jobs.map((j) => {
          const corp = j?.createdBy || {};
          const companyName = corp.companyName || corp.CompanyName || 'Company';
          const cName = String(companyName).toLowerCase();
          const match = Array.isArray(companies)
            ? companies.find(rc => String(rc.CompanyName || rc.companyName || rc.name || '').toLowerCase() === cName)
            : null;
          const recruitmentCompanyId = match?._id || '';
          const positionId = j.positionId || '';
          let organisation = (j.organisationOther || j.organisation || '').trim();
          if (/^[0-9a-fA-F]{24}$/.test(organisation)) {
            const orgMatch = Array.isArray(companies)
              ? companies.find(rc => String(rc._id) === organisation)
              : null;
            if (orgMatch) {
              organisation = orgMatch.CompanyName || orgMatch.companyName || orgMatch.name || organisation;
            }
          }
          const position = (j.position || '').trim();
          const parts = [];
          if (positionId) parts.push(positionId);
          if (organisation) parts.push(organisation);
          if (position) parts.push(position);
          const label = parts.join(' | ') || companyName;
          return {
            jobId: j._id,
            recruitmentCompanyId,
            companyName,
            label,
          };
        });

        setRecruitmentCompanies(list);
      } catch (e) {
        console.error('[Recruitment Companies] load error', e);
        showToast('Failed to load recruitment companies', 'error');
      } finally {
        setRecruitmentCompaniesLoading(false);
      }
    };
    fetchRecruitmentCompanies();
  }, [uploadTab, companies, jobIdFromUrl, authToken]);

  // When landed from Corporate, map company NAME in URL to actual company _id
  useEffect(() => {
    if (!fromCorporate || !companyFromUrl || !companies.length) return;
    const byName = companies.find(c => (c.CompanyName || c.companyName || c.name || '').toLowerCase() === companyFromUrl.toLowerCase());
    if (byName?._id) {
      setSelectedCompany(byName._id);
    }
  }, [companies, fromCorporate, companyFromUrl]);

  const handleParse = async () => {
    if (!rawData.trim()) return showToast("Please paste data first.", "error");

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

  const handleExcelUpload = async (file) => {
    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        showToast('No sheet found in Excel', 'error');
        return;
      }
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows.length) {
        showToast('Empty Excel file', 'error');
        return;
      }
      const norm = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z]+/g, '');
      const syn = [
        { key: 'name', pats: ['name','candidate','candidatename'] },
        { key: 'location', pats: ['location','currentlocation','city','place'] },
        { key: 'current_title', pats: ['currentdesignation','designation','title','currentd','currdesignation','currd','role','currentrole'] },
        { key: 'current_company', pats: ['currentcompany','company','organization','org','employer','currentc','currcompany','currc'] },
        { key: 'education_text', pats: ['education','edu','qualification'] },
        { key: 'skills', pats: ['skills','keyskills','skill'] },
        { key: 'email', pats: ['email','emailid','mail'] },
        { key: 'mobile', pats: ['mobile','phone','contact','contactnumber','contactno','mobilenumber','phonenumber'] },
        { key: 'experience_text', pats: ['experience','exp','exper','experienc'] },
      ];
      const mapHeader = (h) => {
        const nh = norm(h);
        for (const s of syn) {
          if (s.pats.some(p => nh === p || nh.startsWith(p))) return s.key;
        }
        return null;
      };
      let headerRowIdx = 0;
      let bestHits = -1;
      const maxScan = Math.min(rows.length, 10);
      for (let i = 0; i < maxScan; i++) {
        const r = rows[i] || [];
        let hits = 0;
        for (let c = 0; c < r.length; c++) {
          if (mapHeader(r[c])) hits++;
        }
        if (hits > bestHits) { bestHits = hits; headerRowIdx = i; }
      }
      const headers = (rows[headerRowIdx] || []).map(v => String(v || '').trim());
      const headerIdxMap = {};
      headers.forEach((h, idx) => {
        const key = mapHeader(h);
        if (key && headerIdxMap[key] == null) headerIdxMap[key] = idx;
      });
      const structuredKeys = Object.keys(headerIdxMap);

      const hasMinimal = headerIdxMap['name'] != null && (
        headerIdxMap['current_title'] != null || headerIdxMap['current_company'] != null || headerIdxMap['education_text'] != null || headerIdxMap['skills'] != null
      );

      if (hasMinimal) {
        const imported = [];
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const get = (k) => {
            const idx = headerIdxMap[k];
            return idx != null ? String(row[idx] ?? '').trim() : '';
          };
          const name = get('name');
          if (!name) continue;
          const currTitle = get('current_title');
          const currCompany = get('current_company');
          const location = get('location');
          const eduText = get('education_text');
          const skillsText = get('skills');
          const skillsArr = skillsText ? skillsText.split(/[,|]/).map(s => s.trim()).filter(Boolean) : [];
          const experience = (currTitle || currCompany) ? [{ title: currTitle, company: currCompany, from: '', to: '' }] : [];
          const education = eduText ? [{ institution: eduText, degree: '', duration: '' }] : [];
          imported.push({ name, location, experience, education, skills: skillsArr });
        }
        if (imported.length) {
          setProfiles(prev => [...prev, ...imported]);
          showToast(`${imported.length} profiles added from Excel. Total: ${imported.length + (profiles?.length || 0)}`);
        } else {
          showToast('No usable rows found in Excel', 'error');
        }
      } else {
        let colIndex = -1;
        const rawHeaderIdx = headers.findIndex(h => /^(raw\s*data|raw|data|text|content)$/i.test(h));
        if (rawHeaderIdx >= 0) colIndex = rawHeaderIdx;
        if (colIndex === -1) {
          let maxCols = 0;
          rows.forEach(r => { if (r.length > maxCols) maxCols = r.length; });
          let bestScore = -1;
          for (let c = 0; c < maxCols; c++) {
            let score = 0;
            for (let i = rawHeaderIdx >= 0 ? headerRowIdx + 1 : headerRowIdx; i < rows.length; i++) {
              const v = rows[i][c];
              if (v != null) score += String(v).trim().length;
            }
            if (score > bestScore) { bestScore = score; colIndex = c; }
          }
        }
        const startRow = rawHeaderIdx >= 0 ? headerRowIdx + 1 : headerRowIdx;
        const texts = [];
        for (let i = startRow; i < rows.length; i++) {
          const v = rows[i][colIndex];
          if (v != null && String(v).trim()) texts.push(String(v).trim());
        }
        const combined = texts.join('\n\n');
        if (!combined.trim()) {
          showToast('No text found in Excel', 'error');
          return;
        }
        const res = await axios.post(`${BASE_URL}/api/recruitment/parse/linkedin`, { rawData: combined });
        if (res.data.success) {
          const added = res.data.profiles || [];
          setProfiles((prev) => [...prev, ...added]);
          const addedCount = res.data.count || added.length;
          showToast(`${addedCount} profiles added. Total: ${addedCount + (profiles?.length || 0)}`);
        } else {
          showToast(res.data.message || 'Parsing failed.', 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to parse Excel file.', 'error');
    } finally {
      setLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const onExcelFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setExcelFileName(f.name);
      await handleExcelUpload(f);
    }
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
    setExcelFileName("");
    if (excelInputRef.current) excelInputRef.current.value = '';
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
            <p className="text-xs text-gray-600">Paste Recruiter results to extract structured profile information.</p>
          </header>

          <div className="bg-white p-3 border border-gray-200 flex flex-col gap-3">
            <textarea
              className="w-full h-48 p-2 text-gray-800 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 resize-y text-sm"
              placeholder="Paste recruiter results here..."
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

              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onExcelFileChange}
                className="hidden"
              />
              <button
                onClick={() => excelInputRef.current && excelInputRef.current.click()}
                disabled={loading}
                className={`py-1 px-2 rounded border border-gray-300 bg-purple-600 text-white text-xs ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-purple-700'}`}
              >
                Upload Excel
              </button>
              {excelFileName ? (
                <span className="text-[11px] bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded">
                  {excelFileName}
                </span>
              ) : null}

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
                className="ml-auto py-1 px-2 rounded border border-red-700 bg-red-600 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
              >
                Clear Results
              </button>
            </div>
          </div>

          {/* Upload/Save Section */}
          {profiles.length > 0 && (
            <div className="mt-4 p-3 border border-gray-200 bg-white rounded">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Upload Parsed Profiles</h3>
              {/* Tabs: Public vs Recruitment */}
              <div className="mb-3 flex items-center gap-2 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setUploadTab('public')}
                  className={`text-xs px-3 py-1.5 -mb-px border-b-2 ${uploadTab==='public' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                >
                  Upload data
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('recruitment')}
                  className={`text-xs px-3 py-1.5 -mb-px border-b-2 ${uploadTab==='recruitment' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                >
                  Recruitment
                </button>
              </div>
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
                  <label className="text-xs text-gray-700">{uploadTab==='recruitment' ? 'Position:' : 'Company:'}</label>
                  {uploadTab==='recruitment' && (
                    <input
                      type="text"
                      value={recruitmentJobQuery}
                      onChange={(e) => setRecruitmentJobQuery(e.target.value)}
                      placeholder="Search by code, organisation, position"
                      className="text-xs px-2 py-1 border border-gray-300 rounded w-56"
                    />
                  )}
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className={`text-xs px-2 py-1 border border-gray-300 rounded min-w-[280px] ${fromCorporate && selectedCompany ? 'bg-gray-100' : ''}`}
                    disabled={
                      uploadTab==='recruitment'
                        ? recruitmentCompaniesLoading || !recruitmentCompanies.length
                        : (companiesLoading || !companies.length || (fromCorporate && !!selectedCompany))
                    }
                  >
                    {uploadTab==='recruitment' ? (
                      <>
                        <option value="" disabled>
                          {recruitmentCompaniesLoading ? 'Loading positions...' : 'Select position'}
                        </option>
                        {recruitmentCompanies
                          .filter((j) => {
                            const label = String(j.label || '').toLowerCase();
                            return label.includes(recruitmentJobQuery.toLowerCase());
                          })
                          .map((j) => (
                            <option key={j.jobId} value={j.jobId}>
                              {j.label}
                            </option>
                          ))}
                      </>
                    ) : (
                      (fromCorporate && selectedCompany ? (
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
                              {(c.CompanyName || c.companyName || c.name || 'Unnamed Company')}
                            </option>
                          ))}
                        </>
                      ))
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
                    // In recruitment mode, selectedCompany is the jobId from dropdown.
                    // We map jobId -> recruitmentCompanyId later inside the confirm handler
                    // when building the payload.
                    setToRecruitment(uploadTab === 'recruitment');
                    setConfirmOpen(true);
                  }}
                  disabled={!selectedIds.length || !selectedCompany || uploading}
                  className={`py-1 px-2 rounded border border-gray-300 text-white text-xs ${(!selectedIds.length || !selectedCompany || uploading)
                    ? (uploadTab==='recruitment' ? 'bg-indigo-600/60 cursor-not-allowed' : 'bg-emerald-600/60 cursor-not-allowed')
                    : (uploadTab==='recruitment' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700')}`}
                >
                  {uploading ? 'Uploading...' : (uploadTab==='recruitment' ? 'Submit (Recruitment)' : 'Submit (Public)')}
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
                      <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                        <input
                          ref={masterRef}
                          type="checkbox"
                          className="cursor-pointer"
                          checked={allSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(profiles.map((_, idx) => idx));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          aria-label="Select all"
                        />
                      </th>
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
                    {toRecruitment
                      ? (recruitmentCompanies.find((j) => String(j.jobId) === String(selectedCompany))?.label || 'Selected Position')
                      : (companies.find((c) => c._id === selectedCompany)?.CompanyName ||
                        companies.find((c) => c._id === selectedCompany)?.companyName ||
                        companies.find((c) => c._id === selectedCompany)?.name ||
                        'Selected Company')}
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
                      let companyIdToSend = selectedCompany;
                      let jobIdToSend = '';
                      if (toRecruitment) {
                        if (!authToken) {
                          showToast('Authentication token missing. Please log in again.', 'error');
                          setUploading(false);
                          return;
                        }
                        const job = recruitmentCompanies.find(j => String(j.jobId) === String(selectedCompany));
                        if (!job || !job.recruitmentCompanyId) {
                          showToast('No matching Recruitment Company found. Please add it first in Recruitment Companies.', 'error');
                          setUploading(false);
                          return;
                        }
                        companyIdToSend = job.recruitmentCompanyId;
                        jobIdToSend = job.jobId;
                      }
                      const payload = {
                        companyId: companyIdToSend,
                        source: 'linkedin',
                        profiles: toUpload,
                        ...(toRecruitment && jobIdToSend ? { jobId: jobIdToSend } : {}),
                      };
                      console.log('[LinkedIn] Upload payload', { toRecruitment, payload });
                      const endpoint = toRecruitment
                        ? `${BASE_URL}/api/admin/save/parsed/profiles/recruitment`
                        : `${BASE_URL}/api/recruitment/save/parsed-profiles`;
                      const config = toRecruitment && authToken
                        ? { headers: { Authorization: `Bearer ${authToken}` } }
                        : undefined;
                      const res = await axios.post(endpoint, payload, config);
                      console.log('[LinkedIn] Upload response', res?.data);
                      if (res?.data?.success) {
                        const savedCount = res.data.count;
                        showToast(`Uploaded ${savedCount} profile(s) successfully`);
                        setLastUpload({ count: savedCount, source: 'linkedin', companyId: companyIdToSend, ts: Date.now() });
                        setConfirmOpen(false);
                        // Clear UI state
                        setSelectedIds([]);
                        setProfiles([]);
                        setRawData("");
                        setSelectedCompany("");
                        try { localStorage.removeItem("linkedin_profiles_v1"); } catch (_) {}
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

