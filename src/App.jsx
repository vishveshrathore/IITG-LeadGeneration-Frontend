import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AuthScreen from './pages/auth.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import LGDashboard from './pages/LG/LGDashboard.jsx';
import OTPScreen from './pages/OTPScreen.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import AddHrForm from './pages/LG/AddLeads.jsx';
import TodayLeadsOfLG from './pages/LG/TodaysLead.jsx';
import IndustryScreen from './pages/Admin/Industries.jsx';
import CompanyManagement from './pages/Admin/Companies.jsx';
import ManageLeads from './pages/Admin/ManageLeads.jsx';
import ViewLeads from './pages/Admin/ViewLeads.jsx';
import RawLeadsLG from './pages/LG/RawLeads.jsx';
import RawLeadManager from './pages/Admin/RawLeads.jsx';
import DashboardAddLeads from './pages/LG/DashboardAddLeads.jsx';
import Profile from './pages/LG/Profile.jsx';
import RawLeadsDashboard from './pages/Admin/RawLeadsDashboard.jsx';
import TempRawLeadsDashboard from './pages/Admin/RawLeadsUpload&Approve.jsx';
import CRELeadsApprovalDashboard from './pages/Admin/CreFinalApproval.jsx';  //Admin Side
import CreDashboard from './pages/Admin/CreDashboard.jsx'; //Admin Side
import PriorityAssignLeads from './pages/Admin/Prioritypage.jsx'; //Admin Side

import CreCrmDashboard from './pages/CRE-CRM/CRE-CRMDashboard.jsx'; //CRE Side
import LeadAssignment from './pages/CRE-CRM/GetAssignedLeads.jsx'; //CRE Side

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<AuthScreen />} />
        <Route path="/otp" element={<OTPScreen />} />

        {/* Admin routes */}
        <Route
          path="/adminDashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/industries"
          element={
            <ProtectedRoute role="admin">
              <IndustryScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/companies"
          element={
            <ProtectedRoute role="admin">
              <CompanyManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leads"
          element={
            <ProtectedRoute role="admin">
              <ManageLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/viewleads"
          element={
            <ProtectedRoute role="admin">
              <ViewLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/view/rawleads"
          element={
            <ProtectedRoute role="admin">
              <RawLeadManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rawleadsDashboard"
          element={
            <ProtectedRoute role="admin">
              <RawLeadsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/temprawleadsDashboard"
          element={
            <ProtectedRoute role="admin">
              <TempRawLeadsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/PriorityAssignLeads"
          element={
            <ProtectedRoute role="admin">
              < PriorityAssignLeads/>
            </ProtectedRoute>
          }
        />

        {/* LG routes */}
        <Route
          path="/lgDashboard"
          element={
            <ProtectedRoute role="lg">
              <LGDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lg/addlead"
          element={
              <AddHrForm />
          }
        />
        <Route
          path="/lg/viewtodaysleads"
          element={
            <ProtectedRoute role="lg">
              <TodayLeadsOfLG />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lg/rawlead"
          element={
            <ProtectedRoute role="lg">
              <RawLeadsLG />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lg/dashboard"
          element={
            <ProtectedRoute role="lg">
              <DashboardAddLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lg/profile"
          element={
            <ProtectedRoute role="lg">
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/CreDashboard"
          element={
            <ProtectedRoute role="admin">
              <CRELeadsApprovalDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
  path="/creDashboard"
  element={
    <ProtectedRoute role="admin">
      <CreDashboard />
    </ProtectedRoute>
  }
/>


        <Route
          path="/CRE-CRMDashboard"
          element={
            <ProtectedRoute role="cre">
              <CreCrmDashboard />
            </ProtectedRoute>
          }
          />
          <Route
          path="/creassignedlead"
          element={
            <ProtectedRoute role="cre">
              <LeadAssignment />
            </ProtectedRoute>
          }
          />

        LeadAssignment
      </Routes>
    </AnimatePresence>
  );
}

export default App;
