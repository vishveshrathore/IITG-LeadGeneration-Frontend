import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import AuthScreen from "./pages/auth.jsx";
import BDDashboard from "./pages/Admin/BD-Dashboard.jsx";
import LGDashboard from "./pages/LG/LGDashboard.jsx";
import WrongNumberLeads from "./pages/LG/WrongNumberLeads.jsx";
import RejectedLeads from "./pages/LG/RejectedLeads.jsx";
import OTPScreen from "./pages/OTPScreen.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import AddHrForm from "./pages/LG/AddLeads.jsx";
import TodayLeadsOfLG from "./pages/LG/TodaysLead.jsx";
import IndustryScreen from "./pages/Admin/Industries.jsx";
import CompanyManagement from "./pages/Admin/Companies.jsx";
import ManageLeads from "./pages/Admin/ManageLeads.jsx";
import ViewLeads from "./pages/Admin/ViewLeads.jsx";
import RawLeadsLG from "./pages/LG/RawLeads.jsx";
import RawLeadManager from "./pages/Admin/RawLeads.jsx";
import DashboardAddLeads from "./pages/LG/DashboardAddLeads.jsx";
import Profile from "./pages/LG/Profile.jsx";
import RawLeadsDashboard from "./pages/Admin/RawLeadsDashboard.jsx";
import TempRawLeadsDashboard from "./pages/Admin/RawLeadsUpload&Approve.jsx";
import AccountsApproval from "./pages/Admin/AccountApproval.jsx"; //Admin Side
import CRELeadsApprovalDashboard from "./pages/Admin/CreFinalApproval.jsx"; //Admin Side
import CreDashboard from "./pages/Admin/CreDashboard.jsx"; //Admin Side
import PriorityAssignLeads from "./pages/Admin/Prioritypage.jsx"; //Admin Side
import LGAccessControl from "./pages/Admin/LGAccessControl.jsx"; //Admin Side
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx"; //Admin Side - New Dashboard
import AccessAndRolesHub from "./pages/Admin/AccessAndRolesHub.jsx";
import ToolsDashboard from "./pages/Admin/Tools/ToolsDashboard.jsx"; //Tools Dashboard
import NaukriParser from "./components/NaukriParser.jsx"; //Naukri Parser Component
import LinkedInPParser from "./components/LinkedInPParser.jsx"; //LinkedIn Parser Component
import CorporateAccountApproval from "./pages/Admin/CorporateAccountApproval.jsx"; //Admin Side
import RecruitersIndustries from "./pages/Admin/RecruitersIndustries.jsx"; // Admin - BDE & Recruitment Industries
import RecruitersCompanies from "./pages/Admin/RecruitersCompanies.jsx"; // Admin - BDE & Recruitment Companies
import CRECalledData from "./pages/Admin/CRECalledData.jsx"; // Admin - CRE Leads Working Dashboard

import CreCrmDashboard from "./pages/CRE-CRM/CRE-CRMDashboard.jsx"; //CRE Side
import LeadAssignment from "./pages/CRE-CRM/GetAssignedLeads.jsx"; //CRE Side
import TodaysFollowup from "./pages/CRE-CRM/TodaysFollowup.jsx"; //CRE Side
import PositiveLead from "./pages/CRE-CRM/PositiveLead.jsx"; //CRE Side
import MyWorksheet from "./pages/CRE-CRM/Worksheet.jsx"; //CRE Side

import ClousureProspects from "./pages/CRE-CRM/ClousureProspects.jsx"; //CRE Side
import ClosureTillDate from "./pages/CRE-CRM/ClosureTillDate.jsx"; //CRE Side
import MyTeam from "./pages/CRE-CRM/MyTeam.jsx"; //CRE Side - Team page
import TeamStats from "./pages/CRE-CRM/TeamStats.jsx";

import AdminTeamDashboard from "./pages/AdminTeam/AdminTeamDashboard.jsx"; 
import DisabledLGRejectedLeads from "./pages/AdminTeam/DisabledLGRejectedLeads.jsx";
import DisabledLGWrongNumber from "./pages/AdminTeam/DisabledLGWrongNumber.jsx";
import RecruitmentDashboard from "./pages/Admin/Recruitment/RecruitmentDashboard.jsx";
import PositionMIS from "./pages/Admin/Recruitment/PositionMIS.jsx";
import PositionDashboard from "./pages/Admin/Recruitment/PositionDashboard.jsx";
import DataAnalystDashboard from "./pages/DataAnalyst/DataAnalystDashboard.jsx";
import LGStats from "./pages/Admin/LGStats.jsx";

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
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


        {/* Admin routes */}
        <Route
          path="/BD-Dashboard"
          element={
            <ProtectedRoute role="admin">
              <BDDashboard />
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
          path="/admin/recruiters/industries"
          element={
            <ProtectedRoute role="admin">
              <RecruitersIndustries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recruiters/companies"
          element={
            <ProtectedRoute role="admin">
              <RecruitersCompanies />
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
          path="/admin/lg-stats"
          element={
            <ProtectedRoute role="admin">
              <LGStats />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/PriorityAssignLeads"
          element={
            <ProtectedRoute role="admin">
              <PriorityAssignLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cre-called-data"
          element={
            <ProtectedRoute role="admin">
              <CRECalledData />
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
        <Route path="/lg/addlead" element={<AddHrForm />} />
        <Route
          path="/lg/viewtodaysleads"
          element={
            <ProtectedRoute role="lg">
              <TodayLeadsOfLG />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lg/rejected"
          element={
            <ProtectedRoute role="lg">
              <RejectedLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lg/wrong-number"
          element={
            <ProtectedRoute role="lg">
              <WrongNumberLeads />
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
    <ProtectedRoute roles={["admin", "adminteam"]}>
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
          path="/admin/accountapproval"
          element={
            <ProtectedRoute role="admin">
              <AccountsApproval />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/lgAccessControl"
          element={
            <ProtectedRoute role="admin">
              <LGAccessControl />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/access-and-roles"
          element={
            <ProtectedRoute role="admin">
              <AccessAndRolesHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/CRE-CRMDashboard"
          element={
            <ProtectedRoute roles={[
              "cre-crm",
              "crm-teamlead",
              "deputycrm-teamlead",
              "regionalhead",
              "deputyregionalhead",
              "nationalhead",
              "deputynationalhead"
            ]}>
              <CreCrmDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cre/myteam"
          element={
            <ProtectedRoute role="cre-crm">
              <MyTeam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cre/team-stats"
          element={
            <ProtectedRoute role="cre-crm">
              <TeamStats />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creassignedlead"
          element={
            <ProtectedRoute role="cre-crm">
              <LeadAssignment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cre/followups"
          element={
            <ProtectedRoute role="cre-crm">
              <TodaysFollowup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cre/positiveleads"
          element={
            <ProtectedRoute role="cre-crm">
              <PositiveLead />
            </ProtectedRoute>
          }
        />
        
         <Route
          path="/cre/worksheet"
          element={
            <ProtectedRoute role="cre-crm">
              <MyWorksheet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cre/closureprospects"
          element={
            <ProtectedRoute role="cre-crm">
              <ClousureProspects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cre/closure-till-date"
          element={
            <ProtectedRoute role="cre-crm">
              <ClosureTillDate />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/adminteam/dashboard"
          element={
            <ProtectedRoute role="adminteam">
              <AdminTeamDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dataanalyst/dashboard"
          element={
            <ProtectedRoute role="dataanalyst">
              <DataAnalystDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminteam/disabled-lg-rejected"
          element={
            <ProtectedRoute role="adminteam">
              <DisabledLGRejectedLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminteam/disabled-lg-wrong-number"
          element={
            <ProtectedRoute role="adminteam">
              <DisabledLGWrongNumber />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools/dashboard"
          element={
            <ProtectedRoute role="admin">
              <ToolsDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/naukri-parser"
          element={
            <ProtectedRoute roles={["admin", "dataanalyst"]}>
              <NaukriParser />
            </ProtectedRoute>
          }
        />


        <Route
          path="/linkedin-parser"
          element={
            <ProtectedRoute roles={["admin", "dataanalyst"]}>
              <LinkedInPParser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/corporate-account-approval"
          element={
            <ProtectedRoute role="admin">
              <CorporateAccountApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recruitment"
          element={
            <ProtectedRoute role="admin">
              <RecruitmentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recruitment/position-mis"
          element={
            <ProtectedRoute role="admin">
              <PositionMIS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recruitment/position/:id"
          element={
            <ProtectedRoute role="admin">
              <PositionDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
