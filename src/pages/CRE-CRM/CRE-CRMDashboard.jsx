import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiPhoneCall } from 'react-icons/fi';
import { MdBusiness, MdAssignment } from 'react-icons/md';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import CRENavbar from '../../components/CreNavbar';
import Quotes from 'inspirational-quotes';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { BASE_URL } from '../../config';

const CreCrmDashboard = () => {
  const navigate = useNavigate();
  const [isMobile] = useState(false);
  const [timeString, setTimeString] = useState(() => new Date().toLocaleTimeString());
  const [quote, setQuote] = useState({ text: '', author: '' });

  const { user, role, authToken } = useAuth();
  const token = authToken || localStorage.getItem('token');

  const [metrics, setMetrics] = useState({
    myLeads: 0,
    todaysFollowups: 0,
    positiveLeads: 0,
    closureProspects: 0,
    teamLeads: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [teamLeadsData, setTeamLeadsData] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  // TeamGrid filters & pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [followUpTodayOnly, setFollowUpTodayOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const now = new Date();

  useEffect(() => {
    const randomQuote = Quotes.getQuote();
    setQuote(randomQuote);
  }, []);

  // live clock updater
  useEffect(() => {
    const t = setInterval(() => setTimeString(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!token) { setLoadingMetrics(false); return; }
      setLoadingMetrics(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const reqs = [
          axios.get(`${BASE_URL}/api/cre/myleads`, { headers }),
          axios.get(`${BASE_URL}/api/cre/today/followups`, { headers }),
          axios.get(`${BASE_URL}/api/cre/positive/lead`, { headers }),
          axios.get(`${BASE_URL}/api/cre/closure-prospects`, { headers }),
        ];
        // Conditionally fetch team leads only for leader roles
        const isLeader = ["CRM-TeamLead", "RegionalHead", "NationalHead"].includes(role || user?.role);
        const teamReq = isLeader ? axios.get(`${BASE_URL}/api/cre/team/leads`, { headers }) : null;

        const [myLeadsRes, todaysRes, positiveRes, closureRes, teamRes] = await Promise.allSettled(
          teamReq ? [...reqs, teamReq] : reqs
        );

        const safeCount = (res) => (res?.status === 'fulfilled' ? (res.value?.data?.count ?? res.value?.data?.total ?? res.value?.data?.data?.length ?? 0) : 0);
        setMetrics({
          myLeads: safeCount(myLeadsRes),
          todaysFollowups: safeCount(todaysRes),
          positiveLeads: safeCount(positiveRes),
          closureProspects: safeCount(closureRes),
          teamLeads: safeCount(teamRes),
        });
      } catch (_) {
        // Fail silently to keep dashboard resilient
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, [token, role, user?.role]);

  // Fetch full team leads data for leader roles to render TeamGrid
  useEffect(() => {
    const isLeader = ["CRM-TeamLead", "RegionalHead", "NationalHead"].includes(role || user?.role);
    if (!token || !isLeader) { setTeamLeadsData([]); return; }
    const run = async () => {
      try {
        setLoadingTeam(true);
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${BASE_URL}/api/cre/team/leads`, { headers });
        const items = res?.data?.data || [];
        setTeamLeadsData(items);
      } catch (_) {
        setTeamLeadsData([]);
      } finally {
        setLoadingTeam(false);
      }
    };
    run();
  }, [token, role, user?.role]);


  // Derived filtered + paginated data
  const filteredTeamData = React.useMemo(() => {
    let rows = [...teamLeadsData];
    // Status filter
    if (statusFilter) {
      rows = rows.filter((a) => {
        const latestStatus = a.currentStatus || (a.statusHistory && a.statusHistory.length > 0 ? a.statusHistory[a.statusHistory.length - 1]?.status : '');
        return (latestStatus || '').toLowerCase() === statusFilter.toLowerCase();
      });
    }
    // Search by lead name, company, assigned CRE
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((a) => {
        const lead = a.lead || {};
        const company = lead.company || {};
        const text = [
          lead.name,
          company.CompanyName,
          a.Calledbycre?.name,
          a.reportingManager?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      });
    }
    // Follow-up today only
    if (followUpTodayOnly) {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      rows = rows.filter((a) => {
        if (!a.followUps || a.followUps.length === 0) return false;
        const latestFU = a.followUps[a.followUps.length - 1];
        const d = latestFU?.followUpDate ? new Date(latestFU.followUpDate) : null;
        return d && d >= start && d < end;
      });
    }
    return rows;
  }, [teamLeadsData, statusFilter, search, followUpTodayOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredTeamData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeamData.slice(start, start + pageSize);
  }, [filteredTeamData, currentPage, pageSize]);

  const actionGrids = [
     {
      title: 'Today Follow-ups',
      description: 'Track pending follow-up calls efficiently',
      icon: <MdAssignment className="text-green-600 text-3xl" />,
      path: '/cre/followups',
      glow: 'from-green-400 to-teal-500',
      tooltip: 'Review follow-up reminders',
    },
    {
      title: 'Clouser Prospects',
      description: 'Monitor Clouser Prospects Leads',
      icon: <MdBusiness className="text-teal-600 text-3xl" />,
      path: '/cre/closureprospects',
      glow: 'from-teal-400 to-cyan-500',
      tooltip: 'View all your successful deals',
    },
     {
      title: 'Positive leads',
      description: 'Monitor Positive Leads',
      icon: <MdBusiness className="text-teal-600 text-3xl" />,
      path: '/cre/positiveleads',
      glow: 'from-teal-400 to-cyan-500',
      tooltip: 'View all your successful deals',
    },
   
    {
      title: 'My WorkSheet',
      description: 'Manage All the leads assigned to you',
      icon: <FiPhoneCall className="text-indigo-600 text-3xl" />,
      path: '/cre/worksheet',
      glow: 'from-indigo-400 to-blue-500',
      tooltip: 'Add a brand-new lead call',
    },
     {
      title: 'New Leads',
      description: 'Quickly log and manage your fresh leads',
      icon: <FiPhoneCall className="text-indigo-600 text-3xl" />,
      path: '/creassignedlead',
      glow: 'from-indigo-400 to-blue-500',
      tooltip: 'Add a brand-new lead call',
    },
    
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <CRENavbar />

      {/* Animated background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-500/30 to-cyan-400/30 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/20 to-rose-400/20 blur-3xl animate-pulse" />
      </div>

      <div className="pt-20 px-6 w-full">

        {/* Hero Header Banner (White → Greyish) */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-8 md:p-10 shadow-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* background accents */}
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-tr from-slate-100 to-slate-300 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            {/* Left: Greeting, subtitle, chips */}
            <div className="flex items-start gap-4">
              {/* Animated avatar with gradient ring */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 12 }}
                className="relative h-12 w-12 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-400 p-[2px] shadow-lg"
              >
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-slate-700 text-lg font-bold">
                  {(user?.name || 'C')[0]}
                </div>
                <motion.span
                  className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_0_2px_rgba(255,255,255,1)]"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                    {`${getGreeting()}, ${user?.name || 'CRE'}!`}
                  </h1>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300/60 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">
                    {(role || user?.role || 'CRE-CRM')}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">High-performance calling workflow. Industrial-grade visibility.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300/60 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">
                    Local time: {timeString}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300/60 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">
                    SLA: Follow-up within 24 hours
                  </span>
                  {(["CRM-TeamLead", "RegionalHead", "NationalHead"].includes(role || user?.role)) && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300/60 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">Leadership Mode</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: CTAs */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: '0 12px 30px -12px rgba(56,189,248,0.45)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/creassignedlead')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-indigo-500 text-white text-sm shadow-md hover:from-sky-500 hover:to-indigo-600 transition"
              >
                Get Next Lead
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: '0 12px 30px -12px rgba(99,102,241,0.35)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/cre/worksheet')}
                className="px-4 py-2 rounded-lg bg-white/80 text-slate-700 border border-slate-200 text-sm shadow-sm hover:bg-white transition"
              >
                Go to Worksheet
              </motion.button>
              {(["CRM-TeamLead", "RegionalHead", "NationalHead"].includes(role || user?.role)) && (
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 12px 30px -12px rgba(56,189,248,0.45)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/cre/myteam')}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-indigo-500 text-white text-sm shadow-md hover:from-sky-500 hover:to-indigo-600 transition"
                >
                  My Team
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Motivational Quote */}
        <motion.div
          className="mt-8 p-6 rounded-xl shadow-md border bg-gradient-to-tr from-white to-indigo-50 border-slate-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-lg italic text-gray-800 mb-2">“{quote.text}”</p>
          <p className="text-right text-sm text-gray-600">- {quote.author}</p>
        </motion.div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {[{
            title: 'My Leads', value: metrics.myLeads, color: 'from-blue-500 to-indigo-600', icon: <FiUsers className="text-white" />
          },{
            title: "Today's Follow-ups", value: metrics.todaysFollowups, color: 'from-emerald-500 to-teal-600', icon: <MdAssignment className="text-white" />
          },{
            title: 'Positive Leads', value: metrics.positiveLeads, color: 'from-purple-500 to-fuchsia-600', icon: <FiCheckCircle className="text-white" />
          },{
            title: 'Closure Prospects', value: metrics.closureProspects, color: 'from-orange-500 to-rose-600', icon: <MdBusiness className="text-white" />
          },
          // Conditionally append Team Leads card for leader roles
          ...(["CRM-TeamLead", "RegionalHead", "NationalHead"].includes(role || user?.role) ? [{
            title: 'Team Leads', value: metrics.teamLeads, color: 'from-cyan-500 to-sky-600', icon: <FiUsers className="text-white" />
          }] : [])
          ].map((card, i) => (
          <motion.div key={card.title}
            className="relative overflow-hidden rounded-xl shadow-md bg-white cursor-pointer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            whileHover={{ y: -3, scale: 1.01, boxShadow: '0 18px 28px -18px rgba(0,0,0,0.25)' }}
          >
            <div className={`absolute inset-0 bg-gradient-to-tr ${card.color} opacity-10 blur-xl`} />
            <div className="relative p-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{card.title}</div>
                <div className="text-2xl font-bold text-gray-800">
                  {loadingMetrics ? '—' : <CountUp end={Number(card.value) || 0} duration={1.2} />}
                </div>
              </div>
              <div className={`p-3 rounded-full bg-gradient-to-tr ${card.color}`}>{card.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => navigate('/creassignedlead')} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">Get Next Lead</button>
        <button onClick={() => navigate('/cre/worksheet')} className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 shadow-sm">Go to Worksheet</button>
        <button onClick={() => navigate('/cre/followups')} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">Today’s Follow-ups</button>
        <button onClick={() => navigate('/cre/positiveleads')} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm">Positive Leads</button>
        <button onClick={() => navigate('/cre/closureprospects')} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white shadow-sm">Closure Prospects</button>
      </div>

      {/* Compact Action Grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 mb-14">
        {actionGrids.map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02, y: -2, boxShadow: '0 18px 28px -18px rgba(0,0,0,0.25)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(item.path)}
            data-tooltip-id={`grid-${i}`}
            data-tooltip-content={item.tooltip}
            className="relative cursor-pointer overflow-hidden rounded-xl shadow-lg transition bg-white"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-tr ${item.glow} opacity-10 animate-pulse blur-xl`}
            />
            <div className="relative bg-white p-6 rounded-xl h-full flex flex-col justify-between">
              <div className="flex items-center gap-4 mb-4">{item.icon}</div>
              <h4 className="text-lg font-semibold text-gray-800">{item.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            </div>
            {!isMobile && <Tooltip id={`grid-${i}`} place="top" delayShow={300} />}
          </motion.div>
        ))}
      </div>

      
      </div>
    </div>
  );
};

export default CreCrmDashboard;