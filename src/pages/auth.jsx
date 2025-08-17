import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { MdAdminPanelSettings, MdPersonAddAlt1 } from 'react-icons/md';
import { ImSpinner2 } from 'react-icons/im';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext'; // ✅ Import context

const baseUrl = 'https://iitg-lead-generation-r4hmq.ondigitalocean.app'; // Update with your backend URL

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState('LG');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ Use login from context

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password || (!isLogin && (!form.name || !form.confirmPassword))) {
      toast.error('Please fill all required fields.');
      return;
    }

    if (!isLogin && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);

      if (isLogin) {
        const res = await axios.post(`${baseUrl}/api/login`, {
          email: form.email,
          password: form.password
        });

        const { token, role } = res.data;

        login(token, role, rememberMe); // ✅ update AuthContext

        toast.success('Login successful!');
        setTimeout(() => {
          if (role.toLowerCase() === 'admin') navigate('/adminDashboard');
          else if (role.toLowerCase() === 'lg') navigate('/lgDashboard');
          else toast.error('Unknown role');
        }, 500);
      } else {
        const res = await axios.post(`${baseUrl}/api/signup`, {
          name: form.name,
          email: form.email,
          password: form.password,
          role: selectedRole
        });

        toast.success(res.data.message);
        navigate('/otp', { state: { email: form.email } });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (label, name, type = 'text', showToggle = false) => (
    <div className="relative">
      <label className="block text-gray-700 mb-1 text-sm font-medium">{label}</label>
      <input
        type={showToggle ? (showPassword ? 'text' : 'password') : type}
        name={name}
        autoComplete="off"
        value={form[name]}
        onChange={handleChange}
        className="mt-1 w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      {showToggle && (
        <span
          className="absolute right-4 top-9 cursor-pointer text-gray-500"
          title={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen font-sans">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="flex-1 bg-gradient-to-br from-[#0E2A47] to-[#041630] text-white flex flex-col justify-center items-center px-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold text-center leading-tight"
        >
          IITGJobs.com
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-4 italic text-lg text-center max-w-sm"
        >
          "Recruitment Redefined. Your Growth, Our Mission."
        </motion.p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white px-8 relative overflow-hidden">
        <motion.form
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 bg-white p-10 rounded-2xl shadow-xl border border-gray-100"
        >
          <h2 className="text-3xl font-bold text-gray-800">
            {isLogin ? 'Welcome Back' : 'Join IITGJobs.com'}
          </h2>
          <p className="text-sm text-gray-600">
            {isLogin
              ? 'Please log in to access your dashboard.'
              : 'Create your account to get started.'}
          </p>

          {!isLogin && renderInput('Full Name', 'name')}
          {renderInput('Email Address', 'email', 'email')}
          {renderInput('Password', 'password', 'password', true)}
          {!isLogin && renderInput('Confirm Password', 'confirmPassword', 'password', true)}

          {!isLogin && (
            <div className="flex gap-4 items-center justify-between">
              <label className="block text-gray-700 text-sm font-medium">Select Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('Admin')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full border transition ${
                    selectedRole === 'Admin'
                      ? 'bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <MdAdminPanelSettings /> Admin
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('LG')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full border transition ${
                    selectedRole === 'LG'
                      ? 'bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <MdPersonAddAlt1 /> LG
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2"
              />
              <label>Remember Me</label>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-semibold transition duration-300 shadow-md flex items-center justify-center gap-2"
          >
            {isLoading ? <ImSpinner2 className="animate-spin" /> : isLogin ? 'Login' : 'Sign Up'}
          </button>

          <div className="text-center text-gray-600 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 font-medium hover:underline"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default AuthScreen;
