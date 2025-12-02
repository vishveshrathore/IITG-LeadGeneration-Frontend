import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlusCircle, FaEye, FaUsers, FaCheckCircle, FaBriefcase, FaChartLine, FaFolderPlus, FaGalacticSenate } from 'react-icons/fa';
import LgNavBar from '../../components/LgNavBar';

const bentoCardStyle = `rounded-2xl p-6 shadow-lg border border-gray-200 transition duration-300 ease-in-out bg-white dark:bg-gray-800`;

const DashboardAddLeads = () => {
  const navigate = useNavigate();

  const actionGrids = [
    {
      title: 'Raw Leads',
      description: 'See all leads you added today for quick reference.',
      icon: <FaEye className="text-4xl text-green-500" />,
      path: '/lg/rawlead',
      glow: 'from-green-400 to-teal-500',
      tooltip: 'View today’s raw leads',
    },
    {
      title: 'My Lead',
      description: 'Enter fresh HR lead details and assign them.',
      icon: <FaPlusCircle className="text-4xl text-blue-500" />,
      path: '/lg/addlead',
      glow: 'from-blue-400 to-indigo-500',
      tooltip: 'Create a new lead entry',
    },
    {
      title: 'My Leads Using Companies',
      description: 'Enter fresh HR lead details and assign them.',
      icon: <FaGalacticSenate className="text-4xl text-blue-500" />,
      path: '/lg/myleads-new',
      glow: 'from-indigo-400 to-purple-500',
      tooltip: 'Create a new lead entry (company-first)',
    },
  ];

  return (
    <div className="min-h-screen bg-white p-6">
      <LgNavBar />
      <h2 className="text-3xl font-bold text-black mb-8 pt-15">
        Manage Leads
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {actionGrids.map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02, y: -2, boxShadow: '0 18px 28px -18px rgba(0,0,0,0.25)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(item.path)}
            data-tooltip-id={`grid-${i}`}
            data-tooltip-content={item.tooltip}
            className={`relative cursor-pointer overflow-hidden rounded-xl shadow-md border border-gray-200 transition-all duration-300 bg-white hover:shadow-xl`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-tr ${item.glow} opacity-10 animate-pulse blur-xl`}
            />
            <div className={`relative p-6 rounded-xl h-full flex flex-col justify-between bg-white`}>
              <div className="flex items-center gap-4 mb-4">
                {item.icon}
                <div>
                  <h4 className={`text-lg font-bold text-gray-800`}>
                    {item.title}
                  </h4>
                </div>
              </div>
              <p className={`text-sm text-gray-600`}>{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardAddLeads;
