import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiBriefcase, FiMapPin, FiPhone, FiMail, FiBookOpen, FiStar } from 'react-icons/fi';
import AnimatedHRNavbar from '../../components/HRNavbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { BASE_URL } from '../../config';

const navItems = [
    { name: 'Dashboard', path: '/hr-recruiter/dashboard' },
    { name: 'Position MIS', path: '/hr-recruiter/positions' },
    { name: 'Local Hiring', path: '/hr-recruiter/local-hiring' },
];

const STATUS_OPTIONS = ['RNR', 'Wrong Number', 'Positive', 'Negative', 'Line up', 'Blacklist'];

const PRESET_POSITIONS = ['CRE', 'CRM', 'Mgr HRBP', 'Team Lead CRM', 'Training & Productivity'];

const PROFILE_SUMMARY_LABELS = [
    'Name',
    'Experience',
    'CTC',
    'Location',
    'Current Designation',
    'Current Company',
    'Preferred Locations',
    'Mobile',
    'Email',
    'Skills',
    'Education',
];

const DEFAULT_EMAIL_SUBJECT = 'Job Opportunity – Please review the Job Description';

// Builds the default candidate email body.
// "data" can be either a string (position name only) or an object
// { positionName, ctc, location } so we can dynamically fill all parts.
const buildDefaultEmailBody = (info, data) => {
    const recruiterName = info?.name || '';
    const recruiterEmail = info?.email || '';
    const recruiterContact = info?.contact || '';

    let positionName = '';
    let ctc = '';
    let location = '';

    if (typeof data === 'string') {
        positionName = String(data || '').trim();
    } else if (data && typeof data === 'object') {
        positionName = String(data.positionName || '').trim();
        ctc = String(data.ctc || '').trim();
        location = String(data.location || '').trim();
    }

    const hasPosition = !!positionName;
    const hasCtc = !!ctc;
    const hasLocation = !!location;

    let opportunityLine;

    if (hasPosition || hasCtc || hasLocation) {
        const positionPart = hasPosition ? positionName : 'the mentioned position';
        const locationPart = hasLocation ? ` at ${location}` : '';
        const ctcPart = hasCtc ? ` with a CTC of ${ctc}` : '';

        opportunityLine = `As discussed during our recent telephonic conversation, we are looking for candidates for the position of ${positionPart}${locationPart}${ctcPart}.`;
    } else {
        opportunityLine = 'As discussed during our recent telephonic conversation, we are looking for candidates for a suitable position that aligns with your profile and experience.';
    }

    return `Hello Dear Candidate, 👋
Greetings of the day!

We are IITGJobs.co.in, a trusted HR solutions provider headquartered in Jabalpur, Madhya Pradesh.

${opportunityLine}

The detailed Job Description (JD) is attached to this email. Kindly go through it and, if you feel you are the best suitable candidate for this position, please send us your updated resume for active participation in the recruitment process.

If you require any additional information, clarification, or guidance, please feel free to connect with us. Our HR team will be happy to assist you at every step of your career journey.

We look forward to your response and hope to support you in achieving your professional goals. ✨


Warm regards,

${recruiterName}
${recruiterContact ? `Contact: ${recruiterContact}\n` : ''}${recruiterEmail ? `Email: ${recruiterEmail}\n` : ''}

Website - www.iitgjobs.co.in

Team IITGJobs.com Pvt. Ltd.`;
};

const HRRecruiterLocalHiring = () => {
    const { authToken, user } = useAuth();
    const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
    const navigate = useNavigate();

    const [tab, setTab] = useState('next'); // next | worksheet

    const [loading, setLoading] = useState(false);
    const [leadLoading, setLeadLoading] = useState(false);
    const [lead, setLead] = useState(null);
    const [assignmentId, setAssignmentId] = useState('');

    const [status, setStatus] = useState('');
    const [remarks, setRemarks] = useState('');
    const [lineUpDateTime, setLineUpDateTime] = useState('');
    const [interviewType, setInterviewType] = useState('');
    const [selectedPositions, setSelectedPositions] = useState([]);

    const [emailInput, setEmailInput] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);
    const [editingEmailId, setEditingEmailId] = useState(null);
    const [editingEmailValue, setEditingEmailValue] = useState('');
    const [rowEmailSaving, setRowEmailSaving] = useState(null);

    const [worksheetLoading, setWorksheetLoading] = useState(false);
    const [worksheet, setWorksheet] = useState([]);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewItem, setViewItem] = useState(null);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [jdSentFilter, setJdSentFilter] = useState('');

    // Filter worksheet data based on search and filter criteria
    const filteredWorksheet = worksheet.filter((a) => {
        const l = a?.lead || {};
        const name = (l.name || l?.profile?.name || '').toLowerCase();
        const email = (l.email || l?.profile?.email || '').toLowerCase();
        const mobile = Array.isArray(l.mobile) ? l.mobile.join(' ').toLowerCase() : (l.mobile || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        // Search filter - match name, email, or mobile
        const matchesSearch = !searchTerm ||
            name.includes(searchLower) ||
            email.includes(searchLower) ||
            mobile.includes(searchLower);

        // Status filter
        const matchesStatus = !statusFilter || a.currentStatus === statusFilter;

        // JD Sent filter
        const matchesJdSent = !jdSentFilter ||
            (jdSentFilter === 'sent' && a.emailSent) ||
            (jdSentFilter === 'not-sent' && !a.emailSent);

        return matchesSearch && matchesStatus && matchesJdSent;
    });

    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailModalLead, setEmailModalLead] = useState(null);
    const [emailModalAssignmentId, setEmailModalAssignmentId] = useState(null);
    const [emailModalTo, setEmailModalTo] = useState('');
    const [emailModalSubject, setEmailModalSubject] = useState('');
    const [emailModalBody, setEmailModalBody] = useState('');
    const [emailModalFile, setEmailModalFile] = useState(null);
    const [emailModalSending, setEmailModalSending] = useState(false);
    const [emailOpportunity, setEmailOpportunity] = useState('');

    const [resumeUploading, setResumeUploading] = useState(false);

    const [recruiterInfo, setRecruiterInfo] = useState({
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.mobile || user?.phone || '',
    });

    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [updatingItem, setUpdatingItem] = useState(null);

    const fetchNext = async () => {
        if (!token) return;
        setLeadLoading(true);
        try {
            const { data } = await axios.get(`${BASE_URL}/api/local-hiring/next`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!data?.success) {
                setLead(null);
                setAssignmentId('');
                return;
            }

            setLead(data.lead || null);
            setAssignmentId(data.assignmentId || '');
            setStatus('');
            setRemarks('');
        } catch (e) {
            if (e?.response?.status === 404) {
                setLead(null);
                setAssignmentId('');
            } else {
                toast.error(e?.response?.data?.message || 'Failed to fetch lead');
                setLead(null);
                setAssignmentId('');
            }
        } finally {
            setLeadLoading(false);
        }
    };

    const updateLead = async (goNext = true) => {
        if (!token) return toast.error('Not authenticated');
        if (!assignmentId) return toast.error('No assignment loaded');
        if (!status) return toast.error('Select status');

        if (!String(remarks || '').trim()) return toast.error('Remarks is required');

        // Validate line-up date/time if status is "Line up"
        if (status === 'Line up' && !lineUpDateTime) {
            return toast.error('Line-up date and time is required when status is "Line up"');
        }

        // Validate interview type if status is "Line up"
        if (status === 'Line up' && !interviewType) {
            return toast.error('Type of Interview is required when status is "Line up"');
        }

        if (goNext && (status === 'Positive' || status === 'Line up')) {
            if (!lead?.profile?.resumeUrl) {
                return toast.error('Upload resume before moving to next lead');
            }
        }

        setLoading(true);
        try {
            const requestData = { currentStatus: status, remarks };

            // Add line-up date/time if status is "Line up"
            if (status === 'Line up' && lineUpDateTime) {
                requestData.lineUpDateTime = lineUpDateTime;
            }

            if (status === 'Line up' && interviewType) {
                requestData.interviewType = interviewType;
            }

            const { data } = await axios.put(
                `${BASE_URL}/api/local-hiring/assignment/${assignmentId}`,
                requestData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to update');
                return;
            }

            toast.success(goNext ? 'Saved. Loading next lead…' : 'Saved');

            if (goNext) {
                // Reset form only when moving to next lead
                setStatus('');
                setRemarks('');
                setLineUpDateTime('');
                setInterviewType('');
                await fetchNext();
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorksheet = async () => {
        if (!token) return;
        setWorksheetLoading(true);
        try {
            const { data } = await axios.get(`${BASE_URL}/api/local-hiring/my/worksheet`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const list = Array.isArray(data?.data) ? data.data : [];
            setWorksheet(list);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load worksheet');
            setWorksheet([]);
        } finally {
            setWorksheetLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'worksheet') fetchWorksheet();
    }, [tab]);

    useEffect(() => {
        fetchWorksheet();
    }, [token]);

    useEffect(() => {
        fetchNext();
    }, [token]);

    useEffect(() => {
        setRecruiterInfo((prev) => ({
            ...prev,
            name: user?.name || prev.name || '',
            email: user?.email || prev.email || '',
        }));
    }, [user?.name, user?.email]);

    useEffect(() => {
        const fetchRecruiterProfile = async () => {
            if (!token) return;
            try {
                const { data } = await axios.get(`${BASE_URL}/api/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const contactNumber = data?.mobile || data?.altMobile || data?.officeSim || data?.user?.mobile || '';
                setRecruiterInfo({
                    name: data?.user?.name || data?.name || recruiterInfo.name || '',
                    email: data?.user?.email || data?.email || recruiterInfo.email || '',
                    contact: contactNumber || recruiterInfo.contact || '',
                });
            } catch (_) {
                // ignore failures; we'll fall back to whatever is already available
            }
        };
        fetchRecruiterProfile();
    }, [token]);

    useEffect(() => {
        if (lead) {
            setEmailInput(lead?.email || lead?.profile?.email || '');
        } else {
            setEmailInput('');
        }
        setSelectedPositions([]);
    }, [lead]);

    const leadName = lead?.name || lead?.profile?.name || '—';
    const leadLocation = lead?.location || lead?.profile?.location || '—';
    const leadEmail = lead?.email || lead?.profile?.email || '—';
    const leadMobile = Array.isArray(lead?.mobile) ? lead.mobile.join(', ') : '—';
    const leadResumeUrl = lead?.profile?.resumeUrl || '';
    const normalizedLeadEmail = lead ? String(lead?.email || lead?.profile?.email || '').trim().toLowerCase() : '';
    const normalizedInputEmail = String(emailInput || '').trim().toLowerCase();
    const emailUpdateDisabled = !lead || emailSaving || !normalizedInputEmail || normalizedInputEmail === normalizedLeadEmail;
    const showContactResume = status === 'Positive' || status === 'Line up';

    const handleTogglePositionTag = (tag) => {
        setSelectedPositions((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const openEmailModalForCurrentLead = async () => {
        if (!token) {
            toast.error('Not authenticated');
            return;
        }

        if (!lead?._id) {
            toast.error('No lead selected');
            return;
        }

        if (emailModalSending) {
            // Prevent multiple parallel sends if a request is already in progress
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const candidate = String(normalizedInputEmail || normalizedLeadEmail || '').trim().toLowerCase();

        if (!emailRegex.test(candidate)) {
            toast.error('Enter a valid email first');
            return;
        }

        const opportunityText = selectedPositions.length ? selectedPositions.join(', ') : '';

        const jdKeys = [];
        if (selectedPositions.includes('CRE')) {
            jdKeys.push('cre');
        }
        if (selectedPositions.includes('CRM')) {
            jdKeys.push('crm');
        }
        if (selectedPositions.includes('Mgr HRBP')) {
            jdKeys.push('mgr_hrbp');
        }
        if (selectedPositions.includes('Team Lead CRM')) {
            jdKeys.push('team_lead_crm');
        }
        if (selectedPositions.includes('Training & Productivity')) {
            jdKeys.push('training_productivity');
        }
        const primaryJdKey = jdKeys[0] || '';

        try {
            setEmailModalSending(true);

            const formData = new FormData();
            formData.append('subject', DEFAULT_EMAIL_SUBJECT);
            formData.append('text', buildDefaultEmailBody(recruiterInfo, opportunityText || ''));
            formData.append('to', candidate);
            if (primaryJdKey) {
                formData.append('jdKey', primaryJdKey);
            }
            if (jdKeys.length) {
                formData.append('jdKeys', JSON.stringify(jdKeys));
            }

            const { data } = await axios.post(
                `${BASE_URL}/api/local-hiring/lead/${lead._id}/email`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to send email');
                return;
            }

            toast.success('Email sent');

            const assignmentForLead = worksheet.find((item) => item?.lead?._id === lead._id);

            if (assignmentForLead?._id) {
                setWorksheet((prev) =>
                    prev.map((item) =>
                        item._id === assignmentForLead._id ? { ...item, emailSent: true } : item
                    )
                );
                setViewItem((prev) =>
                    prev && prev._id === assignmentForLead._id ? { ...prev, emailSent: true } : prev
                );
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to send email');
        } finally {
            setEmailModalSending(false);
        }
    };

    const handleSendEmail = async () => {
        if (!token) return toast.error('Not authenticated');
        if (!emailModalLead?._id) return toast.error('Lead not found');

        const subjectText = String(emailModalSubject || '').trim();
        const bodyText = String(emailModalBody || '').trim();
        const toValue = String(emailModalTo || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!subjectText) return toast.error('Subject is required');
        if (!bodyText) return toast.error('Message is required');
        if (!emailRegex.test(toValue)) return toast.error('Enter a valid recipient email');

        try {
            setEmailModalSending(true);

            const formData = new FormData();
            formData.append('subject', subjectText);
            formData.append('text', bodyText);
            formData.append('to', toValue);
            if (emailModalFile) {
                formData.append('attachment', emailModalFile);
            }

            const { data } = await axios.post(
                `${BASE_URL}/api/local-hiring/lead/${emailModalLead._id}/email`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to send email');
                return;
            }

            toast.success('Email sent');

            if (emailModalAssignmentId) {
                setWorksheet((prev) =>
                    prev.map((item) =>
                        item._id === emailModalAssignmentId ? { ...item, emailSent: true } : item
                    )
                );
                setViewItem((prev) =>
                    prev && prev._id === emailModalAssignmentId ? { ...prev, emailSent: true } : prev
                );
            }

            closeEmailModal();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to send email');
        } finally {
            setEmailModalSending(false);
        }
    };

    const STATUS_BADGE_VARIANTS = {
        Positive: 'bg-sky-50 text-sky-700 border-sky-200',
        'Line up': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Negative: 'bg-rose-50 text-rose-700 border-rose-200',
        RNR: 'bg-amber-50 text-amber-700 border-amber-200',
        Blacklist: 'bg-slate-200 text-slate-700 border-slate-300',
        'Wrong Number': 'bg-orange-50 text-orange-700 border-orange-200',
    };

    const statusBadgeClass =
        status ? STATUS_BADGE_VARIANTS[status] || 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-100 text-slate-500 border-slate-200';

    const getProfileFields = (l) => {
        const p = l?.profile || {};
        const prev = Array.isArray(p.previous_roles)
            ? (p.previous_roles.every((it) => it && typeof it === 'object' && ('designation' in it || 'company' in it))
                ? p.previous_roles
                    .map((it) => `${it?.designation || ''}${it?.company ? ' at ' + it.company : ''}`.trim())
                    .filter(Boolean)
                    .join(' | ')
                : p.previous_roles.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', '))
            : (p.previous_roles || '—');

        return [
            { label: 'Name', value: l?.name || p.name || '—' },
            { label: 'Experience', value: p.experience || '—' },
            { label: 'CTC', value: p.ctc || '—' },
            { label: 'Location', value: l?.location || p.location || '—' },
            { label: 'Current Designation', value: p.current_designation || '—' },
            { label: 'Current Company', value: p.current_company || '—' },
            { label: 'Preferred Locations', value: p.preferred_locations || '—' },
            { label: 'Mobile', value: Array.isArray(l?.mobile) ? l.mobile.join(', ') : (p.mobile || '—') },
            { label: 'Email', value: l?.email || p.email || '—' },
            { label: 'Skills', value: p.skills || '—', wide: true },
            { label: 'Education', value: p.education || '—', wide: true },
            { label: 'Previous Roles', value: prev || '—', full: true },
        ];
    };

    const TruncatedText = ({ label, text, maxWords = 8 }) => {
        const [expanded, setExpanded] = useState(false);

        const raw = String(text || '');
        const words = raw.split(/\s+/).filter(Boolean);
        const shouldTruncate = (label === 'Skills' || label === 'Education') && words.length > maxWords;

        if (!shouldTruncate) {
            return <>{raw}</>;
        }

        const display = expanded ? raw : words.slice(0, maxWords).join(' ') + '…';

        return (
            <React.Fragment>
                {display}{' '}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="ml-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            </React.Fragment>
        );
    };

    const renderProfileDetails = (l) => {
        const fields = getProfileFields(l);

        return (
            <div className="bg-slate-50 rounded-3xl border border-slate-100 p-4 space-y-3">

                <p className="text-xs uppercase tracking-wide text-slate-500">Candidate Profile</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {fields.map((f) => (
                        <div
                            key={f.label}
                            className={`bg-white rounded-2xl border border-slate-100 p-4 ${f.full ? 'md:col-span-2 lg:col-span-4' : f.wide ? 'md:col-span-2' : ''}`}
                        >
                            <p className="text-xs uppercase tracking-wide text-slate-500">{f.label}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 break-words whitespace-pre-wrap">
                                <TruncatedText label={f.label} text={f.value} />
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleResumeFileChange = async (e) => {
        if (!token) return toast.error('Not authenticated');
        if (!lead?._id) return toast.error('No lead selected');

        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        if (!file) return;

        const formData = new FormData();
        formData.append('resume', file);

        try {
            setResumeUploading(true);
            const { data } = await axios.post(
                `${BASE_URL}/api/local-hiring/lead/${lead._id}/resume`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to upload resume');
                return;
            }

            const url = data?.data?.resumeUrl || '';
            setLead((prev) =>
                prev
                    ? {
                          ...prev,
                          profile: {
                              ...(prev.profile || {}),
                              resumeUrl: url,
                          },
                      }
                    : prev
            );

            setWorksheet((prev) =>
                Array.isArray(prev)
                    ? prev.map((item) => {
                          const l = item?.lead;
                          if (l?._id === lead._id) {
                              return {
                                  ...item,
                                  lead: {
                                      ...l,
                                      profile: { ...(l.profile || {}), resumeUrl: url },
                                  },
                              };
                          }
                          return item;
                      })
                    : prev
            );

            toast.success('Resume uploaded');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to upload resume');
        } finally {
            setResumeUploading(false);
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    const handleEmailUpdate = async () => {
        if (!token) return toast.error('Not authenticated');
        if (!lead?._id) return toast.error('No lead selected');
        const value = String(emailInput || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return toast.error('Enter a valid email');

        setEmailSaving(true);
        try {
            const { data } = await axios.put(
                `${BASE_URL}/api/local-hiring/lead/${lead._id}/email`,
                { email: value },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to update email');
                return;
            }

            setLead((prev) =>
                prev
                    ? {
                          ...prev,
                          email: value,
                          profile: {
                              ...(prev.profile || {}),
                              email: value,
                          },
                      }
                    : prev
            );
            setEmailInput(value);
            toast.success('Email updated');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to update email');
        } finally {
            setEmailSaving(false);
        }
    };

    const workflowCards = [
        {
            title: '1 · Dial & Discover',
            text: 'Pull your next lead, verify intent, and capture quick notes before moving on.',
        },
        {
            title: '2 · Outcome & Insight',
            text: 'Update the disposition, write crisp insights, and get the next lead immediately.',
        },
        {
            title: '3 · Worksheet Backlog',
            text: 'Review previous calls, share progress with Ops, and export context for handovers.',
        },
    ];

    const quickStats = [
        { label: 'Current Lead', value: leadName, muted: leadName === '—' },
        { label: 'Assignment', value: assignmentId ? 'Active' : 'Waiting', muted: !assignmentId },
        { label: 'Worksheet Items', value: worksheet.length, muted: worksheet.length === 0 },
    ];

    const dashboardCards = [
        // {
        //   label: 'Assigned Today',
        //   value: summaryStats.assignedToday,
        //   subtext: 'Assignments touched or updated today',
        //   gradient: 'from-violet-500 to-indigo-500',
        // },
        // {
        //   label: 'Total Assigned (Till Date)',
        //   value: summaryStats.total,
        //   subtext: 'All-time assignments in your queue',
        //   gradient: 'from-slate-900 to-slate-700',
        // },
        // {
        //   label: "Today's Line-up",
        //   value: summaryStats.lineupToday,
        //   subtext: 'Line-ups scheduled or confirmed today',
        //   gradient: 'from-emerald-500 to-green-500',
        // },
        // {
        //   label: 'Tomorrow Line-up',
        //   value: summaryStats.lineupTomorrow,
        //   subtext: 'Line-ups scheduled for tomorrow',
        //   gradient: 'from-amber-500 to-orange-500',
        // },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fef7ff] via-[#f4edff] to-[#f8fbff]">
            <AnimatedHRNavbar title="Recruiter" navItems={navItems} />
            <Toaster position="top-right" />

            <main className="pt-16 pb-10 px-4 sm:px-6 lg:px-10 w-full">
                <div className="space-y-6">
                    <section className="bg-white rounded-3xl border border-slate-200/60 shadow-md backdrop-blur-sm px-5 py-5 md:px-8 space-y-6 transition-all duration-300">

                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex gap-2 bg-slate-50 rounded-2xl p-1">
                                {['next', 'worksheet'].map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() =>
                                            key === 'worksheet'
                                                ? navigate('/hr-recruiter/local-hiring/worksheet')
                                                : setTab(key)
                                        }
                                        className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition ${tab === key ? 'bg-indigo-600 text-white shadow' : 'text-slate-600'
                                            }`}
                                    >
                                        {key === 'next' ? 'Get Assigned Lead' : 'Worksheet'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">Leads stay locked to you until saved.</p>
                        </div>

                        {tab === 'next' && (
                            <div className="w-full">
                                <div className={`grid gap-7 ${lead ? 'lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]' : ''}`}>
                                    {/* Left: lead overview */}
                                    <div className="space-y-4">
                                        <div className="text-center">
                                            <p className="text-[13px] uppercase tracking-[0.3em] text-indigo-400">Local hiring</p>
                                            <h2 className="text-2xl font-black text-slate-900">Current Lead Overview</h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Process, disposition, and move on quickly—without leaving this page.
                                            </p>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-md px-4 md:px-6 py-4 space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center text-lg shadow-sm">
                                                        📋
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs uppercase tracking-wide text-slate-500">Assignment</p>
                                                        <p className="text-base font-semibold text-slate-900">{leadName}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Status</p>
                                                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>
                                                        {status || 'Pending'}
                                                    </span>
                                                </div>
                                            </div>

                                            {leadLoading ? (
                                                <div className="text-sm text-slate-500 py-3">Loading next lead…</div>
                                            ) : !lead ? (
                                                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                                                    <span>No lead available at the moment.</span>
                                                    <button type="button" onClick={fetchNext} className="text-indigo-600 font-semibold underline">
                                                        Refresh
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                                                    {getProfileFields(lead)
                                                        .filter((f) => PROFILE_SUMMARY_LABELS.includes(f.label))
                                                        .map((f) => {
                                                            const iconByLabel = {
                                                                Name: FiUser,
                                                                Experience: FiBriefcase,
                                                                CTC: FiBriefcase,
                                                                Location: FiMapPin,
                                                                'Current Designation': FiBriefcase,
                                                                'Current Company': FiBriefcase,
                                                                'Preferred Locations': FiMapPin,
                                                                Mobile: FiPhone,
                                                                Email: FiMail,
                                                                Skills: FiStar,
                                                                Education: FiBookOpen,
                                                                'Previous Roles': FiBriefcase,
                                                            };
                                                            const Icon = iconByLabel[f.label] || FiStar;
                                                            return (
                                                                <div key={f.label} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white px-3 py-2 shadow-sm">
                                                                    <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100 flex items-center justify-center">
                                                                        <Icon className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{f.label}</p>
                                                                        <p className="mt-1 text-sm font-semibold text-slate-900 break-words whitespace-pre-wrap">
                                                                            <TruncatedText label={f.label} text={f.value} />
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Disposition & dynamic fields */}
                                    {lead && (
                                        <div className="rounded-2xl border border-slate-100/70 bg-gradient-to-br from-slate-50/60 to-white p-4 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-slate-500">Disposition</p>
                                                    <p className="text-xs text-slate-400">Capture status, remarks, and key follow-ups.</p>
                                                </div>
                                                <span className="text-[11px] font-semibold text-slate-500">Lead #{assignmentId?.slice(-6) || '—'}</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</label>
                                                    <div className="mt-2 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white px-3 shadow-sm">
                                                        <select
                                                            value={status}
                                                            onChange={(e) => setStatus(e.target.value)}
                                                            className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                                                        >
                                                            <option value="">Select…</option>
                                                            {STATUS_OPTIONS.map((s) => (
                                                                <option key={s} value={s}>
                                                                    {s}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Remarks</label>
                                                    <div className="mt-2">
                                                        <input
                                                            type="text"
                                                            value={remarks}
                                                            onChange={(e) => setRemarks(e.target.value)}
                                                            className="w-full bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm transition-all duration-200"
                                                            placeholder="Add remark…"
                                                        />
                                                    </div>
                                                </div>

                                                {status === 'Line up' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Line-up Date & Time</label>
                                                            <div className="mt-2">
                                                                <input
                                                                    type="datetime-local"
                                                                    value={lineUpDateTime}
                                                                    onChange={(e) => setLineUpDateTime(e.target.value)}
                                                                    className="w-full bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm transition-all duration-200"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Type of Interview</label>
                                                            <div className="mt-2">
                                                                <select
                                                                    value={interviewType}
                                                                    onChange={(e) => setInterviewType(e.target.value)}
                                                                    className="w-full bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm transition-all duration-200"
                                                                >
                                                                    <option value="">Select type…</option>
                                                                    <option value="Virtual Interview">Virtual Interview</option>
                                                                    <option value="Personal Interview">Personal Interview</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {showContactResume && (
                                                    <div className="mt-3 rounded-2xl border border-slate-100/70 bg-gradient-to-br from-slate-50/60 to-white p-3 space-y-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wide text-slate-500">Contact & Resume</p>
                                                                <p className="text-[11px] text-slate-400">Maintain a clean primary email and latest resume before saving status.</p>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {normalizedLeadEmail && (
                                                                    <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-100 rounded-full px-3 py-1">
                                                                        Email: {normalizedLeadEmail}
                                                                    </span>
                                                                )}
                                                                {leadResumeUrl && (
                                                                    <a
                                                                        href={leadResumeUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-100 rounded-full px-3 py-1"
                                                                    >
                                                                        View Resume
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Primary Email</p>
                                                                <div className="space-y-2">
                                                                    <input
                                                                        type="email"
                                                                        value={emailInput}
                                                                        onChange={(e) => setEmailInput(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200/70 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm transition-all duration-200"
                                                                        placeholder="name@example.com"
                                                                    />

                                                                    {(status === 'Line up' || status === 'Positive') && (
                                                                        <div className="space-y-1">
                                                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Quick Positions</p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {PRESET_POSITIONS.map((tag) => (
                                                                                    <label
                                                                                        key={tag}
                                                                                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700 cursor-pointer"
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={selectedPositions.includes(tag)}
                                                                                            onChange={() => handleTogglePositionTag(tag)}
                                                                                            className="h-3 w-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                                        />
                                                                                        <span>{tag}</span>
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex flex-wrap gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleEmailUpdate}
                                                                            disabled={emailUpdateDisabled}
                                                                            className="px-4 py-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-xs font-semibold disabled:opacity-60 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                                                                        >
                                                                            {emailSaving ? 'Updating…' : 'Update Email'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={openEmailModalForCurrentLead}
                                                                            disabled={emailModalSending}
                                                                            className="px-4 py-2 rounded-2xl border border-indigo-100 bg-white text-indigo-700 text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                                                                        >
                                                                            {emailModalSending ? 'Sending…' : 'Send Email'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Resume</p>
                                                                <p className="text-[11px] text-slate-400 mb-2">Upload and access the candidate's latest resume.</p>
                                                                {!leadResumeUrl ? (
                                                                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                                                        <input
                                                                            type="file"
                                                                            accept=".pdf,.doc,.docx"
                                                                            onChange={handleResumeFileChange}
                                                                            disabled={resumeUploading}
                                                                            className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                                                        />
                                                                        {resumeUploading && (
                                                                            <span className="text-[11px] text-slate-400">Uploading…</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[11px] text-slate-400">Resume already uploaded.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateLead(false)}
                                                        disabled={loading}
                                                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 text-white text-xs font-semibold disabled:opacity-60 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        {loading ? 'Saving…' : 'Update'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateLead(true)}
                                                        disabled={loading}
                                                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-xs font-semibold disabled:opacity-60 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        {loading ? 'Saving…' : 'Save & Next'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {emailModalOpen && emailModalLead && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50 animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        <FiMail className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Compose Email</h3>
                                        <p className="text-sm text-slate-600">Send a message directly to the candidate's inbox.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEmailModal}
                                    className="rounded-full p-2 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 transition-all duration-200 hover:shadow-md border border-slate-200/50"
                                    disabled={emailModalSending}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">To</label>
                                <input
                                    type="email"
                                    value={emailModalTo}
                                    onChange={(e) => setEmailModalTo(e.target.value)}
                                    className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm"
                                    placeholder="candidate@example.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Subject</label>
                                <input
                                    type="text"
                                    value={emailModalSubject}
                                    onChange={(e) => setEmailModalSubject(e.target.value)}
                                    className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm"
                                    placeholder="Subject"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Opportunity / Position</label>
                                <input
                                    type="text"
                                    value={emailOpportunity}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setEmailOpportunity(value);
                                        setEmailModalBody(buildDefaultEmailBody(recruiterInfo, value));
                                    }}
                                    className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm"
                                    placeholder="e.g. CRM Executive, HR Recruiter"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Message</label>
                                <textarea
                                    rows={5}
                                    value={emailModalBody}
                                    onChange={(e) => setEmailModalBody(e.target.value)}
                                    className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm resize-none"
                                    placeholder="Write your message..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Attachment</label>
                                <input
                                    type="file"
                                    onChange={(e) => setEmailModalFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                <p className="text-[11px] text-slate-400">Optional. Attach a JD, company profile, or any document.</p>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeEmailModal}
                                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all duration-200"
                                    disabled={emailModalSending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendEmail}
                                    disabled={emailModalSending}
                                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-sm font-semibold disabled:opacity-60 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    {emailModalSending ? 'Sending…' : 'Send Email'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewOpen && viewItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50 animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Candidate Profile</h3>
                                        <p className="text-sm text-slate-600">Complete lead information and details</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setViewOpen(false);
                                        setViewItem(null);
                                    }}
                                    className="rounded-full p-2 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 transition-all duration-200 hover:shadow-md border border-slate-200/50"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                            {renderProfileDetails(viewItem?.lead || viewItem)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HRRecruiterLocalHiring;