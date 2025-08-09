import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BsBuildings } from 'react-icons/bs';
import { MdBusinessCenter } from 'react-icons/md';
import { BsPersonLinesFill } from 'react-icons/bs';
import { FaDatabase } from 'react-icons/fa';
import AdminNavbar from '../../components/AdminNavbar';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); // Or any logout logic
    window.location.href = '/login';
  };

  const bentoItems = [
    {
      title: 'Manage Leads',
      icon: <BsPersonLinesFill size={30} />,
      route: '/admin/leads',
      color: 'bg-yellow-100',
    },
    {
      title: 'Raw Leads',
      icon: <FaDatabase size={30} />,
      route: '/admin/rawleads',
      color: 'bg-purple-100',
    },
    {
      title: 'Manage Industries',
      icon: <BsBuildings size={30} />,
      route: '/admin/industries',
      color: 'bg-blue-100',
    },
    {
      title: 'Manage Companies',
      icon: <MdBusinessCenter size={30} />,
      route: '/admin/companies',
      color: 'bg-green-100',
    },
    
  ];

  return (
    <>
      <AdminNavbar onLogout={handleLogout} />
      <div className="pt-20 px-4">
        <h2 className="text-2xl font-semibold mb-6">Welcome, Admin!</h2>

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
                Click to manage {item.title.toLowerCase()}.
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
