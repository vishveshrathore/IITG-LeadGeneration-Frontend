import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CRENavbar from '../../components/CreNavbar';
import TeamScopeMenu from '../../components/TeamScopeMenu';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';

const ClosureTillDate = () => {
  const { authToken, user, role } = useAuth();
  const token = authToken || localStorage.getItem('token');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  // hierarchy selector
  const [scope, setScope] = useState('self'); // self | team | user
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);
      let url = `${BASE_URL}/api/cre/closure-till-date`;
      if (isLeader) {
        if (scope === 'team') url += `?scope=team`;
        else if (scope === 'user' && selectedUserId) url += `?userId=${encodeURIComponent(selectedUserId)}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      setItems(rows);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getLatestRemark = (a) => {
    if (!a) return 'N/A';
    if (a.remarks && a.remarks.trim()) return a.remarks.trim();
    const fus = Array.isArray(a.followUps) ? a.followUps : [];
    if (fus.length === 0) return 'N/A';
    const last = fus[fus.length - 1];
    return last?.remarks || 'N/A';
  };

  useEffect(() => { fetchData(); }, [token, scope, selectedUserId]);

  // load team members for leaders
  useEffect(() => {
    const isLeader = ["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role);
    if (!token || !isLeader) { setTeamMembers([]); return; }
    const run = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/cre/team/members`, { headers: { Authorization: `Bearer ${token}` } });
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        setTeamMembers(items);
      } catch (_) { setTeamMembers([]); }
    };
    run();
  }, [token, role, user?.role]);

  return (
    <div className="min-h-screen bg-gray-100">
      <CRENavbar />
      <div className="p-4 my-14 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Closures Till Date
            <span className="ml-2 text-sm font-medium text-gray-500">({items.length})</span>
          </h1>
          <div className="flex items-center gap-3">
            <TeamScopeMenu
              isLeader={["CRM-TeamLead", "DeputyCRMTeamLead", "RegionalHead", "DeputyRegionalHead", "NationalHead", "DeputyNationalHead"].includes(role || user?.role)}
              teamMembers={teamMembers}
              scope={scope}
              selectedUserId={selectedUserId}
              allLabel="All"
              title="Filter by team"
              onSelectMe={() => { setScope('self'); setSelectedUserId(''); }}
              onSelectAll={() => { setScope('team'); setSelectedUserId(''); }}
              onSelectUser={(id) => { setScope('user'); setSelectedUserId(id); }}
            />
            <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✅ Closed</div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded shadow-md p-6 text-gray-600">Loading...</div>
        ) : error ? (
          <div className="bg-white rounded shadow-md p-6 text-rose-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center p-10 text-center border border-dashed border-gray-300">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-lg font-semibold">No closures yet</div>
            <div className="text-gray-500">Closed leads will appear here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-sm">Name</th>
                  <th className="px-3 py-2 text-left text-sm">Company name</th>
                  <th className="px-3 py-2 text-left text-sm">Designation</th>
                  <th className="px-3 py-2 text-left text-sm">Location</th>
                  <th className="px-3 py-2 text-left text-sm">Latest Remark</th>
                  <th className="px-3 py-2 text-left text-sm">Followups</th>
                  <th className="px-3 py-2 text-left text-sm">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{item?.lead?.name || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.company?.CompanyName || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.designation || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{item?.lead?.location || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{getLatestRemark(item)}</td>
                    <td className="px-3 py-2 text-sm">{Array.isArray(item?.followUps) ? item.followUps.length : 0}</td>
                    <td className="px-3 py-2 text-sm">
                      <button className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" onClick={() => setSelectedItem(item)}>Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Details</h2>
              <button className="text-slate-500" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><strong>Name:</strong> {selectedItem?.lead?.name || 'N/A'}</div>
                <div><strong>Company:</strong> {selectedItem?.lead?.company?.CompanyName || 'N/A'}</div>
                <div><strong>Designation:</strong> {selectedItem?.lead?.designation || 'N/A'}</div>
                <div><strong>Location:</strong> {selectedItem?.lead?.location || 'N/A'}</div>
                <div><strong>Email:</strong> {selectedItem?.lead?.email || 'N/A'}</div>
                <div><strong>Mobile:</strong> {Array.isArray(selectedItem?.lead?.mobile) ? selectedItem.lead.mobile.join(', ') : selectedItem?.lead?.mobile || 'N/A'}</div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Follow-ups ({Array.isArray(selectedItem?.followUps) ? selectedItem.followUps.length : 0})</h3>
                {Array.isArray(selectedItem?.followUps) && selectedItem.followUps.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedItem.followUps.map(fu => (
                      <li key={fu._id}>{fu?.followUpDate ? new Date(fu.followUpDate).toLocaleString() : 'N/A'} - {fu?.remarks || ''}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-500">No follow-ups</div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
;

export default ClosureTillDate;

