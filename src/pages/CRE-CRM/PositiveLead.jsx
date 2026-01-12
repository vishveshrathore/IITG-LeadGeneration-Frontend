import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { FaCalendarAlt, FaEdit } from "react-icons/fa";
import CRENavbar from "../../components/CreNavbar";
import TeamScopeMenu from "../../components/TeamScopeMenu";
import { BASE_URL } from "../../config";
import { useAuth } from "../../context/AuthContext";

const PositiveLead = () => {
  const { authToken, user, role } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("");
  const statusOptions = ["Positive", "Negative", "Closure Prospects"];
  // hierarchy selector
  const [scope, setScope] = useState('self'); // self | team | user
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const fetchLeads = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);
      let url = `${BASE_URL}/api/cre/positive/lead`;
      if (isLeader) {
        if (scope === 'team') url += `?scope=team`;
        else if (scope === 'user' && selectedUserId) url += `?userId=${encodeURIComponent(selectedUserId)}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setLeads(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch positive leads");
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

  useEffect(() => {
    fetchLeads();
  }, [authToken, scope, selectedUserId]);

  // load team members for leaders
  useEffect(() => {
    const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);
    if (!authToken || !isLeader) { setTeamMembers([]); return; }
    const run = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/cre/team/members`, { headers: { Authorization: `Bearer ${authToken}` } });
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        setTeamMembers(items);
      } catch (_) { setTeamMembers([]); }
    };
    run();
  }, [authToken, role, user?.role]);

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setRemarks(lead.remarks || "");
    // Show blank by default unless a non-empty status is already set
    setStatus(lead.currentStatus || "");
  };

  const handleSave = async () => {
    if (!selectedLead) return;
    try {
      await axios.put(
        `${BASE_URL}/api/cre/positive/lead/${selectedLead._id}`,
        { currentStatus: status, remarks },
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

  if (loading) return (
    <div className="min-h-screen bg-gray-100">
      <CRENavbar />
      <Toaster position="top-right" />
      <div className="p-4 my-14 space-y-4">
        <div className="bg-white rounded shadow-md p-6 text-gray-600">Loading Positive Leads...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <CRENavbar />
      <Toaster position="top-right" />
      <div className="p-4 my-14 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Positive Leads
            <span className="ml-2 text-sm font-medium text-gray-500">({leads?.length || 0})</span>
          </h1>
          <TeamScopeMenu
            isLeader={["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role)}
            teamMembers={teamMembers}
            scope={scope}
            selectedUserId={selectedUserId}
            allLabel="All"
            title="Filter by team"
            persist={false}
            onSelectMe={() => { setScope('self'); setSelectedUserId(''); }}
            onSelectAll={() => { setScope('team'); setSelectedUserId(''); }}
            onSelectUser={(id) => { setScope('user'); setSelectedUserId(id); }}
          />
        </div>

        {leads.length === 0 ? (
          <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center p-10 text-center border border-dashed border-gray-300">
            <div className="text-3xl mb-2">✨</div>
            <div className="text-lg font-semibold">No Positive Leads found</div>
            <div className="text-gray-500">Update a lead's status to "Positive" to see it here.</div>
          </div>
        ) : (
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium">Name</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Company name</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Designation</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Location</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Latest Remark</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Followups</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((assignment) => (
                <tr key={assignment._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.name || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.company?.CompanyName || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.designation || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.location || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{getLatestRemark(assignment)}</td>
                  <td className="px-3 py-2 text-sm">{Array.isArray(assignment?.followUps) ? assignment.followUps.length : 0}</td>
                  <td className="px-3 py-2 text-sm">
                    <button
                      className="flex items-center bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      onClick={() => handleSelectLead(assignment)}
                    >
                      <FaEdit className="mr-1" /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Edit Modal */}
        {selectedLead && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-semibold">Lead Details</h2>
                  <p className="text-sm text-gray-500">View and update status and remarks</p>
                </div>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedLead(null)}>✕</button>
              </div>

              {/* Modal Body */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="col-span-1 lg:col-span-2 bg-gray-50 border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Lead At A Glance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <p><strong>Name:</strong> {selectedLead?.lead?.name || "N/A"}</p>
                    <p><strong>Designation:</strong> {selectedLead?.lead?.designation || "N/A"}</p>
                    <p><strong>Company:</strong> {selectedLead?.lead?.company?.CompanyName || "N/A"}</p>
                    <p><strong>Industry:</strong> {selectedLead?.lead?.company?.industry?.name || "N/A"}</p>
                    <p><strong>Location:</strong> {selectedLead?.lead?.location || "N/A"}</p>
                    <p><strong>Mobile:</strong> {Array.isArray(selectedLead?.lead?.mobile) ? selectedLead.lead.mobile.join(", ") : selectedLead?.lead?.mobile || "N/A"}</p>
                    <p><strong>Email:</strong> {selectedLead?.lead?.email || "N/A"}</p>
                    <p><strong>Product Line:</strong> {selectedLead?.lead?.productLine || "N/A"}</p>
                    <p><strong>Turnover:</strong> {selectedLead?.lead?.turnover || "N/A"}</p>
                    <p><strong>CRE:</strong> {selectedLead?.Calledbycre?.name || "N/A"}</p>
                    <p><strong>Reporting Manager(s):</strong> {Array.isArray(selectedLead?.reportingManagers) && selectedLead.reportingManagers.length > 0
                      ? selectedLead.reportingManagers.map(rm => `${rm?.name || ''}${rm?.email ? ` (${rm.email})` : ''}`).filter(Boolean).join(', ')
                      : (selectedLead?.reportingManager?.name || "N/A")}
                    </p>
                    <p><strong>Assignment ID:</strong> {selectedLead?._id}</p>
                    <p><strong>Lead ID:</strong> {selectedLead?.lead?._id || selectedLead?.lead}</p>
                    <p><strong>Lead Model:</strong> {selectedLead?.leadModel || 'N/A'}</p>
                    <p><strong>Current Status:</strong> {selectedLead?.currentStatus || 'N/A'}</p>
                    <p><strong>Closure Status:</strong> {selectedLead?.closureStatus || 'N/A'}</p>
                    <p><strong>Completed:</strong> {String(selectedLead?.completed)}</p>
                    <p><strong>Assigned At:</strong> {selectedLead?.assignedAt ? new Date(selectedLead.assignedAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Created:</strong> {selectedLead?.createdAt ? new Date(selectedLead.createdAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Updated:</strong> {selectedLead?.updatedAt ? new Date(selectedLead.updatedAt).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 border rounded-xl p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Follow-ups</h3>
                  {(selectedLead?.followUps || []).length === 0 ? <p className="text-sm text-gray-500">No follow-ups</p> : (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {selectedLead.followUps.map((fu) => (
                        <li key={fu._id}>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleDateString() : "N/A"} - {fu?.remarks || ""}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-gray-50 border rounded-xl p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Mailers & WhatsApp</h3>
                  <div className="text-sm text-gray-700">
                    <div>Mailer1: {(selectedLead?.mailers || []).find(m => m.type === 'mailer1')?.sent ? 'Sent' : 'N/A'}</div>
                    <div>Mailer2: {(selectedLead?.mailers || []).find(m => m.type === 'mailer2')?.sent ? 'Sent' : 'N/A'}</div>
                    <div>WhatsApp: {selectedLead?.whatsapp?.sent ? 'Sent' : 'N/A'}</div>
                  </div>
                </div>

                <div className="bg-gray-50 border rounded-xl p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Remarks & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="border p-2 rounded"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
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

      </div>
    </div>
  );
};

export default PositiveLead;
