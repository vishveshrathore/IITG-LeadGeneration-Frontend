import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";

import axios from "axios";
import {
  FaWhatsapp,
  FaEnvelope,
  FaCommentDots,
  FaUser,
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaLink,
  FaCalendarAlt,
  FaStar,
  FaCogs,
  FaHandshake,
  FaUserTie,
  FaUsers, // Added for Reporting Manager
  FaClock, // For meeting time
  FaRegStickyNote, // For meeting notes
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import CRENavbar from "../../components/CreNavbar";
import { BASE_URL } from "../../config";
import { mailer1Template } from "../../emails/mailer1";
import { mailer2Template } from "../../emails/mailer2";
import { convert } from "html-to-text";

// Constants for new schema fields and options
const STATUS_OPTIONS = ['Pending', 'Positive', 'Negative', 'Closure Prospects'];

const LeadAssignmentDashboard = () => {
  const { authToken, user } = useAuth();
  const token = authToken || localStorage.getItem("token");
  const userEmail = user?.email?.trim();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState(
    "Regarding Attrention Control"
  );
  const [emailRecipient, setEmailRecipient] = useState({});
  const [emailTemplate, setEmailTemplate] = useState("mailer1");
  const [attachments, setAttachments] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reportingManagers, setReportingManagers] = useState([]); // New state for reporting managers

  // Guards to prevent duplicate fetch/assign due to Strict Mode and to avoid concurrent requests
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Communication flags
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [mailer1Sent, setMailer1Sent] = useState(false);
  const [mailer2Sent, setMailer2Sent] = useState(false);

  // New states for the remarks/assignment data based on the Mongoose schema
  const [newStatus, setNewStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [selectedReportingManager, setSelectedReportingManager] = useState('');
  // General remarks (separate from follow-up remarks)
  const [remarks, setRemarks] = useState('');

  // Memoized derived UI data (must be before any conditional returns)
  const { progress } = useMemo(() => {
    const fieldsTotal = 4; // status, manager, meeting(any), followUps(any)
    if (!lead) return { progress: 0 };
    let completed = 0;
    if (lead?.currentStatus && lead.currentStatus !== 'Pending') completed++;
    if (lead?.reportingManager) completed++;
    if (lead?.meeting && (lead.meeting.link || lead.meeting.date || lead.meeting.time || lead.meeting.notes)) completed++;
    if (lead?.followUps && lead.followUps.length > 0) completed++;
    const pct = Math.round((completed / fieldsTotal) * 100) || 0;
    return { progress: pct };
  }, [lead]);

  const leadFields = useMemo(() => ([
    { label: "Name", value: lead?.name, icon: <FaUser /> },
    { label: "Designation", value: lead?.designation, icon: <FaUserTie /> },
    { label: "Company", value: lead?.company?.CompanyName, icon: <FaBuilding /> },
    { label: "Industry", value: lead?.industry?.name, icon: <FaCogs /> },
    { label: "Division", value: lead?.division, icon: <FaHandshake /> },
    { label: "Location", value: lead?.location, icon: <FaMapMarkerAlt /> },
    { label: "Mobile", value: lead?.mobile?.join(", "), icon: <FaPhone /> },
    { label: "Email", value: lead?.email, icon: <FaEnvelope /> },
    { label: "Employee Strength", value: lead?.employeeStrength, icon: <FaStar /> },
    { label: "Product Line", value: lead?.productLine, icon: <FaLink /> },
    { label: "Turnover", value: lead?.turnOver, icon: <FaCalendarAlt /> },
  ]), [lead]);

  const fetchReportingManagers = useCallback(async () => {
    if (!token) {
      console.warn("No auth token found. Skipping reporting managers fetch.");
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/cre/reporting-managers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Backend returns { success, managers: [...] }
      const responseBody = res?.data ?? {};
      const managersArray = Array.isArray(responseBody?.managers)
        ? responseBody.managers
        : Array.isArray(responseBody)
          ? responseBody
          : [];

      setReportingManagers(managersArray);

      // Auto-select if lead already has a reporting manager assigned
      if (lead?.reportingManager) {
        const managerId =
          typeof lead.reportingManager === "object"
            ? lead.reportingManager._id
            : lead.reportingManager;

        if (managerId) setSelectedReportingManager(managerId);
      }
    } catch (err) {
      console.error("Fetch reporting managers failed:", err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || '';
      // If backend indicates none (e.g., 404 or explicit 'no reporting manager' message), don't show an error toast
      const isNoManagers =
        status === 404 || (typeof msg === 'string' && msg.toLowerCase().includes('no reporting manager'));
      if (isNoManagers) {
        setReportingManagers([]);
        return; // silent
      }
      toast.error(msg || "Failed to fetch reporting managers.");
      setReportingManagers([]);
    }
  }, [token, lead]);

  const fetchLead = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/cre/assign`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000, // 15s safety timeout to avoid indefinite spinner
      });
      setLead(res.data);
      localStorage.setItem("currentLead", JSON.stringify(res.data));
      
      // Initialize local states from fetched lead data
      const fetchedLead = res.data;
      if (fetchedLead) {
        setNewStatus(fetchedLead.currentStatus || 'Pending');
        setSelectedReportingManager(fetchedLead.reportingManager?._id || '');
        setMeetingLink(fetchedLead.meeting?.link || '');
        setMeetingDate(fetchedLead.meeting?.date ? new Date(fetchedLead.meeting.date).toISOString().split('T')[0] : '');
        setMeetingTime(fetchedLead.meeting?.time || '');
        setMeetingNotes(fetchedLead.meeting?.notes || '');
        setRemarks(fetchedLead.remarks || '');
        // Initialize communication flags
        setWhatsappSent(!!fetchedLead?.whatsapp?.sent);
        const m1 = fetchedLead?.mailers?.find?.(m => m.type === 'mailer1');
        const m2 = fetchedLead?.mailers?.find?.(m => m.type === 'mailer2');
        setMailer1Sent(!!m1?.sent);
        setMailer2Sent(!!m2?.sent);
      }

    } catch (err) {
      if (err?.code === 'ECONNABORTED') {
        toast.error('Fetching lead timed out. Please try again.');
      }
      const status = err?.response?.status;
      if (status === 404) {
        // No unassigned leads available → show completed state quietly
        setLead(null);
        localStorage.removeItem("currentLead");
      } else {
        toast.error("Failed to fetch lead.");
        setLead(null);
        localStorage.removeItem("currentLead");
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Ensure this initialization runs only once per mount (guards Strict Mode double-invoke)
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const storedLead = localStorage.getItem("currentLead");

    if (storedLead) {
      const parsedLead = JSON.parse(storedLead);
      // Validate stored lead to avoid showing stale/invalid ones
      const hasValidMobile = Array.isArray(parsedLead?.mobile) && parsedLead.mobile.some((n) => /^\d{10}$/.test(n));
      const isApproved = parsedLead?.status === 'approved for calling';
      // Only restore if not completed AND it matches current fetching rules
      if (!parsedLead.completed && hasValidMobile && isApproved) {
        setLead(parsedLead);
        // Rehydrate local UI state and clear loading immediately
        setNewStatus(parsedLead.currentStatus || 'Pending');
        setSelectedReportingManager(parsedLead.reportingManager?._id || '');
        setMeetingLink(parsedLead.meeting?.link || '');
        setMeetingDate(parsedLead.meeting?.date ? new Date(parsedLead.meeting.date).toISOString().split('T')[0] : '');
        setMeetingTime(parsedLead.meeting?.time || '');
        setMeetingNotes(parsedLead.meeting?.notes || '');
        setRemarks(parsedLead.remarks || '');
        setWhatsappSent(!!parsedLead?.whatsapp?.sent);
        const m1 = parsedLead?.mailers?.find?.(m => m.type === 'mailer1');
        const m2 = parsedLead?.mailers?.find?.(m => m.type === 'mailer2');
        setMailer1Sent(!!m1?.sent);
        setMailer2Sent(!!m2?.sent);
        setLoading(false);
        return;
      }
      // If lead was already completed, clear it
      localStorage.removeItem("currentLead");
    }

    // Always try to fetch new lead if no valid stored one
    fetchLead();
  }, [fetchLead]);

  
  useEffect(() => {
    fetchReportingManagers();
  }, [fetchReportingManagers]);

  const saveRemarks = async () => {
    const remarksText = typeof remarks === 'string' ? remarks : String(remarks ?? '');
    if (newStatus === '') {
      return toast.error("Please select a status.");
    }

    if (followUpDate && !followUpRemarks) {
        return toast.error("Please add follow-up remarks if a date is selected.");
    }

    if (!remarksText.trim()) {
      return toast.error("Remarks is required to proceed to next lead.");
    }

    setSaving(true);

    // Prepare the payload based on the new schema structure
    const payload = {
      currentStatus: newStatus,
      ...(selectedReportingManager && { reportingManager: selectedReportingManager }),
      remarks: remarksText,
      
      // Only include follow-up if date and remarks are present
      ...(followUpDate && followUpRemarks && { 
          followUps: { 
              followUpDate: followUpDate, 
              remarks: followUpRemarks 
          } 
      }),
      
      meeting: {
          link: meetingLink,
          date: meetingDate || null,
          time: meetingTime,
          notes: meetingNotes,
      },
      whatsappSent: whatsappSent,
      mailersStatus: { mailer1: mailer1Sent, mailer2: mailer2Sent }
    };
    
    // Cleanup empty strings/nulls for API
    Object.keys(payload.meeting).forEach(key => {
        if (payload.meeting[key] === '' || payload.meeting[key] === null) {
            delete payload.meeting[key];
        }
    });


    try {
      // 1) Save remarks and updates
      await axios.put(
        `${BASE_URL}/api/cre/remarks/${lead.assignmentId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Saved and moved to next lead!");
      setRemarksOpen(false);
      // Clear follow-up input fields after successful save
      setFollowUpDate('');
      setFollowUpRemarks('');
      // Clear local current lead and fetch new one
      localStorage.removeItem("currentLead");
      setLead(null);
      await fetchLead();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save assignment details.");
    } finally {
      setSaving(false);
    }
  };

  


  const openWhatsApp = (number, recipientName, senderName) => {
    const message = `Hello ${recipientName},

This is ${senderName} from IITGJobs.com. We have recently launched a tech-driven product to help organizations control attrition, and I would like to seek an appointment with you.

Your insights would mean a lot. Kindly let me know your comfortable timings for a telephonic discussion. I look forward to hearing from you.

Best regards,  
${senderName}  
IITGJobs.com`;

    const url = `https://web.whatsapp.com/send?phone=91${number}&text=${encodeURIComponent(
      message
    )}`;
    const win = window.open(url, "whatsappWindow");
    if (win) win.focus();
  };

  const openEmailModal = (recipientName, email) => {
    setEmailRecipient({ recipientName, email });

    const template =
      emailTemplate === "mailer1" ? mailer1Template : mailer2Template;

    const filledTemplate = template({
      recipientName,
      crmName: user?.name || "Our Team",
      crmEmail: user?.email || "default@example.com",
    });

    setEmailBody(convert(filledTemplate, { wordwrap: 130 }));
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailRecipient.email) {
      return toast.error("Recipient email not found!");
    }
    setSendingEmail(true);
    try {
      const formData = new FormData();
      formData.append("from", userEmail);
      formData.append("to", emailRecipient.email);
      formData.append(
        "subject",
        emailSubject || "Regarding Attrention Control"
      );
      formData.append("body", emailBody || "");
      attachments.forEach((file) => formData.append("attachments", file));
      await axios.post(`${BASE_URL}/api/cre/send/mailer`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Email sent successfully!");
      setEmailModalOpen(false);
      setEmailRecipient({});
      setEmailBody("");
      setEmailSubject("Regarding Attrention Control");
      setAttachments([]);
    } catch {
      toast.error("Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-center p-8 rounded-xl shadow-lg bg-white max-w-sm">
          <div className="text-2xl font-semibold text-gray-700 mb-2">
            Fetching Lead...
          </div>
          <div className="text-gray-500">Please wait.</div>
        </div>
      </div>
    );

  if (!lead)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 rounded-2xl shadow-xl bg-white max-w-md mx-auto">
          <div className="text-3xl font-extrabold text-gray-800 mb-4">
            🎉 All Leads Completed!
          </div>
          <p className="text-gray-600 mb-6">
            You've successfully worked through all your assigned leads. Take a
            moment to celebrate!
          </p>
          <motion.button
            onClick={fetchLead}
            className="bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:from-teal-600 hover:to-green-600 transition-all"
            whileHover={{
              scale: 1.05,
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            Get Next Lead
          </motion.button>
        </div>
      </div>
    );
    
    // (progress and leadFields are memoized above)


  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <Toaster position="top-center" />
      <CRENavbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header/Hero Section */}
        <motion.div
          className="text-center my-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-gray-900">
            Lead Assignment Dashboard
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
            </span>
          </h1>
          <p className="mt-3 text-lg text-gray-500 max-w-xl mx-auto">
            Manage and process your assigned leads efficiently.
          </p>
        </motion.div>

        <motion.div
          className="max-w-6xl mx-auto bg-white shadow-2xl rounded-2xl p-6 sm:p-10 border border-gray-200"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Current Lead Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-100">
            <h2 className="text-3xl font-bold text-gray-800">
              📋 Current Lead
            </h2>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Progress:</p>
              <p className="text-lg font-bold text-emerald-600">{progress}%</p>
            </div>
          </div>
          {/* Lead Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {leadFields.map((field, index) => (
              <motion.div
                key={field.label}
                className="bg-gray-50 p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-all hover:shadow-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="text-indigo-500 text-2xl">{field.icon}</div>
                <div className="flex-1">
                  <span className="font-semibold text-gray-600 text-sm uppercase block">
                    {field.label}:
                  </span>
                  <span className="text-gray-900 font-bold text-lg leading-tight block">
                    {field.value || "N/A"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <h3 className="text-lg font-bold text-gray-700">Actions:</h3>
            {lead.mobile?.[0] && (
              <motion.button
                onClick={() =>
                  openWhatsApp(lead.mobile[0], lead.name, user?.name)
                }
                className="flex items-center space-x-2 bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold py-2 px-5 rounded-full shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaWhatsapp className="text-xl" />
                <span>WhatsApp</span>
              </motion.button>
            )}
            {lead.email && (
              <motion.button
                onClick={() => openEmailModal(lead.name, lead.email)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold py-2 px-5 rounded-full shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaEnvelope className="text-xl" />
                <span>Email</span>
              </motion.button>
            )}
            <motion.button
              onClick={() => setRemarksOpen(!remarksOpen)}
              className="flex items-center space-x-2 bg-gradient-to-r from-gray-500 to-gray-700 text-white font-semibold py-2 px-5 rounded-full shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaCommentDots className="text-xl" />
              <span>{remarksOpen ? "Hide Details" : "Update Details"}</span>
            </motion.button>
          </div>
          {/* Remarks/Assignment Details Card (Updated) */}
          <AnimatePresence>
            {remarksOpen && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200 mb-8"
              >
                <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
                  Update Assignment Details
                </h3>

                {/* Status and Manager Row */}
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                    {/* Current Status */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                            Current Status
                        </label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
                        >
                            {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reporting Manager */}
                   <div className="relative">
    <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
        <FaUserTie className="mr-2"/> Reporting Manager
    </label>
    <select
        value={selectedReportingManager}
        onChange={(e) => setSelectedReportingManager(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
    >
        <option value="">Select Manager (Optional)</option>
        {/* FIX: Use Nullish Coalescing (??) to prevent 
          "reportingManagers.map is not a function" error.
          It ensures that if reportingManagers is null/undefined, it uses [] instead.
        */}
        {(reportingManagers ?? []).map((manager) => (
            <option key={manager._id} value={manager._id}>
                {manager.name} ({manager.email})
            </option>
        ))}
    </select>
</div>
                </div>

                {/* Follow-Ups Section */}
                <h4 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2 mt-4">New Follow-Up</h4>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                    {/* Follow Up Date */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
                            <FaCalendarAlt className="mr-2"/> Follow-Up Date (Optional)
                        </label>
                        <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
                        />
                    </div>

                    {/* Follow Up Remarks */}
                    <div className="relative col-span-1">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
                            <FaCommentDots className="mr-2"/> Follow-Up Remarks (Required if Date is set)
                        </label>
                        <textarea
                            rows={1}
                            placeholder="Enter remarks for this follow-up..."
                            value={followUpRemarks}
                            onChange={(e) => setFollowUpRemarks(e.target.value)}
                            className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-y"
                        />
                    </div>
                </div>

                {/* General Remarks */}
                <h4 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2 mt-4">Remarks</h4>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
                    <FaRegStickyNote className="mr-2"/> Remarks (General)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add any general remarks regarding this assignment..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-y"
                  />
                </div>

                {/* Communication Toggles */}
                <h4 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2 mt-4">Communication</h4>
                <div className="grid sm:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Sent</label>
                    <select
                      value={whatsappSent ? 'yes' : 'no'}
                      onChange={(e) => setWhatsappSent(e.target.value === 'yes')}
                      className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mailer 1 Sent</label>
                    <select
                      value={mailer1Sent ? 'yes' : 'no'}
                      onChange={(e) => setMailer1Sent(e.target.value === 'yes')}
                      className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mailer 2 Sent</label>
                    <select
                      value={mailer2Sent ? 'yes' : 'no'}
                      onChange={(e) => setMailer2Sent(e.target.value === 'yes')}
                      className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                {/* Meeting Section */}
                <h4 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2 mt-4">Meeting Details (Current)</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Meeting Link */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
                            <FaLink className="mr-2"/> Link
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Google Meet link"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Meeting Date */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
                            <FaCalendarAlt className="mr-2"/> Date
                        </label>
                        <input
                            type="date"
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                            className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
                        />
                    </div>

                    {/* Meeting Time */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
                            <FaClock className="mr-2"/> Time
                        </label>
                        <input
                            type="time"
                            value={meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white"
                        />
                    </div>

                    {/* Meeting Notes */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1 flex items-center">
                            <FaRegStickyNote className="mr-2"/> Notes
                        </label>
                        <input
                            type="text"
                            placeholder="Short notes"
                            value={meetingNotes}
                            onChange={(e) => setMeetingNotes(e.target.value)}
                            className="w-full border border-gray-300 px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="mt-8">
                  <motion.button
                    onClick={saveRemarks}
                    disabled={
                      saving || !(typeof remarks === 'string' ? remarks.trim() : String(remarks ?? '').trim())
                    }
                    title={
                      (typeof remarks === 'string' ? remarks.trim() : String(remarks ?? '').trim())
                        ? ''
                        : 'Please add Remarks to proceed to next lead'
                    }
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? "Saving..." : "Save & Next"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Main Action Buttons */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-4"></div>

        </motion.div>
      </div>
      {/* Email Modal */}
      <AnimatePresence>
        {emailModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl"
              initial={{ scale: 0.9, y: -50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -50 }}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                📧 Send Email to {emailRecipient.recipientName}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Template
                  </label>
                  <select
                    value={emailTemplate}
                    onChange={(e) => {
                      setEmailTemplate(e.target.value);
                      const template =
                        e.target.value === "mailer1"
                          ? mailer1Template
                          : mailer2Template;

                      const filledTemplate = template({
                        recipientName: emailRecipient.recipientName,
                        crmName: user?.name || "Our Team",
                        crmEmail: user?.email,
                      });

                      setEmailBody(convert(filledTemplate, { wordwrap: 130 }));
                    }}
                    className="p-3 border rounded-xl w-full focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="mailer1">Mailer 1</option>
                    <option value="mailer2">Mailer 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter subject"
                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    className="w-full border p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attachments
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAttachments([...e.target.files])}
                    className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <motion.button
                  onClick={() => setEmailModalOpen(false)}
                  className="bg-gray-400 text-white font-semibold px-6 py-2 rounded-full hover:bg-gray-500 transition"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-full hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {sendingEmail ? (
                    <div className="flex items-center space-x-2">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    "Send"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadAssignmentDashboard;