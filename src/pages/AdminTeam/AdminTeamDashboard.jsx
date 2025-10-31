import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import Quotes from "inspirational-quotes";
import CRENavbar from "../../components/CreNavbar";
import { useNavigate } from "react-router-dom"; // ✅ added

const AdminTeamDashboard = () => {
  const { user, role } = useAuth();
  const [timeString, setTimeString] = useState(() => new Date().toLocaleTimeString());
  const [quote, setQuote] = useState({ text: "", author: "" });
  const navigate = useNavigate(); // ✅ added

  // greeting logic
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
    const t = setInterval(() => setTimeString(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      {/* Navbar (role-aware) */}
      <CRENavbar />

      <div className="pt-20 px-6 w-full">
        {/* Hero Banner */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-8 md:p-10 shadow-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            {/* Left: Greeting */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
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
                    {`${getGreeting()}, ${user?.name || "User"}!`}
                  </h1>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-slate-300 text-slate-700 backdrop-blur ring-1 ring-slate-300/40">
                    {role || "Guest"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Your personalized dashboard overview
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700">
                    Local time: {timeString}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700">
                    SLA: Follow-up within 24 hours
                  </span>
                  {["CRM-TeamLead", "RegionalHead", "NationalHead", "Admin"].includes(role) && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700">
                      Leadership Mode
                    </span>
                  )}
                </div>
              </div>
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

        {/* ✅ Clickable Grid Section */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/admin/CreDashboard")} // ✅ open another page
            className="cursor-pointer p-6 rounded-xl shadow-lg bg-white border border-slate-200 flex flex-col justify-between hover:shadow-xl transition"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-800">Leads Approval for CRE</h2>
              <p className="mt-2 text-sm text-slate-600">
                Leads pending your approval for CRE 
              </p>
            </div>
            <div className="mt-4 text-right">
              <span className="text-sm font-semibold text-indigo-600 hover:underline">
                View →
              </span>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/adminteam/disabled-lg-rejected")}
            className="cursor-pointer p-6 rounded-xl shadow-lg bg-white border border-slate-200 flex flex-col justify-between hover:shadow-xl transition"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-800">Rejected Leads (LG Disabled)</h2>
              <p className="mt-2 text-sm text-slate-600">
                View rejected leads where the owning LG account is disabled
              </p>
            </div>
            <div className="mt-4 text-right">
              <span className="text-sm font-semibold text-indigo-600 hover:underline">
                View →
              </span>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/adminteam/disabled-lg-wrong-number")}
            className="cursor-pointer p-6 rounded-xl shadow-lg bg-white border border-slate-200 flex flex-col justify-between hover:shadow-xl transition"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-800">Wrong Number (LG Disabled)</h2>
              <p className="mt-2 text-sm text-slate-600">
                Leads marked Wrong Number where the owning LG account is disabled
              </p>
            </div>
            <div className="mt-4 text-right">
              <span className="text-sm font-semibold text-indigo-600 hover:underline">
                View →
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminTeamDashboard;
