// src/components/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -40 },
};

const Layout = ({ location }) => {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.4 }}
        className="min-h-screen bg-gray-50"
      >
        <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
          <div className="text-2xl font-bold text-blue-700">IITGJobs</div>
          <span className="text-sm text-gray-500">Recruitment Redefined</span>
        </header>

        <main className="p-4">
          <Outlet />
        </main>
      </motion.div>
    </AnimatePresence>
  );
};

export default Layout;
