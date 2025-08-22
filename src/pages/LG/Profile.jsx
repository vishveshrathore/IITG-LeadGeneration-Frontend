import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ClipLoader } from "react-spinners";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { FiUser, FiBriefcase, FiMapPin, FiUpload } from "react-icons/fi";
import AnimatedLGNavbar from '../../components/LgNavBar';
import { BASE_URL } from "../../config";  

const Profile = () => {
  const { authToken: token } = useAuth();
  const [formData, setFormData] = useState({
    mobile: "", officeSim: "", address: "", dob: "", gender: "", designation: "", aadhar: "", experience: "",
  });
  const [previousCompanies, setPreviousCompanies] = useState([]);
  const [profilePic, setProfilePic] = useState(null);
  const [previewPic, setPreviewPic] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", email: "", role: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${BASE_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          const data = res.data;
          setFormData({
            mobile: data.mobile || "",
            officeSim: data.officeSim || "",
            address: data.address || "",
            dob: data.dob ? data.dob.slice(0, 10) : "",
            gender: data.gender || "",
            designation: data.designation || "",
            aadhar: data.aadhar || "",
            experience: data.experience || "",
          });
          setPreviousCompanies(data.previousCompanies || []);
          setPreviewPic(data.profilePic || null);
          setUserInfo({
            name: data.user?.name || "",
            email: data.user?.email || "",
            role: data.user?.role || "",
          });
          setIsEditing(true);
        }
      } catch (err) { console.log("No profile found."); }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e) => { const { name, value } = e.target; setFormData({ ...formData, [name]: value }); };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setProfilePic(file);
    if (file) { const reader = new FileReader(); reader.onload = () => setPreviewPic(reader.result); reader.readAsDataURL(file); }
  };
  const addCompany = () => setPreviousCompanies([...previousCompanies, { company: "", designation: "", years: "" }]);
  const removeCompany = (i) => setPreviousCompanies(previousCompanies.filter((_, idx) => idx !== i));
  const handleCompanyChange = (i, field, value) => { const updated = [...previousCompanies]; updated[i][field] = value; setPreviousCompanies(updated); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("You must be logged in!");
    if (!formData.gender) return toast.error("Please select a gender");

    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach(k => data.append(k, formData[k]));
    data.append("previousCompanies", JSON.stringify(previousCompanies));
    if (profilePic) data.append("Image", profilePic);

    try {
      const url = isEditing ? `${BASE_URL}/api/update` : `${BASE_URL}/api/create`;
      const method = isEditing ? "put" : "post";
      const res = await axios({ method, url, data, headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` } });
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.error || "Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto p-6 bg-gray-50 rounded-xl shadow-lg mt-10">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 my-2">Professional Profile</h1>
        <p className="text-gray-500 text-sm">Manage your personal & professional information</p>
      </div>

      <AnimatedLGNavbar />

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 mt-6">

        {/* Left Panel */}
        <motion.div whileHover={{ scale: 1.02 }} className="flex flex-col gap-4 w-full md:w-1/3 bg-white p-4 rounded-xl shadow-lg">
          <div className="flex flex-col items-center">
            {previewPic ? (
              <motion.img src={previewPic} alt="Profile" className="w-45 h-45 rounded-full object-cover border-2 border-blue-400" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }} />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">No Photo</div>
            )}
            <label className="flex flex-col items-center cursor-pointer text-blue-500 hover:text-blue-600 mt-2">
              <FiUpload size={18} /> Upload
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
          <div className="space-y-2 text-gray-600">
            <div><span className="font-medium">Name:</span> {userInfo.name}</div>
            <div><span className="font-medium">Email:</span> {userInfo.email}</div>
            <div><span className="font-medium">Role:</span> {userInfo.role}</div>
          </div>
        </motion.div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Personal Info */}
          <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-white shadow-lg rounded-xl space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-600"><FiUser /> Personal Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile" className="p-2 border rounded-lg" />
              <input type="text" name="officeSim" value={formData.officeSim} onChange={handleChange} placeholder="Office SIM" className="p-2 border rounded-lg" />
              <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="p-2 border rounded-lg md:col-span-2" />
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="p-2 border rounded-lg" />
              <select name="gender" value={formData.gender} onChange={handleChange} className="p-2 border rounded-lg">
                <option value="">Select Gender</option>
                <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
              </select>
            </div>
          </motion.div>

          {/* Professional Info */}
          <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-white shadow-lg rounded-xl space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-green-600"><FiBriefcase /> Professional Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input type="text" name="designation" value={formData.designation} onChange={handleChange} placeholder="Designation" className="p-2 border rounded-lg" />
              <input type="text" name="aadhar" value={formData.aadhar} onChange={handleChange} placeholder="Aadhar Number" className="p-2 border rounded-lg" />
              <input type="number" name="experience" value={formData.experience} onChange={handleChange} placeholder="Experience (Years)" className="p-2 border rounded-lg" />
            </div>
          </motion.div>

          {/* Previous Companies */}
          <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-white shadow-lg rounded-xl space-y-3 max-h-64 overflow-auto">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-purple-600"><FiMapPin /> Previous Companies</h2>
            <div className="space-y-2">
              {previousCompanies.map((comp, i) => (
                <div key={i} className="flex gap-2 flex-wrap items-center">
                  <input type="text" placeholder="Company" value={comp.company} onChange={(e) => handleCompanyChange(i, "company", e.target.value)} className="flex-1 p-2 border rounded-lg" />
                  <input type="text" placeholder="Designation" value={comp.designation} onChange={(e) => handleCompanyChange(i, "designation", e.target.value)} className="flex-1 p-2 border rounded-lg" />
                  <input type="number" placeholder="Years" value={comp.years} onChange={(e) => handleCompanyChange(i, "years", e.target.value)} className="w-24 p-2 border rounded-lg" />
                  <button type="button" onClick={() => removeCompany(i)} className="text-red-500 font-bold text-xl">×</button>
                </div>
              ))}
              <button type="button" onClick={addCompany} className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition">Add Company</button>
            </div>
          </motion.div>

          {/* Submit */}
          <button type="submit" disabled={loading} className={`w-full flex justify-center items-center bg-gradient-to-r from-blue-500 to-teal-400 text-white p-3 rounded-lg hover:from-blue-600 hover:to-teal-500 transition ${loading ? "opacity-70 cursor-not-allowed" : ""}`}>
            {loading ? <ClipLoader size={20} color="#fff" /> : isEditing ? "Update Profile" : "Create Profile"}
          </button>

        </div>
      </form>
      <Toaster position="top-right" />
    </motion.div>
  );
};

export default Profile;
