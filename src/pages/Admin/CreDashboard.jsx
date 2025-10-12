import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUsers, FaFileAlt, FaChartLine, FaClipboardCheck, FaRegBell, FaPlusCircle, FaPhone, FaPhoneAlt } from 'react-icons/fa';
import AdminNavbar from '../../components/AdminNavbar';
import { MdManageAccounts } from 'react-icons/md';

const bentoCardStyle = `rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-2xl transition duration-300 ease-in-out cursor-pointer bg-white dark:bg-gray-800 hover:scale-[1.02]`;

const CreDashboard = () => {
  const navigate = useNavigate();

  const cards = [
     {
      title: 'Leads Approval For CRE ',
      description: 'View all leads awaiting approval in the CRE Mobile App.',
      icon: <FaUsers className="text-4xl text-green-500" />,
      onClick: () => navigate('/admin/CreDashboard'),
    },
    {
      title: 'Priority Leads Dashboard',
      description: 'Add a new candidate profile to the database.',
      icon: <FaPlusCircle className="text-4xl text-blue-500" />,
      onClick: () => navigate('/admin/PriorityAssignLeads'),
    },
    {
      title: 'Hierarchy Management and Access Control',
      description: 'Manage user roles, reporting structure, and lead access.',
      icon: <MdManageAccounts className="text-4xl text-blue-500" />,
      onClick: () => navigate('/admin/accountapproval'),
    },
    {
      title: 'CRE Leads Working Dashboard',
      description: 'Manage & view CRE leads working ',
      icon: <MdManageAccounts className="text-4xl text-blue-500" />,
      onClick: () => navigate('/admin/cre-called-data'),
    },
   
    
    
    // {
    //   title: 'Tasks',
    //   description: 'View and manage your assigned tasks.',
    //   icon: <FaClipboardCheck className="text-4xl text-purple-500" />,
    //   onClick: () => navigate('/cre/tasks'),
    // },
    // {
    //   title: 'Notifications',
    //   description: 'See all updates and alerts.',
    //   icon: <FaRegBell className="text-4xl text-red-500" />,
    //   onClick: () => navigate('/cre/notifications'),
    // },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
       < AdminNavbar />
      <h1 className="text-3xl font-bold mb-4 text-gray-700 my-13">
        CRE Dashboard for Lead Management and Analysis.
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto py-8">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            className={bentoCardStyle}
            onClick={card.onClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-4 mb-4">
              {card.icon}
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {card.title}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">{card.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CreDashboard;
