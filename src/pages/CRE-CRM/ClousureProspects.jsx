import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { FaWhatsapp, FaEnvelope, FaCalendarAlt } from "react-icons/fa";
import CRENavbar from "../../components/CreNavbar";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config";
import { mailer1Template } from "../../emails/mailer1";
import { mailer2Template } from "../../emails/mailer2";
import { convert } from "html-to-text";

const ClousureProspects = () => {
  const { authToken, user } = useAuth();
  const token = authToken || localStorage.getItem("token");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState([]); // ids currently being saved

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({ name: "", email: "" });
  const [emailTemplate, setEmailTemplate] = useState("mailer1");
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("Regarding Attrention Control");
  const [attachments, setAttachments] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailAssignmentId, setEmailAssignmentId] = useState("");
  const [emailMailersSnapshot, setEmailMailersSnapshot] = useState([]);

  // Congrats modal state for closures
  const [closureCongrats, setClosureCongrats] = useState({ open: false, name: '', company: '' });

  // Fetch closure prospects leads
  const fetchLeads = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/cre/closure-prospects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data?.data || []);
    } catch (e) {
      const serverMsg = e?.response?.data?.message || e?.message || "Failed to fetch closure prospects";
      console.error("Fetch closure prospects error:", e?.response?.data || e);
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openWhatsApp = async (assignmentId, number, recipientName, senderName) => {
    if (!number) { toast.error("Mobile number not found"); return; }
    const message = `Hello ${recipientName},\n\nThis is ${senderName} from IITGJobs.com.Pvt.Ltd. We have recently launched a tech-driven product to help organizations control attrition, and I would like to seek an appointment with you.\n\nYour insights would mean a lot. Kindly let me know your comfortable timings for a telephonic discussion. I look forward to hearing from you.\n\nBest regards,  \n${senderName}  \nIITGJobs.com`;
    const url = `https://web.whatsapp.com/send?phone=91${number}&text=${encodeURIComponent(message)}`;
    const win = window.open(url, "whatsappWindow");
    if (win) win.focus();
    try {
      await axios.put(`${BASE_URL}/api/cre/lead/${assignmentId}`,
        { whatsapp: { sent: true } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLeads();
    } catch (e) { console.error(e); }
  };

  const updateClosureStatus = async (assignmentId, status, leadItem) => {
    if (!assignmentId || !token) {
      toast.error('Auth or ID missing');
      return;
    }
    const prev = leads.map(l => ({ ...l }));
    const next = leads.map(l => (l._id === assignmentId ? { ...l, closureStatus: status } : l));
    setLeads(next);
    setUpdatingIds((ids) => [...new Set([...ids, assignmentId])]);
    try {
      const resp = await axios.put(
        `${BASE_URL}/api/cre/lead/${assignmentId}`,
        { closureStatus: status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp?.status >= 200 && resp?.status < 300) {
        if (status === 'Closed') {
          const leadName = leadItem?.lead?.name || 'Lead';
          const companyName = leadItem?.lead?.company?.CompanyName || '';
          setClosureCongrats({ open: true, name: leadName, company: companyName });
        } else {
          toast.success(`Marked as ${status}`);
        }
        fetchLeads();
      } else {
        throw new Error('Non-2xx response');
      }
    } catch (e) {
      console.error(e);
      setLeads(prev);
      const serverMsg = e?.response?.data?.message || 'Failed to update closure status';
      toast.error(serverMsg);
    } finally {
      setUpdatingIds((ids) => ids.filter(id => id !== assignmentId));
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
      // Mark chosen mailer as sent
      const existing = { mailer1: false, mailer2: false, ...Object.fromEntries((emailMailersSnapshot || []).map(m => [m.type, !!m.sent])) };
      existing[emailTemplate] = true;
      const mailersPayload = [
        { type: 'mailer1', sent: !!existing.mailer1 },
        { type: 'mailer2', sent: !!existing.mailer2 },
      ];
      if (emailAssignmentId) {
        await axios.put(`${BASE_URL}/api/cre/lead/${emailAssignmentId}`,
          { mailers: mailersPayload },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      toast.success("Email sent successfully");
      setEmailModalOpen(false);
      setEmailRecipient({ name: "", email: "" });
      setEmailBody("");
      setEmailSubject("Regarding Attrention Control");
      setAttachments([]);
      setEmailAssignmentId("");
      setEmailMailersSnapshot([]);
      fetchLeads();
    } catch (e) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <CRENavbar />
      <Toaster position="top-right" />
      <div className="p-4 my-14 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Closure Prospects
            <span className="ml-2 text-sm font-medium text-gray-500">({leads?.length || 0})</span>
          </h1>
        </div>

        {loading ? (
          <div className="bg-white rounded shadow-md p-6 text-gray-600">Loading...</div>
        ) : (leads?.length === 0 ? (
          <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center p-10 text-center border border-dashed border-gray-300">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-lg font-semibold">No Closure Prospects found</div>
            <div className="text-gray-500">Update a lead's status to "Closure Prospects" to see it here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow-md">
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
                  <th className="px-3 py-2 text-left text-sm">Status</th>
                  <th className="px-3 py-2 text-left text-sm">Follow-Ups</th>
                  <th className="px-3 py-2 text-left text-sm">Mailer1</th>
                  <th className="px-3 py-2 text-left text-sm">Mailer2</th>
                  <th className="px-3 py-2 text-left text-sm">WhatsApp</th>
                  <th className="px-3 py-2 text-left text-sm">Closure</th>
                  <th className="px-3 py-2 text-left text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(leads || []).map((item) => (
                  <tr
                    key={item._id}
                    className={`${item?.closureStatus === 'Closed' ? 'bg-emerald-50/40' : 'bg-amber-50/30'} hover:bg-white transition-colors`}
                  >
                    <td className="px-3 py-2 text-sm">
                      <span className={`mr-2 align-middle ${item?.closureStatus === 'Closed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {item?.closureStatus === 'Closed' ? '✅' : '⚠️'}
                      </span>
                      <span className="font-semibold text-slate-900">{item?.lead?.name || "N/A"}</span>
                    </td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.designation || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">
                      {item?.lead?.company?.CompanyName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {item.lead.company.CompanyName}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.company?.industry?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.location || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{Array.isArray(item?.lead?.mobile) ? item.lead.mobile.join(", ") : item?.lead?.mobile || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.email || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                        {item?.currentStatus || "N/A"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {(item?.followUps || []).length === 0 ? (
                        <span>N/A</span>
                      ) : (
                        (item.followUps || []).map((fu) => (
                          <div key={fu._id} className="flex items-center space-x-1">
                            <FaCalendarAlt className="text-gray-500" />
                            <span>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleDateString() : "N/A"} - {fu?.remarks || ""}</span>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {((item?.mailers || []).find(m => m.type === "mailer1")?.sent) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                      ) : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {((item?.mailers || []).find(m => m.type === "mailer2")?.sent) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                      ) : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {item?.whatsapp?.sent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Sent</span>
                      ) : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {/* Closure status segmented toggle with optimistic update */}
                      <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-md overflow-hidden border border-slate-200 shadow-sm">
                          <button
                            className={`px-2.5 py-1 text-xs ${item?.closureStatus === 'In Progress' ? 'bg-amber-500 text-white' : 'bg-white text-slate-700'} disabled:opacity-60 hover:bg-amber-50`}
                            onClick={() => updateClosureStatus(item._id, 'In Progress')}
                            disabled={updatingIds.includes(item._id)}
                            title="Mark In Progress"
                          >⚠️ In Progress</button>
                          <button
                            className={`px-2.5 py-1 text-xs ${item?.closureStatus === 'Closed' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'} disabled:opacity-60 hover:bg-emerald-50`}
                            onClick={() => updateClosureStatus(item._id, 'Closed', item)}
                            disabled={updatingIds.includes(item._id)}
                            title="Mark Closed"
                          >✅ Closed</button>
                        </div>
                        {updatingIds.includes(item._id) && (
                          <span className="text-[11px] text-slate-500">Saving...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {Array.isArray(item?.lead?.mobile) && item.lead.mobile[0] && (
                          <button className="bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => openWhatsApp(item._id, item.lead.mobile[0], item?.lead?.name, user?.name)} title="WhatsApp">
                            <FaWhatsapp />
                          </button>
                        )}
                        {item?.lead?.email && (
                          <button className="bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => openEmailModal(item._id, item?.lead?.name, item?.lead?.email, item?.mailers)} title="Email">
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

        {/* Closure Congrats Modal */}
        {closureCongrats.open && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setClosureCongrats({ open: false, name: '', company: '' })}
            />
            <div className="relative z-10 h-full w-full flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-1">
                  <div className="bg-white rounded-2xl p-6">
                    {/* Header pills: Lead (top-left) and Company (top-right) */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        👤 {closureCongrats.name}
                      </span>
                      {closureCongrats.company && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          🏢 {closureCongrats.company}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center mb-3">
                      <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">🎉</div>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 text-center">Closure Achieved!</h3>
                    <p className="mt-2 text-center text-slate-600">
                      Congratulations on closing {closureCongrats.name}
                      {closureCongrats.company ? ` at ${closureCongrats.company}` : ''}.
                    </p>
                    <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-sm text-center">
                      Keep up the momentum and continue delivering great results!
                    </div>
                    <div className="mt-6 flex justify-center">
                      <button
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white shadow hover:bg-emerald-700"
                        onClick={() => setClosureCongrats({ open: false, name: '', company: '' })}
                      >Awesome!</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClousureProspects;


