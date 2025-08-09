import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AuthScreen from './pages/auth.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import LGDashboard from './pages/LG/LGDashboard.jsx';
import OTPScreen from './pages/OTPScreen.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import AddHrForm from './pages/LG/AddLeads.jsx';
import TodayLeadsOfLG from './pages/LG/TodaysLead.jsx'
import IndustryScreen from './pages/Admin/Industries.jsx'
import CompanyManagement from './pages/Admin/Companies.jsx'
import ManageLeads from './pages/Admin/ManageLeads.jsx'
import ViewLeads from './pages/Admin/ViewLeads.jsx'
import RawLeadsLG from './pages/LG/RawLeads.jsx'
import RawLeadManager from './pages/Admin/RawLeads.jsx'
import DashboardAddLeads from './pages/LG/DashboardAddLeads.jsx'

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AuthScreen />} />
        <Route path="/otp" element={<OTPScreen />} />
        
        <Route
          path="/adminDashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lgDashboard"
          element={
            <ProtectedRoute role="lg">

              <LGDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/lg/addlead" element={<AddHrForm />} />
        <Route path="/lg/viewtodaysleads" element={<TodayLeadsOfLG />} />
        <Route path="/admin/industries" element={<IndustryScreen />} />
        <Route path="/admin/companies" element={<CompanyManagement />} />
        <Route path="/admin/leads" element={<ManageLeads />} />
        <Route path="/admin/viewleads" element={<ViewLeads />} />
        <Route path="/lg/rawlead" element={<RawLeadsLG />} />
        <Route path="/admin/rawleads" element={<RawLeadManager />} />
        <Route path="/lg/dashboard" element={<DashboardAddLeads />} />


      </Routes>
    </AnimatePresence>
  );
}

export default App;
