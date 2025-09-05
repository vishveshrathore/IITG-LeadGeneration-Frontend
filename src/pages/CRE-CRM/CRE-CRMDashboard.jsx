import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiPhoneCall } from 'react-icons/fi';
import { MdBusiness, MdAssignment } from 'react-icons/md';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import CRENavbar from '../../components/CreNavbar';
import Quotes from 'inspirational-quotes';

const CreCrmDashboard = () => {
  const navigate = useNavigate();
  const [isMobile] = useState(false);
  const [quote, setQuote] = useState({ text: '', author: '' });

  // Dummy counts (replace with API data if needed)
  const counts = {
    totalCalls: 120,
    todayCalls: 12,
    scheduledFollowups: 8,
    closedDeals: 5,
    missedCalls: 3,
  };

  const now = new Date();
  const serverHour = now.getHours();

  useEffect(() => {
    const randomQuote = Quotes.getQuote();
    setQuote(randomQuote);
  }, []);

  const getGreeting = () => {
    if (serverHour < 12) return 'Good Morning';
    if (serverHour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

const actionGrids = [
  {
    title: 'New Leads',
    description: 'Quickly log and manage your fresh leads',
    icon: <FiPhoneCall className="text-indigo-600 text-3xl" />, // smaller icon
    path: '/creassignedlead',
    glow: 'from-indigo-400 to-blue-500',
    tooltip: 'Add a brand-new lead call',
  },
  {
    title: 'Today Follow-ups',
    description: 'Track pending follow-up calls efficiently',
    icon: <MdAssignment className="text-green-600 text-3xl" />,
    path: '/cre/followups',
    glow: 'from-green-400 to-teal-500',
    tooltip: 'Review follow-up reminders',
  },
  {
    title: 'Positive leads',
    description: 'Monitor successfully closed deals',
    icon: <MdBusiness className="text-teal-600 text-3xl" />,
    path: '/cre/deals',
    glow: 'from-teal-400 to-cyan-500',
    tooltip: 'View all your successful deals',
  },
];

return (
  <div className="p-4"> {/* reduced padding */}
    <CRENavbar />

    {/* Greeting */}
    <div className="m-8 py-10 px-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold">{`${getGreeting()}, CRE!`}</h2>
      <p className="text-xs text-gray-500">{now.toLocaleTimeString()}</p>
    </div>

    {/* Motivational Quote */}
    <motion.div
      className="mt-2 p-4 rounded-lg bg-gradient-to-tr from-white to-indigo-100 shadow-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-sm italic text-gray-800 mb-1">“{quote.text}”</p>
      <p className="text-right text-xs text-gray-600">- {quote.author}</p>
    </motion.div>

    {/* Compact Action Grids */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {actionGrids.map((item, i) => (
        <motion.div
          key={i}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(item.path)}
          data-tooltip-id={`grid-${i}`}
          data-tooltip-content={item.tooltip}
          className="relative cursor-pointer overflow-hidden rounded-lg shadow-md transition hover:shadow-lg"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-tr ${item.glow} opacity-10 animate-pulse blur-xl`}
          />
          <div className="relative bg-white p-4 rounded-lg h-full flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">{item.icon}</div>
            <h4 className="text-md font-semibold text-gray-800">{item.title}</h4>
            <p className="text-xs text-gray-600 mt-1">{item.description}</p>
          </div>
          {!isMobile && <Tooltip id={`grid-${i}`} place="top" delayShow={300} />}
        </motion.div>
      ))}
    </div>
  </div>
);
};

export default CreCrmDashboard;