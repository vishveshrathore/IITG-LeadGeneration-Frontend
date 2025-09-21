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
import { BASE_URL } from "../../config";   // if inside pages/LG
import Quotes from "inspirational-quotes";


const clickSound = new Howl({
  src: ['/assets/click.mp3'],
  volume: 0.4,
});

const hoverSound = new Howl({
  src: ['/assets/hover.mp3'],
  volume: 0.2,
});

const LgDashboard = () => {
  const [serverHour, setServerHour] = useState(null);
  const [quote, setQuote] = useState({ text: "", author: "" });

  const [userName, setUserName] = useState('');
  const [timeString, setTimeString] = useState(() => new Date().toLocaleTimeString());
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [infoModal, setInfoModal] = useState(false);       //Raw Lead Count
  const [counts, setCounts] = useState({
  totalLeads: 0,
  todayLeads: 0,
  monthLeads: 0,
  weekLeads: 0,
  skippedTotal: 0,
  skippedToday: 0,
  submittedTotal: 0,
  submittedToday: 0,
});


  const { authToken, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setUserName((user && user.name) ? user.name : 'Lead Generator');
    setIsMobile(window.innerWidth < 640);
  }, [user]);

  // Live clock updater (local device time)
  useEffect(() => {
    const t = setInterval(() => setTimeString(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
  const fetchCounts = async () => {
    try {
      // Existing count fetch
      const res = await fetch(
        `${BASE_URL}/api/lg/count`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = await res.json();

      // New rawcount fetch
      const rawRes = await fetch(
        `${BASE_URL}/api/lg/rawcount`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const rawData = await rawRes.json();

  

      setCounts({
        totalLeads: data.totalLeads || 0,
        todayLeads: data.todayLeads || 0,
        monthLeads: data.monthLeads || 0,
        weekLeads: data.weekLeads || 0,
        skippedTotal: rawData.skippedTotal || 0,
        skippedToday: rawData.skippedToday || 0,
        submittedTotal: rawData.submittedTotal || 0,
        submittedToday: rawData.submittedToday || 0,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard counts:', err);
    }
  };

  if (authToken) fetchCounts();
}, [authToken]);

useEffect(() => {
  const fetchServerTime = async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/server-time`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = await res.json();
      console.log("Server Time Response:", data);

      // Convert timestamp → Date → Hour
      const serverDate = new Date(data.timestamp);
      const hour = serverDate.getHours();

      console.log("Parsed Server Hour:", hour); // 👈 see actual hour in console
      setServerHour(hour);
    } catch (err) {
      console.error("Failed to fetch server time", err);
    }
  };

  if (authToken) {
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 60000);
    return () => clearInterval(interval);
  }
}, [authToken]);

useEffect(() => {
  setQuote(Quotes.getQuote()); // initial quote
  const interval = setInterval(() => {
    setQuote(Quotes.getQuote());
  }, 15000); // refresh every 15s

  return () => clearInterval(interval);
}, []);


 const bentoItems = [
  {
    title: 'Submitted RawLeads Today',
    count: counts.submittedToday,
    icon: <MdBusiness className="text-teal-600 text-4xl" />,
    glow: 'from-teal-400 to-cyan-500',
    tooltip: 'Leads submitted today',
    locked: serverHour !== null ? serverHour < 18 : true, 
  },

  // {
  //   title: 'Skipped Raw Leads Today',
  //   count: counts.skippedToday,
  //   icon: <MdAssignment className="text-orange-600 text-4xl" />,
  //   glow: 'from-orange-400 to-yellow-500',
  //   tooltip: 'Leads skipped today',
  // },
  // {
  //   title: 'Total Skipped Raw Leads',
  //   count: counts.skippedTotal,
  //   icon: <MdAssignment className="text-red-600 text-4xl" />,
  //   glow: 'from-red-400 to-pink-500',
  //   tooltip: 'Leads skipped in total',
  // },
  {
    title: 'Cumulative Leads Generated Personally',
    count: counts.totalLeads,
    icon: <FiUsers className="text-blue-600 text-4xl" />,
    glow: 'from-blue-400 to-purple-500',
    tooltip: 'Leads you’ve added till now',
  },
  {
    title: 'Today’s Leads Generated Personally',
    count: counts.todayLeads,
    icon: <FiCheckCircle className="text-green-600 text-4xl" />,
    glow: 'from-green-400 to-teal-500',
    tooltip: 'Tasks marked as complete',
  },
  {
    title: 'Cumulative Leads Generated by me This Month',
    count: counts.monthLeads,
    icon: <FiUsers className="text-indigo-600 text-4xl" />,
    glow: 'from-indigo-400 to-cyan-500',
    tooltip: 'Clients who responded',
  },
  // {
  //   title: 'This Week',
  //   count: counts.weekLeads,
  //   icon: <FiCheckCircle className="text-yellow-600 text-4xl" />,
  //   glow: 'from-yellow-400 to-orange-500',
  //   tooltip: 'Leads that need follow-up',
  // },
  
  // {
  //   title: 'Total Submitted Leads',
  //   count: counts.submittedTotal,
  //   icon: <MdBusiness className="text-green-700 text-4xl" />,
  //   glow: 'from-green-500 to-lime-500',
  //   tooltip: 'Total leads you have submitted',
  // },

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

  const now = new Date();
const hour = now.getHours();

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900`}>
      {/* Top Navigation */}
      <AnimatedLGNavbar onLogout={() => setShowModal(true)} />

      {/* Animated background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-500/30 to-cyan-400/30 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/20 to-rose-400/20 blur-3xl animate-pulse" />
      </div>

      <div className="pt-20 px-6 w-full">

        {/* Hero Header Banner */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-8 md:p-10 shadow-lg border bg-gradient-to-tr from-indigo-500/10 via-cyan-400/10 to-transparent border-slate-200"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                {`Good ${hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'}, ${userName} !`}
              </h1>
              <p className="mt-2 text-sm text-slate-600">Stay focused. Great leads start with great consistency.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
                  Local time: {timeString}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
                  Server window: Submitted RawLeads unlock at 6 PM
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onMouseEnter={() => hoverSound.play()}
                onClick={() => navigate('/lg/viewtodaysleads')}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm shadow-md hover:bg-indigo-500 transition"
              >
                View Today’s Leads
              </button>
              <button
                onMouseEnter={() => hoverSound.play()}
                onClick={() => navigate('/lg/dashboard')}
                className="px-4 py-2 rounded-lg bg-white text-slate-800 border border-slate-200 text-sm shadow-sm hover:bg-slate-50 transition"
              >
                Add Lead
              </button>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="pointer-events-none absolute -top-20 -right-14 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-400/30 to-cyan-400/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-fuchsia-400/20 to-rose-400/20 blur-3xl" />
        </motion.div>

        {/* Motivational Quote */}
<motion.div
  className={`mt-8 p-6 rounded-xl shadow-md border bg-gradient-to-tr from-white to-indigo-50 border-slate-200`}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
  <p className={`text-lg italic mb-2 text-gray-800`}>
    “{quote.text}”
  </p>
  <p className={`text-right text-sm text-gray-600`}>- {quote.author}</p>
</motion.div>


        {/* Action Grids */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actionGrids.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02, y: -2, boxShadow: '0 18px 28px -18px rgba(0,0,0,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                clickSound.play();
                navigate(item.path);
              }}
              onMouseEnter={() => hoverSound.play()}
              data-tooltip-id={`grid-${i}`}
              data-tooltip-content={item.tooltip}
              className={`relative cursor-pointer overflow-hidden rounded-xl shadow-lg transition bg-white`}
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
              {!isMobile && (
                <Tooltip id={`grid-${i}`} place="top" delayShow={300} />
              )}
            </motion.div>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
          {bentoItems.map((item, i) => (
  <motion.div
    key={i}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05 }}
    whileHover={{ y: -3, scale: 1.01, boxShadow: '0 18px 28px -18px rgba(0,0,0,0.25)' }}
    className={`relative overflow-hidden rounded-xl shadow-md cursor-pointer bg-white`}
    data-tooltip-id={`tooltip-${i}`}
    data-tooltip-content={item.tooltip}
    onMouseEnter={() => hoverSound.play()}
    onClick={() => {
      if (item.locked) {
        setInfoModal(true);
      } else {
        clickSound.play();
      }
    }}
  >
    <div
      className={`absolute inset-0 bg-gradient-to-tr ${item.glow} opacity-10 animate-pulse blur-xl`}
    />
    <div className={`relative p-6 rounded-xl flex items-center gap-4 bg-white`}>
      {item.icon}
      <div>
        <h4 className={`text-sm text-gray-500`}>{item.title}</h4>
        <p className={`text-xl font-bold text-gray-800`}>
  {item.locked ? (
    <span className="text-gray-400 text-sm">Locked until 6 PM</span>
  ) : (
    <CountUp end={item.count} duration={1.5} />
  )}
</p>


      </div>
    </div>
    {!isMobile && (
      <Tooltip id={`tooltip-${i}`} place="top" delayShow={300} />
    )}
  </motion.div>
))}

        </div>

        {/* Performance section removed as requested */}

        {/* Quick Actions */}
        <div className="mb-14">
          <h3 className="text-base font-semibold mb-3">Quick actions</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Add New Lead', action: () => navigate('/lg/dashboard') },
              { label: 'Today’s Leads', action: () => navigate('/lg/viewtodaysleads') },
              { label: 'Refresh Stats', action: () => window.location.reload() },
            ].map((qa, i) => (
              <button
                key={i}
                onMouseEnter={() => hoverSound.play()}
                onClick={() => {
                  clickSound.play();
                  qa.action();
                }}
                className={`text-sm px-4 py-2 rounded-lg border shadow-sm transition bg-white border-slate-200 hover:bg-slate-50`}
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logout Modal Placeholder */}
      <AnimatePresence>
  {infoModal && (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white p-6 rounded-xl shadow-lg w-80 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <h2 className="text-lg font-bold mb-4">Locked</h2>
        <p className="text-gray-600 mb-6">
          The Submitted RawLeads count will be available at <b>6:00 PM</b>.
        </p>
        <button
          onClick={() => setInfoModal(false)}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
        >
          Okay
        </button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

    </div>
  );
};

export default LgDashboard;
