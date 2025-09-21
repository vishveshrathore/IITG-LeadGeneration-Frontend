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
  const [editMeetings, setEditMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ link: "", date: "", time: "", notes: "" });

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

  const statusOptions = ["Pending", "Positive", "Negative", "Closure Prospects"];

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
    setStatus(lead.currentStatus || "Pending");
    const m1 = (lead?.mailers || []).find(m => m.type === 'mailer1')?.sent || false;
    const m2 = (lead?.mailers || []).find(m => m.type === 'mailer2')?.sent || false;
    setEditMailers({ mailer1: m1, mailer2: m2 });
    setEditWhatsapp(!!lead?.whatsapp?.sent);
    setEditFollowUps(Array.isArray(lead?.followUps) ? [...lead.followUps] : []);
    setEditReportingManager(lead?.reportingManager?._id || "");
    setEditMeetings(Array.isArray(lead?.meeting) ? [...lead.meeting] : []);
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
          meeting: editMeetings.map(m => ({ _id: m._id, link: m.link || null, date: m.date || null, time: m.time || null, notes: m.notes || null })),
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Lead updated successfully");
      setSelectedLead(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update lead");
    }
  };

  const openWhatsApp = async (assignmentId, number, recipientName, senderName) => {
    if (!number) { toast.error("Mobile number not found"); return; }
    const message = `Hello ${recipientName},\n\nThis is ${senderName} from IITGJobs.com. We have recently launched a tech-driven product to help organizations control attrition, and I would like to seek an appointment with you.\n\nYour insights would mean a lot. Kindly let me know your comfortable timings for a telephonic discussion. I look forward to hearing from you.\n\nBest regards,  \n${senderName}  \nIITGJobs.com`;
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

  const openEmailModal = (assignmentId, recipientName, email, mailers = []) => {
    if (!email) { toast.error("Recipient email not found"); return; }
    setEmailRecipient({ name: recipientName || "", email });
    setEmailAssignmentId(assignmentId);
    setEmailMailersSnapshot(Array.isArray(mailers) ? mailers : []);
    const templateFn = emailTemplate === "mailer1" ? mailer1Template : mailer2Template;
    const filledTemplate = templateFn({ recipientName: recipientName || "", crmName: user?.name || "Our Team", crmEmail: user?.email || "default@example.com" });
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
      formData.append("subject", emailSubject || "Regarding Attrention Control");
      formData.append("body", emailBody || "");
      attachments.forEach((file) => formData.append("attachments", file));
      await axios.post(`${BASE_URL}/api/cre/send/mailer`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      toast.success("Email sent successfully!");
      // Build mailers payload preserving previous statuses and setting the chosen one to true
      const existing = { mailer1: false, mailer2: false, ...Object.fromEntries((emailMailersSnapshot || []).map(m => [m.type, !!m.sent])) };
      existing[emailTemplate] = true;
      const mailersPayload = [
        { type: 'mailer1', sent: !!existing.mailer1 },
        { type: 'mailer2', sent: !!existing.mailer2 },
      ];
      if (emailAssignmentId) {
        try {
          await axios.put(`${BASE_URL}/api/cre/lead/${emailAssignmentId}`,
            { mailers: mailersPayload },
            { headers: { Authorization: `Bearer ${token}` } }
          );
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
                  <th className="px-3 py-2 text-left text-sm">Reporting Manager</th>
                  <th className="px-3 py-2 text-left text-sm">Follow-Ups</th>
                  <th className="px-3 py-2 text-left text-sm">Mailer1</th>
                  <th className="px-3 py-2 text-left text-sm">Mailer2</th>
                  <th className="px-3 py-2 text-left text-sm">WhatsApp</th>
                  <th className="px-3 py-2 text-left text-sm">Meeting</th>
                  <th className="px-3 py-2 text-left text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedLeads.map(lead => (
                  <tr key={lead._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{lead?.lead?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.lead?.designation || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.lead?.company?.CompanyName || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.lead?.company?.industry?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.lead?.location || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{Array.isArray(lead?.lead?.mobile) ? lead.lead.mobile.join(", ") : lead?.lead?.mobile || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.lead?.email || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.lead?.productLine || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.lead?.turnover || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.Calledbycre?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{lead?.reportingManager?.name || "N/A"}</td>
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
                    <td className="px-3 py-2 text-sm">
                      {(lead?.meeting || []).length > 0 ? (
                        (lead.meeting || []).map(m => (
                          <div key={m._id}>Link: {m?.link || "N/A"}, Date: {m?.date || "N/A"}</div>
                        ))
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => handleSelectLead(lead)}>View/Edit</button>
                        {Array.isArray(lead?.lead?.mobile) && lead.lead.mobile[0] && (
                          <button className="bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => openWhatsApp(lead._id, lead.lead.mobile[0], lead?.lead?.name, user?.name)} title="WhatsApp">
                            <FaWhatsapp />
                          </button>
                        )}
                        {lead?.lead?.email && (
                          <button className="bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => openEmailModal(lead._id, lead?.lead?.name, lead?.lead?.email, lead?.mailers)} title="Email">
                            <FaEnvelope />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                    <p><strong>Email:</strong> {selectedLead?.lead?.email || "N/A"}</p>
                    <p><strong>Product Line:</strong> {selectedLead?.lead?.productLine || "N/A"}</p>
                    <p><strong>Turnover:</strong> {selectedLead?.lead?.turnover || "N/A"}</p>
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

                {/* Reporting Manager */}
                <div className="bg-gray-50 border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Reporting Manager</h3>
                  <select className="border p-2 rounded w-full" value={editReportingManager} onChange={e => setEditReportingManager(e.target.value)}>
                    <option value="">Select Manager</option>
                    {managers.map(m => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
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
                <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setSelectedLead(null)}>Close</button>
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
