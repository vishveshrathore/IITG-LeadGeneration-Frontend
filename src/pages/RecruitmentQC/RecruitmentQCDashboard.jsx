import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BsBriefcaseFill, BsBuildingCheck, BsTools } from 'react-icons/bs';
import { FiClock } from 'react-icons/fi';
import Quotes from 'inspirational-quotes';
import RecruitmentQCNavbar from '../../components/RecruitmentQCNavbar.jsx';
import { useAuth } from '../../context/AuthContext';

const RecruitmentQCDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState({ text: '', author: '' });
  const [timeString, setTimeString] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    setQuote(Quotes.getQuote());
    const interval = setInterval(() => setQuote(Quotes.getQuote()), 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeString(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const items = [
    {
      title: 'Position MIS',
      description: 'View and analyze all recruitment positions.',
      icon: <BsBriefcaseFill size={20} />,
      route: '/admin/recruitment/position-mis',
      color: 'bg-pink-100',
    },
    {
      title: 'Create Team',
      description: 'Create teams of Recruiters and Manager Operation for each position.',
      icon: <BsBuildingCheck size={20} />,
      route: '/admin/recruitment/position-assignment',
      color: 'bg-blue-100',
    },
    {
      title: 'Recruitment Tools (Table 14 & 12)',
      description: 'Open tools for parsing Naukri and LinkedIn data.',
      icon: <BsTools size={20} />,
      route: '/tools/dashboard',
      color: 'bg-emerald-100',
    },
  ];

  return (
    <>
      <RecruitmentQCNavbar />
      <div className="relative min-h-screen bg-slate-50 text-slate-900">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-500/20 to-sky-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gradient-to-tr from-rose-400/15 to-amber-300/15 blur-[160px]" />
        </div>

        <main className="pt-20 px-4 md:px-10 pb-12 space-y-8">
          <motion.section
            className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-xl px-6 py-8 md:px-10 md:py-12"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-slate-200 to-slate-400 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-100 to-indigo-200 blur-[140px]" />
            </div>

            <div className="relative flex flex-col gap-6">
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                    {`${getGreeting()}, ${user?.name || 'QC Manager'}!`}
                  </h1>
                
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                    <FiClock className="text-indigo-500" /> Local time: {timeString}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                    QA Marker: 100% assignment compliance
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50 px-6 py-5 shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-lg italic text-slate-800">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-right text-sm text-slate-500 mt-2">- {quote.author}</p>
          </motion.section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.route)}
                className={`cursor-pointer rounded-2xl border border-white/60 p-6 shadow-lg transition-all duration-300 ${item.color}`}
              >
                <div className="mb-4 text-blue-800">{item.icon}</div>
                <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </motion.div>
            ))}
          </section>
        </main>
      </div>
    </>
  );
};

export default RecruitmentQCDashboard;
