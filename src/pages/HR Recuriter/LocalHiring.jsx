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

const buildDefaultEmailBody = (info, opportunity) => {
    const recruiterName = info?.name || '';
    const recruiterEmail = info?.email || '';
    const recruiterContact = info?.contact || '';
    const opportunityText = String(opportunity || '').trim();

    const opportunityLine = opportunityText
        ? `As discussed during our recent telephonic conversation, we are reaching out to you regarding a suitable job opportunity for the position of ${opportunityText} that aligns with your profile and experience. Our team works closely with reputed organizations to ensure a smooth and transparent churn control and hiring process .`
        : 'As discussed during our recent telephonic conversation, we are reaching out to you regarding a suitable job opportunity that aligns with your profile and experience. Our team works closely with reputed organizations to ensure a smooth and transparent churn control and hiring process .';

    return `Hello Dear Candidate, 👋
Greetings of the day!

We are IITGJobs.co.in , a trusted HR Solutions Provider, headquartered in Jabalpur, Madhya Pradesh, specializing in connecting skilled professionals with the right career opportunities across various industries.

${opportunityLine}

We request you to kindly review the shared Job Description at your convenience. If you require any additional information, clarification, or guidance, please feel free to connect with us. Our HR team will be happy to assist you at every step of your career journey.

We look forward to your response and hope to support you in achieving your professional goals. ✨


Warm regards,

${recruiterName}
${recruiterContact ? `Contact: ${recruiterContact}\n` : ''}${recruiterEmail ? `Email: ${recruiterEmail}\n` : ''}

Website - www.iitgjobs.co.in

Team IITGJobs.com Pvt.Ltd.`;
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
    }, [lead]);

    const leadName = lead?.name || lead?.profile?.name || '—';
    const leadLocation = lead?.location || lead?.profile?.location || '—';
    const leadEmail = lead?.email || lead?.profile?.email || '—';
    const leadMobile = Array.isArray(lead?.mobile) ? lead.mobile.join(', ') : '—';
    const leadResumeUrl = lead?.profile?.resumeUrl || '';
    const normalizedLeadEmail = lead ? String(lead?.email || lead?.profile?.email || '').trim().toLowerCase() : '';
    const normalizedInputEmail = String(emailInput || '').trim().toLowerCase();
    const emailUpdateDisabled = !lead || emailSaving || !normalizedInputEmail || normalizedInputEmail === normalizedLeadEmail;

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
            <>
                {display}{' '}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="ml-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            </>
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

    const handleEmailUpdate = async () => {
        if (!token) return toast.error('Not authenticated');
        if (!lead?._id) return toast.error('No lead selected');

        const value = normalizedInputEmail;
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
                        profile: { ...(prev.profile || {}), email: value },
                    }
                    : prev
            );
            toast.success('Email updated');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to update email');
        } finally {
            setEmailSaving(false);
        }
    };

    const startWorksheetEmailEdit = (leadDoc) => {
        if (!leadDoc?._id) return;
        setEditingEmailId(leadDoc._id);
        setEditingEmailValue(leadDoc.email || leadDoc?.profile?.email || '');
    };

    const cancelWorksheetEmailEdit = () => {
        setEditingEmailId(null);
        setEditingEmailValue('');
        setRowEmailSaving(null);
    };

    const saveWorksheetEmail = async (leadId) => {
        if (!token) return toast.error('Not authenticated');
        if (!leadId) return toast.error('Lead not found');
        const value = String(editingEmailValue || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return toast.error('Enter a valid email');

        setRowEmailSaving(leadId);
        try {
            const { data } = await axios.put(
                `${BASE_URL}/api/local-hiring/lead/${leadId}/email`,
                { email: value },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to update email');
                setRowEmailSaving(null);
                return;
            }

            setWorksheet((prev) =>
                prev.map((item) => {
                    const currentLead = item?.lead;
                    if (currentLead?._id === leadId) {
                        const updatedLead = {
                            ...currentLead,
                            email: value,
                            profile: { ...(currentLead.profile || {}), email: value },
                        };
                        return { ...item, lead: updatedLead };
                    }
                    return item;
                })
            );

            if (lead?._id === leadId) {
                setLead((prev) =>
                    prev
                        ? { ...prev, email: value, profile: { ...(prev.profile || {}), email: value } }
                        : prev
                );
                setEmailInput(value);
            }

            toast.success('Email updated');
            cancelWorksheetEmailEdit();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to update email');
        } finally {
            setRowEmailSaving(null);
        }
    };

    const openEmailModalForCurrentLead = () => {
        if (!lead?._id) {
            toast.error('No lead selected');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const candidate = String(normalizedInputEmail || normalizedLeadEmail || '').trim().toLowerCase();

        if (!emailRegex.test(candidate)) {
            toast.error('Enter a valid email first');
            return;
        }

        const assignmentForLead = worksheet.find((item) => item?.lead?._id === lead._id);

        const defaultOpportunity = lead?.profile?.current_designation || '';

        setEmailModalLead(lead);
        setEmailModalAssignmentId(assignmentForLead?._id || null);
        setEmailModalTo(candidate);
        setEmailOpportunity(defaultOpportunity);
        setEmailModalSubject(DEFAULT_EMAIL_SUBJECT);
        setEmailModalBody(buildDefaultEmailBody(recruiterInfo, defaultOpportunity));
        setEmailModalFile(null);
        setEmailModalOpen(true);
    };

    const openEmailModalForWorksheetLead = (assignmentOrLead) => {
        const leadDoc = assignmentOrLead?.lead || assignmentOrLead;

        if (!leadDoc?._id) {
            toast.error('Lead not found');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const candidate = String(leadDoc.email || leadDoc?.profile?.email || '').trim().toLowerCase();

        if (!emailRegex.test(candidate)) {
            toast.error('Lead does not have a valid email');
            return;
        }

        const defaultOpportunity = leadDoc?.profile?.current_designation || '';

        setEmailModalLead(leadDoc);
        setEmailModalAssignmentId(assignmentOrLead?._id || null);
        setEmailModalTo(candidate);
        setEmailOpportunity(defaultOpportunity);
        setEmailModalSubject(DEFAULT_EMAIL_SUBJECT);
        setEmailModalBody(buildDefaultEmailBody(recruiterInfo, defaultOpportunity));
        setEmailModalFile(null);
        setEmailModalOpen(true);
    };

    const closeEmailModal = () => {
        setEmailModalOpen(false);
        setEmailModalLead(null);
        setEmailModalAssignmentId(null);
        setEmailModalTo('');
        setEmailModalSubject('');
        setEmailModalBody('');
        setEmailModalFile(null);
        setEmailModalSending(false);
        setEmailOpportunity('');
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

    const summaryStats = useMemo(() => {
        const stats = {
            total: worksheet.length,
            assignedToday: 0,
            lineupToday: 0,
            lineupTomorrow: 0,
        };

        if (!worksheet.length) return stats;

        const startOfDay = (date) => {
            const d = new Date(date);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        };

        const todayStart = startOfDay(new Date());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const dayAfterTomorrowStart = new Date(tomorrowStart);
        dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

        const inRange = (date, start, end) => date >= start && date < end;

        worksheet.forEach((item) => {
            const updatedAt = item?.updatedAt ? new Date(item.updatedAt) : null;
            if (updatedAt && inRange(updatedAt, todayStart, tomorrowStart)) {
                stats.assignedToday += 1;
            }

            if (item?.currentStatus === 'Line up') {
                const reference = item?.lineUpDateTime ? new Date(item.lineUpDateTime) : updatedAt;
                if (reference && !Number.isNaN(reference.getTime())) {
                    if (inRange(reference, todayStart, tomorrowStart)) {
                        stats.lineupToday += 1;
                    } else if (inRange(reference, tomorrowStart, dayAfterTomorrowStart)) {
                        stats.lineupTomorrow += 1;
                    }
                }
            }
        });

        return stats;
    }, [worksheet]);

    const openUpdateModal = (item) => {
        setUpdatingItem(item);
        setStatus(item.currentStatus || '');
        setRemarks(item.remarks || '');
        setLineUpDateTime(item.lineUpDateTime || '');
        setInterviewType(item.interviewType || '');
        const l = item.lead || {};
        setEmailInput(l.email || l.profile?.email || '');
        setUpdateModalOpen(true);
    };

    const closeUpdateModal = () => {
        setUpdateModalOpen(false);
        setUpdatingItem(null);
        setStatus('');
        setRemarks('');
        setLineUpDateTime('');
        setInterviewType('');
        setEmailInput('');
    };

    const handleWorksheetUpdateSubmit = async () => {
        if (!token) return toast.error('Not authenticated');
        if (!updatingItem) return;
        if (!status) return toast.error('Select status');
        if (!String(remarks || '').trim()) return toast.error('Remarks is required');
        if (status === 'Line up' && !lineUpDateTime) return toast.error('Line-up date required');
        if (status === 'Line up' && !interviewType) return toast.error('Interview type required');

        setLoading(true);
        try {
            const requestData = { currentStatus: status, remarks };
            if (status === 'Line up') {
                requestData.lineUpDateTime = lineUpDateTime;
                requestData.interviewType = interviewType;
            }

            const { data } = await axios.put(
                `${BASE_URL}/api/local-hiring/assignment/${updatingItem._id}`,
                requestData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to update');
                return;
            }

            toast.success('Updated successfully');
            fetchWorksheet();
            closeUpdateModal();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    const handleWorksheetEmailUpdate = async () => {
        if (!token) return toast.error('Not authenticated');
        if (!updatingItem?.lead?._id) return toast.error('No lead selected');

        const value = String(emailInput || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return toast.error('Enter a valid email');

        setEmailSaving(true);
        try {
            const { data } = await axios.put(
                `${BASE_URL}/api/local-hiring/lead/${updatingItem.lead._id}/email`,
                { email: value },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!data?.success) {
                toast.error(data?.message || 'Failed to update email');
                return;
            }

            setUpdatingItem(prev => ({
                ...prev,
                lead: {
                    ...prev.lead,
                    email: value,
                    profile: { ...(prev.lead.profile || {}), email: value }
                }
            }));

            setWorksheet(prev => prev.map(item =>
                item._id === updatingItem._id ? {
                    ...item,
                    lead: {
                        ...item.lead,
                        email: value,
                        profile: { ...(item.lead.profile || {}), email: value }
                    }
                } : item
            ));

            toast.success('Email updated');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to update email');
        } finally {
            setEmailSaving(false);
        }
    };

    const handleWorksheetResumeChange = async (e) => {
        if (!token) return toast.error('Not authenticated');
        if (!updatingItem?.lead?._id) return toast.error('No lead selected');

        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        if (!file) return;

        const formData = new FormData();
        formData.append('resume', file);

        try {
            setResumeUploading(true);
            const { data } = await axios.post(
                `${BASE_URL}/api/local-hiring/lead/${updatingItem.lead._id}/resume`,
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

            if (updatingItem) {
                setUpdatingItem(prev => ({
                    ...prev,
                    lead: {
                        ...prev.lead,
                        profile: { ...(prev.lead.profile || {}), resumeUrl: url }
                    }
                }));
            }

            setWorksheet((prev) =>
                prev.map((item) => {
                    if (item._id === updatingItem._id) {
                        return {
                            ...item,
                            lead: {
                                ...item.lead,
                                profile: { ...(item.lead.profile || {}), resumeUrl: url },
                            },
                        };
                    }
                    return item;
                })
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

            <main className="pt-20 pb-14 px-4 sm:px-6 lg:px-12 w-full">
                <div className="space-y-8">

                    <section className="bg-white rounded-4xl border border-slate-200/60 shadow-lg backdrop-blur-sm p-5 space-y-5 transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
                            <div className="flex gap-2 bg-slate-50 rounded-2xl p-1">
                                {['next', 'worksheet'].map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setTab(key)}
                                        className={`px-4 py-2.5 rounded-2xl transition ${tab === key ? 'bg-indigo-600 text-white shadow' : 'text-slate-600'
                                            }`}
                                    >
                                        {key === 'next' ? 'Get Assigned Lead' : 'Worksheet'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">Leads stay locked to you until saved.</p>
                        </div>

                        {tab === 'next' && (
                            <div className="space-y-4">
                                <div className="w-full max-w-6xl mx-auto">
                                    <div className="text-center mb-3">
                                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Local Hiring Lead</h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Manage and process your assigned Local Hiring leads efficiently.
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-3xl border border-slate-100/80 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm px-5 md:px-6 py-4 space-y-4 transition-all duration-300">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center text-lg shadow-sm transition-transform duration-200 hover:scale-105">
                                                    📋
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Current Lead</p>
                                                    <p className="text-xs text-slate-500">Local Hiring</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Progress</p>
                                                <p className="text-sm font-semibold text-emerald-600">0%</p>
                                            </div>
                                        </div>

                                        {leadLoading ? (
                                            <div className="text-sm text-slate-500 py-4">Loading next lead…</div>
                                        ) : !lead ? (
                                            <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-slate-600 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                                                <span>No lead available at the moment.</span>
                                                <button
                                                    type="button"
                                                    onClick={fetchNext}
                                                    className="text-indigo-600 font-semibold underline"
                                                >
                                                    Refresh
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                                                            'May Also Know': FiStar,
                                                            Education: FiBookOpen,
                                                            Summary: FiBookOpen,
                                                            'Previous Roles': FiBriefcase,
                                                        };
                                                        const Icon = iconByLabel[f.label] || FiStar;

                                                        return (
                                                            <div
                                                                key={f.label}
                                                                className="flex items-start gap-3 bg-gradient-to-br from-slate-50/80 to-white rounded-2xl px-3 py-2.5 border border-slate-100/60 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200/80"
                                                            >
                                                                <div className="mt-1 h-8 w-8 rounded-2xl bg-gradient-to-br from-white to-slate-50 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm transition-transform duration-200 hover:scale-105">
                                                                    <Icon className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{f.label}</p>
                                                                    <p className="mt-1 text-sm font-semibold text-slate-900 break-words whitespace-pre-wrap">
                                                                        <TruncatedText label={f.label} text={f.value} />
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="mt-5 rounded-2xl border border-slate-100/70 bg-gradient-to-br from-slate-50/60 to-white p-4 shadow-sm">
                                                    <div className="flex items-start justify-between flex-wrap gap-3">
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-slate-500">Contact & Resume</p>
                                                            <p className="text-sm text-slate-400">Maintain a clean primary email and latest resume before saving status.</p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {normalizedLeadEmail && (
                                                                <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 rounded-full px-3 py-1">
                                                                    Email: {normalizedLeadEmail}
                                                                </span>
                                                            )}
                                                            {leadResumeUrl && (
                                                                <a
                                                                    href={leadResumeUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-xs font-semibold text-indigo-700 bg-white border border-indigo-100 rounded-full px-3 py-1"
                                                                >
                                                                    View Resume
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Primary Email</p>
                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                <input
                                                                    type="email"
                                                                    value={emailInput}
                                                                    onChange={(e) => setEmailInput(e.target.value)}
                                                                    className="flex-1 bg-white border border-slate-200/70 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm transition-all duration-200"
                                                                    placeholder="name@example.com"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleEmailUpdate}
                                                                        disabled={emailUpdateDisabled}
                                                                        className="px-4 py-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-sm font-semibold disabled:opacity-60 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                                                                    >
                                                                        {emailSaving ? 'Updating…' : 'Update Email'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={openEmailModalForCurrentLead}
                                                                        className="px-4 py-2.5 rounded-2xl border border-indigo-100 bg-white text-indigo-700 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                                                                    >
                                                                        Send Email
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Resume</p>
                                                            <p className="text-xs text-slate-400 mb-2">Upload and access the candidate's latest resume.</p>
                                                            {!leadResumeUrl ? (
                                                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
                                                                <p className="text-xs text-slate-400">Resume already uploaded.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {lead && (
                                    <div className="w-full max-w-6xl mx-auto">
                                        <div className="rounded-2xl border border-slate-100/70 bg-gradient-to-br from-slate-50/60 to-white p-4 md:p-5 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-slate-500">Disposition</p>
                                                    <p className="text-xs text-slate-400">Capture final status and crisp remarks before moving to the next lead.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</label>
                                                    <div className="mt-2 bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 shadow-sm transition-all duration-200 focus-within:shadow-md focus-within:border-indigo-200">
                                                        <select
                                                            value={status}
                                                            onChange={(e) => setStatus(e.target.value)}
                                                            className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                                                        >
                                                            <option value="">Select…</option>
                                                            {STATUS_OPTIONS.map((s) => (
                                                                <option key={s} value={s}>{s}</option>
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
                                                                required
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

                                            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateLead(false)}
                                                    disabled={loading}
                                                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 text-white text-sm font-semibold disabled:opacity-60 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    {loading ? 'Saving…' : 'Update'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateLead(true)}
                                                    disabled={loading}
                                                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-sm font-semibold disabled:opacity-60 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    {loading ? 'Saving…' : 'Save & Next'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'worksheet' && (
                            <div className="space-y-4">
                                {/* Enhanced Search and Filter Controls */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* Search Input */}
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Search Candidates</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Search by name, email, or mobile..."
                                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
                                                />
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Filter */}
                                        <div className="min-w-[180px]">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Status Filter</label>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 bg-white"
                                            >
                                                <option value="">All Statuses</option>
                                                {STATUS_OPTIONS.map((status) => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* JD Sent Filter */}
                                        <div className="min-w-[180px]">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">JD Status</label>
                                            <select
                                                value={jdSentFilter}
                                                onChange={(e) => setJdSentFilter(e.target.value)}
                                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 bg-white"
                                            >
                                                <option value="">All</option>
                                                <option value="sent">JD Sent</option>
                                                <option value="not-sent">JD Not Sent</option>
                                            </select>
                                        </div>

                                        {/* Clear Filters Button */}
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setStatusFilter('');
                                                    setJdSentFilter('');
                                                }}
                                                className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 flex items-center gap-2"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Clear All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Results Summary */}
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-slate-600">
                                                <span className="font-semibold text-slate-800">{filteredWorksheet.length}</span> of <span className="font-semibold text-slate-800">{worksheet.length}</span> candidates
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                                    Positive: {worksheet.filter(a => a.currentStatus === 'Positive').length}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                    Line up: {worksheet.filter(a => a.currentStatus === 'Line up').length}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                                    RNR: {worksheet.filter(a => a.currentStatus === 'RNR').length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {worksheetLoading ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            <p className="text-slate-600 font-medium">Loading worksheet...</p>
                                            <p className="text-slate-400 text-sm">Please wait while we fetch your candidates</p>
                                        </div>
                                    </div>
                                ) : filteredWorksheet.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                                    {worksheet.length === 0 ? 'No Candidates Found' : 'No Results Match Your Criteria'}
                                                </h3>
                                                <p className="text-slate-600 mb-4">
                                                    {worksheet.length === 0
                                                        ? 'You don\'t have any candidates in your worksheet yet.'
                                                        : 'Try adjusting your search filters to find more candidates.'}
                                                </p>
                                                {worksheet.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSearchTerm('');
                                                            setStatusFilter('');
                                                            setJdSentFilter('');
                                                        }}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                                                    >
                                                        Clear All Filters
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        {/* Table Header with Actions */}
                                        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-slate-800">Candidate Worksheet</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-slate-600">
                                                        Showing {filteredWorksheet.length} of {worksheet.length} candidates
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RawLeads Style Table */}
                                        <div className="overflow-auto border rounded shadow bg-white">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-100 sticky top-0 z-10">
                                                    <tr>
                                                        {[
                                                            "Name",
                                                            "Mobile",
                                                            "Email",
                                                            "Experience",
                                                            "CTC",
                                                            "Current Designation",
                                                            "Current Company",
                                                            "Location",
                                                            "Status",
                                                            "Line-up Date & Time",
                                                            "Remarks",
                                                            "JD Sent",
                                                            "Actions",
                                                        ].map((header) => (
                                                            <th key={header} className="p-2 text-left whitespace-nowrap">
                                                                {header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredWorksheet.length > 0 ? (
                                                        filteredWorksheet.map((a, index) => {
                                                            const l = a?.lead || {};
                                                            const isEditing = editingEmailId === l?._id;
                                                            const mobileText = Array.isArray(l.mobile)
                                                                ? l.mobile.join(', ')
                                                                : l.mobile || '—';
                                                            const emailDisplay = l.email || l?.profile?.email || '—';

                                                            return (
                                                                <tr
                                                                    key={a._id}
                                                                    className="border-t hover:bg-gray-50 transition"
                                                                >
                                                                    <td className="p-2">{l.name || l?.profile?.name || '—'}</td>
                                                                    <td className="p-2">{mobileText}</td>
                                                                    <td className="p-2">
                                                                        {isEditing ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="email"
                                                                                    value={editingEmailValue}
                                                                                    onChange={(e) => setEditingEmailValue(e.target.value)}
                                                                                    className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-300"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => saveWorksheetEmail(l._id)}
                                                                                    disabled={rowEmailSaving === l._id}
                                                                                    className="px-2 py-1 rounded bg-green-600 text-white text-xs font-medium disabled:opacity-50"
                                                                                >
                                                                                    {rowEmailSaving === l._id ? 'Saving…' : 'Save'}
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={cancelWorksheetEmailEdit}
                                                                                    className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs font-medium"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-gray-900">{emailDisplay}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => startWorksheetEmailEdit(l)}
                                                                                    className="text-blue-600 text-xs font-medium hover:text-blue-700"
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2">{l?.profile?.experience || '—'}</td>
                                                                    <td className="p-2">{l?.profile?.ctc || '—'}</td>
                                                                    <td className="p-2">{l?.profile?.current_designation || '—'}</td>
                                                                    <td className="p-2">{l?.profile?.current_company || '—'}</td>
                                                                    <td className="p-2">{l.location || l?.profile?.location || '—'}</td>
                                                                    <td className="p-2">
                                                                        <span
                                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${a.currentStatus === 'Positive'
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : a.currentStatus === 'Negative'
                                                                                    ? 'bg-red-100 text-red-800'
                                                                                    : a.currentStatus === 'RNR'
                                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                                        : a.currentStatus === 'Wrong Number'
                                                                                            ? 'bg-gray-100 text-gray-800'
                                                                                            : a.currentStatus === 'Line up'
                                                                                                ? 'bg-blue-100 text-blue-800'
                                                                                                : 'bg-gray-100 text-gray-800'
                                                                                }`}
                                                                        >
                                                                            {a.currentStatus || '—'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {a.currentStatus === 'Line up' && a.lineUpDateTime ? (
                                                                            new Date(a.lineUpDateTime).toLocaleString('en-IN', {
                                                                                day: '2-digit',
                                                                                month: 'short',
                                                                                year: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                                hour12: true,
                                                                            })
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2" title={a.remarks || '—'}>
                                                                        <div className="max-w-xs truncate">{a.remarks || '—'}</div>
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <span
                                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${a.emailSent
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-gray-100 text-gray-700'
                                                                                }`}
                                                                        >
                                                                            {a.emailSent ? 'Yes' : 'No'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openUpdateModal(a)}
                                                                            className="px-3 py-1 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                                                                        >
                                                                            Update
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setViewItem(a);
                                                                                setViewOpen(true);
                                                                            }}
                                                                            className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                                                                        >
                                                                            View
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td
                                                                colSpan="13"
                                                                className="p-4 text-center text-gray-500"
                                                            >
                                                                No candidates found.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {emailModalOpen && emailModalLead && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50">
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

            {updateModalOpen && updatingItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50 flex flex-col">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-4 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-900">Update Candidate</h3>
                                <button
                                    onClick={closeUpdateModal}
                                    className="rounded-full p-2 hover:bg-slate-200 text-slate-500 transition"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            {renderProfileDetails(updatingItem.lead)}

                            <div className="rounded-2xl border border-slate-100/70 bg-gradient-to-br from-slate-50/60 to-white p-4 shadow-sm">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Primary Email</p>
                                            <p className="text-sm text-slate-400">Keep candidate's email accurate before saving status.</p>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 rounded-full px-3 py-1">
                                            Current: {updatingItem.lead?.email || updatingItem.lead?.profile?.email || 'n/a'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="email"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            className="flex-1 bg-white border border-slate-200/70 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-300 focus:shadow-sm"
                                            placeholder="name@example.com"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleWorksheetEmailUpdate}
                                                disabled={emailSaving}
                                                className="px-4 py-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                                            >
                                                {emailSaving ? 'Updating…' : 'Update Email'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEmailModalForWorksheetLead(updatingItem)}
                                                className="px-4 py-2.5 rounded-2xl border border-indigo-100 bg-white text-indigo-700 text-sm font-semibold shadow-sm hover:shadow-md"
                                            >
                                                Send Email
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100/70 bg-gradient-to-br from-slate-50/60 to-white p-4 shadow-sm">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Resume</p>
                                            <p className="text-sm text-slate-400">Upload and access the candidate's latest resume.</p>
                                        </div>
                                        {updatingItem.lead?.profile?.resumeUrl && (
                                            <a
                                                href={updatingItem.lead.profile.resumeUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-semibold text-indigo-700 bg-white border border-indigo-100 rounded-full px-3 py-1"
                                            >
                                                View Resume
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleWorksheetResumeChange}
                                            disabled={resumeUploading}
                                            className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                        />
                                        {resumeUploading && <span className="text-xs text-slate-400">Uploading…</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Status</label>
                                    <div className="mt-2 bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 shadow-sm">
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full bg-transparent py-3 text-sm focus:outline-none"
                                        >
                                            <option value="">Select…</option>
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Remarks</label>
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            className="w-full bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 py-3 text-sm focus:outline-none focus:border-indigo-300"
                                            placeholder="Add remark…"
                                        />
                                    </div>
                                </div>
                            </div>

                            {status === 'Line up' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700">Line-up Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={lineUpDateTime}
                                            onChange={(e) => setLineUpDateTime(e.target.value)}
                                            className="w-full mt-2 bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 py-3 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700">Type of Interview</label>
                                        <select
                                            value={interviewType}
                                            onChange={(e) => setInterviewType(e.target.value)}
                                            className="w-full mt-2 bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-2xl px-3 py-3 text-sm"
                                        >
                                            <option value="">Select type…</option>
                                            <option value="Virtual Interview">Virtual Interview</option>
                                            <option value="Personal Interview">Personal Interview</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50/50">
                            <button
                                onClick={closeUpdateModal}
                                className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleWorksheetUpdateSubmit}
                                disabled={loading}
                                className="px-5 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-sm font-semibold hover:shadow-md transition disabled:opacity-60"
                            >
                                {loading ? 'Saving…' : 'Save & Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewOpen && viewItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50 animate-in zoom-in-95 duration-300">
                        {/* Header */}
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
                                    onClick={() => { setViewOpen(false); setViewItem(null); }}
                                    className="rounded-full p-2 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 transition-all duration-200 hover:shadow-md border border-slate-200/50"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
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