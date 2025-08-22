import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaFileExcel, FaUpload, FaPlus, FaList } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import { BASE_URL } from "../../config"; 

const ManageLeads = () => {
  const { authToken } = useAuth();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [responseSummary, setResponseSummary] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResponseSummary(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an Excel file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);

      const res = await axios.post(
        `${BASE_URL}/api/admin/leads/bulk`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const { inserted, duplicates, skipped } = res.data;

      setResponseSummary({ inserted, duplicates, skipped });

      toast.success(
        `✅ ${inserted} inserted, ⚠️ ${duplicates} duplicates, ❌ ${skipped} skipped`
      );

      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
    <AdminNavbar/>

    <motion.div
      className="max-w-5xl mx-auto px-4 py-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold mb-8 text-gray-800 my-23">Manage Leads</h1>

      {/* Bulk Upload Section */}
      <Link to="/admin/viewleads">
          <motion.div
            className="bg-white shadow rounded-xl p-6 hover:shadow-lg transition duration-300 cursor-pointer"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-blue-600">
              <FaList /> View All Leads
            </h2>
            <p className="text-sm text-gray-500">
              View and search all uploaded leads in the system.
            </p>
          </motion.div>
        </Link>

      {/* Navigational Cards */}
      <div className="grid md:grid-cols-2 gap-6 my-5">
        <Link to="/lg/addlead">
          <motion.div
            className="bg-white shadow rounded-xl p-6 hover:shadow-lg transition duration-300 cursor-pointer"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-green-600">
              <FaPlus /> Add Single Lead
            </h2>
            <p className="text-sm text-gray-500">
              Add leads one at a time with detailed information.
            </p>
          </motion.div>
        </Link>

        
      </div>

      <motion.div
        className="bg-white shadow rounded-xl p-6 mb-10 my-5"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-indigo-600">
          <FaFileExcel /> Bulk Excel Upload
        </h2>

        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="mb-4 block w-full file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <FaUpload />
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>

        {/* Summary Display */}
        {responseSummary && (
          <motion.div
            className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>✅ Inserted: <strong>{responseSummary.inserted}</strong></p>
            <p>⚠️ Duplicates: <strong>{responseSummary.duplicates}</strong></p>
            <p>❌ Skipped: <strong>{responseSummary.skipped}</strong></p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
    </div>
  );
};

export default ManageLeads;
