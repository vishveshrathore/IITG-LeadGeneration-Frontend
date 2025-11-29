import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUsers, FaChartBar } from 'react-icons/fa';
import AdminNavbar from '../../components/AdminNavbar';

const RawLeadsDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const bentoItems = [
    {
      title: 'Upload & Approve Raw Leads',
      icon: <FaChartBar size={30} />,
      route: '/admin/temprawleadsDashboard',
      color: 'bg-indigo-100',
    },
    {
      title: 'View All Raw Leads',
      icon: <FaUsers size={30} />,
      route: '/admin/view/rawleads',
      color: 'bg-pink-100',
    },
    {
      title: 'LG Stats',
      icon: <FaChartBar size={30} />,
      route: '/admin/lg-stats',
      color: 'bg-emerald-100',
    },
  ];

  return (
    <>
      <AdminNavbar onLogout={handleLogout} />
      <div className="pt-20 px-4">
        <h2 className="text-2xl font-semibold mb-6">Raw Leads Panel</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6">
          {bentoItems.map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(item.route)}
              className={`cursor-pointer rounded-2xl shadow-md p-6 flex flex-col justify-center items-start transition-all duration-300 ${item.color}`}
            >
              <div className="mb-4 text-blue-800">{item.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Click to access {item.title.toLowerCase()}.
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default RawLeadsDashboard;
