import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import AnimatedLGNavbar from "../../components/LgNavBar";
import { motion } from "framer-motion";
import { BASE_URL } from "../../config";

const API = `${BASE_URL}/api/lg/rawlead`;

const RawLeads = () => {
  const { authToken } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({});
  const [industries, setIndustries] = useState([]);

  const fields = [
    "name",
    "designation",
    "companyName",
    "location",
    "email",
    "mobile",
    "industry",
    "remarks",
    "division",
    "productLine",
    "turnOver",
    "employeeStrength",
  ];

  // Flatten nested data (company, industry)
  const flattenData = (data) => {
    const flattened = { ...data };
    if (data.company && typeof data.company === "object") {
      flattened.companyName = data.company.CompanyName || "";
      flattened.company = data.company._id || "";
    }
    if (data.industry && typeof data.industry === "object") {
      flattened.industry = data.industry._id || "";
    }
    return flattened;
  };

  // Fetch industries from backend
  const fetchIndustries = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/industries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const dataArray = res.data?.industries || [];
      setIndustries(dataArray);
    } catch (err) {
      console.error("Error fetching industries:", err);
      toast.error("🚫 Failed to load industries");
      setIndustries([]);
    }
  };

  // Fetch new lead
  const fetchLead = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/one`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (data && data._id) {
        setLead(data);
        setFormData(flattenData(data));
        setMessage("");
        localStorage.setItem("currentLead", JSON.stringify(data));
        toast.success("🎯 New raw lead assigned");
      } else {
        setLead(null);
        setMessage(data.message || "No leads available");
        localStorage.removeItem("currentLead");
        toast("📭 No new leads to assign right now", { icon: "📭" });
      }
    } catch (err) {
      console.error("Error fetching lead:", err);
      setMessage("Failed to fetch lead.");
      toast.error("🚫 Unable to fetch lead. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Clean payload to avoid BSON errors
  const getCleanPayload = (payload, isComplete = false) => {
    const cleaned = { ...payload };
    cleaned.mobile = Array.isArray(cleaned.mobile)
      ? cleaned.mobile
      : [cleaned.mobile];
    if (isComplete) cleaned.isComplete = true;

    // Remove empty ObjectId fields
    if (!cleaned.company) delete cleaned.company;
    if (!cleaned.industry) delete cleaned.industry;

    // Remove extra fields
    delete cleaned.companyName;

    return cleaned;
  };

  // Submit lead
  const handleComplete = async () => {
    if (!formData.name || !formData.mobile) {
      return toast.error("❗ Name and Mobile are required fields");
    }

    try {
      await axios.put(`${API}/${lead._id}`, getCleanPayload(formData, true), {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      toast.success("✅ Lead marked as completed!");
      localStorage.removeItem("currentLead");
      fetchLead();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update lead.";
      toast.error(`🚫 ${msg}`);
    }
  };

  // Skip lead
  const handleNext = async () => {
    if (!lead?._id) return toast.error("❗ No lead to skip");

    try {
      await axios.put(
        `${API}/skip/${lead._id}`,
        getCleanPayload(formData),
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success("⏩ Lead skipped successfully!");
      localStorage.removeItem("currentLead");
      fetchLead();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to skip lead.";
      toast.error(`🚫 ${msg}`);
    }
  };

  // Load lead and industries on mount
  useEffect(() => {
    fetchIndustries();

    const stored = localStorage.getItem("currentLead");
    if (stored) {
      const parsed = JSON.parse(stored);
      setLead(parsed);
      setFormData(flattenData(parsed));
      setMessage("");
      setLoading(false);
    } else {
      fetchLead();
    }
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
{/* Progress Bar */}
<div className="mb-6">
  <div className="w-full bg-gray-200 h-2 rounded-full">
    <div
      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
      style={{
        width: `${Math.round(
          (fields.filter(f => formData[f] && formData[f] !== "").length /
            fields.length) *
            100
        )}%`
      }}
    ></div>
  </div>
  <p className="text-sm text-gray-600 mt-1 text-right">
    {Math.round(
      (fields.filter(f => formData[f] && formData[f] !== "").length /
        fields.length) *
        100
    )}
    % Completed
  </p>
</div>

        {loading ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-500 text-center"
          >
            🔄 Loading lead details...
          </motion.p>
        ) : message ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 font-semibold text-lg text-center"
          >
            {message}
          </motion.p>
          
        ) : (
          
          <>
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8"
            >
              {fields.map((field) => {
  const isRequired = field !== "email" && field !== "division" && field !== "remarks";


  return (
    
    <motion.div
      key={field}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      


      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
        {field.replace(/([A-Z])/g, " $1")}{" "}
        {isRequired && <span className="text-red-500">*</span>}
      </label>

      {field === "industry" ? (
        <select
          name="industry"
          value={formData.industry || ""}
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
          value={formData[field] || ""}
          onChange={handleInputChange}
          disabled={field === "companyName"}
          className="w-full border border-gray-300 px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          placeholder={`Enter ${field}`}
        />
      )}
    </motion.div>
  );
})}
            </motion.div>

            <div className="flex flex-col gap-4 items-stretch">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition"
              >
                ✅ Submit Lead
              </motion.button>
                <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-xl px-4 py-3 shadow-md"
              >
                <span className="text-green-600 text-xl">✅</span>
                <p className="text-sm text-green-800 leading-snug">
                  <strong>All fields are mandatory.</strong> So click
                  <span className="font-semibold text-green-900"> Submit</span>{" "}
                  when all the fields are properly filled.
                </p>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition"
              >
                ⏭️ Skip & Next
              </motion.button>
               <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-xl px-4 py-3 shadow-md"
              >
                <span className="text-yellow-600 text-xl">⚠️</span>
                <p className="text-sm text-yellow-800 leading-snug">
                  <strong>All fields are mandatory.</strong> If you can’t get
                  proper information about the lead, click
                  <span className="font-semibold text-yellow-900"> Skip</span>{" "}
                  to get the next lead.
                </p>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default RawLeads;
