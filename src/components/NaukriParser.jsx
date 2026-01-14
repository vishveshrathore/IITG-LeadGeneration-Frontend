import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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



// (Removed copy to clipboard utility)

// --- Main Component ---
const NaukriParser = () => {
  // Get URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const companyFromUrl = searchParams.get('company');
  const fromCorporate = searchParams.get('fromCorporate') === 'true';
  const jobIdFromUrl = searchParams.get('jobId') || '';
  const localHiringFromUrl = searchParams.get('localHiring') === 'true';
  const localHiringPositionIdFromUrl = searchParams.get('localHiringPositionId') || '';
  
  const [rawData, setRawData] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [query, setQuery] = useState("");
  const [expandedSkillRows, setExpandedSkillRows] = useState({});
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState({ column: null, search: '' });
  const [activeFilterSelection, setActiveFilterSelection] = useState([]);
  // Upload/selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [recruitmentCompanies, setRecruitmentCompanies] = useState([]); // used as flat job list for recruitment
  const [recruitmentCompaniesLoading, setRecruitmentCompaniesLoading] = useState(false);
  const [recruitmentJobQuery, setRecruitmentJobQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(""); // jobId in recruitment tab, companyId in public tab
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toRecruitment, setToRecruitment] = useState(false);
  const [uploadTab, setUploadTab] = useState(localHiringFromUrl ? 'localHiring' : 'public'); // 'public' | 'recruitment' | 'localHiring'
  const [lastUpload, setLastUpload] = useState(null); // { count, source, companyId, ts }
  // Add company inline form
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  // Local Hiring HR team selection
  const [hrRecruiters, setHrRecruiters] = useState([]);
  const [hrOperations, setHrOperations] = useState([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrError, setHrError] = useState('');
  const [localHiringTeam, setLocalHiringTeam] = useState({ hrRecruiters: [], hrOperations: [] });
  const excelInputRef = useRef(null);
  const [excelFileName, setExcelFileName] = useState("");
  const STORAGE_KEY = "naukri_profiles_v1";
  const columns = [
    "name",
    "experience",
    "ctc",
    "location",
    "preferred_locations",
    "current_designation",
    "current_company",
    "previous_roles",
    "education",
    "skills",
    "mobile",
    "email",
    // removed: summary, verified_phone_email, similar_profiles, activity fields
  ];

  const { authToken } = useGlobalAuth();

  // When opened from PositionDashboard with jobId in URL, default to Recruitment tab
  // and preselect that job in the Position dropdown so user doesn't have to pick it again.
  useEffect(() => {
    if (jobIdFromUrl && !localHiringFromUrl) {
      setUploadTab('recruitment');
    }
  }, [jobIdFromUrl, localHiringFromUrl]);

  useEffect(() => {
    if (!jobIdFromUrl || uploadTab !== 'recruitment') return;
    if (!recruitmentCompanies || !recruitmentCompanies.length) return;
    const found = recruitmentCompanies.find(j => String(j.jobId) === String(jobIdFromUrl));
    if (found) {
      setSelectedCompany(found.jobId);
    }
  }, [jobIdFromUrl, uploadTab, recruitmentCompanies]);

  useEffect(() => {
    setExpandedSkillRows({});
  }, [profiles]);

  const getColumnTextForFilter = (row, key) => {
    if (!row) return '';
    const value = row[key];
    if (value == null) return '';
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
        .join(' | ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const ColumnFilterHeader = ({
    label,
    columnKey,
    profiles,
    columnFilters,
    setColumnFilters,
    activeFilter,
    setActiveFilter,
    activeFilterSelection,
    setActiveFilterSelection,
  }) => {
    const containerRef = useRef(null);
    const panelRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const open = activeFilter.column === columnKey;
    const DROPDOWN_WIDTH = 232;
    const ESTIMATED_HEIGHT = 280;

    const allValues = useMemo(() => {
      const set = new Set();
      (profiles || []).forEach((p) => {
        const v = String(getColumnTextForFilter(p, columnKey) || '').trim();
        set.add(v);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [profiles, columnKey]);

    const applied = columnFilters[columnKey] || [];
    const working = open ? activeFilterSelection : applied; // eslint-disable-line no-unused-vars
    const search = open ? (activeFilter.search || '') : '';
    const lcSearch = search.toLowerCase();
    const filteredValues = lcSearch
      ? allValues.filter((v) => v.toLowerCase().includes(lcSearch))
      : allValues;

    const close = () => {
      setActiveFilter({ column: null, search: '' });
      setActiveFilterSelection([]);
    };

    const updateDropdownPosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let top = rect.bottom + 6;
      let placement = 'below';
      if (rect.bottom + ESTIMATED_HEIGHT + 20 > window.innerHeight) {
        top = rect.top - ESTIMATED_HEIGHT - 6;
        placement = 'above';
      }
      if (top < 8) {
        top = 8;
        placement = 'below';
      }
      let left = rect.left + rect.width - DROPDOWN_WIDTH;
      if (left < 8) left = 8;
      if (left + DROPDOWN_WIDTH > window.innerWidth - 8) {
        left = window.innerWidth - DROPDOWN_WIDTH - 8;
      }
      setDropdownPos({ top, left, placement });
    };

    const openFilter = () => {
      setActiveFilter({ column: columnKey, search: '' });
      if (applied && applied.length) {
        setActiveFilterSelection(applied);
      } else {
        setActiveFilterSelection(allValues);
      }
      setTimeout(updateDropdownPosition, 0);
    };

    const toggleValue = (value) => {
      setActiveFilterSelection((prev) => {
        const exists = prev.includes(value);
        if (exists) return prev.filter((v) => v !== value);
        return [...prev, value];
      });
    };

    const selectAll = () => {
      setActiveFilterSelection(filteredValues);
    };

    const clearSelection = () => {
      setActiveFilterSelection([]);
    };

    const applyFilter = () => {
      setColumnFilters((prev) => {
        const next = { ...prev };
        const allSelected =
          Array.isArray(activeFilterSelection) &&
          activeFilterSelection.length > 0 &&
          activeFilterSelection.length === allValues.length;
        if (!activeFilterSelection || activeFilterSelection.length === 0 || allSelected) {
          delete next[columnKey];
        } else {
          next[columnKey] = activeFilterSelection.slice();
        }
        return next;
      });
      close();
    };

    const clearFilterCompletely = () => {
      setColumnFilters((prev) => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      close();
    };

    const hasActiveFilter = Array.isArray(applied) && applied.length > 0;

    useEffect(() => {
      if (!open) return;
      const handleClick = (e) => {
        const containerEl = containerRef.current;
        const panelEl = panelRef.current;
        if (containerEl && containerEl.contains(e.target)) {
          return;
        }
        if (panelEl && panelEl.contains(e.target)) {
          return;
        }
        close();
      };
      const handleWindowChange = () => {
        updateDropdownPosition();
      };
      document.addEventListener('mousedown', handleClick);
      window.addEventListener('resize', handleWindowChange);
      window.addEventListener('scroll', handleWindowChange, true);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        window.removeEventListener('resize', handleWindowChange);
        window.removeEventListener('scroll', handleWindowChange, true);
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;
      updateDropdownPosition();
    }, [open, profiles, columnFilters]);

    return (
      <div ref={containerRef} className="relative inline-flex items-center gap-1">
        <span>{label}</span>
        <button
          type="button"
          onClick={open ? close : openFilter}
          className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] transition ${
            hasActiveFilter
              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
              : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
          }`}
          title="Filter column values"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3">
            <path
              fill="currentColor"
              d="M3 4h18v2l-7 7v5l-4 2v-7L3 6V4z"
            />
          </svg>
        </button>
        {hasActiveFilter && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
        )}
        {open && createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: DROPDOWN_WIDTH, zIndex: 9999 }}
            className="rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-2xl"
          >
            <div className="mb-2 flex items-center gap-1">
              <input
                type="text"
                value={open ? (activeFilter.search || '') : ''}
                onChange={(e) => setActiveFilter({ column: columnKey, search: e.target.value })}
                placeholder="Search values"
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border-y border-gray-200 py-1 pr-1">
              {filteredValues.length === 0 ? (
                <div className="px-1 py-1 text-gray-500">No values</div>
              ) : (
                filteredValues.map((v) => {
                  const checked = activeFilterSelection.includes(v);
                  const displayLabel = v === '' ? '(Blanks)' : v;
                  return (
                    <label key={v} className="flex cursor-pointer items-center gap-2 px-1 py-0.5 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                        checked={checked}
                        onChange={() => toggleValue(v)}
                      />
                      <span className="truncate" title={displayLabel}>
                        {displayLabel}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
              <div className="flex gap-1">
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={clearFilterCompletely}
                    className="rounded border border-red-200 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyFilter}
                  className="rounded border border-indigo-500 bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
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

  // Master select checkbox ref (indeterminate handled inline in render)
  const masterRef = useRef(null);

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
          // If organisation looks like an ObjectId, try to resolve to company name from companies list
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

  // Fetch HR users when Local Hiring tab is active
  useEffect(() => {
    const fetchHRUsers = async () => {
      if (uploadTab !== 'localHiring') return;
      if (!authToken) return;
      if (hrRecruiters.length && hrOperations.length) return;
      setHrLoading(true);
      setHrError('');
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/hr-users`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const hrData = data?.data || {};
        setHrRecruiters(Array.isArray(hrData.hrRecruiters) ? hrData.hrRecruiters : []);
        setHrOperations(Array.isArray(hrData.hrOperations) ? hrData.hrOperations : []);
      } catch (e) {
        console.error('[LocalHiring] HR users load error', e);
        setHrError(e?.response?.data?.message || e?.message || 'Failed to load HR users');
      } finally {
        setHrLoading(false);
      }
    };
    fetchHRUsers();
  }, [uploadTab, authToken, hrRecruiters.length, hrOperations.length]);

  // When landed from Corporate, map company name in URL to actual company _id
  useEffect(() => {
    if (!fromCorporate || !companyFromUrl || !companies.length) return;
    const byName = companies.find(c => (c.CompanyName || c.companyName || c.name || '').toLowerCase() === companyFromUrl.toLowerCase());
    if (byName?._id) {
      setSelectedCompany(byName._id);
    }
  }, [companies, fromCorporate, companyFromUrl]);

  const displayedProfiles = useMemo(() => {
    if (!profiles || !profiles.length) return [];
    let list = profiles;

    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((p) => {
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
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    const hasColumnFilters =
      columnFilters &&
      Object.values(columnFilters).some((arr) => Array.isArray(arr) && arr.length > 0);
    if (hasColumnFilters) {
      list = list.filter((p) => {
        for (const [col, selectedVals] of Object.entries(columnFilters)) {
          if (!Array.isArray(selectedVals) || selectedVals.length === 0) continue;
          const v = String(getColumnTextForFilter(p, col) || '');
          if (!selectedVals.includes(v)) return false;
        }
        return true;
      });
    }

    return list;
  }, [profiles, query, columnFilters]);

  const displayedIndexes = useMemo(
    () => (displayedProfiles || [])
      .map((p) => profiles.indexOf(p))
      .filter((idx) => idx >= 0),
    [displayedProfiles, profiles]
  );

  const allDisplayedSelected =
    displayedIndexes.length > 0 &&
    displayedIndexes.every((idx) => selectedIds.includes(idx));

  const someDisplayedSelected =
    displayedIndexes.length > 0 &&
    !allDisplayedSelected &&
    displayedIndexes.some((idx) => selectedIds.includes(idx));

  useEffect(() => {
    if (masterRef.current) {
      masterRef.current.indeterminate = someDisplayedSelected;
    }
  }, [someDisplayedSelected]);

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
      // Try to locate header row dynamically (first 10 rows)
      const syn = [
        { key: 'name', pats: ['name','candidate','candidatename'] },
        { key: 'experience', pats: ['experience','exp','exper','experienc','expirence'] },
        { key: 'ctc', pats: ['ctc','salary','annualctc'] },
        { key: 'location', pats: ['location','currentlocation','city','place'] },
        { key: 'current_designation', pats: ['currentdesignation','designation','currdesignation','currentdesig','currdesig','currentd','role','currentrole'] },
        { key: 'current_company', pats: ['currentcompany','company','organization','org','employer','currentc','currcompany'] },
        { key: 'previous_roles', pats: ['previous','previousrole','previousroles','prevroles','prevrole'] },
        { key: 'education', pats: ['education','edu','qualification'] },
        { key: 'preferred_locations', pats: ['preferredlocation','preferredlocations','preferred','preferredloc','preflocation','preflocations'] },
        { key: 'skills', pats: ['skills','keyskills','keyskill','keyskills'] },
        { key: 'mobile', pats: ['mobile','phone','contact','contactnumber','contactno','mobilenumber','phonenumber'] },
        { key: 'email', pats: ['email','mail','emailid','emailid'] },
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

      if (structuredKeys.length >= 5) {
        const imported = [];
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const obj = {};
          structuredKeys.forEach(k => {
            const idx = headerIdxMap[k];
            obj[k] = row[idx] != null ? String(row[idx]) : '';
          });
        
          // Basic normalization
          obj.name = obj.name || '';
          obj.experience = obj.experience || '';
          obj.ctc = obj.ctc || '';
          obj.location = obj.location || '';
          obj.current_designation = obj.current_designation || '';
          obj.current_company = obj.current_company || '';
          obj.previous_roles = obj.previous_roles || '';
          obj.education = obj.education || '';
          obj.preferred_locations = obj.preferred_locations || '';
          obj.skills = obj.skills || '';
          obj.mobile = obj.mobile || '';
          obj.email = obj.email || '';

          // Skip completely empty rows
          const anyVal = Object.values(obj).some(v => String(v).trim());
          if (anyVal) imported.push(obj);
        }
        if (!imported.length) {
          showToast('No usable rows found in Excel', 'error');
        } else {
          setProfiles(prev => [...prev, ...imported]);
          showToast(`${imported.length} profiles added from Excel. Total: ${imported.length + (profiles?.length || 0)}`);
        }
      } else {
        // Fallback: assume a single text column with raw dump and use backend parser
        let colIndex = -1;
        const headerIdx = headers.findIndex(h => /^(raw\s*data|raw|data|text|content)$/i.test(h));
        if (headerIdx >= 0) colIndex = headerIdx;
        if (colIndex === -1) {
          let maxCols = 0;
          rows.forEach(r => { if (r.length > maxCols) maxCols = r.length; });
          let bestScore = -1;
          for (let c = 0; c < maxCols; c++) {
            let score = 0;
            for (let i = headerIdx >= 0 ? headerRowIdx + 1 : headerRowIdx; i < rows.length; i++) {
              const v = rows[i][c];
              if (v != null) score += String(v).trim().length;
            }
            if (score > bestScore) { bestScore = score; colIndex = c; }
          }
        }
        const startRow = headerIdx >= 0 ? headerRowIdx + 1 : headerRowIdx;
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
        const res = await axios.post(`${BASE_URL}/api/recruitment/parse/naukri`, { rawData: combined });
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
            <h1 className="text-lg font-semibold text-gray-900">Table 14</h1>
            <p className="text-xs text-gray-600">Paste recruiter data below to extract structured profile information.</p>
          </header>

          <div className="bg-white p-3 border border-gray-200 flex flex-col gap-3">
            <textarea
              className="w-full h-48 p-2 text-gray-800 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 resize-y text-sm"
              placeholder="Paste recruiter data here..."  
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

              {/* Removed Copy JSON button */}
            </div>
          </div>

          {/* Upload/Save Section */}
          {profiles.length > 0 && (
            <div className="mt-4 p-3 border border-gray-200 bg-white rounded">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                {fromCorporate ? `Upload data for ${companyFromUrl}` : 'Upload data'}
              </h3>
              {/* Tabs: Public vs Recruitment vs Local Hiring */}
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
                <button
                  type="button"
                  onClick={() => {
                    setUploadTab('localHiring');
                    setToRecruitment(false);
                    setSelectedCompany("");
                    setShowAddCompany(false);
                  }}
                  className={`text-xs px-3 py-1.5 -mb-px border-b-2 ${uploadTab==='localHiring' ? 'border-fuchsia-600 text-fuchsia-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                >
                  Local Hiring
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    const idxs = (displayedProfiles || [])
                      .map((p) => profiles.indexOf(p))
                      .filter((idx) => idx >= 0);
                    setSelectedIds(idxs);
                  }}
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
                  {uploadTab === 'localHiring' ? (
                    <span className="text-xs text-gray-700">
                      Destination: <span className="font-semibold text-fuchsia-700">Local Hiring</span>
                    </span>
                  ) : (
                    <>
                      <label className="text-xs text-gray-700">
                        {uploadTab==='recruitment' ? 'Position:' : 'Company:'}
                      </label>
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
                    </>
                  )}
                </div>

                {uploadTab === 'localHiring' && (
                  <div className="w-full mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-800 flex flex-col gap-1">
                        <span>Recruiter</span>
                        <select
                          className="text-[11px] px-2 py-1 border border-gray-300 rounded min-w-[220px] bg-white"
                          disabled={hrLoading || !hrRecruiters.length}
                          value={(localHiringTeam.hrRecruiters && localHiringTeam.hrRecruiters[0]) || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalHiringTeam((prev) => ({
                              ...prev,
                              hrRecruiters: val ? [val] : [],
                            }));
                          }}
                        >
                          <option value="">
                            {hrLoading ? 'Loading recruiters…' : 'Select recruiter'}
                          </option>
                          {hrRecruiters.map((u) => {
                            const uid = String(u._id || u.id || '');
                            const label = `${u.name || ''}${u.email ? ` | ${u.email}` : u.mobile ? ` | ${u.mobile}` : ''}`;
                            return (
                              <option key={uid} value={uid}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-800 flex flex-col gap-1">
                        <span>Manager Operation</span>
                        <select
                          className="text-[11px] px-2 py-1 border border-gray-300 rounded min-w-[220px] bg-white"
                          disabled={hrLoading || !hrOperations.length}
                          value={(localHiringTeam.hrOperations && localHiringTeam.hrOperations[0]) || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalHiringTeam((prev) => ({
                              ...prev,
                              hrOperations: val ? [val] : [],
                            }));
                          }}
                        >
                          <option value="">
                            {hrLoading ? 'Loading Manager Operation…' : 'Select Manager Operation'}
                          </option>
                          {hrOperations.map((u) => {
                            const uid = String(u._id || u.id || '');
                            const label = `${u.name || ''}${u.email ? ` | ${u.email}` : u.mobile ? ` | ${u.mobile}` : ''}`;
                            return (
                              <option key={uid} value={uid}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </div>
                    {hrError ? (
                      <p className="text-[11px] text-red-600 col-span-full">{hrError}</p>
                    ) : null}
                  </div>
                )}

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
                    if (uploadTab !== 'localHiring' && !selectedCompany) return showToast("Please select a company", "error");
                    setToRecruitment(uploadTab === 'recruitment');
                    setConfirmOpen(true);
                  }}
                  disabled={!selectedIds.length || (uploadTab !== 'localHiring' && !selectedCompany) || uploading}
                  className={`py-1 px-2 rounded border border-gray-300 text-white text-xs ${(!selectedIds.length || (uploadTab !== 'localHiring' && !selectedCompany) || uploading)
                    ? (uploadTab==='recruitment' ? 'bg-indigo-600/60 cursor-not-allowed' : (uploadTab==='localHiring' ? 'bg-fuchsia-600/60 cursor-not-allowed' : 'bg-emerald-600/60 cursor-not-allowed'))
                    : (uploadTab==='recruitment' ? 'bg-indigo-600 hover:bg-indigo-700' : (uploadTab==='localHiring' ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : 'bg-emerald-600 hover:bg-emerald-700'))}`}
                >
                  {uploading ? 'Uploading...' : (uploadTab==='recruitment' ? 'Submit (Recruitment)' : (uploadTab==='localHiring' ? 'Submit (Local Hiring)' : 'Submit (Public)'))}
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
                    placeholder="Search name, location, skills..."
                    className="text-xs px-2 py-1 border border-gray-300 rounded w-60"
                  />
                  <span className="text-[11px] bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded">Total: {profiles.length}</span>
                </div>
              </div>
              <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 sticky left-0 bg-gray-50 z-10">S.No.</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                      <input
                        ref={masterRef}
                        type="checkbox"
                        className="cursor-pointer"
                        checked={allDisplayedSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(displayedIndexes);
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        aria-label="Select all"
                      />
                    </th>
                    {columns.map((key) => (
                      <th
                        key={key}
                        className={`px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200 ${
                          key === 'skills' ? 'min-w-[320px]' : ''
                        }`}
                      >
                        <ColumnFilterHeader
                          label={key.replace('activity.', '').replace(/_/g, ' ')}
                          columnKey={key}
                          profiles={displayedProfiles}
                          columnFilters={columnFilters}
                          setColumnFilters={setColumnFilters}
                          activeFilter={activeFilter}
                          setActiveFilter={setActiveFilter}
                          activeFilterSelection={activeFilterSelection}
                          setActiveFilterSelection={setActiveFilterSelection}
                        />
                      </th>
                    ))}
                  </tr>
                  </thead>
                  <tbody>
                  {displayedProfiles.map((p, i) => {
                    const rowIndex = profiles.indexOf(p);
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
                      const s = v !== undefined && v !== null ? String(v).trim() : '';
                      if (s.toUpperCase() === 'N/A') return '';
                      return s;
                    };
                    return (
                      <tr key={i} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50">
                        <td className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 sticky left-0 bg-white">{i + 1}</td>
                        <td className="px-2 py-1 align-top text-gray-800 border-b border-gray-100">
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={rowIndex >= 0 && selectedIds.includes(rowIndex)}
                            onChange={(e) => {
                              const idx = rowIndex;
                              if (idx < 0) return;
                              setSelectedIds((prev) => {
                                if (e.target.checked) {
                                  return Array.from(new Set([...prev, idx]));
                                } else {
                                  return prev.filter((id) => id !== idx);
                                }
                              });
                            }}
                          />
                        </td>
                        {columns.map((key) => {
                          const val = getVal(p, key);
                          if (key === 'skills' && typeof val === 'string') {
                            const items = val.split(/,\s*/).filter(Boolean);
                            const isExpanded = !!expandedSkillRows[i];
                            const shown = isExpanded ? items : items.slice(0, 6);
                            const more = items.length - shown.length;
                            return (
                              <td
                                key={key}
                                className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal min-w-[320px]"
                              >
                                <div className="flex flex-wrap gap-1">
                                  {shown.map((s, idx) => (
                                    <span key={idx} title={s} className="px-1.5 py-0.5 bg-gray-50 text-gray-700 border border-gray-200 rounded">{s}</span>
                                  ))}
                                  {more > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedSkillRows((prev) => ({
                                          ...prev,
                                          [i]: !prev[i],
                                        }));
                                      }}
                                      className="px-1.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded cursor-pointer hover:bg-gray-200"
                                    >
                                      {isExpanded ? 'Show less' : `+${more} more`}
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td
                              key={key}
                              title={typeof val === 'string' ? val : ''}
                              className="px-2 py-1 align-top text-gray-800 border-b border-gray-100 break-words whitespace-normal"
                            >
                              {renderVal(val)}
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
                  to:
                  <br />
                  <span className="font-medium">
                    {uploadTab === 'localHiring'
                      ? 'Local Hiring'
                      : (toRecruitment
                        ? (recruitmentCompanies.find((j) => String(j.jobId) === String(selectedCompany))?.label || 'Selected Position')
                        : (companies.find((c) => c._id === selectedCompany)?.CompanyName ||
                          companies.find((c) => c._id === selectedCompany)?.companyName ||
                          companies.find((c) => c._id === selectedCompany)?.name ||
                          'Selected Company'))}
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
                          source: 'naukri',
                          profiles: toUpload,
                          ...(toRecruitment && jobIdToSend ? { jobId: jobIdToSend } : {}),
                        };
                        if (uploadTab === 'localHiring' && localHiringPositionIdFromUrl) {
                          payload.positionId = localHiringPositionIdFromUrl;
                          if (Array.isArray(localHiringTeam.hrRecruiters) && localHiringTeam.hrRecruiters.length) {
                            payload.hrRecruiters = localHiringTeam.hrRecruiters;
                          }
                          if (Array.isArray(localHiringTeam.hrOperations) && localHiringTeam.hrOperations.length) {
                            payload.hrOperations = localHiringTeam.hrOperations;
                          }
                        }
                        console.log('[Naukri] Upload payload', payload);
                        let endpoint;
                        const config = {};
                        if (uploadTab === 'localHiring') {
                          endpoint = `${BASE_URL}/api/local-hiring/admin/upload/profiles`;
                          if (authToken) config.headers = { Authorization: `Bearer ${authToken}` };
                        } else if (toRecruitment) {
                          endpoint = `${BASE_URL}/api/admin/save/parsed/profiles/recruitment`;
                          if (authToken) config.headers = { Authorization: `Bearer ${authToken}` };
                        } else {
                          endpoint = `${BASE_URL}/api/recruitment/save/parsed-profiles`;
                        }
                        const res = await axios.post(endpoint, payload, config);
                        console.log('[Naukri] Upload response', res?.data);
                        if (res?.data?.success) {
                          const savedCount = res.data.count;
                          showToast(`Uploaded ${savedCount} profile(s) successfully`);
                          setLastUpload({ count: savedCount, source: 'naukri', companyId: companyIdToSend, ts: Date.now() });
                          setConfirmOpen(false);
                          // Clear UI state
                          setSelectedIds([]);
                          setProfiles([]);
                          setRawData("");
                          setSelectedCompany("");
                          try { localStorage.removeItem("naukri_profiles_v1"); } catch (_) {}
                        } else {
                          const msg = res?.data?.message || 'Failed to upload profiles';
                          showToast(msg, 'error');
                        }
                      } catch (e) {
                        console.error('[Naukri] Upload error', e);
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
                  Uploaded {lastUpload.count} profile(s) successfully at {new Date(lastUpload.ts).toLocaleString()}.
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
export default NaukriParser;
