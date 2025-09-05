import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlusCircle, FaEye } from 'react-icons/fa';

const bentoCardStyle = `rounded-2xl p-6 shadow-lg border border-gray-200 transition duration-300 ease-in-out bg-white dark:bg-gray-800`;

const DashboardAddLeads = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Raw Leads",
      description: 'See all leads you added today for quick reference.',
      icon: <FaEye className="text-4xl text-green-500" />,
      onClick: () => navigate('/lg/rawlead'),
      disabled: false,
    },
    {
      title: 'My Lead',
      description: 'Enter fresh HR lead details and assign them.',
      icon: <FaPlusCircle className="text-4xl text-blue-500" />,
      onClick: () => navigate('/lg/addlead'),
      disabled: true, // 🔹 Disable this card
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h2 className="text-3xl font-semibold text-gray-800 dark:text-white mb-8">
        Manage Leads
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            className={`${bentoCardStyle} ${
              card.disabled
                ? "opacity-50 cursor-not-allowed"
                : "shadow-lg hover:shadow-2xl cursor-pointer hover:scale-[1.02]"
            }`}
            onClick={!card.disabled ? card.onClick : undefined}
            whileHover={!card.disabled ? { scale: 1.03 } : {}}
            whileTap={!card.disabled ? { scale: 0.98 } : {}}
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
            <p className="text-gray-600 dark:text-gray-300">
              {card.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardAddLeads;
