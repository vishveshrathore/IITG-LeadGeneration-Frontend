import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { FiEdit2, FiTrash, FiCheck, FiX } from 'react-icons/fi';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import AdminNavbar from '../../components/AdminNavbar';
import { ClipLoader } from 'react-spinners';
import { BASE_URL } from "../../config"; 


const IndustryScreen = () => {
  const [industries, setIndustries] = useState([]);
  const [industryInput, setIndustryInput] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const fetchIndustries = async () => {
    setLoading(true);
    try {
      const res = searchQuery
        ? await axios.get(`${BASE_URL}/api/admin/industries/search?name=${searchQuery}`)
        : await axios.get(`${BASE_URL}/api/admin/industries?page=${page}`);

      const data = res.data;
      const list = Array.isArray(data) ? data : data.industries || [];
      setIndustries(list);

      if (!searchQuery) {
        const countRes = await axios.get(`${BASE_URL}/api/admin/industries/count`);
        setCount(countRes.data.count);
      }
    } catch (err) {
      toast.error('Failed to fetch industries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustries();
  }, [page, searchQuery]);

  const handleAdd = async () => {
    if (!industryInput.trim()) return toast.error('Enter a valid industry name');
    try {
      await axios.post(`${BASE_URL}/api/admin/industries`, { name: industryInput.trim() });
      toast.success('Industry added');
      setIndustryInput('');
      fetchIndustries();
    } catch (err) {
      toast.error('Failed to add industry');
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return toast.error('Name cannot be empty');
    if (!window.confirm('Confirm update?')) return;
    try {
      await axios.put(`${BASE_URL}/api/admin/industries/${id}`, { name: editName.trim() });
      toast.success('Industry updated');
      setEditId(null);
      setEditName('');
      fetchIndustries();
    } catch (err) {
      toast.error('Failed to update industry');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this industry?')) return;
    try {
      await axios.delete(`${BASE_URL}/api/admin/industries/${id}`);
      toast.success('Industry deleted');
      fetchIndustries();
    } catch (err) {
      toast.error('Failed to delete industry');
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminNavbar />
      <Toaster position="top-right" />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Industry Management</h1>
        <p className="text-gray-500">Total industries: {count}</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search industries..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="px-3 py-2 border border-gray-300 rounded-lg w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex w-full md:w-1/2 gap-2">
          <input
            type="text"
            placeholder="Add new industry"
            value={industryInput}
            onChange={(e) => setIndustryInput(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg w-full focus:outline-none"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <ClipLoader color="#3B82F6" size={40} />
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {industries.length === 0 ? (
                <tr>
                  <td colSpan="2" className="text-center px-6 py-4 text-gray-500">
                    No industries found. Try adding one!
                  </td>
                </tr>
              ) : (
                industries.map((industry) => (
                  <tr key={industry._id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {editId === industry._id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border px-2 py-1 rounded-md w-full"
                        />
                      ) : (
                        industry.name
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {editId === industry._id ? (
                        <>
                          <button
                            onClick={() => handleEdit(industry._id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <FiX />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditId(industry._id);
                              setEditName(industry.name);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDelete(industry._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!searchQuery && (
        <div className="mt-6 flex justify-center items-center space-x-4">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-gray-700 font-medium">
            Page {page} / {Math.ceil(count / 10) || 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default IndustryScreen;