import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { FaCalendarAlt, FaEdit } from "react-icons/fa";
import CRENavbar from "../../components/CRENavbar";
import { BASE_URL } from "../../config";
import { useAuth } from "../../context/AuthContext";

const PositiveLead = () => {
  const { authToken } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("");
  const statusOptions = ["Pending", "Positive", "Negative", "Closure Prospects"];

  const fetchLeads = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/cre/positive/lead`, {
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

  useEffect(() => {
    fetchLeads();
  }, [authToken]);

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setRemarks(lead.remarks || "");
    setStatus(lead.currentStatus || "Pending");
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
                <th className="px-3 py-2 text-left text-sm font-medium">Lead Name</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Designation</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Company</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Industry</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Location</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Mobile</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Email</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Product Line</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Turnover</th>
                <th className="px-3 py-2 text-left text-sm font-medium">CRE</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Reporting Manager</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Follow-Ups</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Mailer1</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Mailer2</th>
                <th className="px-3 py-2 text-left text-sm font-medium">WhatsApp</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Meeting</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((assignment) => (
                <tr key={assignment._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.name || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.designation || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.company?.CompanyName || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.company?.industry?.name || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.location || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{Array.isArray(assignment?.lead?.mobile) ? assignment.lead.mobile.join(", ") : assignment?.lead?.mobile || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.email || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.productLine || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.lead?.turnover || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.Calledbycre?.name || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">{assignment?.reportingManager?.name || "N/A"}</td>
                  <td className="px-3 py-2 text-sm">
                    {(assignment?.followUps || []).map((fu) => (
                      <div key={fu._id} className="flex items-center space-x-1">
                        <FaCalendarAlt className="text-gray-500" />
                        <span>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleString() : "N/A"} - {fu?.remarks || ""}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {(assignment?.mailers || []).find(m => m.type === 'mailer1')?.sent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                    ) : <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {(assignment?.mailers || []).find(m => m.type === 'mailer2')?.sent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                    ) : <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {assignment?.whatsapp?.sent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Sent</span>
                    ) : <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {(assignment?.meeting || []).length > 0 ? (
                      (assignment.meeting || []).map((m) => (
                        <div key={m._id} className="text-sm">Link: {m?.link || "N/A"}, Date: {m?.date || "N/A"}</div>
                      ))
                    ) : "N/A"}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <button
                      className="flex items-center bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      onClick={() => handleSelectLead(assignment)}
                    >
                      <FaEdit className="mr-1" /> View/Edit
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
                    <p><strong>Reporting Manager:</strong> {selectedLead?.reportingManager?.name || "N/A"}</p>
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
