import React, { useEffect, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import AdminNavbar from "../../components/AdminNavbar";
import { BASE_URL } from "../../config";

const API_BASE = `${BASE_URL}/api/recruitment`;

export default function CorporateAccountApproval() {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [counts, setCounts] = useState({}); // companyName -> count

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/getAccounts/all`);
      // Expecting { success, count, data: [...] }
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setAccounts(list.slice().reverse());
      // Fetch counts per companyName in parallel (best-effort)
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
  }, []);

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
      console.error(err);
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
      console.error(err);
    }
  };

  const viewAccount = (account) => {
    // Navigate to NaukriParser with the company name
    window.location.href = `/naukri-parser?company=${encodeURIComponent(account.companyName)}&fromCorporate=true`;
  };

  const viewAccountLinkedIn = (account) => {
    // Navigate to LinkedInPParser with the company name
    window.location.href = `/linkedin-parser?company=${encodeURIComponent(account.companyName)}&fromCorporate=true`;
  };

  const deleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }
    
    try {
      await toast.promise(
        axios.delete(`${API_BASE}/delete/corporate/${accountId}`),
        {
          loading: "Deleting account...",
          success: "Account deleted successfully",
          error: "Failed to delete account",
        }
      );
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <Toaster position="top-right" />

      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Corporate Account Approval</h1>

        {loading ? (
          <p className="text-center text-gray-500">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <p className="text-center text-gray-500">No corporate accounts found</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-xl">
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
                  <th className="px-4 py-3 text-center">Demo Data</th>
                  <th className="px-4 py-3 text-center">Delete All Data</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

