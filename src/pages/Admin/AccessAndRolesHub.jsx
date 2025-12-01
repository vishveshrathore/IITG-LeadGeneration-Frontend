import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUsers } from "react-icons/fi";
import { FaSitemap } from "react-icons/fa";
import { MdWeb } from "react-icons/md";
import AdminNavbar from "../../components/AdminNavbar";

export default function AccessAndRolesHub() {
  const navigate = useNavigate();

  const tiles = [
    {
      title: "Access Control",
      desc: "Manage roles, access toggles, and quotas",
      icon: <FiUsers size={28} />,
      route: "/admin/lgAccessControl",
      color: "bg-indigo-50",
    },
    {
      title: "Hierarchy Management & leads Assignment ",
      desc: "Build reporting structure and approvals",
      icon: <FaSitemap size={28} />,
      route: "/admin/accountapproval",
      color: "bg-cyan-50",
    },
    {
      title: "Accounts Transfer ",
      desc: "Review & transfer accounts data",
      icon: <MdWeb size={28} />,
      route: "/admin/frontend-accounts",
      color: "bg-amber-50",
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <>
      <AdminNavbar onLogout={handleLogout} />
      <div className="pt-20 px-4">
        <h2 className="text-2xl font-semibold mb-2">Manage Access & Roles</h2>
        <p className="text-gray-600 mb-6">Choose what you want to manage.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 p-2 max-w-8xl">
          {tiles.map((t, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(t.route)}
              className={`cursor-pointer rounded-2xl shadow-md p-6 flex gap-4 items-center transition-all duration-300 ${t.color}`}
            >
              <div className="text-blue-700">{t.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{t.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
