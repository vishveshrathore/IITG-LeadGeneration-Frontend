import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BsBuildings,
  BsPeople,
  BsTools,
  BsClipboardData,
  BsFileEarmarkText,
} from "react-icons/bs";
import AdminNavbar from "../../components/AdminNavbar";

// --- Constants for Styling & Data ---
const CARD_BASE_CLASSES =
  "cursor-pointer bg-white border border-gray-200 shadow-sm rounded-lg flex flex-col items-start p-6 transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:outline-none";

const DASHBOARD_ITEMS = [
  {
    title: "Business Development",
    description: "Manage client relations, proposals, and sales pipeline.",
    icon: <BsBuildings className="text-3xl text-blue-600" />,
    path: "/BD-Dashboard",
  },
  {
    title: "Recruitment & HR",
    description: "View job openings, applicants, and employee records.",
    icon: <BsPeople className="text-3xl text-green-600" />,
    path: "/admin/recruitment",
  },
  {
    title: "Tools & Resource Management",
    description: "Access internal tools and resource allocation.",
    icon: <BsTools className="text-3xl text-purple-600" />,
    path: "/tools/dashboard",
  },
  // {
  //   title: "Reports & Analytics",
  //   description: "Track KPIs and generate performance reports.",
  //   icon: <BsClipboardData className="text-3xl text-indigo-600" />,
  //   path: "/admin/reports",
  // },
  // {
  //   title: "Policies & Documents",
  //   description: "Manage internal policies and official documents.",
  //   icon: <BsFileEarmarkText className="text-3xl text-orange-600" />,
  //   path: "/admin/documents",
  // },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const gridItems = useMemo(() => DASHBOARD_ITEMS, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 my-10">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 ">
            Administrative Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select a module to manage company resources and operations.
          </p>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridItems.map((item, index) => (
            <motion.div
              key={index}
              role="button"
              aria-label={`Go to ${item.title} module`}
              tabIndex={0}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(item.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigate(item.path);
                }
              }}
              className={CARD_BASE_CLASSES}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <h2 className="text-lg font-medium text-gray-800">
                  {item.title}
                </h2>
              </div>
              <p className="mt-3 text-sm text-gray-600">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
