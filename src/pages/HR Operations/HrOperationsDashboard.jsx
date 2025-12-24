import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { BASE_URL } from '../../config';
import AnimatedHRNavbar from '../../components/HRNavbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Quotes from 'inspirational-quotes';
import { MdBusiness, MdAssignment } from 'react-icons/md';
import { FiUsers, FiCheckCircle } from 'react-icons/fi';

const operationsNavItems = [
  { name: 'Dashboard', path: '/hr-operations/dashboard' },
  { name: 'Position MIS', path: '/hr-operations/positions' },
  { name: 'Local Hiring', path: '/hr-operations/local-hiring' },
];

const HROperationsDashboard = () => {
  const navigate = useNavigate();
  const { user, authToken } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [timeString, setTimeString] = useState(() => new Date().toLocaleTimeString());
  const [quote, setQuote] = useState({ text: '', author: '' });

  useEffect(() => {
    if (!authToken) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${BASE_URL}/api/admin/getallpostjobs`, {
          withCredentials: true,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setJobs(list);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load positions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authToken]);

  useEffect(() => {
    setUserName((user && user.name) ? user.name : 'Manager Operation');
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setTimeString(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setQuote(Quotes.getQuote());
    const interval = setInterval(() => {
      setQuote(Quotes.getQuote());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const assignedJobs = useMemo(() => {
    if (!user || !user.id) return [];
    return jobs.filter(j =>
      Array.isArray(j.assignedHROperations) &&
      j.assignedHROperations.some(u => String(u._id || u.id || u) === String(user.id))
    );
  }, [jobs, user]);

  const stats = useMemo(() => {
    const total = assignedJobs.length;
    const active = assignedJobs.filter(j => String(j?.status).toLowerCase() === 'active').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [assignedJobs]);

  const now = new Date();
  const hour = now.getHours();

  const actionCards = [
    {
      title: 'Position MIS',
      description: 'Browse all recruitment positions and see key details.',
      icon: <MdBusiness className="text-indigo-600 text-4xl" />,
      glow: 'from-indigo-400 to-blue-500',
      onClick: () => navigate('/hr-operations/positions'),
    },
    {
      title: 'Local Hiring',
      description: 'Work local hiring leads and maintain your worksheet.',
      icon: <MdAssignment className="text-emerald-600 text-4xl" />,
      glow: 'from-emerald-400 to-green-500',
      onClick: () => navigate('/hr-operations/local-hiring'),
    },
  ];

  const countCards = [
    {
      title: 'Active Positions',
      description: 'Quick snapshot of currently active positions.',
      icon: <FiCheckCircle className="text-green-600 text-4xl" />,
      glow: 'from-green-400 to-lime-500',
      metric: stats.active,
    },
    {
      title: 'Total Positions',
      description: 'Overall positions being handled by operations.',
      icon: <FiUsers className="text-slate-700 text-4xl" />,
      glow: 'from-slate-400 to-slate-600',
      metric: stats.total,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <AnimatedHRNavbar title="Manager Operation" navItems={operationsNavItems} />
      <main className="pt-20 pb-10 px-6 w-full">
        {/* Hero section (mirrors LG dashboard style) */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-8 md:p-10 shadow-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-tr from-slate-100 to-slate-300 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                {`Good ${hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'}, ${userName} !`}
              </h1>
              <p className="mt-2 text-sm text-slate-600">Oversee the full recruitment pipeline and ensure smooth operations.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300/60 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">
                  Local time: {timeString}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300/60 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">
                  Role: Manager Operation
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/hr-operations/positions')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-indigo-500 text-white text-sm shadow-md hover:from-sky-500 hover:to-indigo-600 transition"
              >
                Open Position MIS
              </button>
            </div>
          </div>
        </motion.div>

        {/* Motivational Quote */}
        <motion.div
          className="mt-8 p-6 rounded-xl shadow-md border bg-gradient-to-tr from-white to-indigo-50 border-slate-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-lg italic mb-2 text-gray-800">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-right text-sm text-gray-600">- {quote.author}</p>
        </motion.div>

        {error && (
          <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{error}</div>
        )}

        {/* Action grid */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {actionCards.map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ scale: 1.02, y: -3, boxShadow: '0 18px 28px -18px rgba(0,0,0,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => card.onClick && card.onClick()}
              className="relative cursor-pointer overflow-hidden rounded-xl shadow-md border border-gray-200 bg-white transition-all duration-300 hover:shadow-xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-tr ${card.glow} opacity-10 animate-pulse blur-xl`} />
              <div className="relative p-5 h-full flex flex-col justify-between bg-white">
                <div className="flex items-center gap-4 mb-3">
                  {card.icon}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{card.description}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Count cards */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {countCards.map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ scale: 1.02, y: -3, boxShadow: '0 18px 28px -18px rgba(0,0,0,0.25)' }}
              className="relative overflow-hidden rounded-xl shadow-md border border-gray-200 bg-white transition-all duration-300 hover:shadow-xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-tr ${card.glow} opacity-10 animate-pulse blur-xl`} />
              <div className="relative p-5 h-full flex flex-col justify-between bg-white">
                <div className="flex items-center gap-4 mb-3">
                  {card.icon}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                    {typeof card.metric === 'number' && (
                      <p className="text-xs text-gray-600 mt-1">Count: <span className="font-semibold">{card.metric}</span></p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{card.description}</p>
              </div>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default HROperationsDashboard;

