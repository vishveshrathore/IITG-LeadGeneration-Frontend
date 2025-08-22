import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AdminNavbar from '../../components/AdminNavbar';
import { BASE_URL } from "../../config"; 

const ViewLeads = () => {
  const { authToken } = useAuth();

  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    industry: '',
    company: '',
    createdBy: '',
    isComplete: '',
    from: '',
    to: '',
    page: 1,
    limit: 10,
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = { ...filters };

      if (!params.isComplete) delete params.isComplete;
      if (!params.from) delete params.from;
      if (!params.to) delete params.to;

      const response = await axios.get(`${BASE_URL}/api/admin/leads`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params,
      });

      setLeads(response.data.leads || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error('Failed to fetch leads');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterData = async () => {
    try {
      const [industryRes, companyRes, userRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/industries`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        axios.get(`${BASE_URL}/api/admin/companies`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        axios.get(`${BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);



      setIndustries(industryRes.data?.industries || []);
      setCompanies(companyRes.data?.companies || []);
      setUsers(userRes.data || []);

    } catch (error) {
      toast.error('Failed to load filter data');
      console.error(error);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchFilterData();
      fetchLeads();
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) fetchLeads();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="p-6">
      <AdminNavbar />
      <h1 className="text-2xl font-semibold mb-6 mt-12">All Leads</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <input
          type="text"
          name="search"
          placeholder="Search..."
          value={filters.search}
          onChange={handleFilterChange}
          className="border px-3 py-2 rounded"
        />

        <select name="industry" value={filters.industry} onChange={handleFilterChange} className="border px-3 py-2 rounded">
          <option value="">All Industries</option>
          {industries.map((ind) => (
            <option key={ind._id} value={ind._id}>{ind.name}</option>
          ))}
        </select>

        <select name="company" value={filters.company} onChange={handleFilterChange} className="border px-3 py-2 rounded">
          <option value="">All Companies</option>
          {companies.map((comp) => (
            <option key={comp._id} value={comp._id}>{comp.CompanyName}</option>
          ))}
        </select>

        <select
  name="createdBy"
  value={filters.createdBy}
  onChange={handleFilterChange}
  className="border px-3 py-2 rounded"
>
  <option value="">All Creators</option>
  {users.map((user) => (
    <option key={user._id} value={user._id}>
      {user.name}
    </option>
  ))}
</select>


        <select name="isComplete" value={filters.isComplete} onChange={handleFilterChange} className="border px-3 py-2 rounded">
          <option value="">All Status</option>
          <option value="true">Completed</option>
          <option value="false">Incomplete</option>
        </select>

        <input
          type="date"
          name="from"
          value={filters.from}
          onChange={handleFilterChange}
          className="border px-3 py-2 rounded"
        />
        <input
          type="date"
          name="to"
          value={filters.to}
          onChange={handleFilterChange}
          className="border px-3 py-2 rounded"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : leads.length === 0 ? (
        <p>No leads found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-200 rounded">
            <thead className="bg-gray-100">
  <tr>
    <th className="px-4 py-2">Name</th>
    <th className="px-4 py-2">Designation</th>
    <th className="px-4 py-2">Mobile</th>
    <th className="px-4 py-2">Email</th>
    <th className="px-4 py-2">Location</th>
    <th className="px-4 py-2">Industry</th>
    <th className="px-4 py-2">Product Line</th>
    <th className="px-4 py-2">Employee Strength</th>
    <th className="px-4 py-2">Company</th>
    <th className="px-4 py-2">Created By</th>
    <th className="px-4 py-2">Created At</th>
  </tr>
</thead>
<tbody>
  {leads.map((lead) => (
    <tr key={lead._id} className="border-t">
      <td className="px-4 py-2">{lead.name}</td>
      <td className="px-4 py-2">{lead.designation}</td>
      <td className="px-4 py-2">{lead.mobile?.join(', ')}</td>
      <td className="px-4 py-2">{lead.email}</td>
      <td className="px-4 py-2">{lead.location}</td>
      <td className="px-4 py-2">{lead.industry?.name || 'N/A'}</td>
      <td className="px-4 py-2">{lead.productLine}</td>
      <td className="px-4 py-2">{lead.employeeStrength}</td>
      <td className="px-4 py-2">{lead.company?.CompanyName || 'N/A'}</td>
      <td className="px-4 py-2">{lead.createdBy?.name || 'N/A'}</td>
      <td className="px-4 py-2">
        {lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) : 'N/A'}
      </td>
    </tr>
  ))}
</tbody>

          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-4">
          <button
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
            }
            disabled={filters.page === 1}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-4 py-2">Page {filters.page} of {totalPages}</span>
          <button
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: Math.min(prev.page + 1, totalPages) }))
            }
            disabled={filters.page >= totalPages}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewLeads;
