import React from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../components/AdminNavbar"; // Admin view
import RecruitmentQCNavbar from "../../../components/RecruitmentQCNavbar.jsx"; // Recruitment / QC Manager view
import { useAuth } from "../../../context/AuthContext"; // Assuming this handles user context
import { FaFileInvoice, FaWrench, FaServer, FaUserShield, FaFileUpload, FaFileCsv } from "react-icons/fa"; // Using more specific/professional icons
import { motion } from "framer-motion";

// --- Configuration for Dashboard Items ---
const DASHBOARD_TOOLS = [
  { 
    title: "Table 14", 
    description: "Automate extraction",
    path: "/naukri-parser", 
    icon: <FaFileCsv size={30} className="text-indigo-700" />,
    color: "bg-indigo-100",
  },
  { 
    title: "Table 12", 
    description: "Automate extraction",
    path: "/linkedin-parser", 
    icon: <FaFileCsv size={30} className="text-emerald-700" />,
    color: "bg-emerald-100",
  },
];

const ToolsDashboard = () => {
  // Destructuring for clarity, though 'user' is currently unused.
  const { user, role } = useAuth(); 
  const navigate = useNavigate();

  // Basic guard to prevent rendering before auth context loads, if needed.
  if (!user && process.env.NODE_ENV === 'production') {
      // Potentially redirect to a login/loading page here if auth is strictly required.
      // return <LoadingSpinner />; 
  }

  const rawRole = role || localStorage.getItem('role') || sessionStorage.getItem('role') || '';
  const roleNorm = rawRole.toLowerCase().replace(/[^a-z]/g, '');
  const isRecruitmentQC = roleNorm === 'recruitmentqcmanager';
  const Navbar = isRecruitmentQC ? RecruitmentQCNavbar : AdminNavbar;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <header className="mb-10 border-b pb-4 my-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight ">
            Tools
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Select a module to perform administrative tools and manage application utilities.
          </p>
        </header>

        {/* Dashboard Grid - Bento style (2 columns on small screens) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6">
          {DASHBOARD_TOOLS.map((item, index) => (
            <motion.div
              key={index}
              onClick={() => navigate(item.path)}
              role="button" // Improve accessibility (A11y)
              aria-label={`Go to ${item.title}`} // A11y
              tabIndex={0} // Make div focusable
              className={`cursor-pointer rounded-2xl shadow-md p-6 flex flex-col justify-center items-start transition-all duration-300 ${item.color || 'bg-gray-50'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="mb-4 text-blue-800">{item.icon}</div>
              <h2 className="text-lg font-semibold text-gray-800">
                {item.title}
              </h2>
              <p className="text-sm text-gray-500">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

      </main>
    </div>
  );
};

export default ToolsDashboard;