import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiUser, FiLogOut, FiMenu } from 'react-icons/fi';
import { BsFillPersonPlusFill } from 'react-icons/bs';
import { AnimatePresence, motion } from 'framer-motion';
import useSound from 'use-sound';
import clickSound from '../assets/click.mp3';

const navItems = [
  { name: 'Home', icon: <FiHome />, path: '/lgDashboard' },
  { name: 'Add Lead', icon: <BsFillPersonPlusFill />, path: '/lg/addlead' },
  { name: 'Profile', icon: <FiUser />, path: '/lg/profile' },
];

const AnimatedLGNavbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [playClick] = useSound(clickSound, { volume: 0.3 });

  const toggleMenu = () => {
    playClick();
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  return (
    <motion.nav
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 md:px-8 py-3 flex items-center justify-between shadow-sm"
    >

      {/* Logo */}
      <motion.h1
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3"
    >

      {/* Animated Company Name */}
      <motion.span
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
        className="relative font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-[length:200%_100%] bg-clip-text text-transparent"
      >
        <motion.span
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear"
          }}
          className="bg-gradient-to-r from-gray-900 via-gray-500 to-gray-900 bg-[length:200%_100%] bg-clip-text text-transparent"
        >
          IITGIndianJobs.com
        </motion.span>

        {/* Underline Sweep */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.8, duration: 0.6, ease: "easeInOut" }}
          className="absolute -bottom-1 left-0 h-[2px] bg-gradient-to-r from-black-500 to-blue-300"
        />
      </motion.span>
    </motion.h1>

      


      {/* Logo end */}
      {/* Mobile menu toggle */}
      <button
        className="md:hidden text-2xl text-gray-600"
        onClick={toggleMenu}
      >
        <FiMenu />
      </button>

      {/* Desktop nav */}
      <div className="hidden md:flex gap-6 items-center relative">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Link
                to={item.path}
                onClick={playClick}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive ? 'text-blue-600' : 'text-gray-600 hover:text-blue-500'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-blue-100 rounded-md -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
          );
        })}

        <button
          onClick={() => {
            playClick();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 rounded-md transition"
        >
          <FiLogOut /> Logout
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-full left-0 right-0 bg-white border-b shadow-md flex flex-col md:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => {
                  setIsOpen(false);
                  playClick();
                }}
                className={`flex items-center gap-3 px-6 py-3 border-t text-sm font-medium ${
                  location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon} {item.name}
              </Link>
            ))}

            {/* Mobile Logout */}
            <button
              onClick={() => {
                playClick();
                setIsOpen(false);
                setShowModal(true);
              }}
              className="flex items-center gap-3 px-6 py-3 border-t text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <FiLogOut /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]"
          >
            <motion.div
              initial={{ scale: 0.8, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm border border-gray-200"
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Confirm Logout
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to log out?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default AnimatedLGNavbar;
