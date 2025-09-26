import React from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../../components/AdminNavbar"; // Assuming this is a standard component
import { useAuth } from "../../../context/AuthContext"; // Assuming this handles user context
import { FaFileInvoice, FaWrench, FaServer, FaUserShield, FaFileUpload, FaFileCsv } from "react-icons/fa"; // Using more specific/professional icons
import { motion } from "framer-motion";

// --- Configuration for Dashboard Items ---
const DASHBOARD_TOOLS = [
  { 
    title: "Naukri Parser", 
    description: "Automate extraction from Naukri",
    path: "/naukri-parser", 
    icon: <FaFileCsv size={36} className="text-indigo-600" /> 
  },
  { 
    title: "LinkedIn Parser ", 
    description: "Access core application tools and run system health checks.",
    path: "/tools", 
    icon: <FaFileCsv size={36} className="text-green-600" /> 
  },
];

const ToolsDashboard = () => {
  // Destructuring for clarity, though 'user' is currently unused.
  const { user } = useAuth(); 
  const navigate = useNavigate();

  // Basic guard to prevent rendering before auth context loads, if needed.
  if (!user && process.env.NODE_ENV === 'production') {
      // Potentially redirect to a login/loading page here if auth is strictly required.
      // return <LoadingSpinner />; 
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* AdminNavbar is assumed to be a professional, fixed header */}
      <AdminNavbar />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <header className="mb-10 border-b pb-4 my-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight ">
            Tool Panel
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Select a module to perform administrative tools and manage application utilities.
          </p>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {DASHBOARD_TOOLS.map((item, index) => (
            <motion.div
              key={index}
              onClick={() => navigate(item.path)}
              role="button" // Improve accessibility (A11y)
              aria-label={`Go to ${item.title}`} // A11y
              tabIndex={0} // Make div focusable
              className="group bg-white rounded-xl border border-gray-200 shadow-lg p-6 flex flex-col items-start text-left cursor-pointer transition duration-300 ease-in-out hover:shadow-2xl hover:border-indigo-400"
              whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.08)" }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="mb-4 p-3 bg-gray-100 rounded-full transition-colors group-hover:bg-indigo-50">
                {item.icon}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-700 transition-colors">
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