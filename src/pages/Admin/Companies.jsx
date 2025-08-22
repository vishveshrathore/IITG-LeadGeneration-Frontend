import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaEdit, FaTrash } from 'react-icons/fa';
import AdminNavbar from '../../components/AdminNavbar';
import { BASE_URL } from "../../config"; 

const API_BASE = `${BASE_URL}/api`;

const CompanyManagement = () => {
  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/industries`);
        setIndustries(res.data.industries || []);
      } catch (err) {
        toast.error('Failed to fetch industries');
        console.error(err);
      }
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      fetchCompanies();
    } else {
      setCompanies([]);
    }
  }, [selectedIndustry]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/lg/companies/byindustry/${selectedIndustry}`);
      setCompanies(res.data.companies || []);
    } catch (err) {
      toast.error('Failed to fetch companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !selectedIndustry) {
      toast.error('Please enter a company name and select an industry');
      return;
    }

    const action = editingId ? 'Updating' : 'Creating';

    try {
      await toast.promise(
        editingId
          ? axios.put(`${API_BASE}/admin/companies/${editingId}`, {
              name: companyName,
              industryId: selectedIndustry,
            })
          : axios.post(`${API_BASE}/admin/companies`, {
              name: companyName,
              industryId: selectedIndustry,
            }),
        {
          loading: `${action} company...`,
          success: editingId ? 'Company updated' : 'Company created',
          error: 'Failed to save company',
        }
      );

      setCompanyName('');
      setEditingId(null);
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm('Are you sure you want to delete this company?');
    if (!confirm) return;

    try {
      await toast.promise(
        axios.delete(`${API_BASE}/admin/companies/${id}`),
        {
          loading: 'Deleting company...',
          success: 'Company deleted',
          error: 'Error deleting company',
        }
      );
      setCompanies((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-12 bg-white shadow-lg rounded-2xl mt-8">
      <AdminNavbar/>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Company Management</h1>

      {/* Industry Dropdown */}
      <div className="mb-6">
        <label className="block mb-2 text-gray-700 font-medium">Select Industry</label>
        <select
          value={selectedIndustry}
          onChange={(e) => {
            setSelectedIndustry(e.target.value);
            setCompanyName('');
            setEditingId(null);
          }}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Industry --</option>
          {industries.map((ind) => (
            <option key={ind._id} value={ind._id}>
              {ind.name || 'Unnamed Industry'}
            </option>
          ))}
        </select>
      </div>

      {/* Form */}
      {selectedIndustry && (
        <form onSubmit={handleSubmit} className="mb-8 flex flex-col sm:flex-row gap-4 items-start">
          <input
            type="text"
            placeholder="Enter Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {editingId ? 'Update' : 'Add'} Company
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setCompanyName('');
                setEditingId(null);
              }}
              className="bg-gray-500 text-white px-5 py-3 rounded-lg hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          )}
        </form>
      )}

      {/* Company List */}
      {selectedIndustry && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Companies</h2>
          {loading ? (
            <p className="text-gray-500">Loading companies...</p>
          ) : companies.length === 0 ? (
            <p className="text-gray-500">No companies found for this industry.</p>
          ) : (
            <ul className="space-y-4">
              {companies.map((company) => (
                <li
                  key={company._id}
                  className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition"
                >
                  <span className="text-lg text-gray-800 font-medium">
                    {company.CompanyName || company.name || 'Unnamed Company'}
                  </span>
                  <div className="flex gap-4 text-lg">
                    <button
                      onClick={() => {
                        setCompanyName(company.name);
                        setEditingId(company._id);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(company._id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
