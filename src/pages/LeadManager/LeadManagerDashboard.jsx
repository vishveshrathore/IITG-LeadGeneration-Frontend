import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUsers } from "react-icons/fa";
import AdminNavbar from "../../components/AdminNavbar";
import { useAuth } from "../../context/AuthContext";
import Quotes from "inspirational-quotes";

const CARD_BASE_CLASSES =
  "cursor-pointer bg-white border border-gray-200 shadow-sm rounded-lg flex flex-col items-start p-6 transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:outline-none";

const DASHBOARD_ITEMS = [
  {
    title: "CRE Leads Approval",
    description:
      "Review, approve, or reject leads before they move into the CRE calling workflow.",
    icon: <FaUsers className="text-3xl text-blue-600" />,
    path: "/admin/CreDashboard",
  },
];

const LeadManagerDashboard = () => {
  const { user, role } = useAuth();
  const [timeString, setTimeString] = useState(
    () => new Date().toLocaleTimeString()
  );
  const [quote, setQuote] = useState({ text: "", author: "" });
  const navigate = useNavigate();
  const gridItems = useMemo(() => DASHBOARD_ITEMS, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    const randomQuote = Quotes.getQuote();
    setQuote(randomQuote);
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setTimeString(new Date().toLocaleTimeString()),
      1000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <AdminNavbar />

      <div className="pt-20 px-6 w-full">
        {/* Hero card (same style as Data Analyst) */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-8 md:p-10 shadow-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 12 }}
                className="relative h-12 w-12 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-400 p-[2px] shadow-lg"
              >
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-slate-700 text-lg font-bold">
                  {(user?.name || "U")[0]}
                </div>
              </motion.div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                    {`${getGreeting()}, ${user?.name || "Lead Manager"}!`}
                  </h1>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">
                    {role || "Lead Manager"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Your Lead Manager control center for CRE approvals and performance.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700">
                    Local time: {timeString}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700">
                    Focused on CRE lead quality
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quote card */}
        <motion.div
          className="mt-8 p-6 rounded-xl shadow-md border bg-gradient-to-tr from-white to-indigo-50 border-slate-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-lg italic text-gray-800 mb-2">“{quote.text}”</p>
          <p className="text-right text-sm text-gray-600">- {quote.author}</p>
        </motion.div>

        {/* Grid of tools */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridItems.map((item, index) => (
            <motion.div
              key={index}
              role="button"
              aria-label={`Go to ${item.title}`}
              tabIndex={0}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(item.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigate(item.path);
                }
              }}
              className={CARD_BASE_CLASSES}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <h2 className="text-lg font-medium text-gray-800">{item.title}</h2>
              </div>
              <p className="mt-3 text-sm text-gray-600">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadManagerDashboard;
