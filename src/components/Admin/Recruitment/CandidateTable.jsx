import React, { useState } from "react";

const CandidateTable = ({ candidates, onAction, currentStage }) => {
  const [remark, setRemark] = useState({});

  const getSkillsText = (val) => {
    if (!val) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") return Object.values(val).join(", ");
    return String(val);
  };   

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Experience</th>
            <th className="p-2 border">Location</th>
            <th className="p-2 border">Skills</th>
            <th className="p-2 border">Remark</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {candidates.length === 0 && (
            <tr>
              <td colSpan={6} className="p-3 text-center text-gray-500">No candidates in {currentStage}</td>
            </tr>
          )}
          {candidates.map((c) => (
            <tr key={c._id} className="border-t">
              <td className="p-2 border">{c.name || "-"}</td>
              <td className="p-2 border">{c.experience || "-"}</td>
              <td className="p-2 border">{c.location || "-"}</td>
              <td className="p-2 border">{getSkillsText(c.skills)}</td>
              <td className="p-2 border">
                <input
                  type="text"
                  value={remark[c._id] || ""}
                  onChange={(e) => setRemark({ ...remark, [c._id]: e.target.value })}
                  placeholder="Add remark"
                  className="border rounded p-1 w-full"
                />
              </td>
              <td className="p-2 border">
                <div className="flex gap-2">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() => onAction(c._id, "Yes", remark[c._id])}
                  >
                    Yes
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded"
                    onClick={() => onAction(c._id, "No", remark[c._id])}
                  >
                    No
                  </button>
                  <button
                    className="bg-indigo-600 text-white px-3 py-1 rounded"
                    onClick={() => onAction(c._id, "Approved", remark[c._id])}
                  >
                    Approved
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CandidateTable;
