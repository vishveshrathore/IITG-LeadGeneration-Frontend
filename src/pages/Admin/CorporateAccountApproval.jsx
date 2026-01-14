import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import { BASE_URL } from "../../config";
import { useAuth } from "../../context/AuthContext";

const API_BASE = `${BASE_URL}/api/recruitment`;
const ADMIN_API_BASE = `${BASE_URL}/api/admin`;

export default function CorporateAccountApproval() {
  const { authToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [counts, setCounts] = useState({}); 
  const [companyFilter, setCompanyFilter] = useState("");
  const [hrFilter, setHrFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [profilesModalOpen, setProfilesModalOpen] = useState(false);
  const [profilesModalTitle, setProfilesModalTitle] = useState("");
  const [profilesModalType, setProfilesModalType] = useState("");
  const [profilesModalData, setProfilesModalData] = useState([]);
  const [serverNow, setServerNow] = useState(null);

  useEffect(() => {
    const loadServerTime = async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/server-time`);
        if (typeof data?.timestamp === "number") {
          setServerNow(data.timestamp);
        }
      } catch (_) {
        // ignore; fallback to Date.now
      }
    };
    loadServerTime();
  }, []);

  const dateHeaders = useMemo(() => {
    const tz = "Asia/Kolkata";
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const base = typeof serverNow === "number" ? serverNow : Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return [0, 7, 14, 21].map((offset) =>
      formatter.format(new Date(base - offset * dayMs))
    );
  }, [serverNow]);

  const renderDateTick = (val) => {
    if (!val) return "";
    const s = String(val).toLowerCase();
    const isRed = s.includes("red");
    return (
      <span className={isRed ? "text-red-600" : "text-green-600"}>
        ✓
      </span>
    );
  };

  const dedupeProfiles = (profiles) => {
    if (!Array.isArray(profiles)) return [];
    const seen = new Set();
    const result = [];
    for (const p of profiles) {
      if (!p) continue;
      const name = (p.name || "").trim().toLowerCase();
      const designation = (p.current_designation || p.designation || "").trim().toLowerCase();
      const company = (p.current_company || p.company || "").trim().toLowerCase();
      const location = (p.location || "").trim().toLowerCase();
      const key = [name, designation, company, location].join("||");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
    }
    return result;
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (companyFilter) {
        params.company = companyFilter;
      }
      if (hrFilter) {
        params.hrName = hrFilter;
      }

      const { data } = await axios.get(`${API_BASE}/getAccounts/all`, { params });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setAccounts(list);
      if (typeof data?.count === "number") {
        setTotalCount(data.count);
      } else {
        setTotalCount(list.length);
      }
      if (typeof data?.totalPages === "number" && data.totalPages > 0) {
        setTotalPages(data.totalPages);
      } else {
        setTotalPages(1);
      }

      try {
        const queries = list
          .map((acc) => acc?.companyName)
          .filter(Boolean);
        const uniqueNames = Array.from(new Set(queries));
        const results = await Promise.all(
          uniqueNames.map(async (name) => {
            try {
              const resp = await axios.get(`${API_BASE}/parsed-profiles/count`, {
                params: { companyName: name, t: Date.now() },
              });
              return { name, count: resp?.data?.count || 0 };
            } catch {
              return { name, count: 0 };
            }
          })
        );
        const map = {};
        results.forEach((r) => { map[r.name] = r.count; });
        setCounts(map);
      } catch (e) {
        console.warn('Failed to fetch counts', e);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch corporate accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [page, companyFilter, hrFilter]);

  const approveAccount = async (accountId) => {
    try {
      await toast.promise(
        axios.post(`${API_BASE}/approve/corporate`, { accountId }),
        {
          loading: "Approving account...",
          success: "Account approved",
          error: "Failed to approve account",
        }
      );
      fetchAccounts();
    } catch (err) {
      console.error("approveAccount error", err);
    }
  };

  const disapproveAccount = async (accountId) => {
    try {
      await toast.promise(
        axios.post(`${API_BASE}/disapprove/corporate`, { accountId }),
        {
          loading: "Disapproving account...",
          success: "Account disapproved",
          error: "Failed to disapprove account",
        }
      );
      fetchAccounts();
    } catch (err) {
      console.error("disapproveAccount error", err);
    }
  };

  const fetchDemoProfilesForCompany = async (companyName) => {
    if (!companyName) {
      toast.error("Company name not available for this row");
      return;
    }
    try {
      const response = await toast.promise(
        axios.get(`${ADMIN_API_BASE}/gettopctcprofiles`, {
          params: { companyName },
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }),
        {
          loading: `Fetching demo profiles for ${companyName}...`,
          success: `Demo profiles fetched for ${companyName}`,
          error: "Failed to fetch demo profiles",
        }
      );
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
        ? response.data
        : [];
      const dedupedList = dedupeProfiles(list);
      setProfilesModalTitle(`Top CTC Profiles (Demo) - ${companyName}`);
      setProfilesModalType("demo");
      setProfilesModalData(dedupedList);
      setProfilesModalOpen(true);
    } catch (err) {
      console.error("Error fetching demo profiles for company", companyName, err);
    }
  };

  const fetchServiceProfilesForCompany = async (companyName) => {
    if (!companyName) {
      toast.error("Company name not available for this row");
      return;
    }
    try {
      const response = await toast.promise(
        axios.get(`${ADMIN_API_BASE}/getallprofilesforadmin`, {
          params: { companyName },
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }),
        {
          loading: `Fetching service profiles for ${companyName}...`,
          success: `Service profiles fetched for ${companyName}`,
          error: "Failed to fetch service profiles",
        }
      );
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
        ? response.data
        : [];
      const dedupedList = dedupeProfiles(list);
      setProfilesModalTitle(`All Profiles (Service) - ${companyName}`);
      setProfilesModalType("service");
      setProfilesModalData(dedupedList);
      setProfilesModalOpen(true);
    } catch (err) {
      console.error("Error fetching service profiles for company", companyName, err);
    }
  };

  const viewAccount = (account) => {
    if (!account?.companyName) return;
    window.location.href = `/naukri-parser?company=${encodeURIComponent(
      account.companyName
    )}&fromCorporate=true`;
  };

  const viewAccountLinkedIn = (account) => {
    if (!account?.companyName) return;
    window.location.href = `/linkedin-parser?company=${encodeURIComponent(
      account.companyName
    )}&fromCorporate=true`;
  };

  const filteredAccounts = accounts;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <Toaster position="top-right" />

      <div className="p-4 md:p-6 w-full">
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Corporate Account Approval</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCompanyFilter("");
                setHrFilter("");
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              title="Clear all filters"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <input
                type="text"
                value={companyFilter}
                onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
                placeholder="Search by company"
                className="pl-10 pr-10 py-2 w-64 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
              />
              {companyFilter && (
                <button
                  onClick={() => setCompanyFilter("")}
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  title="Clear company filter"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">HR Name</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                value={hrFilter}
                onChange={(e) => { setHrFilter(e.target.value); setPage(1); }}
                placeholder="Search by HR name"
                className="pl-10 pr-10 py-2 w-64 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
              />
              {hrFilter && (
                <button
                  onClick={() => setHrFilter("")}
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  title="Clear HR filter"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {(companyFilter || hrFilter) && (
            <button
              onClick={() => { setCompanyFilter(""); setHrFilter(""); setPage(1); }}
              type="button"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              title="Clear all filters"
            >
              Clear All
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <p className="text-center text-gray-500">No corporate accounts found</p>
        ) : (
          <div className="bg-white shadow rounded-xl w-full">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">HR Name</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Mobile</th>
                  <th className="px-4 py-3 text-left">Email Verified</th>
                  <th className="px-4 py-3 text-left">Approved</th>
                  <th className="px-4 py-3 text-left">Data Count</th>
                  <th className="px-4 py-3 text-center">Status Actions</th>
                  <th className="px-4 py-3 text-center">Admin Data</th>
                  <th className="px-4 py-3 text-center">Demo Data</th>
                  <th className="px-4 py-3 text-center">Delete All Data</th>
                  <th className="px-4 py-3 text-center">Delete Account</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((acc) => (
                  <tr key={acc._id} className="border-b hover:bg-gray-50">
                    {/* Company */}
                    <td className="px-4 py-3 font-medium">{acc.companyName || "-"}</td>
                    {/* HR Name */}
                    <td className="px-4 py-3">{acc.hrName || '-'}</td>
                    {/* Designation */}
                    <td className="px-4 py-3">{acc.designation || '-'}</td>
                    {/* Email */}
                    <td className="px-4 py-3">{acc.email || "-"}</td>
                    {/* Mobile */}
                    <td className="px-4 py-3">{acc.mobile || "-"}</td>
                    {/* Email Verified */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-lg font-medium ${acc.emailVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                      >
                        {acc.emailVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    {/* Approved */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-lg font-medium ${acc.isApproved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {acc.isApproved ? "Approved" : "Not Approved"}
                      </span>
                    </td>
                    {/* Data Count */}
                    <td className="px-4 py-3">{counts[acc.companyName] ?? '—'}</td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={() => approveAccount(acc._id)}
                        disabled={!acc.emailVerified || acc.isApproved}
                        className={`px-3 py-1 rounded-lg text-white transition ${
                          !acc.emailVerified || acc.isApproved
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                        title={
                          acc.isApproved
                            ? "Already approved"
                            : !acc.emailVerified
                            ? "Verify email before approval"
                            : "Approve account"
                        }
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => disapproveAccount(acc._id)}
                        disabled={!acc.emailVerified || !acc.isApproved}
                        className={`px-3 py-1 rounded-lg text-white transition ${
                          !acc.emailVerified || !acc.isApproved
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                        title={
                          !acc.isApproved
                            ? "Account is not approved yet"
                            : !acc.emailVerified
                            ? "Verify email before disapproval"
                            : "Disapprove account"
                        }
                      >
                        Disapprove
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={() => fetchDemoProfilesForCompany(acc.companyName)}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                        title="Fetch demo profiles (Top CTC) for this company"
                      >
                        Demo
                      </button>
                      <button
                        onClick={() => fetchServiceProfilesForCompany(acc.companyName)}
                        className="px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                        title="Fetch service profiles (all alphabetical) for this company"
                      >
                        Service
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          viewAccount(acc);
                        }}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-green-700 transition"
                        title="Open in Naukri Parser"
                      >
                        table14
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); viewAccountLinkedIn(acc); }}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                        title="Open in LinkedIn Parser"
                      >
                        table12
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={async () => {
                          if (!acc.companyName) return;
                          const ok = window.confirm(`Delete ALL parsed data for \"${acc.companyName}\"? This cannot be undone.`);
                          if (!ok) return;
                          try {
                            await toast.promise(
                              axios.delete(`${API_BASE}/parsed-profiles/delete`, {
                                params: { companyName: acc.companyName },
                              }),
                              {
                                loading: 'Deleting data...',
                                success: 'All parsed data deleted',
                                error: 'Failed to delete data',
                              }
                            );
                            // refresh count for this company
                            try {
                              const resp = await axios.get(`${API_BASE}/parsed-profiles/count`, { params: { companyName: acc.companyName, t: Date.now() } });
                              setCounts((prev) => ({ ...prev, [acc.companyName]: resp?.data?.count || 0 }));
                            } catch {}
                          } catch (e) {
                            console.error('Delete parsed error', e);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                        title="Delete all parsed profiles for this company"
                      >
                        Delete All
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={async () => {
                          if (!acc._id) return;
                          const ok = window.confirm(`Delete corporate account for "${acc.companyName || "this company"}"? This cannot be undone.`);
                          if (!ok) return;
                          try {
                            await toast.promise(
                              axios.delete(`${API_BASE}/delete/corporate/${acc._id}`),
                              {
                                loading: "Deleting corporate account...",
                                success: "Corporate account deleted",
                                error: "Failed to delete corporate account",
                              }
                            );
                            fetchAccounts();
                          } catch (e) {
                            console.error("Delete corporate account error", e);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-red-700 text-white hover:bg-red-800 transition"
                        title="Delete this corporate account record"
                      >
                        Delete Account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-700">
                <span>
                  Showing {accounts.length > 0 ? (page - 1) * pageSize + 1 : 0}
                  {" - "}
                  {(page - 1) * pageSize + accounts.length} of {totalCount} records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1 || loading}
                    className={`px-3 py-1 rounded-lg border text-sm font-medium ${
                      page === 1 || loading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages || loading}
                    className={`px-3 py-1 rounded-lg border text-sm font-medium ${
                      page === totalPages || loading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {profilesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => setProfilesModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[80vh] mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{profilesModalTitle || "Profiles"}</h2>
                {profilesModalType && (
                  <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                    {profilesModalType === "demo" ? "Demo" : "Service"} data
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setProfilesModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {(!profilesModalData || profilesModalData.length === 0) ? (
                <p className="text-sm text-gray-500 text-center py-6">No profiles found for this selection.</p>
              ) : (
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Current Designation</th>
                      <th className="px-3 py-2 text-left">Company</th>
                      <th className="px-3 py-2 text-left">Location</th>
                      <th className="px-3 py-2 text-left">{dateHeaders[0]}</th>
                      <th className="px-3 py-2 text-left">{dateHeaders[1]}</th>
                      <th className="px-3 py-2 text-left">{dateHeaders[2]}</th>
                      <th className="px-3 py-2 text-left">{dateHeaders[3]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profilesModalData.map((p, idx) => (
                      <tr key={p._id || idx} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 align-top text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 align-top font-medium text-gray-900">{p.name || "-"}</td>
                        <td className="px-3 py-2 align-top">{p.current_designation || p.designation || "-"}</td>
                        <td className="px-3 py-2 align-top">{p.current_company || p.company || "-"}</td>
                        <td className="px-3 py-2 align-top">{p.location || "-"}</td>
                        <td className="px-3 py-2 align-top text-xs">{renderDateTick(p.date1)}</td>
                        <td className="px-3 py-2 align-top text-xs">{renderDateTick(p.date2)}</td>
                        <td className="px-3 py-2 align-top text-xs">{renderDateTick(p.date3)}</td>
                        <td className="px-3 py-2 align-top text-xs">{renderDateTick(p.date4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

