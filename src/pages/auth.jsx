import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { MdAdminPanelSettings, MdPersonAddAlt1 } from 'react-icons/md';
import { ImSpinner2 } from 'react-icons/im';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext'; 
import { BASE_URL } from "../config"; 

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
  const { authToken, login } = useAuth(); 

  // Set Axios default header whenever authToken changes
  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [authToken]);

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
        const res = await axios.post(`${BASE_URL}/api/login`, {
          email: form.email,
          password: form.password
        });

        const { token, role, id, name, reportsTo, email } = res.data;
        // Ensure a meaningful name even if backend name is missing
        const safeName = (name && String(name).trim()) || (email ? String(email).split('@')[0] : 'User');
        const userDetails = { id, name: safeName, reportsTo, email };

        // Store in context
        login(token, role, userDetails, rememberMe);

        toast.success('Login successful!');

        setTimeout(() => {
          const r = (role || '').toLowerCase();
          if (r === 'admin') navigate('/adminDashboard');
          else if (r === 'lg') navigate('/lgDashboard');
          else if (r === 'cre-crm') navigate('/CRE-CRMDashboard');
          else if (r === 'crm-teamlead') navigate('/CRE-CRMDashboard');
          else if (r === 'regionalhead') navigate('/CRE-CRMDashboard');
          else if (r === 'nationalhead') navigate('/CRE-CRMDashboard');
          else if (r === 'adminteam') navigate('/adminteam/dashboard');
          else toast.error(`Unknown role: ${role}`);
        }, 500);

      } else {
        const res = await axios.post(`${BASE_URL}/api/signup`, {
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

  // Change Password state
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpForm, setCpForm] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });

  const handleCpChange = (e) => setCpForm({ ...cpForm, [e.target.name]: e.target.value });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!authToken) {
      toast.error('Please login first to change password');
      return;
    }
    const { oldPassword, newPassword, confirmNewPassword } = cpForm;
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please fill all change password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      setCpLoading(true);
      await axios.put(`${BASE_URL}/api/change-password`, { oldPassword, newPassword });
      toast.success('Password changed successfully');
      setCpForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
      setShowChangePwd(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setCpLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen font-sans">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Left Banner */}
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

      {/* Form */}
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
            <div className="flex gap-3 items-start justify-between">
              <label className="block text-gray-700 text-sm font-medium">Select Role</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                {/* <button
                  type="button"
                  onClick={() => setSelectedRole('Admin')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition ${
                    selectedRole === 'Admin'
                      ? 'bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <MdAdminPanelSettings size={14} /> Admin
                </button> */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('LG')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition ${
                    selectedRole === 'LG'
                      ? 'bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <MdPersonAddAlt1 size={14} /> LG
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('CRE-CRM')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition ${
                    selectedRole === 'CRE-CRM'
                      ? 'bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <MdPersonAddAlt1 size={14} /> CRE-CRM
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('AdminTeam')}
                  className={`flex items-center gap-1 py-1 text-xs rounded-full border transition ${
                    selectedRole === 'AdminTeam'
                      ? 'bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <MdPersonAddAlt1 size={14} /> AdminTeam
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2"
                />
                <label>Remember Me</label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowForgot((s) => !s)}
                  className="text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangePwd((s) => !s)}
                  className="text-blue-600 hover:underline"
                >
                  Change Password
                </button>
              </div>
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
        {isLogin && <ForgotPasswordModal show={showForgot} setShow={setShowForgot} />}
        {isLogin && showChangePwd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowChangePwd(false)} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
                <button onClick={() => setShowChangePwd(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Old Password</label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={cpForm.oldPassword}
                    onChange={handleCpChange}
                    className="mt-1 w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={cpForm.newPassword}
                    onChange={handleCpChange}
                    className="mt-1 w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={cpForm.confirmNewPassword}
                    onChange={handleCpChange}
                    className="mt-1 w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cpLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  {cpLoading ? <ImSpinner2 className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

// Modal: Forgot Password
const ForgotPasswordModal = (props) => {
  const isControlled = typeof props?.show === 'boolean' && typeof props?.setShow === 'function';
  const [internalShow, setInternalShow] = useState(false);
  const show = isControlled ? props.show : internalShow;
  const setShow = isControlled ? props.setShow : setInternalShow;
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const sendOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    try {
      setIsSending(true);
      await axios.post(`${BASE_URL}/api/forgot-password`, { email });
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsSending(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return toast.error('Please fill all reset password fields');
    }
    if (newPassword.length < 6) return toast.error('New password too short');
    if (newPassword !== confirmNewPassword) return toast.error('New passwords do not match');
    try {
      setIsResetting(true);
      await axios.post(`${BASE_URL}/api/reset-password`, { email, otp, newPassword });
      toast.success('Password reset successfully. Please login.');
      setOtp(''); setNewPassword(''); setConfirmNewPassword('');
      setShow(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShow(false)} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white w-full max-w-3xl mx-4 rounded-2xl shadow-2xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Forgot Password</h3>
          <button onClick={() => setShow(false)} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={sendOtp} className="bg-white p-0 rounded-xl space-y-3">
            <h4 className="font-semibold text-gray-800 text-sm">Send OTP</h4>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {isSending ? <ImSpinner2 className="animate-spin" /> : 'Send OTP'}
            </button>
          </form>
          <form onSubmit={resetPassword} className="bg-white p-0 rounded-xl space-y-3">
            <h4 className="font-semibold text-gray-800 text-sm">Reset Password</h4>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isResetting}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {isResetting ? <ImSpinner2 className="animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
