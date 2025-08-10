import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AnimatedLGNavbar from '../../components/LgNavBar';
import { FiUsers, FiCheckCircle } from 'react-icons/fi';
import { MdBusiness, MdAssignment } from 'react-icons/md';
import { Tooltip } from 'react-tooltip';
import { Howl } from 'howler';
import 'react-tooltip/dist/react-tooltip.css';

const clickSound = new Howl({
  src: ['/assets/click.mp3'],
  volume: 0.4,
});

const hoverSound = new Howl({
  src: ['/assets/hover.mp3'],
  volume: 0.2,
});

const LgDashboard = () => {
  const [userName, setUserName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [counts, setCounts] = useState({
    totalLeads: 0,
    todayLeads: 0,
    monthLeads: 0,
    weekLeads: 0,
  });

  const { authToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const nameFromStorage =
      localStorage.getItem('userName') || sessionStorage.getItem('userName');
    setUserName(nameFromStorage || 'Lead Generator');
    setIsMobile(window.innerWidth < 640);
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch(
          'https://iitg-lead-generation-r4hmq.ondigitalocean.app/api/lg/count',
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const data = await res.json();
        setCounts({
          totalLeads: data.totalLeads || 0,
          todayLeads: data.todayLeads || 0,
          monthLeads: data.monthLeads || 0,
          weekLeads: data.weekLeads || 0,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard counts:', err);
      }
    };
    if (authToken) fetchCounts();
  }, [authToken]);

  const bentoItems = [
    {
      title: 'Total Leads Till Date',
      count: counts.totalLeads,
      icon: <FiUsers className="text-blue-600 text-4xl" />,
      glow: 'from-blue-400 to-purple-500',
      tooltip: 'Leads you’ve added till now',
    },
    {
      title: 'Today’s Leads Generated',
      count: counts.todayLeads,
      icon: <FiCheckCircle className="text-green-600 text-4xl" />,
      glow: 'from-green-400 to-teal-500',
      tooltip: 'Tasks marked as complete',
    },
    {
      title: 'This Month',
      count: counts.monthLeads,
      icon: <FiUsers className="text-indigo-600 text-4xl" />,
      glow: 'from-indigo-400 to-cyan-500',
      tooltip: 'Clients who responded',
    },
    {
      title: 'This Week',
      count: counts.weekLeads,
      icon: <FiCheckCircle className="text-yellow-600 text-4xl" />,
      glow: 'from-yellow-400 to-orange-500',
      tooltip: 'Leads that need follow-up',
    },
  ];

  const actionGrids = [
    {
      title: 'Add Lead',
      description: 'Explore and find leads by your own',
      icon: <MdBusiness className="text-indigo-600 text-5xl" />,
      path: '/lg/dashboard',
      glow: 'from-indigo-400 to-blue-500',
      tooltip: 'Create a new lead entry',
    },
    {
      title: 'View Today’s Leads',
      description: 'View leads you generated today',
      icon: <MdAssignment className="text-green-600 text-5xl" />,
      path: '/lg/viewtodaysleads',
      glow: 'from-green-400 to-teal-500',
      tooltip: 'Check today’s progress',
    },
  ];

  return (
    <div>
      <AnimatedLGNavbar onLogout={() => setShowModal(true)} />
      <div className="pt-20 px-6">
        <h2 className="text-2xl font-semibold mb-6">Welcome, {userName}!</h2>

        {/* Action Grids */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actionGrids.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                clickSound.play();
                navigate(item.path);
              }}
              onMouseEnter={() => hoverSound.play()}
              data-tooltip-id={`grid-${i}`}
              data-tooltip-content={item.tooltip}
              className="relative cursor-pointer overflow-hidden rounded-xl shadow-lg transition"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-tr ${item.glow} opacity-10 animate-pulse blur-xl`}
              />
              <div className="relative bg-white p-6 rounded-xl h-full flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-4">
                  {item.icon}
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">
                      {item.title}
                    </h4>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              {!isMobile && (
                <Tooltip id={`grid-${i}`} place="top" delayShow={300} />
              )}
            </motion.div>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
          {bentoItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-xl shadow-md"
              data-tooltip-id={`tooltip-${i}`}
              data-tooltip-content={item.tooltip}
              onMouseEnter={() => hoverSound.play()}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-tr ${item.glow} opacity-10 animate-pulse blur-xl`}
              />
              <div className="relative bg-white p-6 rounded-xl flex items-center gap-4">
                {item.icon}
                <div>
                  <h4 className="text-sm text-gray-500">{item.title}</h4>
                  <p className="text-xl font-bold text-gray-800">
                    <CountUp end={item.count} duration={1.5} />
                  </p>
                </div>
              </div>
              {!isMobile && (
                <Tooltip id={`tooltip-${i}`} place="top" delayShow={300} />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Logout Modal Placeholder */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Add your logout modal content here */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LgDashboard;
