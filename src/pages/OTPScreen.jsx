import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaLock } from 'react-icons/fa';
import { BASE_URL } from "../config";


const OTPScreen = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);
  const inputsRef = React.useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setResendDisabled(false);
    }
  }, [timer]);

  const handleChange = (value, index) => {
    if (/^\d$/.test(value) || value === '') {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return alert('Please enter the complete 6-digit OTP.');

    try {
      const res = await axios.post(`${BASE_URL}/api/verify-otp`, { email, otp: code });
      alert(res.data.message);
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || 'OTP verification failed');
    }
  };

  const handleResend = async () => {
    try {
      await axios.post(`${baseUrl}/api/resend-otp`, { email });
      alert('OTP resent to your email.');
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      setResendDisabled(true);
      inputsRef.current[0].focus();
    } catch (error) {
      alert('Failed to resend OTP.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md border border-blue-200"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <FaLock className="text-blue-600 text-2xl" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800">OTP Verification</h2>
        <p className="text-sm text-center text-gray-500 mt-2 mb-6">
          Enter the 6-digit code sent to <strong>{email || 'your email'}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-12 h-12 text-center text-xl font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Verify OTP
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {resendDisabled ? (
            <span>Resend OTP in <strong>{timer}s</strong></span>
          ) : (
            <button
              onClick={handleResend}
              className="text-blue-600 hover:underline font-medium"
            >
              Resend OTP
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OTPScreen;