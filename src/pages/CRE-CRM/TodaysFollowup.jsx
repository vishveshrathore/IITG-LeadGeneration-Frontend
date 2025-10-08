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

const TodaysFollowup = () => {
  const { authToken } = useAuth();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Fetch today's follow-ups
  const fetchFollowUps = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/cre/today/followups`, {
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

  useEffect(() => {
    fetchFollowUps();
  }, [authToken]);

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
      toast.error("Failed to update follow-up");
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
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Lead Name</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Designation</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Company</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Industry</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Location</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Mobile</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Product Line</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Turnover</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">CRE</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Reporting Manager(s)</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Follow-Ups</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Mailer1</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Mailer2</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">WhatsApp</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Meeting</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {followUps.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{assignment.lead?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.designation || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.company?.CompanyName || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.company?.industry?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.location || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.mobile?.join(", ") || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.email || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.productLine || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.lead?.turnover || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{assignment.Calledbycre?.name || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">{
                      Array.isArray(assignment.reportingManagers) && assignment.reportingManagers.length > 0
                        ? assignment.reportingManagers.map(rm => `${rm?.name || ''}${rm?.email ? ` (${rm.email})` : ''}`).filter(Boolean).join(', ')
                        : (assignment.reportingManager?.name || "N/A")
                    }</td>
                    <td className="px-3 py-2 text-sm">
                      {assignment.followUps.map((fu, idx) => (
                        <div key={idx} className="flex items-center space-x-1">
                          <FaCalendarAlt className="text-gray-500" />
                          <span>{new Date(fu.followUpDate).toLocaleString()} - {fu.remarks}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {assignment.mailers?.find(m => m.type === 'mailer1')?.sent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                      ) : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {assignment.mailers?.find(m => m.type === 'mailer2')?.sent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Sent</span>
                      ) : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {assignment.whatsapp?.sent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Sent</span>
                      ) : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {assignment.meeting?.link ? (
                        <a href={assignment.meeting.link} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          Join
                        </a>
                      ) : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {editingId === assignment._id ? (
                        <div className="space-y-1">
                          <input
                            type="datetime-local"
                            value={followUpDate || new Date().toISOString().slice(0,16)}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="border p-1 rounded w-full"
                          />
                          <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Enter remarks"
                            className="border p-1 rounded w-full"
                          />
                          <div className="flex space-x-1 mt-1">
                            <button
                              className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                              onClick={() => handleEditFollowUp(assignment._id)}
                            >
                              Save
                            </button>
                            <button
                              className="bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="flex items-center bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          onClick={() => {
                            setEditingId(assignment._id);
                            if (assignment.followUps.length > 0) {
                              setRemarks(assignment.followUps[0].remarks || "");
                              setFollowUpDate(new Date(assignment.followUps[0].followUpDate).toISOString().slice(0,16));
                            } else {
                              setRemarks("");
                              setFollowUpDate(new Date().toISOString().slice(0,16));
                            }
                          }}
                        >
                          <FaEdit className="mr-1" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaysFollowup;
