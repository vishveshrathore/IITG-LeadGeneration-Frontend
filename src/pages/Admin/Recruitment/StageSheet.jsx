import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BASE_URL } from '../../../config';
import { useAuth } from '../../../context/AuthContext';

const synonyms = {
  // Legacy names
  'BooleanDataSheet': ['Boolean', ''],
  'BooleanDataSheet(C)': ['Boolean (C)'],
  'InterviewSheet': ['InterviewSheet'],
};

const sanitizeValue = (value) => {
  if (value == null) return '';
  const str = String(value).trim();
  if (!str) return '';
  return str.toUpperCase() === 'N/A' ? '' : str;
};

const displayValue = (value, fallback = '-') => {
  const clean = sanitizeValue(value);
  return clean || fallback;
};

// Compute total experience for LinkedIn profiles from raw.experience (excluding current role)
const getLinkedInTotalExperienceFromRawForFilter = (experience = []) => {
  if (!Array.isArray(experience) || !experience.length) return '';
  const currentYear = new Date().getFullYear();
  let totalMonths = 0;

  const currentIdx = experience.findIndex((e) => /present/i.test(String(e?.to || '')));
  const excludeIdx = currentIdx >= 0 ? currentIdx : 0;

  experience.forEach((e, idx) => {
    if (idx === excludeIdx) return;
    const fromYear = parseInt(e.from, 10);
    let toYear;
    if (/present/i.test(String(e?.to || ''))) {
      toYear = currentYear;
    } else if (e.to) {
      toYear = parseInt(e.to, 10);
    } else {
      toYear = fromYear;
    }

    if (Number.isFinite(fromYear) && Number.isFinite(toYear)) {
      const diffMonths = Math.max(0, (toYear - fromYear) * 12);
      totalMonths += diffMonths;
    }
  });

  if (!totalMonths) return '';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  return parts.join(' ');
};

const getColumnText = (p, key) => {
  if (!p) return '';
  switch (key) {
    case 'name':
      return sanitizeValue(p.name);
    case 'experience': {
      const src = String(p?.source || '').toLowerCase();
      if (src === 'linkedin') {
        const rawExp = Array.isArray(p?.raw?.experience) ? p.raw.experience : [];
        return sanitizeValue(getLinkedInTotalExperienceFromRawForFilter(rawExp));
      }
      return sanitizeValue(p.experience);
    }
    case 'ctc':
      return sanitizeValue(p.ctc);
    case 'location':
      return sanitizeValue(p.location);
    case 'preferred_locations':
      if (Array.isArray(p.preferred_locations)) {
        return p.preferred_locations.map(sanitizeValue).filter(Boolean).join(', ');
      }
      return sanitizeValue(p.preferred_locations);
    case 'mobile':
      return sanitizeValue(p.mobile);
    case 'email':
      return sanitizeValue(p.email);
    case 'current_designation':
      return sanitizeValue(p.current_designation);
    case 'current_company':
      return sanitizeValue(p.current_company);
    case 'education':
      if (!Array.isArray(p.education)) return sanitizeValue(p.education);
      // Get all education entries, extract degree/fieldOfStudy, filter out empty values
      const educationItems = p.education
        .map(e => sanitizeValue(e.degree || e.fieldOfStudy || ''))
        .filter(Boolean);
      // Remove duplicates using Set and join with comma
      return [...new Set(educationItems)].join(', ');
    case 'skills': {
      const raw = p.skills;
      if (!raw) return '';
      if (Array.isArray(raw)) {
        const items = raw
          .map((s) => {
            if (s == null) return '';
            if (typeof s === 'string') return sanitizeValue(s);
            if (typeof s === 'object') {
              return sanitizeValue(s.name || s.skill || s.value || '');
            }
            return sanitizeValue(s);
          })
          .filter(Boolean);
        return [...new Set(items)].join(', ');
      }
      return sanitizeValue(raw);
    }
    default:
      return '';
  }
};

const normalizeFilterValue = (v) =>
  String(v || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const getFilterValuesForColumn = (p, key) => {
  if (!p) return [];
  // Excel-style: treat each cell's full text as a single filterable value
  const single = String(getColumnText(p, key) || '').trim();
  return single ? [single] : [];
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
  const containerRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0 });
  const open = activeFilter.column === columnKey;
  const DROPDOWN_WIDTH = 232;
  const ESTIMATED_HEIGHT = 280;

  const allValues = React.useMemo(() => {
    const map = new Map();
    (profiles || []).forEach((p) => {
      const values = getFilterValuesForColumn(p, columnKey);
      values.forEach((raw) => {
        const norm = normalizeFilterValue(raw);
        if (!norm) return;
        if (!map.has(norm)) map.set(norm, raw);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [profiles, columnKey]);

  const applied = columnFilters[columnKey] || [];
  const working = open ? activeFilterSelection : applied;
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

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      const containerEl = containerRef.current;
      const panelEl = panelRef.current;
      if (
        containerEl &&
        containerEl.contains(e.target)
      ) {
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

  React.useEffect(() => {
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
                return (
                  <label key={v} className="flex cursor-pointer items-center gap-2 px-1 py-0.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                      checked={checked}
                      onChange={() => toggleValue(v)}
                    />
                    <span className="truncate" title={v}>
                      {v}
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

const StageSheet = ({ job, stageKey, title, recruiterFQC = false, recruiterView = false }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, authToken } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [modalProfileId, setModalProfileId] = useState(null);
  const [modalDecision, setModalDecision] = useState('YES');
  const [modalRemark, setModalRemark] = useState('');
  const [remarkById, setRemarkById] = useState({});
  const [savingId, setSavingId] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [uploadingId, setUploadingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [historyModal, setHistoryModal] = useState({ open: false, profile: null });
  const [density, setDensity] = useState('compact'); // 'comfortable' | 'compact'
  const [q, setQ] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [selectedMap, setSelectedMap] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newResume, setNewResume] = useState(null);
  const [newForm, setNewForm] = useState({
    name: '',
    experience: '',
    ctc: '',
    location: '',
    current_designation: '',
    current_company: '',
    previous_roles: '',
    education: '',
    preferred_locations: '',
    skills: '',
    mobile: '',
    email: '',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    experience: '',
    ctc: '',
    location: '',
    current_designation: '',
    current_company: '',
    previous_roles: '',
    education: '',
    preferred_locations: '',
    skills: '',
    mobile: '',
    email: '',
  });

  const [qInput, setQInput] = useState('');
  const [expandSkills, setExpandSkills] = useState({});
  const [expandExperience, setExpandExperience] = useState({});
  const [expandPreviousRoles, setExpandPreviousRoles] = useState({});
  const [expandEducation, setExpandEducation] = useState({});
  const [expandPreferredLocations, setExpandPreferredLocations] = useState({});
  const [expandLocation, setExpandLocation] = useState({});
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState({ column: null, search: '' });
  const [activeFilterSelection, setActiveFilterSelection] = useState([]);
  const [assigningNext, setAssigningNext] = useState(false);
  const [sendingActivation, setSendingActivation] = useState(false);
  const [sendingFinalQC, setSendingFinalQC] = useState(false);
  const [sendingFinalLineupClient, setSendingFinalLineupClient] = useState(false);
  const [sendingFQCManager, setSendingFQCManager] = useState(false);
  const [candidateModal, setCandidateModal] = useState({ open: false, profile: null });
  const [candidateForm, setCandidateForm] = useState({
    email: '',
    mobile: '',
    interviewDate: '',
    interviewTime: '',
    contactPerson: '',
    contactNumber: '',
    location: '',
    address: '',
    interviewType: 'PI',
    interviewLink: '',
  });
  const [sendingFinalLineupCandidate, setSendingFinalLineupCandidate] = useState(false);
  const [contactEdits, setContactEdits] = useState({});
  const [contactSavingId, setContactSavingId] = useState('');

  const companyName = useMemo(() => {
    const c = job?.createdBy || {};
    return c.companyName || c.CompanyName || '';
  }, [job]);

  const candidateSuggestions = useMemo(() => {
    const profile = candidateModal.profile;
    if (!profile) return {};
    return {
      name: profile.name || '',
      designation: profile.current_designation || '',
      company: profile.current_company || '',
      email: profile.email || '',
      mobile: profile.mobile || '',
      location: job?.jobLocation || job?.locationDisplay || profile.location || '',
    };
  }, [candidateModal.profile, job]);

  const interviewType = candidateForm.interviewType || 'PI';
  const isVirtualInterview = interviewType === 'VI';

  const applyCandidateSuggestion = (field) => {
    if (!field) return;
    setCandidateForm((prev) => ({ ...prev, [field]: candidateSuggestions[field] || '' }));
  };

  const getContactDraft = (p) => {
    const draft = contactEdits[p._id] || {};
    return {
      mobile: draft.mobile != null ? draft.mobile : (p?.mobile || ''),
      email: draft.email != null ? draft.email : (p?.email || ''),
    };
  };

  const updateContactDraft = (id, field, value) => {
    setContactEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const saveContact = async (p) => {
    const id = p?._id;
    if (!id || !authToken) return;
    const draft = contactEdits[id] || {};
    const payload = {};
    if (draft.mobile != null) payload.mobile = draft.mobile;
    if (draft.email != null) payload.email = draft.email;
    if (!Object.keys(payload).length) return;
    try {
      setContactSavingId(String(id));
      await axios.patch(
        `${BASE_URL}/api/admin/recruitment/profile/${id}`,
        payload,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      await refresh();
      setContactEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setToast({ visible: true, message: 'Contact updated', type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2000);
    } catch (e) {
      setToast({ visible: true, message: e?.response?.data?.message || e?.message || 'Update failed', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setContactSavingId('');
    }
  };

  const jobId = job?._id;
  const isRecruiterFQC = recruiterFQC && stageKey === 'FQC';
  const recruiterUserId = user?.id || user?._id || null;
  const recruiterFilterActive = recruiterView && !!recruiterUserId;

  const allFQCProcessed = useMemo(() => {
    if (!isRecruiterFQC) return true;
    if (!Array.isArray(profiles) || profiles.length === 0) return true;

    for (const p of profiles) {
      const decisions = Array.isArray(p?.decisions) ? p.decisions : [];
      if (!decisions.length) {
        return false;
      }
      const last = decisions[decisions.length - 1] || {};
      const dec = String(last.decision || '').trim();
      const remark = String(last.remark || '').trim();
      if (!dec || !remark) {
        return false;
      }
    }

    return true;
  }, [isRecruiterFQC, profiles]);

  const nextDisabled = assigningNext || !allFQCProcessed;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`rec:${stageKey}:filters`);
      const f = raw ? JSON.parse(raw) : {};
      setQInput(f.q || '');
      setQ(f.q || '');
      setFilterLocation(f.location || '');
      setFilterSkill(f.skill || '');
      const dens = localStorage.getItem(`rec:${stageKey}:density`);
      if (dens === 'comfortable' || dens === 'compact') setDensity(dens);
    } catch (_) {}
  }, [stageKey]);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput, stageKey]);

  useEffect(() => {
    try {
      const payload = { q: qInput, location: filterLocation, skill: filterSkill };
      localStorage.setItem(`rec:${stageKey}:filters`, JSON.stringify(payload));
      localStorage.setItem(`rec:${stageKey}:density`, density);
    } catch (_) {}
  }, [stageKey, qInput, filterLocation, filterSkill, density]);

  const matchStage = (s) => {
    const v = String(s || '').trim();
    if (v === stageKey) return true;
    const extra = synonyms[stageKey] || [];
    return extra.includes(v);
  };

  const openEdit = (row) => {
    if (!row) {
      return;
    }
    setEditId(row._id || '');
    setEditOpen(true);
    try {
      const prevRolesStr = Array.isArray(row.previous_roles)
        ? row.previous_roles.map((r) => {
            if (r && typeof r === 'object') {
              const d = r.designation || '';
              const c = r.company ? ` at ${r.company}` : '';
              const s = `${d}${c}`.trim();
              return s;
            }
            return String(r || '');
          }).filter(Boolean).join(', ')
        : (typeof row.previous_roles === 'string' ? row.previous_roles : '');
      const eduStr = Array.isArray(row.education) ? row.education.join(', ') : (row.education || '');
      const prefLocStr = Array.isArray(row.preferred_locations) ? row.preferred_locations.join(', ') : (row.preferred_locations || '');
      const skillsStr = Array.isArray(row.skills) ? row.skills.join(', ') : (row.skills || '');
      console.log('Prefilling form');
      setEditForm({
        name: row.name || '',
        experience: row.experience || '',
        ctc: row.ctc || '',
        location: row.location || '',
        current_designation: row.current_designation || '',
        current_company: row.current_company || '',
        previous_roles: prevRolesStr,
        education: eduStr,
        preferred_locations: prefLocStr,
        skills: skillsStr,
        mobile: row.mobile || '',
        email: row.email || '',
      });
    } catch (e) {
      setEditForm({
        name: row?.name || '',
        experience: row?.experience || '',
        ctc: row?.ctc || '',
        location: row?.location || '',
        current_designation: row?.current_designation || '',
        current_company: row?.current_company || '',
        previous_roles: '',
        education: '',
        preferred_locations: '',
        skills: '',
        mobile: row?.mobile || '',
        email: row?.email || '',
      });
    }
  };

  const sendFinalLineupInformClient = async () => {
    if (!jobId || !authToken) {
      setToast({ visible: true, message: 'Unable to send notification (missing job or auth).', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
      return;
    }
    try {
      setSendingFinalLineupClient(true);
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/recruitment/job/${jobId}/notify-final-lineup-client`,
        {},
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      const msg = data?.message || 'Final Lineup sheet update sent to client.';
      setToast({ visible: true, message: msg, type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2500);
    } catch (e) {
      setToast({
        visible: true,
        message: e?.response?.data?.message || e?.message || 'Failed to send notification',
        type: 'error',
      });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setSendingFinalLineupClient(false);
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    try {
      setEditSubmitting(true);
      await axios.patch(
        `${BASE_URL}/api/admin/recruitment/profile/${editId}`,
        editForm,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      setEditOpen(false);
      setEditId('');
      await refresh();
      setToast({ visible: true, message: 'Profile updated', type: 'success' });
      setTimeout(()=> setToast({ visible: false, message: '', type: 'success' }), 2000);
    } catch (e) {
      setToast({ visible: true, message: e?.response?.data?.message || e?.message || 'Update failed', type: 'error' });
      setTimeout(()=> setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setEditSubmitting(false);
    }
  };

  const chipVariantClasses = {
    neutral: 'bg-gray-50 text-gray-700 border-gray-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const renderChips = (arr, variant = 'neutral') => {
    if (!Array.isArray(arr) || arr.length === 0) return '-';
    const colorClasses = chipVariantClasses[variant] || chipVariantClasses.neutral;
    return (
      <div className="flex flex-wrap gap-1 max-w-[260px] text-[10px] leading-tight">
        {arr.map((it, i) => {
          let label;
          if (it && typeof it === 'object') {
            const degree = it.degree || it.qualification || it.course || '';
            const inst = it.institution || it.college || it.university || it.school || '';
            const year = it.year || it.passingYear || it.passedOut || '';
            if (degree || inst || year) {
              const main = [degree, inst && inst ? (degree ? ` at ${inst}` : inst) : ''].join('').trim();
              label = year ? `${main} (${year})`.trim() : main || JSON.stringify(it);
            } else {
              label = it.designation || it.company || it.name || JSON.stringify(it);
            }
          } else {
            label = String(it);
          }
          return <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] border ${colorClasses}`} title={label}>{label}</span>;
        })}
      </div>
    );
  };

  const renderMixed = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) {
      const isRoleArray = v.every(item => item && typeof item === 'object' && ('designation' in item || 'company' in item));
      if (isRoleArray) {
        return v
          .map(item => `${item.designation || ''}${item.company ? ' at ' + item.company : ''}`.trim())
          .filter(Boolean)
          .join(' | ');
      }
      return v.map(item => {
        if (item && typeof item === 'object') {
          const degree = item.degree || item.qualification || item.course || '';
          const inst = item.institution || item.college || item.university || item.school || '';
          const year = item.year || item.passingYear || item.passedOut || '';
          if (degree || inst || year) {
            const main = [degree, inst && inst ? (degree ? ` at ${inst}` : inst) : ''].join('').trim();
            return year ? `${main} (${year})`.trim() : main || JSON.stringify(item);
          }
          if (item.designation || item.company) {
            return `${item.designation || ''}${item.company ? ' at ' + item.company : ''}`.trim();
          }
          return JSON.stringify(item);
        }
        return String(item);
      }).join(' | ');
    }
    if (typeof v === 'object') {
      const degree = v.degree || v.qualification || v.course || '';
      const inst = v.institution || v.college || v.university || v.school || '';
      const year = v.year || v.passingYear || v.passedOut || '';
      if (degree || inst || year) {
        const main = [degree, inst && inst ? (degree ? ` at ${inst}` : inst) : ''].join('').trim();
        return year ? `${main} (${year})`.trim() : main || JSON.stringify(v);
      }
      if ('designation' in v || 'company' in v) {
        return `${v.designation || ''}${v.company ? ' at ' + v.company : ''}`.trim();
      }
      return JSON.stringify(v);
    }
    return String(v);
  };

  const renderExperience = (v) => {
    if (!v) return '-';
    if (Array.isArray(v)) {
      return renderChips(v);
    }
    const s = String(v || '').trim();
    if (!s) return '-';
    const parts = s.split('|').map(part => part.trim()).filter(Boolean);
    if (parts.length <= 1) return s;
    return renderChips(parts);
  };

  const getLinkedInPastRolesFromRaw = (experience = []) => {
    if (!Array.isArray(experience) || !experience.length) return [];
    const currentIdx = experience.findIndex((e) => /present/i.test(String(e?.to || '')));
    const excludeIdx = currentIdx >= 0 ? currentIdx : 0;
    return experience
      .filter((_, idx) => idx !== excludeIdx)
      .map((e) => ({
        designation: e?.title || '',
        company: e?.company || '',
      }))
      .filter((r) => r.designation || r.company);
  };

  const getLinkedInTotalExperienceFromRaw = (experience = []) => {
    if (!Array.isArray(experience) || !experience.length) return '';
    const currentYear = new Date().getFullYear();
    let totalMonths = 0;

    const currentIdx = experience.findIndex((e) => /present/i.test(String(e?.to || '')));
    const excludeIdx = currentIdx >= 0 ? currentIdx : 0;

    experience.forEach((e, idx) => {
      if (idx === excludeIdx) return;
      const fromYear = parseInt(e.from, 10);
      let toYear;
      if (/present/i.test(String(e?.to || ''))) {
        toYear = currentYear;
      } else if (e.to) {
        toYear = parseInt(e.to, 10);
      } else {
        toYear = fromYear;
      }

      if (Number.isFinite(fromYear) && Number.isFinite(toYear)) {
        const diffMonths = Math.max(0, (toYear - fromYear) * 12);
        totalMonths += diffMonths;
      }
    });

    if (!totalMonths) return '';
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const parts = [];
    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}m`);
    return parts.join(' ');
  };

  const highlight = (text, needle) => {
    const str = String(text || '');
    const n = String(needle || '').trim();
    if (!n) return str;
    const lc = str.toLowerCase();
    const ln = n.toLowerCase();
    const parts = [];
    let idx = 0;
    while (true) {
      const i = lc.indexOf(ln, idx);
      if (i === -1) { parts.push(str.slice(idx)); break; }
      if (i > idx) parts.push(str.slice(idx, i));
      parts.push(<mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{str.slice(i, i + n.length)}</mark>);
      idx = i + n.length;
    }
    return <span>{parts}</span>;
  };

  const timeAgo = (d) => {
    try {
      const ts = typeof d === 'string' || typeof d === 'number' ? new Date(d).getTime() : (d?.getTime?.() || Date.now());
      const diff = Math.max(0, Date.now() - ts);
      const s = Math.floor(diff / 1000);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d2 = Math.floor(h / 24);
      if (d2 < 30) return `${d2}d ago`;
      const mo = Math.floor(d2 / 30);
      if (mo < 12) return `${mo}mo ago`;
      const y = Math.floor(mo / 12);
      return `${y}y ago`;
    } catch {
      return '';
    }
  };

  const getFileExt = (url) => {
    try {
      const u = new URL(url);
      const p = u.pathname;
      const ix = p.lastIndexOf('.');
      return ix >= 0 ? p.slice(ix + 1).toUpperCase() : '';
    } catch {
      const ix = String(url || '').lastIndexOf('.');
      return ix >= 0 ? String(url).slice(ix + 1).toUpperCase() : '';
    }
  };

  const toggleSkills = (id) => setExpandSkills(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleExperience = (id) => setExpandExperience(prev => ({ ...prev, [id]: !prev[id] }));
  const togglePreviousRoles = (id) => setExpandPreviousRoles(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleEducation = (id) => setExpandEducation(prev => ({ ...prev, [id]: !prev[id] }));
  const togglePreferredLocations = (id) => setExpandPreferredLocations(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleLocation = (id) => setExpandLocation(prev => ({ ...prev, [id]: !prev[id] }));

  const deleteResume = async (profileId) => {
    try {
      if (!window.confirm('Delete resume from Cloudinary for this candidate?')) return;
      setDeletingId(profileId);
      await axios.delete(
        `${BASE_URL}/api/admin/recruitment/resume/${profileId}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      await refresh();
      setToast({ visible: true, message: 'Resume deleted', type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2000);
    } catch (e) {
      setToast({
        visible: true,
        message: e?.response?.data?.message || e?.message || 'Delete failed',
        type: 'error',
      });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setDeletingId('');
    }
  };

  const displayedProfiles = useMemo(() => {
    let list = profiles;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((p) =>
        [p?.name, p?.email, p?.mobile]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
    }
    const loc = filterLocation.trim().toLowerCase();
    if (loc) {
      list = list.filter((p) => String(p?.location || '').toLowerCase().includes(loc));
    }
    const skill = filterSkill.trim().toLowerCase();
    if (skill) {
      list = list.filter((p) => {
        const s = Array.isArray(p?.skills) ? p.skills.join(' ') : String(p?.skills || '');
        return s.toLowerCase().includes(skill);
      });
    }

    const hasColumnFilters =
      columnFilters && Object.values(columnFilters).some((arr) => Array.isArray(arr) && arr.length > 0);
    if (hasColumnFilters) {
      list = list.filter((p) => {
        for (const [col, selectedVals] of Object.entries(columnFilters)) {
          if (!Array.isArray(selectedVals) || selectedVals.length === 0) continue;

          const values = getFilterValuesForColumn(p, col);
          if (!values.length) return false;

          const selectedNorm = new Set(selectedVals.map(normalizeFilterValue));
          const matched = values.some((val) => selectedNorm.has(normalizeFilterValue(val)));
          if (!matched) return false;
        }
        return true;
      });
    }

    return list;
  }, [profiles, q, filterLocation, filterSkill, columnFilters]);

  const selectedIds = useMemo(
    () => Object.keys(selectedMap).filter((k) => selectedMap[k]),
    [selectedMap]
  );

  const allShownSelected = useMemo(
    () => displayedProfiles.length > 0 && displayedProfiles.every((p) => selectedMap[p._id]),
    [displayedProfiles, selectedMap]
  );

  const toggleSelect = (id, value) => {
    if (!id) return;
    setSelectedMap((prev) => {
      const next = { ...prev };
      const nextVal = typeof value === 'boolean' ? value : !next[id];
      if (nextVal) {
        next[id] = true;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const selectAllShown = (val) => {
    const next = { ...selectedMap };
    displayedProfiles.forEach(p => { next[p._id] = !!val; });
    setSelectedMap(next);
  };
  const clearSelection = () => setSelectedMap({});

  const bulkMoveSelected = async () => {
    if (selectedIds.length === 0) {
      setToast({ visible: true, message: 'No profiles selected', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2000);
      return;
    }
    try {
      setBulkSaving(true);
      let ok = 0, skipped = 0, fail = 0;
      const deltas = {};
      for (const id of selectedIds) {
        const row = profiles.find(p => String(p._id) === String(id));
        if (!row) { skipped++; continue; }
        if (stageKey === 'FQC' && !row.resumeUrl) { skipped++; continue; }
        try {
          await axios.post(
            `${BASE_URL}/api/admin/recruitment/decision`,
            {
              profileId: id,
              decision: 'YES',
              remark: remarkById[id] || '',
              markerType: 'user',
              markerId: user?.id,
              markerName: user?.name,
            },
            {
              headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            }
          );
          ok++;
          const from = row?.currentStage || stageKey;
          const to = nextStage(from);
          if (from !== to) {
            deltas[from] = (deltas[from] || 0) - 1;
            deltas[to] = (deltas[to] || 0) + 1;
          }
        } catch (_) {
          fail++;
        }
      }
      if (Object.keys(deltas).length) {
        window.dispatchEvent(new CustomEvent('recruitment:countsDelta', { detail: { deltas } }));
      }
      await refresh();
      clearSelection();
      setToast({ visible: true, message: `Moved: ${ok} · Skipped: ${skipped} · Failed: ${fail}`, type: fail ? 'error' : 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: fail ? 'error' : 'success' }), 2500);
    } finally {
      setBulkSaving(false);
    }
  };

  const getResumeViewUrl = (url) => {
    if (!url) return '#';
    try {
      const u = new URL(url);
      const path = u.pathname.toLowerCase();
      if (path.endsWith('.pdf')) return url; // most browsers render PDF inline
      if (path.endsWith('.doc') || path.endsWith('.docx')) {
        return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
      }
      // default to Google Docs Viewer for unknown types
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    } catch {
      return url;
    }
  };

  const pipeline = [
    'BooleanDataSheet',
    'BooleanDataSheet(C)',
    'FQC',
    'FirstLineup',
    'OfficeInterview',
    'FinalLineup',
    'InterviewStatus',
    'Selection',
    'Joining',
    'JoiningStatus',
    'Billing',
  ];
  const stageDisplayNames = {
    BooleanDataSheet: '1) Boolean Data Sheet',
    'BooleanDataSheet(C)': '2) Boolean Data Sheet (C)',
    FQC: '3) First QC Sheet',
    FirstLineup: '4) Final QC',
    OfficeInterview: '5) First Lineup Sheet For Client ShortListing',
    FinalLineup: '6) Final Lineup Sheet',
    InterviewStatus: '7) Interview Status',
    Selection: '8) Selection Sheet',
    Joining: '9) Joining Sheet',
    JoiningStatus: '10) Joining Status',
    Billing: '11) Forward to Billing',
  };
  const getStageDisplayName = (stage) => stageDisplayNames[stage] || stage;
  const normalizeStage = (s) => {
    const v = String(s || '').trim();
    if (v === 'Boolean') return 'BooleanDataSheet';
    if (v === 'Boolean (C)') return 'BooleanDataSheet(C)';
    if (v === '') return 'BooleanDataSheet';
    return pipeline.includes(v) ? v : stageKey;
  };
  const nextStage = (from) => {
    const norm = normalizeStage(from);
    const idx = pipeline.indexOf(norm);
    return idx >= 0 && idx < pipeline.length - 1 ? pipeline[idx + 1] : norm;
  };

  const sortProfilesByRecent = (list) => {
    if (!Array.isArray(list)) return [];
    return list.slice().sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  };

  const load = async (jId) => {
    setLoading(true);
    setError('');
    try {
      if (!jId) {
        setProfiles([]);
        return;
      }
      if (isRecruiterFQC) {
        const { data } = await axios.get(
          `${BASE_URL}/api/admin/recruitment/recruiter/fqc-assigned`,
          {
            params: { jobId: jId },
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );
        const list = Array.isArray(data?.data) ? data.data : [];
        setProfiles(sortProfilesByRecent(list));
      } else {
        const { data } = await axios.get(
          `${BASE_URL}/api/admin/recruitment/parsed-profiles`,
          {
            params: { jobId: jId },
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );
        const list = Array.isArray(data?.data) ? data.data : [];
        let filtered = list;
        if (recruiterFilterActive && recruiterUserId) {
          filtered = filtered.filter(p => String(p?.assignedtoRecruiters) === String(recruiterUserId));
        }
        const stageList = filtered.filter(p => matchStage(p?.currentStage));
        setProfiles(sortProfilesByRecent(stageList));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId || !authToken) return;
    load(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, stageKey, authToken]);

  const refresh = async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      if (isRecruiterFQC) {
        const { data } = await axios.get(
          `${BASE_URL}/api/admin/recruitment/recruiter/fqc-assigned`,
          {
            params: { jobId },
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );
        const list = Array.isArray(data?.data) ? data.data : [];
        setProfiles(sortProfilesByRecent(list));
      } else {
        const { data } = await axios.get(
          `${BASE_URL}/api/admin/recruitment/parsed-profiles`,
          {
            params: { jobId },
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );
        const list = Array.isArray(data?.data) ? data.data : [];
        let filtered = list;
        if (recruiterFilterActive && recruiterUserId) {
          filtered = filtered.filter(p => String(p?.assignedtoRecruiters) === String(recruiterUserId));
        }
        const stageList = filtered.filter(p => matchStage(p?.currentStage));
        setProfiles(sortProfilesByRecent(stageList));
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const assignNextRecruiterFQC = async () => {
    if (!isRecruiterFQC || !jobId || !authToken) return;
    try {
      setAssigningNext(true);
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/recruitment/recruiter/fqc-assign-next`,
        { jobId },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      const doc = data?.data || null;
      if (!doc) {
        setToast({ visible: true, message: data?.message || 'No more profiles available', type: 'error' });
        setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
        return;
      }
      setProfiles((prev) => {
        const idx = prev.findIndex((p) => String(p._id) === String(doc._id));
        if (idx >= 0) {
          const without = prev.filter((p) => String(p._id) !== String(doc._id));
          return [doc, ...without];
        }
        return [doc, ...prev];
      });
    } catch (e) {
      setToast({ visible: true, message: e?.response?.data?.message || e?.message || 'Failed to assign profile', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setAssigningNext(false);
    }
  };

  const openDecision = (profileId, decision) => {
    // Inline action: directly submit using inline remark
    submitDecision(profileId, decision);
  };

  const submitDecision = async (profileId, decision) => {
    if (!profileId) return;
    try {
      setSavingId(profileId);
      const remarkValue = String(remarkById[profileId] || '').trim();
      if (!remarkValue) {
        setToast({ visible: true, message: 'Remark is required before submitting.', type: 'error' });
        setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
        return;
      }

      const payload = {
        profileId,
        decision,
        remark: remarkValue,
        markerType: 'user',
        markerId: user?.id,
        markerName: user?.name,
      };
      await axios.post(
        `${BASE_URL}/api/admin/recruitment/decision`,
        payload,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      // Compute from/to and emit counts delta immediately
      const row = profiles.find(p => String(p._id) === String(profileId));
      const from = row?.currentStage || stageKey;
      const to = decision === 'YES' ? nextStage(from) : normalizeStage(from);
      if (from && to) {
        const deltas = {};
        if (from !== to) {
          deltas[from] = -1;
          deltas[to] = 1;
        }
        if (Object.keys(deltas).length) {
          window.dispatchEvent(new CustomEvent('recruitment:countsDelta', {
            detail: {
              deltas,
              markerId: user?.id || user?._id || null,
            },
          }));
        }
      }
      await refresh();
      // Toast message about destination
      setToast({ visible: true, message: `Profile moved to ${to}`, type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2000);
    } catch (e) {
      setToast({ visible: true, message: e?.response?.data?.message || e?.message || 'Failed to save decision', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    }
    finally {
      setSavingId('');
    }
  };

  const uploadResume = async (profileId, file, candidateName) => {
    if (!file) return;
    try {
      setUploadingId(profileId);
      const form = new FormData();
      form.append('resume', file);
      form.append('profileId', profileId);
      if (candidateName) form.append('candidateName', candidateName);
      if (job && job._id) form.append('jobId', job._id);
      await axios.post(`${BASE_URL}/api/admin/recruitment/upload-resume`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      await refresh();
      setToast({ visible: true, message: 'Resume uploaded', type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2000);
    } catch (e) {
      setToast({ visible: true, message: e?.response?.data?.message || e?.message || 'Upload failed', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setUploadingId('');
    }
  };

  const sendJobActivationNotification = async () => {
    if (!jobId || !authToken) {
      setToast({ visible: true, message: 'Unable to send notification (missing job or auth).', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
      return;
    }
    try {
      setSendingActivation(true);
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/recruitment/job/${jobId}/notify-activation`,
        {},
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      const msg = data?.message || 'Notification sent';
      setToast({ visible: true, message: msg, type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2500);
    } catch (e) {
      setToast({
        visible: true,
        message: e?.response?.data?.message || e?.message || 'Failed to send notification',
        type: 'error',
      });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setSendingActivation(false);
    }
  };

  const sendFinalQCUpdateClient = async () => {
    if (!jobId || !authToken) {
      setToast({ visible: true, message: 'Unable to send notification (missing job or auth).', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
      return;
    }
    try {
      setSendingFinalQC(true);
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/recruitment/job/${jobId}/notify-final-qc`,
        {},
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      const msg = data?.message || 'Final QC update sent to client.';
      setToast({ visible: true, message: msg, type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2500);
    } catch (e) {
      setToast({
        visible: true,
        message: e?.response?.data?.message || e?.message || 'Failed to send notification',
        type: 'error',
      });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setSendingFinalQC(false);
    }
  };

  const sendFirstQCUpdateManager = async () => {
    if (!jobId || !authToken) {
      setToast({ visible: true, message: 'Unable to send notification (missing job or auth).', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
      return;
    }
    try {
      setSendingFQCManager(true);
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/recruitment/job/${jobId}/notify-first-qc-manager`,
        {},
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      const msg = data?.message || 'First QC sheet trigger sent to QC manager.';
      setToast({ visible: true, message: msg, type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2500);
    } catch (e) {
      setToast({
        visible: true,
        message: e?.response?.data?.message || e?.message || 'Failed to send notification',
        type: 'error',
      });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setSendingFQCManager(false);
    }
  };

  const openFinalLineupCandidateModal = (profile) => {
    if (!profile) return;
    setCandidateModal({ open: true, profile });
    setCandidateForm({
      email: '',
      mobile: '',
      interviewDate: '',
      interviewTime: '',
      contactPerson: '',
      contactNumber: '',
      location: '',
      address: '',
      interviewType: 'PI',
      interviewLink: '',
    });
  };

  const sendFinalLineupUpdateCandidate = async () => {
    if (!jobId || !authToken) {
      setToast({ visible: true, message: 'Unable to send notification (missing job or auth).', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
      return;
    }

    const trimmedEmail = String(candidateForm.email || '').trim();
    const trimmedMobile = String(candidateForm.mobile || '').trim();
    const trimmedLink = String(candidateForm.interviewLink || '').trim();
    const isVI = (candidateForm.interviewType || 'PI') === 'VI';

    if (!trimmedEmail && !trimmedMobile) {
      setToast({ visible: true, message: 'Please enter candidate email or mobile number.', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
      return;
    }

    if (!candidateForm.interviewDate || !candidateForm.interviewTime) {
      setToast({ visible: true, message: 'Please fill interview date and time.', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
      return;
    }

    if (isVI) {
      if (!trimmedLink) {
        setToast({ visible: true, message: 'Please enter video interview link.', type: 'error' });
        setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
        return;
      }
    } else {
      if (!candidateForm.contactPerson || !candidateForm.location) {
        setToast({ visible: true, message: 'Please fill interview date, time, contact person and location.', type: 'error' });
        setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
        return;
      }
    }

    try {
      setSendingFinalLineupCandidate(true);
      const payloadLocation = isVI ? 'Virtual Interview' : candidateForm.location;
      const payloadAddress = isVI ? (trimmedLink || 'N/A') : candidateForm.address;
      const payloadContactPerson = isVI ? 'N/A' : candidateForm.contactPerson;
      const payloadContactNumber = candidateForm.contactNumber;
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/recruitment/job/${jobId}/notify-final-lineup-candidate`,
        {
          email: trimmedEmail || undefined,
          mobile: trimmedMobile || undefined,
          interviewDate: candidateForm.interviewDate,
          interviewTime: candidateForm.interviewTime,
          contactPerson: payloadContactPerson,
          contactNumber: payloadContactNumber,
          location: payloadLocation,
          address: payloadAddress,
          interviewType: isVI ? 'VI' : 'PI',
          interviewLink: trimmedLink || undefined,
          profileId: candidateModal.profile?._id,
        },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );

      const msg = data?.message || 'Final lineup interview notification sent to candidate.';
      await refresh();
      setCandidateModal({ open: false, profile: null });
      setToast({ visible: true, message: msg, type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2500);
    } catch (e) {
      setToast({
        visible: true,
        message: e?.response?.data?.message || e?.message || 'Failed to send notification',
        type: 'error',
      });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setSendingFinalLineupCandidate(false);
    }
  };

  const hasError = !!error;

  return (
    <div className="text-sm text-gray-800">
      {toast.visible && (
        <div className={`fixed top-20 right-4 z-40 px-3 py-2 rounded text-white text-xs ${toast.type==='success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.message}</div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-600">
            <span>Total: {profiles.length}</span>
            <span>Shown: {displayedProfiles.length}</span>
          </div>
          <div className="flex items-center gap-1 border rounded px-1.5 py-0.5 bg-white">
            <button onClick={()=>setDensity('comfortable')} className={`text-[11px] px-1.5 py-0.5 rounded ${density==='comfortable'?'bg-gray-900 text-white':'text-gray-700 hover:bg-gray-100'}`}>Comfort</button>
            <button onClick={()=>setDensity('compact')} className={`text-[11px] px-1.5 py-0.5 rounded ${density==='compact'?'bg-gray-900 text-white':'text-gray-700 hover:bg-gray-100'}`}>Compact</button>
          </div>
          {stageKey === 'FQC' && (
            <button
              type="button"
              onClick={sendFirstQCUpdateManager}
              disabled={sendingFQCManager}
              className={`ml-2 px-3 py-1.5 text-xs rounded ${sendingFQCManager ? 'bg-sky-600/60 text-white cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
            >
              {sendingFQCManager ? 'Sending…' : 'Update to QC Manager'}
            </button>
          )}
          {isRecruiterFQC && (
            <button
              type="button"
              onClick={assignNextRecruiterFQC}
              disabled={nextDisabled}
              className={`ml-2 px-3 py-1.5 text-xs rounded ${nextDisabled ? 'bg-indigo-600/60 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {assigningNext ? 'Loading…' : 'Next'}
            </button>
          )}
          {stageKey==='BooleanDataSheet' && jobId && !recruiterView && (
            <button
              type="button"
              onClick={sendJobActivationNotification}
              disabled={sendingActivation}
              className={`ml-2 px-3 py-1.5 text-xs rounded ${sendingActivation ? 'bg-sky-600/60 text-white cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
            >
              {sendingActivation ? 'Sending…' : 'Trigger Client'}
            </button>
          )}
          {stageKey==='FinalLineup' && jobId && !recruiterView && (
            <button
              type="button"
              onClick={sendFinalLineupInformClient}
              disabled={sendingFinalLineupClient}
              className={`ml-2 px-3 py-1.5 text-xs rounded ${sendingFinalLineupClient ? 'bg-sky-600/60 text-white cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
            >
              {sendingFinalLineupClient ? 'Sending…' : 'Update Client'}
            </button>
          )}
          {stageKey==='BooleanDataSheet' && (
            <button type="button" onClick={()=> setNewOpen(true)} className="ml-2 px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white">Add Profile</button>
          )}
        </div>
      </div>
      {/* Quick Filters */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input value={qInput} onChange={e=>setQInput(e.target.value)} placeholder="Search name, email, mobile" className="text-xs px-2 py-1 border rounded w-56" />
        <input value={filterLocation} onChange={e=>setFilterLocation(e.target.value)} placeholder="Filter by location" className="text-xs px-2 py-1 border rounded w-40" />
        <input value={filterSkill} onChange={e=>setFilterSkill(e.target.value)} placeholder="Filter by skill" className="text-xs px-2 py-1 border rounded w-40" />
        <button type="button" onClick={()=>{ setQInput(''); setFilterLocation(''); setFilterSkill(''); }} className="ml-1 px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50">Clear</button>
      </div>
      {/* Bulk actions */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" className="accent-indigo-600" checked={allShownSelected} onChange={(e)=> selectAllShown(e.target.checked)} />
            <span>Select all (shown)</span>
          </label>
          <span className="text-gray-600">Selected: {selectedIds.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={bulkMoveSelected} disabled={bulkSaving || selectedIds.length===0} className={`px-3 py-1.5 text-xs rounded ${bulkSaving || selectedIds.length===0 ? 'bg-indigo-600/60 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>{bulkSaving? 'Moving…' : `Move Selected to ${getStageDisplayName(nextStage(stageKey))}`}</button>
        </div>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <input type="checkbox" className="accent-indigo-600" checked={allShownSelected} onChange={(e)=> selectAllShown(e.target.checked)} />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">#</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Name"
                    columnKey="name"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Experience"
                    columnKey="experience"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="CTC"
                    columnKey="ctc"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Location"
                    columnKey="location"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Preferred Locations"
                    columnKey="preferred_locations"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Designation"
                    columnKey="current_designation"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Current Company"
                    columnKey="current_company"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">Previous Roles</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Education"
                    columnKey="education"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Skills"
                    columnKey="skills"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Mobile"
                    columnKey="mobile"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  <ColumnFilterHeader
                    label="Email"
                    columnKey="email"
                    profiles={displayedProfiles}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeFilterSelection={activeFilterSelection}
                    setActiveFilterSelection={setActiveFilterSelection}
                  />
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">
                  Resume
                </th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 16 }).map((__, j) => (
                      <td key={`skc-${i}-${j}`} className="px-3 py-2 border-b">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-3 py-10">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center mb-2">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4m0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5Z"/></svg>
                      </div>
                      <div className="text-sm text-gray-700">No profiles in this stage</div>
                      {stageKey==='BooleanDataSheet' && (
                        <button type="button" onClick={()=> setNewOpen(true)} className="mt-2 px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white">Add Profile</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedProfiles.map((p, idx) => (
                  <React.Fragment key={p._id || idx}>
                  <tr
                    className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50 cursor-pointer"
                    onClick={(e) => {
                      const target = e.target;
                      if (target.closest('button, a, input, textarea, select, label')) return;
                      toggleSelect(p._id);
                    }}
                  >
                    <td className={`${density==='compact'?'px-2 py-1':'px-2 py-1'} border-b align-top`}>
                      <input type="checkbox" className="accent-indigo-600" checked={!!selectedMap[p._id]} onChange={(e)=> toggleSelect(p._id, e.target.checked)} />
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>{idx + 1}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top max-w-[180px] truncate`} title={p?.name || ''}>{highlight(p?.name || '-', q)}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>
                      {(() => {
                        if (String(p?.source || '').toLowerCase() === 'linkedin') {
                          const rawExp = Array.isArray(p?.raw?.experience) ? p.raw.experience : [];
                          const total = getLinkedInTotalExperienceFromRaw(rawExp);
                          return total || '-';
                        }

                        const v = p?.experience;
                        if (!v) return '-';

                        let items = [];
                        if (Array.isArray(v)) {
                          items = v.map((it) => {
                            if (it && typeof it === 'object') {
                              const d = it.designation || '';
                              const c = it.company ? ` at ${it.company}` : '';
                              const s = `${d}${c}`.trim();
                              return s || JSON.stringify(it);
                            }
                            return String(it || '').trim();
                          }).filter(Boolean);
                        } else {
                          const s = String(v || '').trim();
                          if (!s) return '-';
                          const parts = s.split('|').map(part => part.trim()).filter(Boolean);
                          if (parts.length <= 1) return s;
                          items = parts;
                        }

                        if (!items.length) return '-';

                        const expanded = !!expandExperience[p._id];
                        const shown = expanded ? items : items.slice(0, 3);
                        const more = items.length - shown.length;

                        return (
                          <div className="flex flex-col gap-1 max-w-[260px]">
                            <div className="flex flex-wrap gap-1 text-[10px] leading-tight">
                              {shown.map((s, si) => (
                                <span
                                  key={si}
                                  className="px-1.5 py-0.5 rounded border bg-gray-50 text-gray-700 border-gray-200"
                                  title={s}
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                            {more > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExperience(p._id)}
                                className="self-start px-2 py-0.5 text-[10px] rounded border bg-white hover:bg-gray-50 text-sky-700"
                              >
                                {expanded ? 'Show less' : `+${more} more`}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>{displayValue(p?.ctc)}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal w-40`}>
                      {(() => {
                        const text = displayValue(p?.location, '-');
                        if (!text || text === '-') return '-';

                        const expanded = !!expandLocation[p._id];
                        if (!expanded && text.length <= 60) {
                          return text;
                        }

                        const shortText = text.length > 60 && !expanded ? text.slice(0, 60) + '…' : text;
                        return (
                          <div className="flex items-start gap-1 max-w-[160px]">
                            <span className="flex-1 break-words" title={text}>{shortText}</span>
                            {text.length > 60 && (
                              <button
                                type="button"
                                onClick={() => toggleLocation(p._id)}
                                className="ml-1 text-[9px] px-1 py-0.5 rounded border bg-white hover:bg-gray-50 text-sky-700 whitespace-nowrap"
                              >
                                {expanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal`}>
                      {(() => {
                        const v = p?.preferred_locations;
                        if (!v) return '-';
                        let text;
                        if (Array.isArray(v)) {
                          const clean = v.map(sanitizeValue).filter(Boolean).join(', ');
                          text = clean || '';
                        } else {
                          text = displayValue(v, '');
                        }
                        if (!text) return '-';

                        const expanded = !!expandPreferredLocations[p._id];
                        if (!expanded && text.length <= 80) {
                          return text;
                        }

                        const shortText = text.length > 80 && !expanded ? text.slice(0, 80) + '…' : text;
                        return (
                          <div className="flex items-start gap-1 max-w-[260px]">
                            <span className="flex-1 break-words" title={text}>{shortText}</span>
                            {text.length > 80 && (
                              <button
                                type="button"
                                onClick={() => togglePreferredLocations(p._id)}
                                className="ml-1 text-[10px] px-1.5 py-0.5 rounded border bg-white hover:bg-gray-50 text-sky-700 whitespace-nowrap"
                              >
                                {expanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}><span className="px-1.5 py-0.5 rounded text-[10px] border bg-indigo-50 text-indigo-700 border-indigo-200">{displayValue(p?.current_designation)}</span></td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}><span className="px-1.5 py-0.5 rounded text-[10px] border bg-emerald-50 text-emerald-700 border-emerald-200">{displayValue(p?.current_company)}</span></td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal`}>
                      {(() => {
                        const isLinkedIn = String(p?.source || '').toLowerCase() === 'linkedin';
                        let roles = null;
                        if (isLinkedIn) {
                          const rawExp = Array.isArray(p?.raw?.experience) ? p.raw.experience : [];
                          roles = getLinkedInPastRolesFromRaw(rawExp);
                        } else if (Array.isArray(p?.previous_roles)) {
                          roles = p.previous_roles;
                        }

                        if (Array.isArray(roles)) {
                          const labels = roles
                            .map((r) =>
                              r && (r.designation || r.company)
                                ? `${r.designation || ''}${r.company ? ' at ' + r.company : ''}`.trim()
                                : (typeof r === 'object' ? JSON.stringify(r) : String(r))
                            )
                            .filter(Boolean);

                          if (!labels.length) return renderMixed(p?.previous_roles) || '-';
                          const expanded = !!expandPreviousRoles[p._id];
                          const shown = expanded ? labels : labels.slice(0, 3);
                          const hasMore = labels.length > shown.length;
                          return (
                            <div className="flex flex-col gap-1">
                              <div
                                className="relative"
                                style={!expanded && hasMore ? { maxHeight: 64, overflow: 'hidden' } : undefined}
                              >
                                <div className="flex flex-wrap items-center gap-1 max-w-[340px]">
                                  {renderChips(shown)}
                                </div>
                                {!expanded && hasMore && (
                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent" />
                                )}
                              </div>
                              {hasMore && (
                                <button
                                  type="button"
                                  onClick={() => togglePreviousRoles(p._id)}
                                  className="self-start px-2 py-0.5 text-[10px] rounded border bg-white hover:bg-gray-50 text-sky-700"
                                >
                                  {expanded ? 'Show less' : `+${labels.length - shown.length} more`}
                                </button>
                              )}
                            </div>
                          );
                        }

                        return renderMixed(p?.previous_roles) || '-';
                      })()}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal`}>
                      {Array.isArray(p?.education) ? (() => {
                        const all = p.education;
                        if (!all.length) return '-';
                        const expandedEdu = !!expandEducation[p._id];
                        const shownEdu = expandedEdu ? all : all.slice(0, 3);
                        const hasMore = all.length > shownEdu.length;
                        return (
                          <div className="flex flex-col gap-1">
                            <div
                              className="relative"
                              style={!expandedEdu && hasMore ? { maxHeight: 64, overflow: 'hidden' } : undefined}
                            >
                              <div className="flex flex-wrap items-center gap-1 max-w-[340px]">
                                {renderChips(shownEdu)}
                              </div>
                              {!expandedEdu && hasMore && (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent" />
                              )}
                            </div>
                            {hasMore && (
                              <button
                                type="button"
                                onClick={() => toggleEducation(p._id)}
                                className="self-start px-2 py-0.5 text-[10px] rounded border bg-white hover:bg-gray-50 text-sky-700"
                              >
                                {expandedEdu ? 'Show less' : `+${all.length - shownEdu.length} more`}
                              </button>
                            )}
                          </div>
                        );
                      })() : (renderMixed(p?.education) || '-')}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal min-w-[320px]`}>
                      {(() => {
                        const rawSkills = p?.skills;
                        if (!rawSkills) return '-';

                        let items;
                        if (Array.isArray(rawSkills)) {
                          items = rawSkills.map((s) => String(s || '').trim()).filter(Boolean);
                        } else {
                          items = String(rawSkills || '')
                            .split(/,\s*/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                        }

                        if (!items.length) return '-';

                        const isExpanded = !!expandSkills[p._id];
                        const shown = isExpanded ? items : items.slice(0, 6);
                        const more = items.length - shown.length;

                        return (
                          <div className="flex flex-wrap gap-1">
                            {shown.map((s, si) => (
                              <span
                                key={si}
                                title={s}
                                className="px-1.5 py-0.5 bg-gray-50 text-gray-700 border border-gray-200 rounded"
                              >
                                {s}
                              </span>
                            ))}
                            {more > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleSkills(p._id)}
                                className="px-1.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded cursor-pointer hover:bg-gray-200"
                              >
                                {isExpanded ? 'Show less' : `+${more} more`}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>
                      {recruiterView ? (
                        (() => {
                          const draft = getContactDraft(p);
                          return (
                            <input
                              type="text"
                              value={draft.mobile}
                              onChange={(e) => updateContactDraft(p._id, 'mobile', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="Mobile"
                            />
                          );
                        })()
                      ) : (
                        p?.mobile || '-'
                      )}
                    </td>

                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>
                      {recruiterView ? (
                        (() => {
                          const draft = getContactDraft(p);
                          const hasDraft = !!contactEdits[p._id];
                          const saving = contactSavingId === String(p._id);
                          return (
                            <div className="flex items-center gap-2">
                              <input
                                type="email"
                                value={draft.email}
                                onChange={(e) => updateContactDraft(p._id, 'email', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="Email"
                              />
                              <button
                                type="button"
                                disabled={!hasDraft || saving}
                                onClick={() => saveContact(p)}
                                className={`px-2 py-1 text-[10px] rounded border text-white ${
                                  !hasDraft || saving
                                    ? 'bg-emerald-500/60 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                              >
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        p?.email || '-'
                      )}
                    </td>

                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>
                      {p?.resumeUrl ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-700">
                            <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m7 1.5V8h5.5"/></svg>
                            {getFileExt(p.resumeUrl)}
                          </span>
                          <a href={getResumeViewUrl(p.resumeUrl)} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">Review</a>
                          <a href={p.resumeUrl} download className="text-xs text-indigo-600 underline">Download</a>
                          <button
                            onClick={() => deleteResume(p._id)}
                            disabled={deletingId===String(p._id)}
                            className={`inline-flex items-center gap-1 text-xs ${deletingId===String(p._id)?'text-red-600/60 cursor-wait':'text-red-600 hover:underline'}`}
                            title="Delete resume from Cloudinary"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9 3v1H4v2h16V4h-5V3H9m-3 6h12l-1 12H7L6 9Z"/></svg>
                            {deletingId===String(p._id)?'Deleting…':'Delete'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>
                      {(() => {
                        const decisions = Array.isArray(p.decisions) ? p.decisions : [];
                        const last = decisions.length ? decisions[decisions.length - 1] : null;
                        const lastDec = String(last?.decision || '').toUpperCase();
                        const isNo = lastDec === 'NO';
                        const lastRemark = last?.remark || '';
                        const letterSent = !!p.finalLineupInterviewLetterSent;

                        if (isNo) {
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-red-50 text-red-700 border-red-200">
                                  Status: NO
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setHistoryModal({ open: true, profile: p })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded border border-gray-300 bg-white hover:bg-gray-50 shadow-sm"
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M12 8v5h5v-2h-3V8zM12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1Zm0 20a9 9 0 1 1 9-9a9 9 0 0 1-9 9Z"/></svg>
                                  History
                                </button>
                                {stageKey === 'FinalLineup' && (
                                  <button
                                    type="button"
                                    onClick={() => openFinalLineupCandidateModal(p)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded border border-sky-500 text-sky-700 bg-white hover:bg-sky-50 shadow-sm"
                                  >
                                    Create Interview Letter 
                                  </button>
                                )}
                                {letterSent && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                                    <svg viewBox="0 0 24 24" className="w-3 h-3"><path fill="currentColor" d="M9 16.17 4.83 12 3.41 13.41 9 19l12-12-1.41-1.41Z"/></svg>
                                    Sent
                                  </span>
                                )}
                              </div>
                              {lastRemark && (
                                <div className="text-[11px] text-gray-500 max-w-xs truncate" title={lastRemark}>
                                  Last remark: <span className="font-medium text-gray-700">{lastRemark}</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        const inlineRemark = String(remarkById[p._id] || '').trim();
                        const remarkMissing = !inlineRemark;

                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {stageKey === 'FQC' && !p?.resumeUrl && (
                                <div className="flex items-center gap-2 mr-2">
                                  <label className={`inline-flex items-center gap-1 text-xs px-2 py-1 border rounded ${uploadingId===String(p._id)?'opacity-60 cursor-wait':'cursor-pointer bg-white hover:bg-gray-50'}`}>
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M5 20h14v-2H5v2m7-14l5 5h-3v4h-4v-4H7l5-5Z"/></svg>
                                    {uploadingId===String(p._id)?'Uploading…':'Upload Resume'}
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files && e.target.files[0];
                                        if (f) uploadResume(p._id, f, p?.name);
                                        e.target.value = '';
                                      }}
                                      disabled={uploadingId===String(p._id)}
                                    />
                                  </label>
                                </div>
                              )}
                              <input
                                type="text"
                                value={remarkById[p._id] || ''}
                                onChange={(e) => setRemarkById(prev => ({ ...prev, [p._id]: e.target.value }))}
                                placeholder="Remark"
                                className="text-xs px-2 py-1 border rounded min-w-[140px]"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={savingId===String(p._id) || (stageKey==='FQC' && !p?.resumeUrl) || remarkMissing}
                                  onClick={() => openDecision(p._id, 'YES')}
                                  className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-semibold rounded-full text-white shadow-md transition ${
                                    (savingId===String(p._id) || (stageKey==='FQC' && !p?.resumeUrl) || remarkMissing)
                                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500/70 cursor-not-allowed opacity-70'
                                      : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:shadow-lg hover:-translate-y-0.5'
                                  }`}
                                >
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/15 ring-1 ring-white/30">
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41Z"/></svg>
                                  </span>
                                  <span className="tracking-wide uppercase">
                                    {savingId===String(p._id)?'Saving…':(stageKey==='InterviewStatus'?'Approved':'Yes')}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled={savingId===String(p._id) || remarkMissing}
                                  onClick={() => openDecision(p._id, 'NO')}
                                  className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-semibold rounded-full text-white shadow-md transition ${
                                    (savingId===String(p._id) || remarkMissing)
                                      ? 'bg-gradient-to-r from-rose-400 to-rose-500/70 cursor-wait opacity-70'
                                      : 'bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 hover:shadow-lg hover:-translate-y-0.5'
                                  }`}
                                >
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/15 ring-1 ring-white/30">
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m5 11H7v-2h10z"/></svg>
                                  </span>
                                  <span className="tracking-wide uppercase">
                                    {savingId===String(p._id)?'Saving…':(stageKey==='InterviewStatus'?'Not Approved':'No')}
                                  </span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setHistoryModal({ open: true, profile: p })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded border border-gray-300 bg-white hover:bg-gray-50 shadow-sm"
                              >
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M12 8v5h5v-2h-3V8zM12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1Zm0 20a9 9 0 1 1 9-9a9 9 0 0 1-9 9Z"/></svg>
                                History
                              </button>
                              {stageKey === 'FinalLineup' && (
                                <button
                                  type="button"
                                  onClick={() => openFinalLineupCandidateModal(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded border border-sky-500 text-sky-700 bg-white hover:bg-sky-50 shadow-sm"
                                >
                                  Create Interview Letter
                                </button>
                              )}
                              {letterSent && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                                  <svg viewBox="0 0 24 24" className="w-3 h-3"><path fill="currentColor" d="M9 16.17 4.83 12 3.41 13.41 9 19l12-12-1.41-1.41Z"/></svg>
                                  Sent
                                </span>
                              )}
                            </div>
                            {lastRemark && (
                              <div className="text-[11px] text-gray-500 max-w-xs truncate" title={lastRemark}>
                                Last remark: <span className="font-medium text-gray-700">{lastRemark}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
        </table>
      </div>

      {hasError && (
        <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{error}</div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="mx-auto max-w-7xl pointer-events-auto">
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-white shadow-lg">
              <div className="text-xs text-gray-700">{selectedIds.length} selected</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={bulkMoveSelected}
                  disabled={bulkSaving || selectedIds.length===0}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded ${bulkSaving || selectedIds.length===0 ? 'bg-indigo-600/60 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M5 12h12.17l-4.59-4.59L13 6l7 7l-7 7l-1.41-1.41L17.17 14H5z"/></svg>
                  {bulkSaving? 'Moving…' : `Move Selected to ${getStageDisplayName(nextStage(stageKey))}`}
                </button>
                <button type="button" onClick={clearSelection} className="px-3 py-1.5 text-xs rounded border bg-white hover:bg-gray-50">Clear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {candidateModal.open && candidateModal.profile && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-slate-100">
            <div className="p-6 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">Final Lineup</p>
                <h3 className="text-2xl font-semibold text-slate-900">Update Candidate</h3>
                <p className="text-sm text-slate-600">
                  Send interview schedule to {candidateModal.profile?.name || 'candidate'} for {job?.position || 'this position'}.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium text-slate-600 border border-slate-200 rounded-full px-2 py-1 bg-slate-50">
                  <span className="uppercase tracking-[0.2em] text-slate-500">Type</span>
                  <div className="flex items-center gap-1 rounded-full bg-white px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => setCandidateForm(prev => ({ ...prev, interviewType: 'PI' }))}
                      className={`px-2 py-0.5 rounded-full text-[11px] ${
                        interviewType === 'PI'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      PI
                    </button>
                    <button
                      type="button"
                      onClick={() => setCandidateForm(prev => ({ ...prev, interviewType: 'VI' }))}
                      className={`px-2 py-0.5 rounded-full text-[11px] ${
                        interviewType === 'VI'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      VI
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCandidateModal({ open: false, profile: null })}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 mb-3">Candidate snapshot</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {candidateSuggestions.name && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {candidateSuggestions.name}
                    </span>
                  )}
                  {candidateSuggestions.designation && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-800">
                      {candidateSuggestions.designation}
                    </span>
                  )}
                  {candidateSuggestions.company && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-amber-800">
                      {candidateSuggestions.company}
                    </span>
                  )}
                  {(candidateSuggestions.email || candidateSuggestions.mobile) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                      {candidateSuggestions.email || '—'} · {candidateSuggestions.mobile || '—'}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5 rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">1</span>
                    Candidate contact
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-medium text-slate-700">Candidate Email</label>
                      {candidateSuggestions.email && (
                        <button
                          type="button"
                          onClick={() => applyCandidateSuggestion('email')}
                          className="text-sky-600 hover:text-sky-800 font-semibold"
                        >
                          Use {candidateSuggestions.email}
                        </button>
                      )}
                    </div>
                    <input
                      type="email"
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      placeholder="Type email address"
                    />
                    <p className="text-[11px] text-slate-500">We’ll send the interview details to this address.</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-medium text-slate-700">Candidate Mobile</label>
                      {candidateSuggestions.mobile && (
                        <button
                          type="button"
                          onClick={() => applyCandidateSuggestion('mobile')}
                          className="text-sky-600 hover:text-sky-800 font-semibold"
                        >
                          Use {candidateSuggestions.mobile}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={candidateForm.mobile}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, mobile: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      placeholder="Type mobile number"
                    />
                    <p className="text-[11px] text-slate-500">Optional but recommended for SMS alert.</p>
                  </div>
                </div>

                <div className="space-y-5 rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">2</span>
                    Interview schedule
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Interview Date *</label>
                      <input
                        type="date"
                        value={candidateForm.interviewDate}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, interviewDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                      <p className="text-[11px] text-slate-500">Select the exact date shared by the client.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Interview Time *</label>
                      <input
                        type="time"
                        value={candidateForm.interviewTime}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, interviewTime: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                      <p className="text-[11px] text-slate-500">Use 24-hour or AM/PM format.</p>
                    </div>
                  </div>

                  {!isVirtualInterview && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Contact Person *</label>
                        <input
                          type="text"
                          value={candidateForm.contactPerson}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          placeholder="Name of interviewer / HR"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Contact Number</label>
                        <input
                          type="text"
                          value={candidateForm.contactNumber}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          placeholder="Phone number for coordination"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!isVirtualInterview ? (
                <div className="space-y-5 rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">3</span>
                    Venue details
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-medium text-slate-700">Location *</label>
                        {candidateSuggestions.location && (
                          <button
                            type="button"
                            onClick={() => applyCandidateSuggestion('location')}
                            className="text-sky-600 hover:text-sky-800 font-semibold"
                          >
                            Use {candidateSuggestions.location}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={candidateForm.location}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="City / Office location"
                      />
                      <p className="text-[11px] text-slate-500">If not applicable, you can type N/A.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Address / Landmark</label>
                      <textarea
                        rows={3}
                        value={candidateForm.address}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="Full office address, floor, landmark, meeting room, etc."
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">Make sure all mandatory fields marked * are filled before sending the update.</p>
                </div>
              ) : (
                <div className="space-y-5 rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">3</span>
                    Video interview details
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Interview link *</label>
                    <input
                      type="url"
                      value={candidateForm.interviewLink}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, interviewLink: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-inner shadow-transparent focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      placeholder="Paste meeting link (Zoom/Google Meet/Teams/etc.)"
                    />
                    <p className="text-[11px] text-slate-500">For virtual interviews, candidates will receive this link instead of a physical venue.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-slate-50 rounded-b-2xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setCandidateModal({ open: false, profile: null })}
                className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendFinalLineupUpdateCandidate}
                disabled={sendingFinalLineupCandidate}
                className="w-full sm:w-auto rounded-xl border border-transparent bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-sky-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingFinalLineupCandidate ? 'Sending...' : 'Send Update'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Profile Modal */}
      {newOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Profile</h3>
              <p className="text-sm text-gray-600 mt-1">Create a new profile for {job?.position || 'this position'}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Experience</label>
                  <input
                    type="text"
                    value={newForm.experience}
                    onChange={(e) => setNewForm(prev => ({ ...prev, experience: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 3y 2m"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CTC</label>
                  <input
                    type="text"
                    value={newForm.ctc}
                    onChange={(e) => setNewForm(prev => ({ ...prev, ctc: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., ₹ 8 Lacs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newForm.location}
                    onChange={(e) => setNewForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Designation</label>
                  <input
                    type="text"
                    value={newForm.current_designation}
                    onChange={(e) => setNewForm(prev => ({ ...prev, current_designation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Company</label>
                  <input
                    type="text"
                    value={newForm.current_company}
                    onChange={(e) => setNewForm(prev => ({ ...prev, current_company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={newForm.mobile}
                    onChange={(e) => setNewForm(prev => ({ ...prev, mobile: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Mobile number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newForm.email}
                    onChange={(e) => setNewForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Previous Roles</label>
                  <textarea
                    value={newForm.previous_roles}
                    onChange={(e) => setNewForm(prev => ({ ...prev, previous_roles: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                    placeholder="Previous job roles (comma separated)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Education</label>
                  <textarea
                    value={newForm.education}
                    onChange={(e) => setNewForm(prev => ({ ...prev, education: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                    placeholder="Education details"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Skills</label>
                  <textarea
                    value={newForm.skills}
                    onChange={(e) => setNewForm(prev => ({ ...prev, skills: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                    placeholder="Skills (comma separated)"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-xl">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewOpen(false);
                    setNewForm({
                      name: '',
                      experience: '',
                      ctc: '',
                      location: '',
                      current_designation: '',
                      current_company: '',
                      previous_roles: '',
                      education: '',
                      preferred_locations: '',
                      skills: '',
                      mobile: '',
                      email: '',
                    });
                    setNewResume(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newForm.name.trim()) {
                      setToast({ visible: true, message: 'Name is required', type: 'error' });
                      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
                      return;
                    }
                    try {
                      if (!job?._id || !job?.positionId) {
                        setToast({ visible: true, message: 'Position details are incomplete. Please reopen this position and try again.', type: 'error' });
                        setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
                        return;
                      }
                      setNewSubmitting(true);
                      const payload = {
                        ...newForm,
                        jobId: job._id,
                        positionId: job.positionId,
                        source: 'application',
                        currentStage: 'BooleanDataSheet',
                      };
                      await axios.post(
                        `${BASE_URL}/api/admin/recruitment/manual-profile`,
                        payload,
                        {
                          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                        }
                      );
                      setNewOpen(false);
                      setNewForm({
                        name: '',
                        experience: '',
                        ctc: '',
                        location: '',
                        current_designation: '',
                        current_company: '',
                        previous_roles: '',
                        education: '',
                        preferred_locations: '',
                        skills: '',
                        mobile: '',
                        email: '',
                      });
                      setNewResume(null);
                      await refresh();
                      setToast({ visible: true, message: 'Profile created successfully', type: 'success' });
                      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2000);
                    } catch (e) {
                      setToast({ visible: true, message: e?.response?.data?.message || e?.message || 'Failed to create profile', type: 'error' });
                      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
                    } finally {
                      setNewSubmitting(false);
                    }
                  }}
                  disabled={newSubmitting || !newForm.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {newSubmitting ? 'Creating...' : 'Create Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* History Modal */}
      {historyModal.open && historyModal.profile && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-4 md:p-5 border-b flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Decision History</h3>
                <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                  {historyModal.profile?.name || 'Candidate'} &mdash; {historyModal.profile?.current_designation || 'Current Role'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal({ open: false, profile: null })}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="p-4 md:p-5">
              {Array.isArray(historyModal.profile?.decisions) && historyModal.profile.decisions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-[13px] table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">#</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Decision</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">From Stage</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">To Stage</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">By</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyModal.profile.decisions.map((d, idx) => {
                        const dec = String(d?.decision || '').toUpperCase();
                        const isYes = dec === 'YES';
                        const isNo = dec === 'NO';
                        return (
                          <tr key={idx} className="odd:bg-white even:bg-gray-50">
                            <td className="px-3 py-2 border-b align-top text-gray-700">{idx + 1}</td>
                            <td className="px-3 py-2 border-b align-top">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                  isYes
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isNo
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {dec || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-b align-top text-gray-700">{d?.fromStage || '-'}</td>
                            <td className="px-3 py-2 border-b align-top text-gray-700">{d?.toStage || '-'}</td>
                            <td className="px-3 py-2 border-b align-top text-gray-700">{d?.byName || d?.byType || '-'}</td>
                            <td className="px-3 py-2 border-b align-top text-gray-700 max-w-xs whitespace-pre-wrap">{d?.remark || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No history recorded yet for this profile.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StageSheet;
