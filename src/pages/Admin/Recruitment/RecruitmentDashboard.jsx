import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BsPersonCheck, BsPeople, BsBriefcaseFill, BsBuildingCheck, BsClipboardData, BsBuildingExclamation } from 'react-icons/bs';
import AdminNavbar from '../../../components/AdminNavbar';

const RecruitmentDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const recruitmentItems = [
    {
      title: 'Position MIS',
      icon: <BsBriefcaseFill size={20} />,
      route: '/admin/recruitment/position-mis',
      color: 'bg-pink-100',
    },
    {
      title: 'Local Hiring',
      icon: <BsPeople size={20} />,
      route: '/admin/recruitment/local-hiring',
      color: 'bg-green-100',
    },
    // {
    //   title: 'Create Team',
    //   icon: <BsBuildingCheck size={20} />,
    //   route: '/admin/recruitment/position-assignment',
    //   color: 'bg-blue-100',
    // },
    
  ];

  return (
    <>
      <AdminNavbar onLogout={handleLogout} />
      <div className="pt-20 px-4">
        <h2 className="text-2xl font-semibold mb-6">Recruitment Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6">
          {recruitmentItems.map((item, index) => (
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

export default RecruitmentDashboard;
