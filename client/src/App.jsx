import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DataDeletion from './pages/DataDeletion';

// Marketing pages
import Features from './pages/Features';
import Pricing  from './pages/Pricing';
import About    from './pages/About';
import Contact  from './pages/Contact';

// Super admin pages
import SuperDashboard from './pages/super-admin/Dashboard';
import SuperCompanies from './pages/super-admin/Companies';

// Company admin pages
import CompanyDashboard from './pages/company/Dashboard';
import CompanyEmployees from './pages/company/Employees';
import CompanyVisits from './pages/company/Visits';
import CompanyVisitors from './pages/company/Visitors';
import CompanySettings from './pages/company/Settings';
import CompanyServices from './pages/company/Services';
import Scheduling from './pages/company/Scheduling';
import Billing from './pages/company/Billing';
import Revisits from './pages/company/Revisits';

// Company user portal
import MyVisits from './pages/user-portal/MyVisits';
import UserDashboard from './pages/user-portal/UserDashboard';
import MySchedule from './pages/user-portal/MySchedule';

// Shared
import HelpPage from './pages/HelpPage';

// Visitor pages (public, no auth)
import VisitorMobile from './pages/visitor/MobileEntry';
import VisitorForm from './pages/visitor/VisitorForm';
import VisitorConfirmation from './pages/visitor/Confirmation';
import DisplayBoard from './pages/visitor/DisplayBoard';
import BookingPage from './pages/visitor/BookingPage';

// Layouts
import SuperAdminLayout from './components/layouts/SuperAdminLayout';
import CompanyLayout from './components/layouts/CompanyLayout';
import UserLayout from './components/layouts/UserLayout';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public auth */}
      <Route path="/login"            element={<Login />} />
      <Route path="/register"         element={<Register />} />
      <Route path="/verify-email"     element={<VerifyEmail />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />
      <Route path="/privacy-policy"   element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/data-deletion"    element={<DataDeletion />} />

      {/* Marketing pages */}
      <Route path="/features" element={<Features />} />
      <Route path="/pricing"  element={<Pricing />} />
      <Route path="/about"    element={<About />} />
      <Route path="/contact"  element={<Contact />} />

      {/* Visitor kiosk — public */}
      <Route path="/visit/:slug"              element={<VisitorMobile />} />
      <Route path="/visit/:slug/details"      element={<VisitorForm />} />
      <Route path="/visit/:slug/confirmation" element={<VisitorConfirmation />} />

      {/* TV display board — public */}
      <Route path="/display/:slug" element={<DisplayBoard />} />

      {/* Advance booking — public */}
      <Route path="/book/:slug"         element={<BookingPage />} />
      <Route path="/book/:slug/:action" element={<BookingPage />} />

      {/* Super Admin */}
      <Route path="/super-admin" element={
        <PrivateRoute roles={['super_admin']}><SuperAdminLayout /></PrivateRoute>
      }>
        <Route index element={<SuperDashboard />} />
        <Route path="companies" element={<SuperCompanies />} />
      </Route>

      {/* Company Admin */}
      <Route path="/dashboard" element={
        <PrivateRoute roles={['company_admin']}><CompanyLayout /></PrivateRoute>
      }>
        <Route index element={<CompanyDashboard />} />
        <Route path="employees"   element={<CompanyEmployees />} />
        <Route path="visits"      element={<CompanyVisits />} />
        <Route path="visitors"    element={<CompanyVisitors />} />
        <Route path="services"    element={<CompanyServices />} />
        <Route path="revisits"    element={<Revisits />} />
        <Route path="scheduling"  element={<Scheduling />} />
        <Route path="settings"    element={<CompanySettings />} />
        <Route path="billing"     element={<Billing />} />
        <Route path="help"        element={<HelpPage />} />
      </Route>

      {/* Company User Portal */}
      <Route path="/user-portal" element={
        <PrivateRoute roles={['company_user']}><UserLayout /></PrivateRoute>
      }>
        <Route index element={<UserDashboard />} />
        <Route path="visits"    element={<MyVisits />} />
        <Route path="schedule"  element={<MySchedule />} />
        <Route path="help"      element={<HelpPage />} />
      </Route>

      {/* Root: always show landing page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </AuthProvider>
  );
}
