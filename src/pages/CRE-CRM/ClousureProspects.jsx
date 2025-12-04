import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { FaWhatsapp, FaEnvelope, FaCalendarAlt, FaEdit } from "react-icons/fa";
import CRENavbar from "../../components/CreNavbar";
import TeamScopeMenu from "../../components/TeamScopeMenu";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config";
import { mailer1Template } from "../../emails/mailer1";
import { mailer2Template } from "../../emails/mailer2";
import { convert } from "html-to-text";

const ClousureProspects = () => {
  const { authToken, user, role } = useAuth();
  const token = authToken || localStorage.getItem("token");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState([]); // ids currently being saved
  // hierarchy selector
  const [scope, setScope] = useState('self'); // self | team | user
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

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
  // top filter: Closure | In Progress | Closed
  const [statusFilter, setStatusFilter] = useState('Closure');
  const [selectedItem, setSelectedItem] = useState(null);
  const [latestRemark, setLatestRemark] = useState('');

  // Fetch closure prospects leads
  const fetchLeads = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);
      let url = `${BASE_URL}/api/cre/closure-prospects`;
      if (isLeader) {
        if (scope === 'team') url += `?scope=team`;
        else if (scope === 'user' && selectedUserId) url += `?userId=${encodeURIComponent(selectedUserId)}`;
      }
      const res = await axios.get(url, {
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

  const getLatestRemark = (a) => {
    if (!a) return 'N/A';
    if (a.remarks && a.remarks.trim()) return a.remarks.trim();
    const fus = Array.isArray(a.followUps) ? a.followUps : [];
    if (fus.length === 0) return 'N/A';
    const last = fus[fus.length - 1];
    return last?.remarks || 'N/A';
  };

  const filteredLeads = (leads || []).filter((item) => {
    if (statusFilter === 'Closure') return true; // show all closure prospects dataset
    if (statusFilter === 'In Progress') return (item?.closureStatus || '') === 'In Progress';
    if (statusFilter === 'Closed') return (item?.closureStatus || '') === 'Closed';
    return true;
  });

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scope, selectedUserId]);

  // load team members for leaders
  useEffect(() => {
    const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);
    if (!token || !isLeader) { setTeamMembers([]); return; }
    const run = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/cre/team/members`, { headers: { Authorization: `Bearer ${token}` } });
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        setTeamMembers(items);
      } catch (_) { setTeamMembers([]); }
    };
    run();
  }, [token, role, user?.role]);

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
          // Close Details modal if open
          setSelectedItem(null);
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
          <div className="flex items-center gap-3">
            {/* status segmented control */}
            <div className="inline-flex rounded-md overflow-hidden border border-slate-200 shadow-sm">
              <button className={`px-3 py-1.5 text-xs ${statusFilter==='Closure'?'bg-slate-800 text-white':'bg-white text-slate-700'} hover:bg-slate-50`} onClick={()=>setStatusFilter('Closure')}>Closure</button>
              <button className={`px-3 py-1.5 text-xs ${statusFilter==='In Progress'?'bg-amber-500 text-white':'bg-white text-slate-700'} hover:bg-amber-50`} onClick={()=>setStatusFilter('In Progress')}>⚠️ In Progress</button>
              <button className={`px-3 py-1.5 text-xs ${statusFilter==='Closed'?'bg-emerald-600 text-white':'bg-white text-slate-700'} hover:bg-emerald-50`} onClick={()=>setStatusFilter('Closed')}>✅ Closed</button>
            </div>
            <TeamScopeMenu
            isLeader={["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role)}
            teamMembers={teamMembers}
            scope={scope}
            selectedUserId={selectedUserId}
            allLabel="All"
            title="Filter by team"
            onSelectMe={() => { setScope('self'); setSelectedUserId(''); }}
            onSelectAll={() => { setScope('team'); setSelectedUserId(''); }}
            onSelectUser={(id) => { setScope('user'); setSelectedUserId(id); }}
            />
          </div>
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
                  <th className="px-3 py-2 text-left text-sm">Name</th>
                  <th className="px-3 py-2 text-left text-sm">Location</th>
                  
                  <th className="px-3 py-2 text-left text-sm">Designation</th>
                  <th className="px-3 py-2 text-left text-sm">Company name</th>
                  <th className="px-3 py-2 text-left text-sm">Updated</th>
                  <th className="px-3 py-2 text-left text-sm">Latest Remark</th>
                  <th className="px-3 py-2 text-left text-sm">Followups</th>
                  <th className="px-3 py-2 text-left text-sm">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(filteredLeads || []).map((item) => (
                  <tr
                    key={item._id}
                    className={`hover:bg-gray-50 ${item?.closureStatus==='Closed' ? 'bg-emerald-50/60' : (item?.closureStatus==='In Progress' ? 'bg-amber-50/40' : '')}`}
                  >
                    <td className="px-3 py-2 text-sm">{item?.lead?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.location || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.designation || "N/A"}</td>
                     <td className="px-3 py-2 text-sm">{item?.lead?.company?.CompanyName || "N/A"}</td>
                   
                    <td className="px-3 py-2 text-sm whitespace-nowrap">{item?.updatedAt ? new Date(item.updatedAt).toLocaleString() : "N/A"}</td>
                    <td className="px-3 py-2 text-sm">
                      {getLatestRemark(item)}
                      {item?.closureStatus==='Closed' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Closed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">{Array.isArray(item?.followUps) ? item.followUps.length : 0}</td>
                    <td className="px-3 py-2 text-sm">
                      <button className="flex items-center bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" onClick={()=> { setSelectedItem(item); setLatestRemark(item?.remarks || ''); }}>
                        <FaEdit className="mr-1" /> Details
                      </button>
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

        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">Details</h2>
                  <div className="inline-flex rounded-md overflow-hidden border border-slate-200 shadow-sm">
                    <button
                      className={`px-3 py-1.5 text-xs ${selectedItem?.closureStatus==='In Progress'?'bg-amber-500 text-white':'bg-white text-slate-700'} hover:bg-amber-50`}
                      onClick={() => updateClosureStatus(selectedItem._id, 'In Progress', selectedItem)}
                      disabled={updatingIds.includes(selectedItem._id)}
                    >⚠️ In Progress</button>
                    <button
                      className={`px-3 py-1.5 text-xs ${selectedItem?.closureStatus==='Closed'?'bg-emerald-600 text-white':'bg-white text-slate-700'} hover:bg-emerald-50`}
                      onClick={() => updateClosureStatus(selectedItem._id, 'Closed', selectedItem)}
                      disabled={updatingIds.includes(selectedItem._id)}
                    >✅ Closed</button>
                  </div>
                </div>
                <button className="text-slate-500" onClick={() => setSelectedItem(null)}>✕</button>
              </div>
              <div className="p-4 space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><strong>Name:</strong> {selectedItem?.lead?.name || 'N/A'}</div>
                  <div><strong>Company:</strong> {selectedItem?.lead?.company?.CompanyName || 'N/A'}</div>
                  <div><strong>Designation:</strong> {selectedItem?.lead?.designation || 'N/A'}</div>
                  <div><strong>Location:</strong> {selectedItem?.lead?.location || 'N/A'}</div>
                  <div><strong>Email:</strong> {selectedItem?.lead?.email || 'N/A'}</div>
                  <div><strong>Mobile:</strong> {Array.isArray(selectedItem?.lead?.mobile) ? selectedItem.lead.mobile.join(', ') : selectedItem?.lead?.mobile || 'N/A'}</div>
                  <div><strong>Assignment ID:</strong> {selectedItem?._id}</div>
                  <div><strong>Lead ID:</strong> {selectedItem?.lead?._id || selectedItem?.lead}</div>
                  <div><strong>Lead Model:</strong> {selectedItem?.leadModel || 'N/A'}</div>
                  <div><strong>CRE:</strong> {selectedItem?.Calledbycre?.name || selectedItem?.Calledbycre || 'N/A'}</div>
                  <div><strong>Current Status:</strong> {selectedItem?.currentStatus || 'N/A'}</div>
                  <div><strong>Closure Status:</strong> {selectedItem?.closureStatus || 'N/A'}</div>
                  <div><strong>Assigned At:</strong> {selectedItem?.assignedAt ? new Date(selectedItem.assignedAt).toLocaleString() : 'N/A'}</div>
                  <div><strong>Created:</strong> {selectedItem?.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : 'N/A'}</div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Follow-ups ({Array.isArray(selectedItem?.followUps) ? selectedItem.followUps.length : 0})</h3>
                  {Array.isArray(selectedItem?.followUps) && selectedItem.followUps.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {selectedItem.followUps.map(fu => (
                        <li key={fu._id}>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleString() : 'N/A'} - {fu?.remarks || ''}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-slate-500">No follow-ups</div>
                  )}
                </div>
                <div className="rounded border p-3 bg-slate-50">
                  <h3 className="font-semibold mb-2">Updated</h3>
                  <div>{selectedItem?.updatedAt ? new Date(selectedItem.updatedAt).toLocaleString() : 'N/A'}</div>
                </div>
                {/* Latest Remark edit */}
                <div className="rounded border p-3 bg-slate-50">
                  <h3 className="font-semibold mb-2">Latest Remark</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <textarea
                      className="border p-2 rounded w-full"
                      rows={3}
                      value={latestRemark}
                      placeholder="Enter latest remark"
                      onChange={(e) => setLatestRemark(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button className="px-3 py-2 rounded bg-gray-200" onClick={()=> setLatestRemark(selectedItem?.remarks || '')}>Reset</button>
                      <button
                        className="px-3 py-2 rounded bg-blue-600 text-white"
                        onClick={async ()=>{
                          try {
                            await axios.put(`${BASE_URL}/api/cre/lead/${selectedItem._id}`, { remarks: latestRemark }, { headers: { Authorization: `Bearer ${token}` } });
                            toast.success('Latest Remark updated');
                            fetchLeads();
                          } catch (e) {
                            toast.error(e?.response?.data?.message || 'Failed to update remark');
                          }
                        }}
                      >Save Remark</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end">
                <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setSelectedItem(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClousureProspects;


