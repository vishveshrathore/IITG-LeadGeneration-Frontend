import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BASE_URL } from '../../../config';
import { useAuth } from '../../../context/AuthContext';

const synonyms = {
  // Legacy names
  'BooleanDataSheet': ['Boolean', ''],
  'BooleanDataSheet(C)': ['Boolean (C)'],
};

const StageSheet = ({ job, stageKey, title }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [modalProfileId, setModalProfileId] = useState(null);
  const [modalDecision, setModalDecision] = useState('YES');
  const [modalRemark, setModalRemark] = useState('');
  const [remarkById, setRemarkById] = useState({});
  const [companyId, setCompanyId] = useState('');
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

  const companyName = useMemo(() => {
    const c = job?.createdBy || {};
    return c.companyName || c.CompanyName || '';
  }, [job]);

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
    console.log('openEdit called with row:', row);
    if (!row) {
      console.log('No row provided');
      return;
    }
    setEditId(row._id || '');
    console.log('Setting editOpen to true');
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
      console.error('Error prefilling:', e);
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

  const submitEdit = async () => {
    if (!editId) return;
    try {
      setEditSubmitting(true);
      await axios.patch(`${BASE_URL}/api/admin/recruitment/profile/${editId}`, editForm);
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

  const renderChips = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return '-';
    return (
      <div className="flex flex-wrap gap-1 max-w-[420px]">
        {arr.map((it, i) => {
          const label = typeof it === 'object' ? (it.designation || it.company || it.name || JSON.stringify(it)) : String(it);
          return <span key={i} className="px-1.5 py-0.5 rounded text-[10px] border bg-gray-50 text-gray-700 border-gray-200" title={label}>{label}</span>;
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
      return v.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' | ');
    }
    if (typeof v === 'object') {
      if ('designation' in v || 'company' in v) {
        return `${v.designation || ''}${v.company ? ' at ' + v.company : ''}`.trim();
      }
      return JSON.stringify(v);
    }
    return String(v);
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

  const deleteResume = async (profileId) => {
    try {
      if (!window.confirm('Delete resume from Cloudinary for this candidate?')) return;
      setDeletingId(profileId);
      await axios.delete(`${BASE_URL}/api/admin/recruitment/resume/${profileId}`);
      await refresh();
      setToast({ visible: true, message: 'Resume deleted', type: 'success' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 2000);
    } catch (e) {
      setToast({ visible: true, message: e?.response?.data?.message || e?.message || 'Delete failed', type: 'error' });
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 2500);
    } finally {
      setDeletingId('');
    }
  };

  const displayedProfiles = useMemo(() => {
    let list = profiles;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(p => [p?.name, p?.email, p?.mobile].filter(Boolean).join(' ').toLowerCase().includes(needle));
    }
    const loc = filterLocation.trim().toLowerCase();
    if (loc) {
      list = list.filter(p => String(p?.location || '').toLowerCase().includes(loc));
    }
    const skill = filterSkill.trim().toLowerCase();
    if (skill) {
      list = list.filter(p => {
        const s = Array.isArray(p?.skills) ? p.skills.join(' ') : String(p?.skills || '');
        return s.toLowerCase().includes(skill);
      });
    }
    return list;
  }, [profiles, q, filterLocation, filterSkill]);

  const selectedIds = useMemo(() => Object.keys(selectedMap).filter(k => selectedMap[k]), [selectedMap]);
  const allShownSelected = useMemo(() => displayedProfiles.length > 0 && displayedProfiles.every(p => selectedMap[p._id]), [displayedProfiles, selectedMap]);
  const toggleSelect = (id, val) => {
    setSelectedMap(prev => ({ ...prev, [id]: val ?? !prev[id] }));
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
          await axios.post(`${BASE_URL}/api/admin/recruitment/decision`, {
            profileId: id,
            decision: 'YES',
            remark: remarkById[id] || '',
            markerType: 'user',
            markerId: user?.id,
            markerName: user?.name,
          });
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
    'FinalInterview',
    'InterviewStatus',
    'Selection',
    'Joining',
    'JoiningStatus',
    'Billing'
  ];
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

  const load = async (name) => {
    setLoading(true);
    setError('');
    try {
      // company mapping
      const compRes = await axios.get(`${BASE_URL}/api/recruitment/getCompanies/all`);
      const companies = Array.isArray(compRes?.data?.data) ? compRes.data.data : [];
      const match = companies.find((c) => String(c.CompanyName || c.companyName || c.name || '').toLowerCase() === String(name).toLowerCase());
      if (!match?._id) {
        setProfiles([]);
        setError('Recruitment company not found for this position');
        return;
      }
      setCompanyId(match._id);
      const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/parsed-profiles`, { params: { companyId: match._id } });
      const list = Array.isArray(data?.data) ? data.data : [];
      setProfiles(list.filter(p => matchStage(p?.currentStage)));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyName) return;
    load(companyName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, stageKey]);

  const refresh = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${BASE_URL}/api/admin/recruitment/parsed-profiles`, { params: { companyId } });
      const list = Array.isArray(data?.data) ? data.data : [];
      setProfiles(list.filter(p => matchStage(p?.currentStage)));
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
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
      const payload = {
        profileId,
        decision,
        remark: remarkById[profileId] || '',
        markerType: 'user',
        markerId: user?.id,
        markerName: user?.name,
      };
      await axios.post(`${BASE_URL}/api/admin/recruitment/decision`, payload);
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
          window.dispatchEvent(new CustomEvent('recruitment:countsDelta', { detail: { deltas } }));
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
        headers: { 'Content-Type': 'multipart/form-data' }
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
          <button type="button" onClick={bulkMoveSelected} disabled={bulkSaving || selectedIds.length===0} className={`px-3 py-1.5 text-xs rounded ${bulkSaving || selectedIds.length===0 ? 'bg-indigo-600/60 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>{bulkSaving? 'Moving…' : `Move Selected to ${nextStage(stageKey)}`}</button>
        </div>
      </div>
      <div className="border rounded overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full table-auto text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">
                  <input type="checkbox" className="accent-indigo-600" checked={allShownSelected} onChange={(e)=> selectAllShown(e.target.checked)} />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Experience</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">CTC</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Location</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Current Role</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Current Company</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Previous Roles</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Education</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Preferred Locations</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b min-w-[360px]">Skills</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Mobile</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Email</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Resume</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Actions</th>
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
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50">
                    <td className={`${density==='compact'?'px-2 py-1':'px-2 py-1'} border-b align-top`}>
                      <input type="checkbox" className="accent-indigo-600" checked={!!selectedMap[p._id]} onChange={(e)=> toggleSelect(p._id, e.target.checked)} />
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>{idx + 1}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top max-w-[180px] truncate`} title={p?.name || ''}>{highlight(p?.name || '-', q)}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>{p?.experience || '-'}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>{p?.ctc || '-'}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>{p?.location || '-'}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}><span className="px-1.5 py-0.5 rounded text-[10px] border bg-indigo-50 text-indigo-700 border-indigo-200">{p?.current_designation || '-'}</span></td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}><span className="px-1.5 py-0.5 rounded text-[10px] border bg-emerald-50 text-emerald-700 border-emerald-200">{p?.current_company || '-'}</span></td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal`}>{Array.isArray(p?.previous_roles) ? renderChips(p.previous_roles.map(r=> (r.designation || r.company) ? `${r.designation || ''}${r.company ? ' at ' + r.company : ''}`.trim() : (typeof r==='object'? JSON.stringify(r): String(r)))) : (renderMixed(p?.previous_roles) || '-')}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal`}>{Array.isArray(p?.education) ? renderChips(p.education) : (renderMixed(p?.education) || '-')}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal`}>{Array.isArray(p?.preferred_locations) ? renderChips(p.preferred_locations) : (renderMixed(p?.preferred_locations) || '-')}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top break-words whitespace-normal`}>
                      {Array.isArray(p?.skills) ? (
                        (() => {
                          const expanded = !!expandSkills[p._id];
                          const all = p.skills;
                          const shown = expanded ? all : all.slice(0, 8);
                          return (
                            <div className="flex flex-wrap gap-1 max-w-[720px] items-center">
                              {shown.map((s, si) => (
                                <span key={si} className="px-2 py-0.5 rounded text-[11px] border bg-slate-50 text-slate-700 border-slate-200" title={String(s)}>{String(s)}</span>
                              ))}
                              {all.length > shown.length && (
                                <button type="button" onClick={()=> toggleSkills(p._id)} className="px-2 py-0.5 text-[11px] rounded border bg-white hover:bg-gray-50">+{all.length - shown.length} more</button>
                              )}
                              {expanded && all.length > 8 && (
                                <button type="button" onClick={()=> toggleSkills(p._id)} className="px-2 py-0.5 text-[11px] rounded border bg-white hover:bg-gray-50">Show less</button>
                              )}
                            </div>
                          );
                        })()
                      ) : (p?.skills || '-')}
                    </td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>{p?.mobile || '-'}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top max-w-[220px] truncate`} title={p?.email || ''}>{highlight(p?.email || '-', q)}</td>
                    <td className={`${density==='compact'?'px-2 py-1':'px-3 py-2'} border-b align-top`}>
                      {p?.resumeUrl ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-700">
                            <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m7 1.5V8h5.5"/></svg>
                            {getFileExt(p.resumeUrl)}
                          </span>
                          <a href={getResumeViewUrl(p.resumeUrl)} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">Preview</a>
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
                      <div className="flex flex-wrap items-center gap-2">
                        {/* FQC stage requires resume upload before YES */}
                        {stageKey === 'FQC' && !p?.resumeUrl && (
                          <div className="flex items-center gap-2 mr-2">
                            <label className={`inline-flex items-center gap-1 text-xs px-2 py-1 border rounded ${uploadingId===String(p._id)?'opacity-60 cursor-wait':'cursor-pointer bg-white hover:bg-gray-50'}`}>
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M5 20h14v-2H5v2m7-14l5 5h-3v4h-4v-4H7l5-5Z"/></svg>
                              {uploadingId===String(p._id)?'Uploading…':'Upload Resume'}
                              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e)=>{
                                const f = e.target.files && e.target.files[0];
                                if (f) uploadResume(p._id, f, p?.name);
                                e.target.value = '';
                              }} disabled={uploadingId===String(p._id)} />
                            </label>
                          </div>
                        )}
                        {/* Inline Remark */}
                        <input
                          type="text"
                          value={remarkById[p._id] || ''}
                          onChange={(e)=> setRemarkById(prev=>({ ...prev, [p._id]: e.target.value }))}
                          placeholder="Remark"
                          className="text-xs px-2 py-1 border rounded min-w-[160px]"
                        />
                        <button disabled={savingId===String(p._id) || (stageKey==='FQC' && !p?.resumeUrl)} onClick={() => openDecision(p._id, 'YES')} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded text-white ${(savingId===String(p._id) || (stageKey==='FQC' && !p?.resumeUrl))?'bg-emerald-600/60 cursor-not-allowed':'bg-emerald-600 hover:bg-emerald-700'}`}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41Z"/></svg>
                          {savingId===String(p._id)?'Saving…':(stageKey==='InterviewStatus'?'Approved':'YES')}
                        </button>
                        <button disabled={savingId===String(p._id)} onClick={() => openDecision(p._id, 'NO')} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded text-white ${savingId===String(p._id)?'bg-red-600/60 cursor-wait':'bg-red-600 hover:bg-red-700'}`}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m5 11H7v-2h10z"/></svg>
                          {savingId===String(p._id)?'Saving…':(stageKey==='InterviewStatus'?'Not Approved':'NO')}
                        </button>
                        <button type="button" onClick={()=> openEdit(p)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50" title="Edit profile" aria-label="Edit profile">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M5 20h14v-2H5v2m3.7-5.88l7.68-7.69l3.18 3.18l-7.69 7.68H8.7v-3.17z"/></svg>
                          Edit
                        </button>
                        <button onClick={()=> setHistoryModal({ open: true, profile: p })} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M12 8v5h5v-2h-3V8zM12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1Zm0 20a9 9 0 1 1 9-9a9 9 0 0 1-9 9Z"/></svg>
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                  {bulkSaving? 'Moving…' : `Move Selected to ${nextStage(stageKey)}`}
                </button>
                <button type="button" onClick={clearSelection} className="px-3 py-1.5 text-xs rounded border bg-white hover:bg-gray-50">Clear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageSheet;
