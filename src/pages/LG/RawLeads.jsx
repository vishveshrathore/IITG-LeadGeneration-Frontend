import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AnimatedLGNavbar from '../../components/LgNavBar';
import { motion } from 'framer-motion';

const API = 'https://iitg-lead-generation-r4hmq.ondigitalocean.app/api/lg/rawlead';
const INDUSTRY_API = 'https://iitg-lead-generation-r4hmq.ondigitalocean.app/api/lg/industry';

const RawLeads = () => {
  const { authToken } = useAuth();
  const [lead, setLead] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({});

  const fields = [
    'name', 'designation', 'companyName', 'location', 'email', 'mobile',
    'industryName', 'remarks', 'division', 'productLine', 'turnOver', 'employeeStrength',
  ];

  // Fetch one lead
  const fetchLead = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/one`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (data && data._id) {
        setLead(data);
        setFormData(flattenData(data));
        setMessage('');
        toast.success('🎯 New raw lead assigned');
      } else {
        setLead(null);
        setMessage(data.message || 'No leads available');
        toast('📭 No new leads to assign right now', { icon: '📭' });
      }
    } catch (err) {
      console.error('Error fetching lead:', err);
      setMessage('Failed to fetch lead.');
      toast.error('🚫 Unable to fetch lead. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch industries
  const fetchIndustries = async () => {
    try {
      const { data } = await axios.get(INDUSTRY_API, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setIndustries(data || []);
    } catch (err) {
      console.error('Error fetching industries:', err);
      toast.error('🚫 Failed to load industries');
    }
  };

  // Flatten nested data
  const flattenData = (data) => {
    const flattened = { ...data };

    if (data.company && typeof data.company === 'object') {
      flattened.companyName = data.company.CompanyName || '';
      flattened.company = data.company._id || '';
    }

    if (data.industry && typeof data.industry === 'object') {
      flattened.industryName = data.industry.name || '';
      flattened.industry = data.industry._id || '';
    }

    return flattened;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleComplete = async () => {
    if (!formData.name || !formData.mobile) {
      return toast.error('❗ Name and Mobile are required fields');
    }

    const cleanedPayload = {
      ...formData,
      mobile: Array.isArray(formData.mobile) ? formData.mobile[0] : formData.mobile,
      isComplete: true,
    };

    // Remove UI-only fields
    delete cleanedPayload.companyName;
    delete cleanedPayload.industryName;

    try {
      await axios.put(`${API}/${lead._id}`, cleanedPayload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      toast.success('✅ Lead marked as completed!');
      fetchLead();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to update lead.';
      toast.error(`🚫 ${msg}`);
    }
  };

  const handleNext = async () => {
    if (!lead?._id) return toast.error('❗ No lead to skip');

    const cleanedPayload = {
      ...formData,
      mobile: Array.isArray(formData.mobile) ? formData.mobile[0] : formData.mobile,
    };

    // Remove UI-only fields
    delete cleanedPayload.companyName;
    delete cleanedPayload.industryName;

    try {
      toast('⏭️ Skipping current lead...', { icon: '⏭️' });

      await axios.put(`${API}/skip/${lead._id}`, cleanedPayload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      toast.success('⏩ Lead skipped successfully!');
      fetchLead();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to skip lead.';
      toast.error(`🚫 ${msg}`);
    }
  };

  useEffect(() => {
    fetchLead();
    fetchIndustries();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white px-4 py-6">
      <Toaster position="top-center" />
      <AnimatedLGNavbar />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto mt-10 bg-white shadow-2xl rounded-3xl p-6 sm:p-10"
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          📋 Assigned Raw Lead
        </h2>

        {loading ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 text-center">
            🔄 Loading lead details...
          </motion.p>
        ) : message ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-600 font-semibold text-lg text-center">
            {message}
          </motion.p>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
              {fields.map((field) => (
                <motion.div key={field} whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {field.replace(/([A-Z])/g, ' $1')}
                  </label>

                  {field === 'industryName' ? (
                    <select
                      name="industry"
                      value={formData.industry || ''}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    >
                      <option value="">Select Industry</option>
                      {industries.map((ind) => (
                        <option key={ind._id} value={ind._id}>
                          {ind.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name={field}
                      value={formData[field] || ''}
                      onChange={handleInputChange}
                      disabled={field === 'companyName'}
                      className="w-full border border-gray-300 px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      placeholder={`Enter ${field}`}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
                className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition"
              >
                ⏭️ Skip & Next
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleComplete}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition"
              >
                ✅ Submit & Mark Completed
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default RawLeads;
