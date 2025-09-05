import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaWhatsapp, FaEnvelope, FaCommentDots, FaSyncAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const LeadAssignment = () => {
  const { authToken } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remark, setRemark] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const fetchLead = async () => {
    if (!authToken) {
      toast.error("You must be logged in");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:3000/api/cre/assign", {
        withCredentials: true,
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setLead(res.data);
      setRemark(res.data.remarks || "");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error fetching lead");
      setLead(null);
    } finally {
      setLoading(false);
    }
  };

  const saveRemark = async () => {
    if (!remark.trim()) {
      toast.error("Remark cannot be empty");
      return;
    }
    try {
      setSavingRemark(true);
      await axios.put(
        `http://localhost:3000/api/cre/remarks/${lead.assignmentId}`,
        { remarks: remark },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      toast.success("Remark saved");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error saving remark");
    } finally {
      setSavingRemark(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [authToken]);

  if (loading) return <p className="text-center p-4">Loading...</p>;
  if (!lead) return <p className="text-center p-4">No lead assigned</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-700">Assigned Lead</h2>
        <button
          onClick={fetchLead}
          className="text-gray-500 hover:text-gray-700"
          title="Fetch Next Lead"
        >
          <FaSyncAlt />
        </button>
      </div>

      <div className="mb-4 space-y-1">
        <p><span className="font-semibold">Name:</span> {lead.name || "N/A"}</p>
        <p><span className="font-semibold">Company:</span> {lead.companyName || "N/A"}</p>
        <p><span className="font-semibold">Industry:</span> {lead.industryName || "N/A"}</p>
        <p><span className="font-semibold">Mobile:</span> {lead.mobile || "N/A"}</p>
        <p><span className="font-semibold">Email:</span> {lead.email || "N/A"}</p>
      </div>

      <div className="flex gap-6 mb-4 text-2xl">
        <a
          href={`https://wa.me/91${lead.mobile}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:text-green-700"
          title="WhatsApp"
        >
          <FaWhatsapp />
        </a>

        <a
          href={`mailto:${lead.email}`}
          className="text-blue-600 hover:text-blue-700"
          title="Email"
        >
          <FaEnvelope />
        </a>

        <button
          onClick={() => document.getElementById("remarkBox").focus()}
          className="text-gray-600 hover:text-gray-800"
          title="Add Remark"
        >
          <FaCommentDots />
        </button>
      </div>

      <textarea
        id="remarkBox"
        className="w-full border rounded-lg p-2 mb-2 resize-none"
        rows="3"
        placeholder="Write a remark..."
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
      ></textarea>

      <button
        onClick={saveRemark}
        disabled={savingRemark}
        className={`w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition ${
          savingRemark ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {savingRemark ? "Saving..." : "Save Remark"}
      </button>
    </div>
  );
};

export default LeadAssignment;
