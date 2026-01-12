import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { FaCalendarAlt, FaEdit, FaWhatsapp, FaEnvelope } from "react-icons/fa";
import CRENavbar from "../../components/CreNavbar";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config";
import { mailer1Template } from "../../emails/mailer1";
import { mailer2Template } from "../../emails/mailer2";
import { convert } from "html-to-text";

const MyWorksheet = () => {
  const { authToken, user } = useAuth();
  const token = authToken || localStorage.getItem("token");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [currentStatus, setCurrentStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [reportingManager, setReportingManager] = useState("");
  const [mailer1, setMailer1] = useState("");
  const [mailer2, setMailer2] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Additional lead filters
  const [leadName, setLeadName] = useState("");
  const [designation, setDesignation] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [productLine, setProductLine] = useState("");
  const [turnover, setTurnover] = useState("");
  const [industry, setIndustry] = useState("");

  // Reporting managers (API returns the current user's manager list)
  const [managers, setManagers] = useState([]);

  const [selectedLead, setSelectedLead] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Editable modal states for mailers/whatsapp/followUps
  const [editMailers, setEditMailers] = useState({ mailer1: false, mailer2: false });
  const [editWhatsapp, setEditWhatsapp] = useState(false);
  const [editFollowUps, setEditFollowUps] = useState([]);
  const [newFUDate, setNewFUDate] = useState("");
  const [newFURemarks, setNewFURemarks] = useState("");
  const [editReportingManager, setEditReportingManager] = useState("");
  const [editReportingManagers, setEditReportingManagers] = useState([]); // multi-select
  const [editMeetings, setEditMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ link: "", date: "", time: "", notes: "" });
  const [closureStatus, setClosureStatus] = useState("In Progress");
  const [completed, setCompleted] = useState(false);
  const [editEmail, setEditEmail] = useState("");

  // Email modal states (Mailer)
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({ name: "", email: "" });
  const [emailTemplate, setEmailTemplate] = useState("mailer1");
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("Regarding Attrention Control");
  const [attachments, setAttachments] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailAssignmentId, setEmailAssignmentId] = useState("");
  const [emailMailersSnapshot, setEmailMailersSnapshot] = useState([]);
  // Cache CRM phone once to avoid intermittent empty values due to races
  const [crmPhoneResolved, setCrmPhoneResolved] = useState("");

  // User-selectable status options (Pending is internal-only; not exposed here)
  const statusOptions = ["Positive", "Negative", "RNR", "Wrong Number", "Closure Prospects"];
  const closureStatusOptions = ["Closed", "In Progress"];

  // Consistent status resolver for UI: treat internal 'Pending' as "no status" (blank)
  const getCurrentStatus = (assignment) => {
    if (!assignment) return "";

    const rawCurrent = assignment.currentStatus;
    if (rawCurrent && rawCurrent !== "Pending") return rawCurrent;

    const hist = Array.isArray(assignment.statusHistory) ? assignment.statusHistory : [];
    if (hist.length > 0) {
      const last = hist[hist.length - 1]?.status;
      if (last && last !== "Pending") return last;
    }

    // Only the internal default 'Pending' is present → show blank in UI
    return "";
  };

  const saveEmail = async (assignmentId, value) => {
    if (!assignmentId) return;
    const emailVal = (value || "").trim();
    if (!emailVal) { toast.error("Email cannot be empty"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) { toast.error("Invalid email format"); return; }
    try {
      await axios.put(`${BASE_URL}/api/cre/lead/${assignmentId}/email`, { email: emailVal }, { headers: { Authorization: `Bearer ${authToken}` } });
      toast.success("Email updated");
      if (selectedLead && selectedLead._id === assignmentId) {
        const updated = { ...selectedLead, lead: { ...(selectedLead.lead || {}), email: emailVal } };
        setSelectedLead(updated);
        setEditEmail(emailVal);
      }
      fetchLeads();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to update email");
    }
  };

  const markWrongNumber = async (assignment) => {
    if (!assignment?._id) return;
    try {
      await axios.put(
        `${BASE_URL}/api/cre/lead/${assignment._id}`,
        { currentStatus: 'Wrong Number', remarks: 'Marked as Wrong Number from Worksheet' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success('Marked as Wrong Number');
      fetchLeads();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to mark Wrong Number');
    }
  };

  // Normalize mixed model shapes into a consistent record for UI
  const normalize = (a) => {
    const l = a?.lead || {};
    const company = l.company || {};
    const industry = company.industry || l.industry || {}; // support both nested and flat
    const leadName = l.name || l.fullName || 'N/A';
    const designation = l.designation || l.title || 'N/A';
    const companyName = company.CompanyName || company.name || 'N/A';
    const industryName = industry.name || 'N/A';
    const location = l.location || l.city || l.address || 'N/A';
    const mobile = Array.isArray(l.mobile) ? l.mobile.join(', ') : (l.mobile || 'N/A');
    const email = l.email || 'N/A';
    const productLine = l.productLine || 'N/A';
    const turnover = l.turnover || 'N/A';
    const followUps = Array.isArray(a?.followUps) ? a.followUps : [];
    const followUpsCount = followUps.length;
    const meeting = Array.isArray(a?.meeting) ? a.meeting : [];
    const meetingDisplay = meeting.length > 0
      ? meeting.map(m => `Link: ${m?.link || 'N/A'}, Date: ${m?.date ? new Date(m.date).toLocaleDateString() : 'N/A'}`).join('; ')
      : 'N/A';
    return {
      leadName, designation, companyName, industryName, location, mobile, email, productLine, turnover,
      currentStatus: getCurrentStatus(a),
      closureStatus: a?.closureStatus || 'In Progress',
      completed: !!a?.completed,
      followUpsCount,
      meetingDisplay,
    };
  };

  const fetchLeads = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const params = {};
      if (currentStatus) params.currentStatus = currentStatus;
      if (followUpDate) params.followUpDate = followUpDate;
      if (reportingManager) params.reportingManager = reportingManager; // backend expects manager id
      // Convert string values from selects to booleans for API if provided
      if (mailer1) params.mailer1 = mailer1 === "true";
      if (mailer2) params.mailer2 = mailer2 === "true";
      if (whatsapp) params.whatsapp = whatsapp === "true";
      if (leadName) params.leadName = leadName;
      if (designation) params.designation = designation;
      if (company) params.company = company;
      if (location) params.location = location;
      if (mobile) params.mobile = mobile;
      if (email) params.email = email;
      if (productLine) params.productLine = productLine;
      if (turnover) params.turnover = turnover;
      if (industry) params.industry = industry;

      const res = await axios.get(`${BASE_URL}/api/cre/myleads`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params,
      });
      setLeads(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [authToken]);

  // Fetch reporting managers for filter
  useEffect(() => {
    const fetchManagers = async () => {
      if (!authToken) return;
      try {
        const res = await axios.get(`${BASE_URL}/api/cre/reporting-managers`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setManagers(res.data?.managers || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchManagers();
  }, [authToken]);

  // Derived pagination values
  const totalRecords = Array.isArray(leads) ? leads.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedLeads = (leads || []).slice(startIndex, endIndex);

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setRemarks(lead.remarks || "");
    // Do not prefill status; force explicit selection in the dropdown each time
    setStatus("");
    const m1 = (lead?.mailers || []).find(m => m.type === 'mailer1')?.sent || false;
    const m2 = (lead?.mailers || []).find(m => m.type === 'mailer2')?.sent || false;
    setEditMailers({ mailer1: m1, mailer2: m2 });
    setEditWhatsapp(!!lead?.whatsapp?.sent);
    setEditFollowUps(Array.isArray(lead?.followUps) ? [...lead.followUps] : []);
    setEditReportingManager(lead?.reportingManager?._id || "");
    setEditReportingManagers(Array.isArray(lead?.reportingManagers) ? lead.reportingManagers.map(r=>r?._id || r) : []);
    setEditMeetings(Array.isArray(lead?.meeting) ? [...lead.meeting] : []);
    setClosureStatus(lead?.closureStatus || "In Progress");
    setCompleted(!!lead?.completed);
    setEditEmail(lead?.lead?.email || "");
  };

  const handleSave = async () => {
    if (!selectedLead) return;
    try {
      // Construct mailers array in backend format
      const mailersPayload = [
        { type: 'mailer1', sent: !!editMailers.mailer1 },
        { type: 'mailer2', sent: !!editMailers.mailer2 },
      ];

      await axios.put(
        `${BASE_URL}/api/cre/lead/${selectedLead._id}`,
        {
          currentStatus: status,
          remarks,
          followUps: editFollowUps.map(fu => ({
            _id: fu._id,
            followUpDate: fu.followUpDate,
            remarks: fu.remarks,
            createdAt: fu.createdAt,
            updatedAt: fu.updatedAt,
          })),
          mailers: mailersPayload,
          whatsapp: { sent: !!editWhatsapp },
          reportingManager: editReportingManager || undefined,
          reportingManagers: Array.isArray(editReportingManagers) ? editReportingManagers : undefined,
          meeting: editMeetings.map(m => ({ _id: m._id, link: m.link || null, date: m.date || null, time: m.time || null, notes: m.notes || null })),
          closureStatus,
          completed,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Lead updated successfully");
      setSelectedLead(null);
      setStatus("");
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update lead");
    }
  };

  const openWhatsApp = async (assignmentId, number, recipientName, senderName) => {
    if (!number) { toast.error("Mobile number not found"); return; }
    const message = `Hello ${recipientName},\nHope you're doing well.\nWe’ve launched a tech-driven solution that can reduce attrition by up to 80%. Until attrition is controlled, we’re also offering hiring services at just 2% of CTC across levels. I’d appreciate a short GMeet to discuss this in detail.\nPlease share a convenient date and time.\nWarm regards,\n${senderName}\nCRE-CRM,\nhttps://iitgjobs.co.in/attrition-demo`;
    const url = `https://web.whatsapp.com/send?phone=91${number}&text=${encodeURIComponent(message)}`;
    const win = window.open(url, "whatsappWindow");
    if (win) win.focus();
    // Persist whatsapp sent = true for this assignment
    try {
      await axios.put(`${BASE_URL}/api/cre/lead/${assignmentId}`,
        { whatsapp: { sent: true } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("WhatsApp marked as sent");
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

 // Keep imports as they are (axios, BASE_URL, convert, mailer1Template, mailer2Template)

  // Resolve CRM phone once and cache it
  useEffect(() => {
    let cancelled = false;
    const resolvePhone = async () => {
      let phone = Array.isArray(user?.mobile)
        ? (user.mobile[0] || "")
        : (user?.mobile || user?.phone || user?.officeSim || user?.altMobile || "");
      if (!phone && token) {
        try {
          const res = await axios.get(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
          const profile = res?.data || {};
          phone = Array.isArray(profile?.mobile)
            ? (profile.mobile[0] || "")
            : (profile?.mobile || profile?.phone || profile?.officeSim || profile?.contactNumber || profile?.altMobile || "");
        } catch (_) {}
      }
      if (!cancelled) setCrmPhoneResolved(phone || "");
    };
    resolvePhone();
    return () => { cancelled = true; };
  }, [user?.mobile, user?.phone, user?.officeSim, user?.altMobile, token]);

  // When template is switched in the modal, rebuild the email body with cached phone
  useEffect(() => {
    if (!emailModalOpen) return;
    const templateFn = emailTemplate === "mailer1" ? mailer1Template : mailer2Template;
    const recipientName = emailRecipient?.name || "";
    const filled = templateFn({
      recipientName,
      crmName: user?.name || "Our Team",
      crmEmail: user?.email || "default@example.com",
      crmPhone: crmPhoneResolved || "",
    });
    setEmailBody(convert(filled, { wordwrap: 130 }));
  }, [emailTemplate, emailModalOpen, crmPhoneResolved, emailRecipient?.name, user?.name, user?.email]);

  // Set subject based on selected template (Mailer 2 has a specific subject)
  useEffect(() => {
    if (!emailModalOpen) return;
    if (emailTemplate === 'mailer2') {
      setEmailSubject('Details about Churn Control Model & Preferred Partner Model.');
    } else if (emailTemplate === 'mailer1') {
      setEmailSubject('Brief about Churn Control Model & Preferred Partner Model.');
    }
  }, [emailTemplate, emailModalOpen]);

  const openEmailModal = async (assignmentId, recipientName, email, mailers = []) => {
  if (!email) { toast.error("Recipient email not found"); return; }
  setEmailRecipient({ name: recipientName || "", email });
  setEmailAssignmentId(assignmentId);
  setEmailMailersSnapshot(Array.isArray(mailers) ? mailers : []);

    const templateFn = emailTemplate === "mailer1" ? mailer1Template : mailer2Template;
    // Prefer cached phone; fallback to compute + fetch only if still empty
    let crmPhone = crmPhoneResolved;
    if (!crmPhone) {
      crmPhone = Array.isArray(user?.mobile) ? (user.mobile[0] || "") : (user?.mobile || user?.phone || user?.officeSim || user?.altMobile || "");
    }
    if (!crmPhone) {
      try {
        const res = await axios.get(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
        const profile = res?.data || {};
        crmPhone = Array.isArray(profile?.mobile) ? (profile.mobile[0] || "") : (profile?.mobile || profile?.phone || profile?.officeSim || profile?.contactNumber || profile?.altMobile || "");
      } catch (_) { /* ignore */ }
    }

  const filledTemplate = templateFn({
    recipientName: recipientName || "",
    crmName: user?.name || "Our Team",
    crmEmail: user?.email || "default@example.com",
    crmPhone,
  });

  setEmailBody(convert(filledTemplate, { wordwrap: 130 }));
  setEmailModalOpen(true);
};

const handleSendEmail = async () => {
  if (!emailRecipient.email) return toast.error("Recipient email not found");
  setSendingEmail(true);
  try {
    const formData = new FormData();
    formData.append("from", user?.email?.trim() || "");
    formData.append("to", emailRecipient.email);
    const fallbackSubject = emailTemplate === 'mailer2'
      ? 'Details about Churn Control Model & Preferred Partner Model.'
      : 'Brief about Churn Control Model & Preferred Partner Model.';
    formData.append("subject", emailSubject || fallbackSubject);
    formData.append("body", emailBody || "");
    attachments.forEach((file) => formData.append("attachments", file));
    await axios.post(`${BASE_URL}/api/cre/send/mailer`, formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    });
    toast.success("Email sent successfully!");
    const existing = { mailer1: false, mailer2: false, ...Object.fromEntries((emailMailersSnapshot || []).map(m => [m.type, !!m.sent])) };
    existing[emailTemplate] = true;
    const mailersPayload = [
      { type: 'mailer1', sent: !!existing.mailer1 },
      { type: 'mailer2', sent: !!existing.mailer2 },
    ];
    if (emailAssignmentId) {
      try {
        await axios.put(`${BASE_URL}/api/cre/lead/${emailAssignmentId}`, { mailers: mailersPayload }, { headers: { Authorization: `Bearer ${token}` } });
        fetchLeads();
      } catch (e) { console.error(e); }
    }
    setEmailModalOpen(false);
    setEmailRecipient({ name: "", email: "" });
    setEmailBody("");
    setEmailSubject("Regarding Attrention Control");
    setAttachments([]);
    setEmailAssignmentId("");
    setEmailMailersSnapshot([]);
  } catch (e) {
    toast.error("Failed to send email.");
  } finally {
    setSendingEmail(false);
  }
};

  const handleResetFilters = () => {
    setCurrentStatus("");
    setFollowUpDate("");
    setReportingManager("");
    setMailer1("");
    setMailer2("");
    setWhatsapp("");
    setLeadName("");
    setDesignation("");
    setCompany("");
    setLocation("");
    setMobile("");
    setEmail("");
    setProductLine("");
    setTurnover("");
    setIndustry("");
    fetchLeads();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <CRENavbar />
      <Toaster position="top-right" />
      <div className="p-4 my-14 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Leads
            <span className="ml-2 text-sm font-medium text-gray-500">({leads?.length || 0})</span>
          </h1>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <select value={currentStatus} onChange={e => setCurrentStatus(e.target.value)} className="border p-2 rounded">
            <option value="">All Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="border p-2 rounded" />
          <select value={reportingManager} onChange={e => setReportingManager(e.target.value)} className="border p-2 rounded">
            <option value="">Reporting Manager</option>
            {managers.map(m => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>

          <select value={mailer1} onChange={e => setMailer1(e.target.value)} className="border p-2 rounded">
            <option value="">Mailer1</option>
            <option value="true">Sent</option>
            <option value="false">Not Sent</option>
          </select>

          <select value={mailer2} onChange={e => setMailer2(e.target.value)} className="border p-2 rounded">
            <option value="">Mailer2</option>
            <option value="true">Sent</option>
            <option value="false">Not Sent</option>
          </select>

          <select value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="border p-2 rounded">
            <option value="">WhatsApp</option>
            <option value="true">Sent</option>
            <option value="false">Not Sent</option>
          </select>

          {/* Additional lead filters row */}
          <input type="text" placeholder="Lead Name" value={leadName} onChange={e => setLeadName(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Designation" value={designation} onChange={e => setDesignation(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Mobile" value={mobile} onChange={e => setMobile(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Product Line" value={productLine} onChange={e => setProductLine(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Turnover" value={turnover} onChange={e => setTurnover(e.target.value)} className="border p-2 rounded col-span-1" />
          <input type="text" placeholder="Industry" value={industry} onChange={e => setIndustry(e.target.value)} className="border p-2 rounded col-span-1" />

          <button className="col-span-1 bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded" onClick={fetchLeads} disabled={loading}>
            {loading ? "Applying..." : "Apply"}
          </button>
          <button className="col-span-1 bg-gray-200 hover:bg-gray-300 transition text-gray-800 px-4 py-2 rounded" onClick={handleResetFilters} disabled={loading}>
            Reset
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded shadow-md p-6 text-gray-600">Loading...</div>
        ) : (leads?.length === 0 ? (
          <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center p-10 text-center border border-dashed border-gray-300">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-lg font-semibold">No leads found</div>
            <div className="text-gray-500">Try adjusting filters or reset to see all.</div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow-md">
            {/* Table toolbar: page size and range */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-sm text-gray-600">Showing {totalRecords === 0 ? 0 : startIndex + 1}–{endIndex} of {totalRecords}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page</span>
                <select className="border rounded p-1 text-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1 rounded border text-sm disabled:opacity-50" onClick={() => goToPage(1)} disabled={currentPage === 1}>First</button>
                  <button className="px-2 py-1 rounded border text-sm disabled:opacity-50" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
                  <span className="text-sm px-2">{currentPage} / {totalPages}</span>
                  <button className="px-2 py-1 rounded border text-sm disabled:opacity-50" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
                  <button className="px-2 py-1 rounded border text-sm disabled:opacity-50" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>Last</button>
                </div>
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-sm">Lead Name</th>
                  <th className="px-3 py-2 text-left text-sm">Designation</th>
                  <th className="px-3 py-2 text-left text-sm">Company</th>
                  <th className="px-3 py-2 text-left text-sm">Industry</th>
                  <th className="px-3 py-2 text-left text-sm">Location</th>
                  <th className="px-3 py-2 text-left text-sm">Mobile</th>
                  <th className="px-3 py-2 text-left text-sm">Email</th>
                  <th className="px-3 py-2 text-left text-sm">Product Line</th>
                  <th className="px-3 py-2 text-left text-sm">Turnover</th>
                  <th className="px-3 py-2 text-left text-sm">CRE</th>
                  <th className="px-3 py-2 text-left text-sm">Reporting Manager(s)</th>
                  <th className="px-3 py-2 text-left text-sm">Follow-Ups</th>
                  <th className="px-3 py-2 text-left text-sm">Current Status</th>
                  <th className="px-3 py-2 text-left text-sm">LG Update</th>
                  <th className="px-3 py-2 text-left text-sm">Mailer1</th>
                  <th className="px-3 py-2 text-left text-sm">Mailer2</th>
                  <th className="px-3 py-2 text-left text-sm">WhatsApp</th>
                  <th className="px-3 py-2 text-left text-sm">Meeting</th>
                  <th className="px-3 py-2 text-left text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedLeads.map(lead => {
                  const n = normalize(lead);
                  return (
                  <tr key={lead._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm" title={n.leadName}>{n.leadName}</td>
                    <td className="px-3 py-2 text-sm" title={n.designation}>{n.designation}</td>
                    <td className="px-3 py-2 text-sm" title={n.companyName}>{n.companyName}</td>
                    <td className="px-3 py-2 text-sm" title={n.industryName}>{n.industryName}</td>
                    <td className="px-3 py-2 text-sm" title={n.location}>{n.location}</td>
                    <td className="px-3 py-2 text-sm" title={n.mobile}>{n.mobile}</td>
                    <td className="px-3 py-2 text-sm" title={n.email}>{n.email}</td>
                    <td className="px-3 py-2 text-sm" title={n.productLine}>{n.productLine}</td>
                    <td className="px-3 py-2 text-sm" title={n.turnover}>{n.turnover}</td>
                    <td className="px-3 py-2 text-sm">{lead?.Calledbycre?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{
                      Array.isArray(lead?.reportingManagers) && lead.reportingManagers.length > 0
                        ? lead.reportingManagers.map(rm => `${rm?.name || ''}${rm?.email ? ` (${rm.email})` : ''}`).filter(Boolean).join(', ')
                        : (lead?.reportingManager?.name || "N/A")
                    }</td>
                    <td className="px-3 py-2 text-sm">
                      {(lead?.followUps || []).length === 0 ? (
                        <span>N/A</span>
                      ) : (
                        (lead.followUps || []).map((fu) => (
                          <div key={fu._id} className="flex items-center space-x-1">
                            <FaCalendarAlt className="text-gray-500" />
                            <span>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleDateString() : "N/A"} - {fu?.remarks || ""}</span>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">{n.currentStatus}</td>
                    <td className="px-3 py-2 text-sm">
                      {lead?.lgUpdated ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Number Updated</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {((lead?.mailers || []).find(m => m.type === "mailer1")?.sent) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                      ) : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {((lead?.mailers || []).find(m => m.type === "mailer2")?.sent) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                      ) : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {lead?.whatsapp?.sent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Sent</span>
                      ) : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm" title={n.meetingDisplay}>{n.meetingDisplay}</td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => handleSelectLead(lead)}>View/Edit</button>
                        <button className="bg-amber-500 text-white px-2 py-1 rounded" title="Mark as Wrong Number" onClick={() => markWrongNumber(lead)}>Wrong No.</button>
                        {Array.isArray(lead?.lead?.mobile) && lead.lead.mobile[0] && (
                          <button className="bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => openWhatsApp(lead._id, lead.lead.mobile[0], lead?.lead?.name, user?.name)} title="WhatsApp">
                            <FaWhatsapp />
                          </button>
                        )}
                        {lead?.lead?.email ? (
                          <button className="bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => openEmailModal(lead._id, lead?.lead?.name, lead?.lead?.email, lead?.mailers)} title="Email">
                            <FaEnvelope />
                          </button>
                        ) : (
                          <button
                            className="bg-indigo-500 text-white px-2 py-1 rounded"
                            title="Add Email"
                            onClick={() => {
                              const v = window.prompt("Enter email for this lead");
                              if (v !== null) saveEmail(lead._id, v);
                            }}
                          >Add Email</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Edit Modal */}
        {selectedLead && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-semibold">Lead Details</h2>
                  <p className="text-sm text-gray-500">View and update current status, remarks, communication, and schedules</p>
                </div>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedLead(null)}>✕</button>
              </div>

              {/* Modal Body */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead at a glance */}
                <div className="col-span-1 lg:col-span-2 bg-gray-50 border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Lead At A Glance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <p><strong>Name:</strong> {selectedLead?.lead?.name || "N/A"}</p>
                    <p><strong>Designation:</strong> {selectedLead?.lead?.designation || "N/A"}</p>
                    <p><strong>Company:</strong> {selectedLead?.lead?.company?.CompanyName || "N/A"}</p>
                    <p><strong>Location:</strong> {selectedLead?.lead?.location || "N/A"}</p>
                    <p><strong>Mobile:</strong> {Array.isArray(selectedLead?.lead?.mobile) ? selectedLead.lead.mobile.join(", ") : selectedLead?.lead?.mobile || "N/A"}</p>
                    <p className="flex items-center gap-2">
                      <strong>Email:</strong>
                      <input
                        className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
                        type="email"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        placeholder="Enter email"
                      />
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
                        onClick={() => saveEmail(selectedLead?._id, editEmail)}
                      >Save</button>
                    </p>
                    <p><strong>Product Line:</strong> {selectedLead?.lead?.productLine || "N/A"}</p>
                    <p><strong>Turnover:</strong> {selectedLead?.lead?.turnover || "N/A"}</p>
                    <p><strong>Lead Model:</strong> {selectedLead?.leadModel || "N/A"}</p>
                    <p><strong>Assignment ID:</strong> {selectedLead?._id}</p>
                  </div>
                </div>

                {/* Status history */}
                <div className="bg-gray-50 border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Status History</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {(selectedLead?.statusHistory || []).length === 0 ? (
                      <li>None</li>
                    ) : (
                      (selectedLead.statusHistory || []).map(s => (
                        <li key={s._id}>{s?.status || ""} - {s?.updatedAt ? new Date(s.updatedAt).toLocaleString() : ""}</li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Communications */}
                <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Communications</h3>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!editMailers.mailer1} onChange={e => setEditMailers(v => ({ ...v, mailer1: e.target.checked }))} />
                      <span>Mailer 1 Sent</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!editMailers.mailer2} onChange={e => setEditMailers(v => ({ ...v, mailer2: e.target.checked }))} />
                      <span>Mailer 2 Sent</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!editWhatsapp} onChange={e => setEditWhatsapp(e.target.checked)} />
                      <span>WhatsApp Sent</span>
                    </label>
                  </div>
                </div>

                {/* Reporting Managers */}
                <div className="bg-gray-50 border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Reporting Managers</h3>
                  <div className="space-y-2">
                    <select className="border p-2 rounded w-full" value={editReportingManager} onChange={e => setEditReportingManager(e.target.value)}>
                      <option value="">Add a manager...</option>
                      {managers.map(m => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm" onClick={() => {
                      if (!editReportingManager) return;
                      setEditReportingManagers(arr => Array.from(new Set([...(arr||[]), editReportingManager])));
                      setEditReportingManager("");
                    }}>Add</button>
                    {(editReportingManagers||[]).length === 0 ? (
                      <p className="text-sm text-gray-500">No managers selected.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editReportingManagers.map(id => {
                          const m = managers.find(mm => String(mm._id) === String(id));
                          return (
                            <span key={id} className="text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-1">
                              {m?.name || id}
                              <button className="text-blue-700" onClick={() => setEditReportingManagers(arr => arr.filter(x => String(x) !== String(id)))}>×</button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Follow-ups */}
                <div className="bg-gray-50 border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Follow-ups</h3>
                  {(editFollowUps || []).length === 0 ? <p className="text-sm text-gray-500">No follow-ups</p> : (
                    <ul className="space-y-2">
                      {editFollowUps.map((fu, idx) => (
                        <li key={fu._id || idx} className="flex items-center gap-2">
                          <input type="date" className="border p-2 rounded" value={fu.followUpDate ? new Date(fu.followUpDate).toISOString().split('T')[0] : ''}
                            onChange={e => {
                              const val = e.target.value;
                              setEditFollowUps(arr => arr.map((x,i)=> i===idx ? { ...x, followUpDate: val } : x));
                            }} />
                          <input type="text" className="border p-2 rounded flex-1" value={fu.remarks || ''}
                            placeholder="Remarks"
                            onChange={e => {
                              const val = e.target.value;
                              setEditFollowUps(arr => arr.map((x,i)=> i===idx ? { ...x, remarks: val } : x));
                            }} />
                          <button className="text-red-600 hover:text-red-700" onClick={() => setEditFollowUps(arr => arr.filter((_,i)=>i!==idx))}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <input type="date" className="border p-2 rounded" value={newFUDate} onChange={e => setNewFUDate(e.target.value)} />
                    <input type="text" className="border p-2 rounded flex-1" placeholder="Remarks" value={newFURemarks} onChange={e => setNewFURemarks(e.target.value)} />
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded" onClick={() => {
                      if (!newFUDate || !newFURemarks) { toast.error('Please provide date and remarks'); return; }
                      setEditFollowUps(arr => [...arr, { followUpDate: newFUDate, remarks: newFURemarks }]);
                      setNewFUDate(''); setNewFURemarks('');
                    }}>Add</button>
                  </div>
                </div>

                {/* Meetings */}
                <div className="bg-gray-50 border rounded-xl p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Meetings</h3>
                  {(editMeetings || []).length === 0 ? <p className="text-sm text-gray-500">No meetings</p> : (
                    <ul className="space-y-2">
                      {editMeetings.map((m, idx) => (
                        <li key={m._id || idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <input type="text" placeholder="Link" className="border p-2 rounded w-full" value={m.link || ''} onChange={e => setEditMeetings(arr => arr.map((x,i)=> i===idx ? { ...x, link: e.target.value } : x))} />
                          <input type="date" className="border p-2 rounded w-full" value={m.date ? new Date(m.date).toISOString().split('T')[0] : ''} onChange={e => setEditMeetings(arr => arr.map((x,i)=> i===idx ? { ...x, date: e.target.value } : x))} />
                          <input type="time" className="border p-2 rounded w-full" value={m.time || ''} onChange={e => setEditMeetings(arr => arr.map((x,i)=> i===idx ? { ...x, time: e.target.value } : x))} />
                          <div className="flex gap-2">
                            <input type="text" placeholder="Notes" className="border p-2 rounded flex-1" value={m.notes || ''} onChange={e => setEditMeetings(arr => arr.map((x,i)=> i===idx ? { ...x, notes: e.target.value } : x))} />
                            <button className="text-red-600 hover:text-red-700" onClick={() => setEditMeetings(arr => arr.filter((_,i)=> i!==idx))}>Remove</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <input type="text" placeholder="Link" className="border p-2 rounded w-full" value={newMeeting.link} onChange={e => setNewMeeting(v => ({ ...v, link: e.target.value }))} />
                    <input type="date" className="border p-2 rounded w-full" value={newMeeting.date} onChange={e => setNewMeeting(v => ({ ...v, date: e.target.value }))} />
                    <input type="time" className="border p-2 rounded w-full" value={newMeeting.time} onChange={e => setNewMeeting(v => ({ ...v, time: e.target.value }))} />
                    <div className="flex gap-2">
                      <input type="text" placeholder="Notes" className="border p-2 rounded flex-1" value={newMeeting.notes} onChange={e => setNewMeeting(v => ({ ...v, notes: e.target.value }))} />
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded" onClick={() => {
                        if (!newMeeting.date) { toast.error('Please provide meeting date'); return; }
                        setEditMeetings(arr => [...arr, { ...newMeeting }]);
                        setNewMeeting({ link: "", date: "", time: "", notes: "" });
                      }}>Add</button>
                    </div>
                  </div>
                </div>

                {/* Remarks & Status */}
                <div className="bg-gray-50 border rounded-xl p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Remarks & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="border p-2 rounded"
                    >
                      <option value="">Select status</option>
                      {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="md:col-span-2">
                      <textarea
                        className="border p-2 rounded w-full"
                        rows={3}
                        value={remarks}
                        placeholder="Add general remarks"
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-6 border-t bg-gray-50 rounded-b-2xl">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => { setSelectedLead(null); setStatus(""); }}
                >
                  Close
                </button>
                <button className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {emailModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Send Email to {emailRecipient.name}</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Template</label>
                  <select className="border p-2 rounded w-full" value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)}>
                    <option value="mailer1">Mailer 1</option>
                    <option value="mailer2">Mailer 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <input className="border p-2 rounded w-full" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Body</label>
                  <textarea className="border p-2 rounded w-full" rows={8} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Attachments</label>
                  <input type="file" multiple onChange={e => setAttachments(Array.from(e.target.files || []))} />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button className="px-3 py-2 rounded bg-gray-200" onClick={() => { setEmailModalOpen(false); setAttachments([]); }}>Cancel</button>
                  <button className="px-3 py-2 rounded bg-blue-600 text-white" disabled={sendingEmail} onClick={handleSendEmail}>{sendingEmail ? 'Sending...' : 'Send'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MyWorksheet;
