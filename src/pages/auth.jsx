import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { ImSpinner2 } from 'react-icons/im';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext'; 
import { BASE_URL } from "../config"; 

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    altMobile: '',
    photo: null,
    currentAddress: '',
    permanentAddress: '',
    nominee1Name: '',
    nominee1Email: '',
    nominee1Mobile: '',
    nominee1Relation: '',
    nominee2Name: '',
    nominee2Email: '',
    nominee2Mobile: '',
    nominee2Relation: ''
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

  // Register segmented form state
  const [registerSegment, setRegisterSegment] = useState('basic'); // basic | contact | nominee1 | nominee2
  const segmentOrder = ['basic', 'contact', 'nominee1', 'nominee2'];
  const nextSegment = () => {
    const idx = segmentOrder.indexOf(registerSegment);
    if (idx < segmentOrder.length - 1) setRegisterSegment(segmentOrder[idx + 1]);
  };
  const prevSegment = () => {
    const idx = segmentOrder.indexOf(registerSegment);
    if (idx > 0) setRegisterSegment(segmentOrder[idx - 1]);
  };
  const canProceed = () => {
    if (registerSegment === 'basic') {
      if (!form.name || !form.email || !form.password || !form.confirmPassword) {
        toast.error('Please complete Basic details');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match.');
        return false;
      }
    }
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setForm({ ...form, [e.target.name]: file });
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Prevent accidental submits during multi-step registration
    // Only allow submit on the final step (nominee2)
    if (!isLogin && registerSegment !== 'nominee2') {
      return;
    }

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
          const rn = r.replace(/[^a-z]/g, ''); // normalize by removing non-letters

          if (rn === 'admin') navigate('/adminDashboard');
          else if (rn === 'lg') navigate('/lgDashboard');
          else if (rn === 'crecrm') navigate('/CRE-CRMDashboard');
          else if (rn === 'crmteamlead') navigate('/CRE-CRMDashboard');
          else if (rn === 'deputycrmteamlead') navigate('/CRE-CRMDashboard');
          else if (rn === 'regionalhead') navigate('/CRE-CRMDashboard');
          else if (rn === 'deputyregionalhead') navigate('/CRE-CRMDashboard');
          else if (rn === 'nationalhead') navigate('/CRE-CRMDashboard');
          else if (rn === 'deputynationalhead') navigate('/CRE-CRMDashboard');
          else if (rn === 'adminteam') navigate('/adminteam/dashboard');
          else if (rn === 'dataanalyst') navigate('/dataanalyst/dashboard');
          else if (rn === 'recruitmentqcmanager') navigate('/recruitment-qc/dashboard');
          // HR roles
          else if (rn === 'hroperations' || rn === 'hroperation') navigate('/hr-operations/dashboard');
          else if (rn === 'hrrecruiter' || rn === 'hrrecuriter') navigate('/hr-recruiter/dashboard');
          else toast.error(`Unknown role: ${role}`);
        }, 500);

      } else {
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('email', form.email);
        fd.append('password', form.password);
        if (form.employeeId) fd.append('employeeId', form.employeeId);
        if (form.mobile) fd.append('mobile', form.mobile);
        if (form.altMobile) fd.append('altMobile', form.altMobile);
        if (form.currentAddress) fd.append('address', form.currentAddress);
        if (form.currentAddress) fd.append('currentAddress', form.currentAddress);
        if (form.permanentAddress) fd.append('permanentAddress', form.permanentAddress);
        // Nominee 1
        if (form.nominee1Name) fd.append('nominee1Name', form.nominee1Name);
        if (form.nominee1Email) fd.append('nominee1Email', form.nominee1Email);
        if (form.nominee1Mobile) fd.append('nominee1Mobile', form.nominee1Mobile);
        if (form.nominee1Relation) fd.append('nominee1Relation', form.nominee1Relation);
        // Nominee 2
        if (form.nominee2Name) fd.append('nominee2Name', form.nominee2Name);
        if (form.nominee2Email) fd.append('nominee2Email', form.nominee2Email);
        if (form.nominee2Mobile) fd.append('nominee2Mobile', form.nominee2Mobile);
        if (form.nominee2Relation) fd.append('nominee2Relation', form.nominee2Relation);
        if (form.photo) fd.append('photo', form.photo);

        const res = await axios.post(`${BASE_URL}/api/signup`, fd);

        toast.success(res.data.message);
        navigate('/otp', { state: { email: form.email } });
      }

    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (label, name, type = 'text', showToggle = false, compact = false) => {
    const mobileField = ['mobile', 'altMobile', 'nominee1Mobile', 'nominee2Mobile'].includes(name);
    const placeholders = {
      name: '',
      email: '',
      employeeId: '',
      password: '',
      confirmPassword: '',
      mobile: '',
      altMobile: '',
      nominee1Name: '',
      nominee1Email: '',
      nominee1Mobile: '',
      nominee1Relation: '',
      nominee2Name: '',
      nominee2Email: '',
      nominee2Mobile: '',
      nominee2Relation: '',
    };
    return (
      <div className="relative">
        <label className={`block text-gray-700 mb-1 ${compact ? 'text-xs' : 'text-sm'} font-medium`}>{label}</label>
        <input
          type={showToggle ? (showPassword ? 'text' : 'password') : type}
          name={name}
          autoComplete="off"
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholders[name] || ''}
          inputMode={mobileField ? 'numeric' : undefined}
          pattern={mobileField ? '[0-9]*' : undefined}
          maxLength={mobileField ? 10 : undefined}
          className={`mt-1 w-full ${compact ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-2 rounded-xl'} border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
        />
        {showToggle && (
          <span
            className={`absolute ${compact ? 'right-3 top-8' : 'right-4 top-9'} cursor-pointer text-gray-500`}
            title={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
          </span>
        )}
      </div>
    );
  };

  const renderTextarea = (label, name, rows = 3, compact = false) => (
    <div>
      <label className={`block text-gray-700 mb-1 ${compact ? 'text-xs' : 'text-sm'} font-medium`}>{label}</label>
      <textarea
        name={name}
        rows={rows}
        value={form[name]}
        onChange={handleChange}
        placeholder={name.includes('Address') ? 'House No, Street, City, State, PIN' : ''}
        className={`mt-1 w-full ${compact ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-2 rounded-xl'} border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
      />
    </div>
  );

  const renderFile = (label, name, accept = 'image/*', compact = false) => (
    <div>
      <label className={`block text-gray-700 mb-1 ${compact ? 'text-xs' : 'text-sm'} font-medium`}>{label}</label>
      <input
        type="file"
        name={name}
        accept={accept}
        onChange={handleFileChange}
        className={`mt-1 w-full ${compact ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-2 rounded-xl'} border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
      />
      {form[name] && typeof form[name] !== 'string' && (
        <p className="text-xs text-gray-500 mt-1">Selected: {form[name]?.name} (max ~2MB)</p>
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
          IITGJobs.com Pvt. Ltd.
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
      <div className="flex-1 flex items-center justify-center bg-white px-8 relative overflow-auto">
        <motion.form
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          onSubmit={(e) => { if (isLogin) handleSubmit(e); else e.preventDefault(); }}
          onKeyDown={(e) => { if (!isLogin && e.key === 'Enter') { e.preventDefault(); } }}
          className={`w-full max-w-md ${!isLogin ? 'space-y-3 p-6' : 'space-y-4 p-10'} bg-white rounded-2xl shadow-xl border border-gray-100`}
        >
          <h2 className={`font-bold text-gray-800 ${!isLogin ? 'text-2xl' : 'text-3xl'}`}>
            {isLogin ? 'Welcome Back' : 'Register'}
          </h2>
          <p className={`${!isLogin ? 'text-xs' : 'text-sm'} text-gray-600`}>
            {isLogin
              ? 'Please log in to access your dashboard.'
              : 'Create your account to get started.'}
          </p>

          {isLogin && (
            <>
              {renderInput('Email Address', 'email', 'email')}
              {renderInput('Password', 'password', 'password', true)}
            </>
          )}

          

          {/* Segmented Register Form (only for Register) */}
          {!isLogin && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => setRegisterSegment('basic')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${registerSegment==='basic' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Basic</button>
                <button type="button" onClick={() => setRegisterSegment('contact')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${registerSegment==='contact' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Contact & Address</button>
                <button type="button" onClick={() => setRegisterSegment('nominee1')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${registerSegment==='nominee1' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Nominee 1</button>
                <button type="button" onClick={() => setRegisterSegment('nominee2')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${registerSegment==='nominee2' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>Nominee 2</button>
              </div>
              <div className="text-xs text-gray-600">Step {segmentOrder.indexOf(registerSegment)+1} of {segmentOrder.length}</div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${((segmentOrder.indexOf(registerSegment)+1)/segmentOrder.length)*100}%` }}
                />
              </div>
              <motion.div key={registerSegment} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {registerSegment === 'basic' && (
                  <div className="grid grid-cols-1 gap-3 border rounded-xl p-3">
                    {renderInput('Full Name', 'name', 'text', false, true)}
                    {renderInput('Employee ID', 'employeeId', 'text', false, true)}
                    {renderInput('Email Address', 'email', 'email', false, true)}
                    {renderInput('Password', 'password', 'password', true, true)}
                    {renderInput('Confirm Password', 'confirmPassword', 'password', true, true)}
                  </div>
                )}

                {registerSegment === 'contact' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-xl p-3">
                    {renderInput('Mobile', 'mobile', 'tel', false, true)}
                    {renderInput('Alternate Mobile', 'altMobile', 'tel', false, true)}
                    <div className="md:col-span-2">{renderFile('Photo', 'photo', 'image/*', true)}</div>
                    <div className="md:col-span-2">{renderTextarea('Current Address', 'currentAddress', 3, true)}</div>
                    <div className="md:col-span-2">{renderTextarea('Permanent Address', 'permanentAddress', 3, true)}</div>
                  </div>
                )}

                {registerSegment === 'nominee1' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-xl p-3">
                    {renderInput('Nominee 1 Name', 'nominee1Name', 'text', false, true)}
                    {renderInput('Nominee 1 Email', 'nominee1Email', 'email', false, true)}
                    {renderInput('Nominee 1 Mobile', 'nominee1Mobile', 'tel', false, true)}
                    {renderInput('Nominee 1 Relation', 'nominee1Relation', 'text', false, true)}
                  </div>
                )}

                {registerSegment === 'nominee2' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-xl p-3">
                    {renderInput('Nominee 2 Name', 'nominee2Name', 'text', false, true)}
                    {renderInput('Nominee 2 Email', 'nominee2Email', 'email', false, true)}
                    {renderInput('Nominee 2 Mobile', 'nominee2Mobile', 'tel', false, true)}
                    {renderInput('Nominee 2 Relation', 'nominee2Relation', 'text', false, true)}
                  </div>
                )}
              </motion.div>
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

          {isLogin ? (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-semibold transition duration-300 shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? <ImSpinner2 className="animate-spin" /> : 'Login'}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={prevSegment}
                disabled={segmentOrder.indexOf(registerSegment) === 0 || isLoading}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold border transition ${segmentOrder.indexOf(registerSegment) === 0 ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-sm'}`}
              >
                Prev
              </button>
              {segmentOrder.indexOf(registerSegment) < segmentOrder.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (canProceed()) nextSegment();
                  }}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-md hover:shadow-lg"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-md hover:shadow-lg"
                  onClick={() => handleSubmit()}
                >
                  {isLoading ? <ImSpinner2 className="animate-spin" /> : 'Sign Up'}
                </button>
              )}
            </div>
          )}

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