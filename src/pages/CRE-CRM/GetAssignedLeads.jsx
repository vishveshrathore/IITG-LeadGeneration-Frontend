import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaWhatsapp,
  FaEnvelope,
  FaCommentDots,
  FaRegCopy,
  FaTimes,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import CRENavbar from "../../components/CreNavbar";
import { BASE_URL } from "../../config";
import { mailer1Template } from "../../emails/mailer1";
import { mailer2Template } from "../../emails/mailer2";
import { convert } from "html-to-text";

const LeadAssignmentDashboard = () => {
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem("token");
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("IITGJobs.com HR Solutions");
  const [emailRecipient, setEmailRecipient] = useState({});

  const fields = [
    "type",
    "note",
    "priority",
    "status",
    "meetLink",
    "meetCount",
    "communicationMode",
    "followUpDate",
    "teamManager",
    "mostRecentDate",
  ];

  // Utility: Fill template placeholders
  const fillTemplate = (template, data) =>
    template.replace(/{{(\w+)}}/g, (_, key) => data[key] || "");

  // Fetch assigned lead
  const fetchLead = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/cre/assign`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLead(res.data);
      localStorage.setItem("currentLead", JSON.stringify(res.data));
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch lead.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedLead = localStorage.getItem("currentLead");
    if (storedLead) {
      setLead(JSON.parse(storedLead));
      setLoading(false);
    } else {
      fetchLead();
    }
  }, []);

  // Save remarks
  const saveRemarks = async () => {
    if (!Object.values(lead.remarks || {}).some((val) => val.trim() !== "")) {
      toast.error("Please add at least one remark before saving.");
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${BASE_URL}/api/cre/remarks/${lead.assignmentId}`,
        { remarks: lead.remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Remarks saved!");
      setRemarksOpen(false);
      fetchLead();
    } catch (err) {
      toast.error("Failed to save remarks.");
    } finally {
      setSaving(false);
    }
  };

  // Complete lead
  const completeLead = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${BASE_URL}/api/cre/submitlead/${lead.assignmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Lead completed!");
      localStorage.removeItem("currentLead");
      fetchLead();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete lead.");
    } finally {
      setSaving(false);
    }
  };

  // Skip lead
  const skipLead = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${BASE_URL}/api/cre/skip/${lead.assignmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Lead skipped!");
      localStorage.removeItem("currentLead");
      fetchLead();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to skip lead.");
    } finally {
      setSaving(false);
    }
  };

  // Next lead
  const nextLead = () => {
    localStorage.removeItem("currentLead");
    fetchLead();
  };

  // WhatsApp message
  const openWhatsApp = (number, name, senderName = "Your Name") => {
    const message = `Hello ${name},\n\nThis is ${senderName} from IITGJobs.com. I would be glad to have a brief conversation with you at a time that is convenient for you.\n\nYour insights would mean a lot, and I look forward to your kind response.\n\nBest regards,\n${senderName}\nIITGJobs.com`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/91${number}?text=${encodedMessage}`, "_blank");
  };

  // Open Email Modal
  const openEmailModal = (recipientName, email) => {
    setEmailRecipient({ recipientName, email });
    setEmailBody(
      convert(fillTemplate(mailer1Template, { recipientName }), {
        wordwrap: 130,
      })
    );
    setEmailModalOpen(true);
  };

  // Send via Gmail
  const sendEmail = () => {
    const { email } = emailRecipient;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
      emailBody
    )}`;
    const mailtoLink = `mailto:${encodeURIComponent(
      email
    )}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
      emailBody
    )}`;
    const newWindow = window.open(gmailLink, "_blank");
    if (!newWindow) {
      window.location.href = mailtoLink;
    } else {
      newWindow.focus();
    }
    toast.success("Opening Gmail...");
    setEmailModalOpen(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text, label = "Text") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Loader
  if (loading)
    return (
      <div className="max-w-5xl mx-auto mt-10 p-4 animate-pulse">
        <div className="h-8 bg-gray-300 rounded mb-4 w-1/2"></div>
        <div className="h-48 bg-gray-200 rounded-xl"></div>
      </div>
    );

  if (!lead)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
          🎉 You’re all caught up! No lead assigned.
        </h2>
        <button
          onClick={fetchLead}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-xl shadow-md"
        >
          🔄 Refresh
        </button>
      </div>
    );

  const completedFields = fields.filter(
    (f) => lead.remarks?.[f] && lead.remarks[f] !== ""
  ).length;
  const progress = Math.round((completedFields / fields.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white px-4 sm:px-6 lg:px-20 py-6">
      <Toaster position="top-center" />
      <CRENavbar/>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto mt-10"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
          📋 Assigned Lead
        </h2>

        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-4 sm:p-8 md:p-10 mb-6"
        >
          {/* Lead Details */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
  <p><span className="font-semibold">Name:</span> {lead.name}</p>
  <p><span className="font-semibold">Designation:</span> {lead.designation || "N/A"}</p>
  <p><span className="font-semibold">Company:</span> {lead.company?.CompanyName || "N/A"}</p>
  <p><span className="font-semibold">Industry:</span> {lead.industry?.name || "N/A"}</p>
  <p><span className="font-semibold">Division:</span> {lead.division || "N/A"}</p>
  <p><span className="font-semibold">Location:</span> {lead.location || "N/A"}</p>
  <p><span className="font-semibold">Mobile:</span> {lead.mobile?.join(", ") || "N/A"}</p>
  <p><span className="font-semibold">Email:</span> {lead.email || "N/A"}</p>
  <p><span className="font-semibold">Employee Strength:</span> {lead.employeeStrength || "N/A"}</p>
  <p><span className="font-semibold">Product Line:</span> {lead.productLine || "N/A"}</p>
  <p><span className="font-semibold">Turnover:</span> {lead.turnOver || "N/A"}</p>
  <p><span className="font-semibold">Status:</span> {lead.status || "N/A"}</p>
  <p><span className="font-semibold">Source:</span> {lead.source || "N/A"}</p>
  <p><span className="font-semibold">Created At:</span> {new Date(lead.createdAt).toLocaleString()}</p>
  <p><span className="font-semibold">Updated At:</span> {new Date(lead.updatedAt).toLocaleString()}</p>
</div>


          {/* Progress Bar */}
          <div className="mt-4 mb-6">
            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 text-right">
              {completedFields}/{fields.length} ({progress}%) Completed
            </p>
          </div>

          {/* Action Icons */}
          <div className="flex gap-4 mb-4 text-2xl sm:text-3xl justify-start flex-wrap">
            {lead.mobile?.[0] && (
              <button
                onClick={() => openWhatsApp(lead.mobile[0], lead.name)}
                className="text-green-600 hover:text-green-700 transition"
              >
                <FaWhatsapp />
              </button>
            )}
            {lead.email && (
              <button
                onClick={() => openEmailModal(lead.name, lead.email)}
                className="text-blue-600 hover:text-blue-700 transition"
              >
                <FaEnvelope />
              </button>
            )}
            <button
              onClick={() => setRemarksOpen(!remarksOpen)}
              className="text-gray-600 hover:text-gray-800 transition"
            >
              <FaCommentDots />
            </button>
          </div>

          {/* Remark Editor */}
          {remarksOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="bg-gray-50 p-4 rounded-xl shadow-inner mb-4"
            >
              {fields.map((f) => (
                <div className="mb-2" key={f}>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 capitalize">
                    {f.replace(/([A-Z])/g, " $1")}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter remark..."
                    value={lead.remarks?.[f] || ""}
                    onChange={(e) =>
                      setLead({
                        ...lead,
                        remarks: {
                          ...lead.remarks,
                          [f]: e.target.value,
                        },
                      })
                    }
                    className={`w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base ${
                      lead.remarks?.[f] && lead.remarks[f] !== ""
                        ? "bg-green-50 border-green-400"
                        : "bg-white"
                    }`}
                  />
                </div>
              ))}
              <button
                onClick={saveRemarks}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-xl mt-2 w-full sm:w-auto"
              >
                💾 {saving ? "Saving..." : "Save Remarks"}
              </button>
            </motion.div>
          )}

          {/* Complete / Skip / Next */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button
              onClick={completeLead}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-6 rounded-xl shadow-md w-full sm:w-auto"
            >
              ✅ Complete Lead
            </button>
            <button
              onClick={skipLead}
              disabled={saving}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white py-2 px-6 rounded-xl shadow-md w-full sm:w-auto"
            >
              ⏭️ Skip Lead
            </button>
            <button
              onClick={nextLead}
              disabled={saving}
              className="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-6 rounded-xl shadow-md w-full sm:w-auto"
            >
              🔄 Next Lead
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Email Modal */}
      <AnimatePresence>
        {emailModalOpen && (
          <motion.div
            className="fixed inset-0 bg-blur bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-6 w-[95%] max-w-2xl relative"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Close */}
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
                onClick={() => setEmailModalOpen(false)}
              >
                <FaTimes size={20} />
              </button>

              {/* Title */}
              <h2 className="text-2xl font-semibold mb-5 text-gray-800 text-center">
                📧 Send Email to{" "}
                <span className="text-blue-600">
                  {emailRecipient.recipientName}
                </span>
              </h2>

              {/* Template Selector */}
              <div className="flex gap-3 mb-6 justify-center">
                {["Mailer 1", "Mailer 2", "Custom"].map((label, idx) => {
                  const active =
                    (idx === 0 && emailBody.includes("Transforming HR")) ||
                    (idx === 1 && emailBody.includes("Smart HR Solutions")) ||
                    (idx === 2 && emailBody.trim() === "");

                  const baseClasses =
                    "px-4 py-2 border rounded-lg font-medium transition";
                  const activeClasses = active
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100";

                  return (
                    <button
                      key={label}
                      className={`${baseClasses} ${activeClasses}`}
                      onClick={() => {
                        if (label === "Mailer 1") {
                          setEmailBody(
                            convert(
                              fillTemplate(mailer1Template, {
                                recipientName: emailRecipient.recipientName,
                              }),
                              { wordwrap: 130 }
                            )
                          );
                          toast.success("📩 Mailer 1 applied");
                        } else if (label === "Mailer 2") {
                          setEmailBody(
                            convert(
                              fillTemplate(mailer2Template, {
                                recipientName: emailRecipient.recipientName,
                              }),
                              { wordwrap: 130 }
                            )
                          );
                          toast.success("📩 Mailer 2 applied");
                        } else {
                          setEmailBody("");
                          toast("✍️ Custom mode enabled");
                        }
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Subject */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full border px-3 py-2 rounded-md mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter subject..."
              />

              {/* Body */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full border px-3 py-3 rounded-md h-44 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
                placeholder="Write your email..."
              ></textarea>
              {/* Attachment Upload */}
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Attachment (optional)
  </label>
  <input
    type="file"
    accept=".pdf,.xlsx,.xls,.doc,.docx"
    onChange={(e) => {
      if (e.target.files[0]) {
        setEmailRecipient((prev) => ({
          ...prev,
          attachment: e.target.files[0],
        }));
        toast.success(`📎 ${e.target.files[0].name} selected`);
      }
    }}
    className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
  />
  {emailRecipient.attachment && (
    <p className="text-sm text-green-600 mt-1">
      📂 {emailRecipient.attachment.name}
    </p>
  )}
</div>


              {/* Actions */}
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => copyToClipboard(emailBody, "Email body")}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-gray-700 transition"
                >
                  📋 Copy
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={sendEmail}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition flex items-center gap-2"
                >
                  🚀 Send via Gmail
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
