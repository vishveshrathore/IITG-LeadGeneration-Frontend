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

const AnimatedLGNavbar = ({ onLogout }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [playClick] = useSound(clickSound, { volume: 0.3 });

  const toggleMenu = () => {
    playClick();
    setIsOpen(!isOpen);
  };

  return (
    <motion.nav
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 md:px-8 py-3 flex items-center justify-between shadow-sm"
    >
      <h1 className="text-xl font-bold text-black-600 tracking-tight">IITGJobs.com</h1>

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
            onLogout();
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
            <button
              onClick={() => {
                playClick();
                setIsOpen(false);
                onLogout();
              }}
              className="flex items-center gap-3 px-6 py-3 border-t text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <FiLogOut /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default AnimatedLGNavbar;
