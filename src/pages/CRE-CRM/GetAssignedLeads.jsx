import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaWhatsapp, FaEnvelope, FaCommentDots, FaRegCopy } from "react-icons/fa";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import AnimatedLGNavbar from "../../components/LgNavBar";
import { BASE_URL } from "../../config";

const LeadAssignmentDashboard = () => {
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem("token");

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarksOpen, setRemarksOpen] = useState(false);

  const fields = [
    "type", "note", "priority", "status", "meetLink",
    "meetCount", "communicationMode", "followUpDate", "teamManager", "mostRecentDate"
  ];

  useEffect(() => {
    // Check localStorage first
    const storedLead = localStorage.getItem("currentLead");
    if (storedLead) {
      setLead(JSON.parse(storedLead));
      setLoading(false);
    } else {
      fetchLead();
    }
  }, []);

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

  // Save remarks
  const saveRemarks = async () => {
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
    }
  };

  // Mark lead as complete
  const completeLead = async () => {
    try {
      await axios.put(`${BASE_URL}/api/cre/submitlead/${lead.assignmentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Lead completed!");
      localStorage.removeItem("currentLead");
      fetchLead();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete lead.");
    }
  };

  // Skip lead
  const skipLead = async () => {
    try {
      await axios.put(`${BASE_URL}/api/cre/skip/${lead.assignmentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Lead skipped!");
      localStorage.removeItem("currentLead");
      fetchLead();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to skip lead.");
    }
  };

const openWhatsApp = (number, name) => {
  const message = `Hello ${name},\n\nThis is ___________ from IITGJobs.com. I would be glad to have a brief conversation with you at a time that is convenient for you. \n\nYour insights would mean a lot, and I look forward to your kind response.\n\nBest regards,\n__________\nIITGJobs.com`;
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/91${number}?text=${encodedMessage}`, "_blank");
};


  const openGmail = (email) =>
    window.open(`https://mail.google.com/mail/?view=cm&to=${email}`, "gmailWindow").focus();
    const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  useEffect(() => {
    fetchLead();
  }, []);

  // Loader
  if (loading) return (
    <div className="max-w-5xl mx-auto mt-10 p-4 animate-pulse">
      <div className="h-8 bg-gray-300 rounded mb-4 w-1/2"></div>
      <div className="h-48 bg-gray-200 rounded-xl"></div>
    </div>
  );

  if (!lead) return <p className="text-center mt-10 text-lg">No lead assigned</p>;

  const progress = Math.round(
    (fields.filter((f) => lead.remarks?.[f] && lead.remarks[f] !== "").length / fields.length) * 100
  ) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white px-4 sm:px-6 lg:px-20 py-6">
      <Toaster position="top-center" />
      <AnimatedLGNavbar />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto mt-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">📋 Assigned Lead</h2>

        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl p-4 sm:p-8 md:p-10 mb-6">

          {/* Lead Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <p className="text-sm sm:text-base"><span className="font-semibold">Name:</span> {lead.name}</p>
            <p className="text-sm sm:text-base flex items-center gap-1">
              <span className="font-semibold">Company:</span> {lead.company?.CompanyName || "N/A"}
              {lead.company?.CompanyName && <FaRegCopy className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => copyToClipboard(lead.company.CompanyName, "Company")} />}
            </p>
            <p className="text-sm sm:text-base"><span className="font-semibold">Industry:</span> {lead.industry?.name || "N/A"}</p>
            <p className="text-sm sm:text-base flex items-center gap-1">
              <span className="font-semibold">Mobile:</span> {lead.mobile?.[0] || "N/A"}
              {lead.mobile?.[0] && <FaRegCopy className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => copyToClipboard(lead.mobile[0], "Mobile")} />}
            </p>
            <p className="text-sm sm:text-base flex items-center gap-1 col-span-1 sm:col-span-2">
              <span className="font-semibold">Email:</span> {lead.email || "N/A"}
              {lead.email && <FaRegCopy className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => copyToClipboard(lead.email, "Email")} />}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 mb-6">
            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 text-right">{progress}% Completed</p>
          </div>

          {/* Action Icons */}
          <div className="flex gap-4 mb-4 text-2xl sm:text-3xl justify-start sm:justify-start flex-wrap">
            {lead.mobile?.[0] && (
              <button
                onClick={() => openWhatsApp(lead.mobile[0], lead.name, lead.company?.CompanyName)}
                className="text-green-600 hover:text-green-700 transition"
              >
                <FaWhatsapp />
              </button>
            )}
            {lead.email && <button onClick={() => openGmail(lead.email)} className="text-blue-600 hover:text-blue-700 transition"><FaEnvelope /></button>}
            <button onClick={() => setRemarksOpen(!remarksOpen)} className="text-gray-600 hover:text-gray-800 transition"><FaCommentDots /></button>
          </div>

          {/* Remark Editor */}
          {remarksOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.3 }} className="bg-gray-50 p-4 rounded-xl shadow-inner mb-4">
              {fields.map((f) => (
                <div className="mb-2" key={f}>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 capitalize">
                    {f.replace(/([A-Z])/g, " $1")}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter remark..."
                    value={lead.remarks[f] || ""}
                    onChange={(e) => setLead({ ...lead, remarks: { ...lead.remarks, [f]: e.target.value } })}
                    className={`w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base
                      ${lead.remarks[f] && lead.remarks[f] !== "" ? "bg-green-50 border-green-400" : "bg-white"}`}
                  />
                </div>
              ))}
              <button onClick={saveRemarks} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl mt-2 w-full sm:w-auto">💾 Save Remarks</button>
            </motion.div>
          )}

          {/* Complete / Skip */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button onClick={completeLead} className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-xl shadow-md w-full sm:w-auto">✅ Complete Lead</button>
            <button onClick={skipLead} className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-6 rounded-xl shadow-md w-full sm:w-auto">⏭️ Skip Lead</button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LeadAssignmentDashboard;
