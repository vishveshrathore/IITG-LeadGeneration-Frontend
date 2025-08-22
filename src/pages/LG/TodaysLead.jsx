import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AnimatedLGNavbar from '../../components/LgNavBar';
import { FiEdit } from 'react-icons/fi';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { motion } from 'framer-motion';
import { BASE_URL } from "../../config";   // if inside pages/LG



const TodayLeadsOfLG = () => {
  const { authToken } = useAuth();
  const [leads, setLeads] = useState([]);
  const [editingLead, setEditingLead] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchTodayLeads = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/lg/todayleads`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setLeads(res.data.leads);
    } catch (error) {
      toast.error('Failed to fetch today’s leads');
      console.error(error);
    }
  };

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      await axios.put(
        `${BASE_URL}/api/lg/todayleads/update/${id}`,
        { isComplete: !currentStatus },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success('Status updated');
      fetchTodayLeads();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handleEditClick = (lead) => {
    setEditingLead(lead._id);
    setEditForm({ ...lead });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(
        `${BASE_URL}/api/lg/todayleads/update/${editingLead}`,
        editForm,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success('Lead updated successfully');
      setEditingLead(null);
      fetchTodayLeads();
    } catch (err) {
      toast.error('Failed to update lead');
      console.error(err);
    }
  };

  const handleCancelEdit = () => setEditingLead(null);

  useEffect(() => {
    if (authToken) fetchTodayLeads();
  }, [authToken]);

  return (
    <div className="p-6">
      <AnimatedLGNavbar />
      <h2 className="text-3xl font-bold mb-6 text-center">📋 Today's Leads</h2>

      <div className="overflow-x-auto rounded-xl shadow-lg bg-white">
        <table className="min-w-full table-auto text-sm text-gray-800">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600 border-b">
            <tr>
              {[
                'Name', 'Designation', 'Mobile', 'Email', 'Location',
                'Remarks', 'Division', 'Product Line', 'Turnover',
                'Employee Strength', 'Industry', 'Company', 'Complete', 'Actions'
              ].map((title) => (
                <th key={title} className="px-4 py-2 whitespace-nowrap">{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length > 0 ? (
              leads.map((lead) => (
                <tr key={lead._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{lead.name}</td>
                  <td className="px-4 py-2">{lead.designation}</td>
                  <td className="px-4 py-2">{lead.mobile?.join(', ')}</td>
                  <td className="px-4 py-2">{lead.email}</td>
                  <td className="px-4 py-2">{lead.location}</td>
                  <td className="px-4 py-2">{lead.remarks}</td>
                  <td className="px-4 py-2">{lead.division}</td>
                  <td className="px-4 py-2">{lead.productLine}</td>
                  <td className="px-4 py-2">{lead.turnOver}</td>
                  <td className="px-4 py-2">{lead.employeeStrength}</td>
                  <td className="px-4 py-2">{lead.industry?.name || '-'}</td>
                  <td className="px-4 py-2">{lead.company?.CompanyName || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={lead.isComplete}
                      onChange={() => handleToggleComplete(lead._id, lead.isComplete)}
                      className="h-4 w-4 text-green-600"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      data-tooltip-id={`edit-tooltip-${lead._id}`}
                      onClick={() => handleEditClick(lead)}
                      className="text-blue-600 hover:text-blue-800 text-lg"
                    >
                      <FiEdit />
                    </button>
                    <Tooltip id={`edit-tooltip-${lead._id}`} place="top" content="Edit Lead" />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="14" className="text-center py-6 text-gray-500">
                  No leads submitted today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal with framer-motion */}
      {editingLead && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-3xl relative">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Edit Lead Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'name', 'designation', 'email', 'location', 'remarks',
                'division', 'productLine', 'turnOver', 'employeeStrength'
              ].map((field) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 capitalize mb-1 block">{field}</label>
                  <input
                    type="text"
                    name={field}
                    value={editForm[field] || ''}
                    onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-sm rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TodayLeadsOfLG;
