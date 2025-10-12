import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  FaWhatsapp,
  FaEnvelope,
  FaLink,
  FaCalendarAlt,
  FaEdit,
} from "react-icons/fa";
import CRENavbar from "../../components/CreNavbar";
import { BASE_URL } from "../../config";
import { useAuth } from "../../context/AuthContext";
import TeamScopeMenu from "../../components/TeamScopeMenu";

const TodaysFollowup = () => {
  const { authToken, user, role } = useAuth();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // for Details modal
  const [latestRemark, setLatestRemark] = useState("");
  // hierarchy selector
  const [scope, setScope] = useState('self'); // self | team | user
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Fetch today's follow-ups
  const fetchFollowUps = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);
      let url = `${BASE_URL}/api/cre/today/followups`;
      if (isLeader) {
        if (scope === 'team') url += `?scope=team`;
        else if (scope === 'user' && selectedUserId) url += `?userId=${encodeURIComponent(selectedUserId)}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setFollowUps(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch today's follow-ups");
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
    fetchFollowUps();
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

  // Edit follow-up
  const handleEditFollowUp = async (assignmentId) => {
    if (!followUpDate || !remarks) {
      toast.error("Please provide follow-up date and remarks");
      return;
    }
    try {
      await axios.put(
        `${BASE_URL}/api/cre/followup/${assignmentId}`,
        { followUpDate, remarks },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      toast.success("Follow-up updated!");
      setEditingId(null);
      setRemarks("");
      setFollowUpDate("");
      fetchFollowUps();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Failed to update follow-up";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <CRENavbar />
      <Toaster position="top-right" />
      <div className="p-4 my-14 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Today's Follow-ups
            <span className="ml-2 text-sm font-medium text-gray-500">({followUps?.length || 0})</span>
          </h1>
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

        {loading ? (
          <div className="bg-white rounded shadow-md p-6 text-gray-600">Loading...</div>
        ) : followUps.length === 0 ? (
          <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center p-10 text-center border border-dashed border-gray-300">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-lg font-semibold">No follow-ups scheduled for today</div>
            <div className="text-gray-500">Schedule a follow-up in Worksheet to see it here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Company name</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Designation</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Location</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Latest Remark</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Followups</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {followUps.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{assignment.lead?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.company?.CompanyName || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.designation || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.location || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{getLatestRemark(assignment)}</td>
                    <td className="px-3 py-2 text-sm">{typeof assignment.totalFollowUps === 'number' ? assignment.totalFollowUps : (Array.isArray(assignment.followUps) ? assignment.followUps.length : 0)}</td>
                    <td className="px-3 py-2 text-sm">
                      <button
                        className="flex items-center bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        onClick={() => { setSelectedItem(assignment); setLatestRemark(assignment?.remarks || ""); setEditingId(assignment._id); if (Array.isArray(assignment.followUps) && assignment.followUps.length>0) { setRemarks(assignment.followUps[assignment.followUps.length-1].remarks||''); setFollowUpDate(new Date().toISOString().slice(0,16)); } else { setRemarks(''); setFollowUpDate(new Date().toISOString().slice(0,16)); } }}
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

        {/* Details Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Details</h2>
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
                  <div><strong>Completed:</strong> {String(selectedItem?.completed)}</div>
                  <div><strong>Assigned At:</strong> {selectedItem?.assignedAt ? new Date(selectedItem.assignedAt).toLocaleString() : 'N/A'}</div>
                  <div><strong>Created:</strong> {selectedItem?.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : 'N/A'}</div>
                  <div><strong>Updated:</strong> {selectedItem?.updatedAt ? new Date(selectedItem.updatedAt).toLocaleString() : 'N/A'}</div>
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
                            await axios.put(`${BASE_URL}/api/cre/lead/${selectedItem._id}`, { remarks: latestRemark }, { headers: { Authorization: `Bearer ${authToken}` } });
                            toast.success('Latest Remark updated');
                            fetchFollowUps();
                          } catch (e) {
                            toast.error(e?.response?.data?.message || 'Failed to update remark');
                          }
                        }}
                      >Save Remark</button>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Follow-ups ({typeof selectedItem?.totalFollowUps === 'number' ? selectedItem.totalFollowUps : (Array.isArray(selectedItem?.fullFollowUps) ? selectedItem.fullFollowUps.length : (Array.isArray(selectedItem?.followUps) ? selectedItem.followUps.length : 0))})</h3>
                  {Array.isArray(selectedItem?.fullFollowUps) && selectedItem.fullFollowUps.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {selectedItem.fullFollowUps.map(fu => (
                        <li key={fu._id}>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleString() : 'N/A'} - {fu?.remarks || ''}</li>
                      ))}
                    </ul>
                  ) : Array.isArray(selectedItem?.followUps) && selectedItem.followUps.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {selectedItem.followUps.map(fu => (
                        <li key={fu._id}>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleString() : 'N/A'} - {fu?.remarks || ''}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-slate-500">No follow-ups</div>
                  )}
                </div>
                {/* Add next follow-up */}
                <div className="rounded border p-3 bg-slate-50">
                  <h3 className="font-semibold mb-2">Add Next Follow-up</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                    <input
                      type="datetime-local"
                      value={followUpDate || new Date().toISOString().slice(0,16)}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="border p-2 rounded"
                    />
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter remarks"
                      className="border p-2 rounded md:col-span-2"
                      rows={2}
                    />
                    <div className="md:col-span-3 flex justify-end gap-2">
                      <button className="px-3 py-2 rounded bg-gray-200" onClick={()=>{ setRemarks(''); setFollowUpDate(new Date().toISOString().slice(0,16)); }}>Reset</button>
                      <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={() => handleEditFollowUp(selectedItem._id)}>Save Follow-up</button>
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

export default TodaysFollowup;


