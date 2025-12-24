import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../../components/AdminNavbar';
import { useAuth } from '../../../context/AuthContext';
import { BASE_URL } from '../../../config';

const AdminLocalHiring = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');

  const [summary, setSummary] = useState({ total: 0, assigned: 0, unassigned: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchSummary = async () => {
    if (!token) return;
    setSummaryLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/local-hiring/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.success) {
        setSummary({
          total: data.total || 0,
          assigned: data.assigned || 0,
          unassigned: data.unassigned || 0,
        });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [token]);

  const stats = [
    { label: 'Total Leads', value: summary.total, accent: 'from-slate-900 to-slate-700' },
    { label: 'Unassigned', value: summary.unassigned, accent: 'from-amber-500 to-orange-500' },
    { label: 'Assigned', value: summary.assigned, accent: 'from-emerald-500 to-emerald-600' },
  ];

  const COLOR_MAP = {
    emerald: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    indigo: {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      icon: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
  };

  const actionCards = [
    {
      title: 'Naukri Parser',
      description: 'Paste Table 14 (or upload Excel) and push shortlisted profiles to Local Hiring.',
      badge: 'Table 14',
      color: 'emerald',
      navigateTo: '/naukri-parser?localHiring=true',
      tips: [
        'Use the Local Hiring tab inside the Upload section.',
        'Select multiple profiles and submit in one go.',
      ],
    },
    {
      title: 'LinkedIn Parser',
      description: 'Paste scraped LinkedIn Table 12 data and upload the parsed talent pool.',
      badge: 'Table 12',
      color: 'indigo',
      navigateTo: '/linkedin-parser?localHiring=true',
      tips: [
        'Supports both text paste and file upload.',
        'Filter profiles before pushing to Local Hiring.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7faff] via-[#edf2ff] to-[#fbfdf8]">
      <AdminNavbar />
      <Toaster position="top-right" />

      <div className="pt-20 px-4 sm:px-6 lg:px-10 pb-16 w-full space-y-8">
        <div className="bg-white/90 backdrop-blur rounded-4xl border border-slate-200 shadow-sm">
          <div className="px-6 md:px-10 py-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Local Hiring Upload Hub
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Bring parsed profiles into Local Hiring</h1>
                <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed">
                  Use the same parser interfaces you rely on for Recruitment. Just switch to the
                  <span className="font-semibold text-slate-900"> Local Hiring</span> upload destination, then assign leads
                  to HR Ops / HR Recruiters for follow-up.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={fetchSummary}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white text-sm font-semibold px-4 py-2 hover:bg-slate-800 transition"
                >
                  Refresh Summary
                </button>
                
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:max-w-2xl">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="relative bg-slate-900 text-white rounded-3xl p-4 overflow-hidden"
                >
                  <div className={`absolute inset-0 opacity-90 bg-gradient-to-br ${item.accent}`} />
                  <div className="relative space-y-2">
                    <p className="text-xs uppercase tracking-wide text-white/80">{item.label}</p>
                    <p className="text-3xl font-semibold">
                      {summaryLoading ? (
                        <span className="text-white/60">…</span>
                      ) : (
                        item.value
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {actionCards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-full border ${COLOR_MAP[card.color].badge}`}
                  >
                    {card.badge}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">{card.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{card.description}</p>
                </div>
                <div
                  className={`h-12 w-12 rounded-2xl border font-semibold flex items-center justify-center ${COLOR_MAP[card.color].icon}`}
                >
                  {card.color === 'emerald' ? 'N' : 'in'}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 space-y-2">
                {card.tips.map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate(card.navigateTo)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 px-4 py-2 hover:bg-slate-900 hover:text-white transition"
              >
                Open {card.title}
              </button>
            </div>
          ))}
        </div>

          
      </div>
    </div>
  );
};

export default AdminLocalHiring;
