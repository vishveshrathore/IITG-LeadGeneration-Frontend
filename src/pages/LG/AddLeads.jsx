// Same imports as before
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import AnimatedLGNavbar from "../../components/LgNavBar";
import { useAuth } from "../../context/AuthContext.jsx";
import { FaCopy } from "react-icons/fa";
import { BASE_URL } from "../../config"; // if inside pages/LG
const initialFormData = {
  name: "",
  designation: "",
  mobile: [""],
  email: "",
  location: "",
  remarks: "",
  division: "",
  productLine: "",
  turnOver: "",
  employeeStrength: "",
  industryName: "",
  companyName: "",
};

const AddLeadScreen = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [industries, setIndustries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [hrLeads, setHrLeads] = useState([]);
  const [highlightedLeadId, setHighlightedLeadId] = useState(null);
  const { authToken } = useAuth();
  const token = localStorage.getItem("token");
  const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState([]);
const [loadingSearch, setLoadingSearch] = useState(false);
const [submitting, setSubmitting] = useState(false);

const handleSearchHR = async () => {
  if (!searchQuery.trim()) return;
  setLoadingSearch(true);
  try {
    const res = await axios.get(`${BASE_URL}/api/lg/search?name=${searchQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSearchResults(res.data.results || []);
  } catch {
    toast.error("❌ Failed to search HR");
  }
  setLoadingSearch(false);
};
  

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/lg/industry`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIndustries(res.data.industries || []);
      } catch {
        toast.error("❌ Failed to load industries");
      }
    };
    fetchIndustries();
  }, [token]);

  useEffect(() => {
    if (!formData.industryName) return;
    const selectedIndustry = industries.find(
      (ind) => ind.name === formData.industryName
    );
    if (!selectedIndustry) return;

    const fetchCompanies = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/lg/companies/byindustry/${selectedIndustry._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCompanies(res.data.companies || []);
      } catch {
        toast.error("❌ Failed to load companies");
      }
    };
    fetchCompanies();
  }, [formData.industryName, token, industries]);

  useEffect(() => {
    const selectedIndustry = industries.find(
      (ind) => ind.name === formData.industryName
    );
    const selectedCompany = companies.find(
      (comp) => comp.CompanyName === formData.companyName
    );

    if (selectedIndustry && selectedCompany) {
      fetchHRLeads(selectedIndustry._id, selectedCompany._id);
    }
  }, [formData.industryName, formData.companyName, industries, companies]);

  const fetchHRLeads = async (industryId, companyId) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/lg/gethr/idscom`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { industryId, companyId },
      });
      setHrLeads(res.data.hr || []);
    } catch {
      toast.error("❌ Failed to fetch HR leads");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMobileChange = (index, value) => {
    const updatedMobile = [...formData.mobile];
    updatedMobile[index] = value;
    setFormData((prev) => ({ ...prev, mobile: updatedMobile }));
  };

  const addMobileField = () => {
    setFormData((prev) => ({ ...prev, mobile: [...prev.mobile, ""] }));
  };

  const removeMobileField = (index) => {
    const updatedMobile = [...formData.mobile];
    updatedMobile.splice(index, 1);
    setFormData((prev) => ({ ...prev, mobile: updatedMobile }));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (submitting) return; // 🚀 Block duplicate clicks
  setSubmitting(true);

  if (!authToken) {
    toast.error("No token found. Please login again.");
    setSubmitting(false);
    return;
  }

  try {
    const selectedIndustry = industries.find(
      (ind) => ind.name === formData.industryName
    );
    const selectedCompany = companies.find(
      (comp) => comp.CompanyName === formData.companyName
    );

    if (!selectedIndustry || !selectedCompany) {
      toast.error("Invalid Industry or Company selection");
      setSubmitting(false);
      return;
    }

    const cleanedMobile = formData.mobile.map((m) => m.trim()).filter(Boolean);
    const payload = {
      ...formData,
      industryId: selectedIndustry._id,
      companyId: selectedCompany._id,
      mobile: cleanedMobile,
    };

    const res = await axios.post(`${BASE_URL}/api/lg/addhr`, payload, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    toast.success(res.data.message || "✅ HR Lead added successfully");
    setFormData(initialFormData);
    fetchHRLeads(payload.industryId, payload.companyId);
    setHighlightedLeadId(res.data.newLeadId || null);
  } catch (err) {
    if (err.response?.status === 409) {
      toast.error(err.response.data.message || "⚠️ HR Lead already exists");
    } else {
      toast.error(err.response?.data?.message || "❌ Something went wrong");
    }
  } finally {
    setSubmitting(false); // ✅ Unlock for next submission
  }
};
  

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 overflow-x-hidden my-8">
      <Toaster position="top-center" reverseOrder={false} />
      <AnimatedLGNavbar />
      <div className="pt-8 px-4 md:px-10 pb-16 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start my-8">
        {/* LEFT FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 md:p-10 rounded-2xl shadow-xl space-y-6 sticky top-24"
        >
          <h2 className="text-2xl font-bold text-blue-700 mb-2">
            Add New HR Lead
          </h2>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Industry</label>
              <input
                list="industry-list"
                name="industryName"
                value={formData.industryName}
                onChange={handleChange}
                placeholder="Search Industry"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <datalist id="industry-list">
                {industries.map((ind) => (
                  <option key={ind._id} value={ind.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-sm text-gray-600">Company</label>
              <input
                list="company-list"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Search Company"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <datalist id="company-list">
                {companies.map((comp) => (
                  <option key={comp._id} value={comp.CompanyName} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "division", placeholder: "Division" },
              { name: "productLine", placeholder: "Product Line" },
              { name: "employeeStrength", placeholder: "Employee Strength" },
              { name: "turnOver", placeholder: "Turnover" },
              { name: "name", placeholder: "Name", required: true },
              { name: "designation", placeholder: "Designation" },
              { name: "location", placeholder: "Location" },
              { name: "email", placeholder: "Email", type: "email" },
              { name: "remarks", placeholder: "Remarks" },
            ].map(({ name, placeholder, type = "text", required }) => (
              <input
                key={name}
                name={name}
                type={type}
                value={formData[name]}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            ))}
          </div>

          {/* Mobiles */}
          <div>
            <label className="block font-medium mb-2 text-gray-700">
              Mobile Numbers
            </label>
            {formData.mobile.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={m}
                  maxLength={10}
                  required
                  onChange={(e) => handleMobileChange(idx, e.target.value)}
                  placeholder="10-digit mobile"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {formData.mobile.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMobileField(idx)}
                    className="text-red-500 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addMobileField}
              className="text-sm text-blue-600"
            >
              + Add Another Mobile
            </button>
          </div>

          <button
  type="submit"
  disabled={submitting}
  className={`w-full py-3 rounded-lg transition-all duration-200 ${
    submitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white font-bold"
  }`}
>
  {submitting ? "Submitting..." : "Submit"}
</button>

        </form>

        {/* RIGHT DISPLAY */}
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl min-h-[400px] max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h3 className="text-xl font-semibold text-blue-700 flex items-center gap-2">
              👥 HR Leads
            </h3>
            <span className="text-sm text-gray-500">
              {hrLeads.length} found
            </span>
          </div>

          {hrLeads.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">
              No HR leads to display
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hrLeads.map((hr) => (
                <div
                  key={hr._id}
                  className={`relative p-5 rounded-2xl bg-gradient-to-tr from-white via-blue-50 to-blue-100 border border-gray-200 shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                    highlightedLeadId === hr._id ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  {/* Top Name and Designation */}
                  <div className="flex flex-col mb-3">
                    <p className="text-lg font-semibold text-blue-800">
                      {hr.name}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      🏷️ {hr.designation || "—"}
                    </p>
                  </div>

                  {/* Contact Info */}
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">📧 Email:</span>
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[130px]">
                          {hr.email || "—"}
                        </span>
                        <FaCopy
                          onClick={() => handleCopy(hr.email)}
                          title="Copy Email"
                          className="cursor-pointer text-blue-500 hover:text-blue-700 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">📞 Mobile:</span>
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[130px]">
                          {hr.mobile?.join(", ")}
                        </span>
                        <FaCopy
                          onClick={() => handleCopy(hr.mobile?.join(", "))}
                          title="Copy Mobile"
                          className="cursor-pointer text-blue-500 hover:text-blue-700 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">📍 Location:</span>
                      <span>{hr.location || "—"}</span>
                    </div>
                  </div>

                  {/* Additional Info Badges */}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {hr.division && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Division: {hr.division}
                      </span>
                    )}
                    {hr.productLine && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Product Line: {hr.productLine}
                      </span>
                    )}
                    {hr.turnOver && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        Turnover: {hr.turnOver}
                      </span>
                    )}
                    {hr.employeeStrength && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        Strength: {hr.employeeStrength}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* NEW GRID - Bento Style */}
          {/* NEW GRID - Bento Style (Dynamic Search) */}
<div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl min-h-[400px] max-h-[80vh] overflow-y-auto mt-8">
  <div className="flex justify-between items-center mb-6 border-b pb-3">
    <h3 className="text-xl font-semibold text-blue-700 flex items-center gap-2">
      🔍 Search HR by Name
    </h3>
    <span className="text-sm text-gray-500">{searchResults.length} items</span>
  </div>

  {/* Search bar */}
  <div className="flex gap-2 mb-6">
    <input
      type="text"
      placeholder="Enter HR name..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
    />
    <button
      onClick={handleSearchHR}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      Search
    </button>
  </div>

  {/* Results */}
  {loadingSearch ? (
    <p className="text-gray-500">Loading...</p>
  ) : searchResults.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {searchResults.map((item, idx) => (
        <div
          key={idx}
          className="p-5 rounded-2xl bg-gradient-to-tr from-white via-gray-50 to-blue-50 border border-gray-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all"
        >
          <p className="font-semibold text-blue-800">{item.name}</p>
          <p className="text-gray-600 text-sm mt-1">
            {item.company || "No Company"}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-gray-500">No results found</p>
  )}
</div>


        </div>
        
      </div>
    </div>
  );
};

export default AddLeadScreen;