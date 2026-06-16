import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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

// Company user portal
import MyVisits from './pages/user-portal/MyVisits';
import UserDashboard from './pages/user-portal/UserDashboard';

// Visitor pages (public, no auth)
import VisitorMobile from './pages/visitor/MobileEntry';
import VisitorForm from './pages/visitor/VisitorForm';
import VisitorConfirmation from './pages/visitor/Confirmation';
import DisplayBoard from './pages/visitor/DisplayBoard';

// Layouts
import SuperAdminLayout from './components/layouts/SuperAdminLayout';
import CompanyLayout from './components/layouts/CompanyLayout';
import UserLayout from './components/layouts/UserLayout';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public auth */}
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Visitor kiosk — public */}
      <Route path="/visit/:slug"              element={<VisitorMobile />} />
      <Route path="/visit/:slug/details"      element={<VisitorForm />} />
      <Route path="/visit/:slug/confirmation" element={<VisitorConfirmation />} />

      {/* TV display board — public */}
      <Route path="/display/:slug" element={<DisplayBoard />} />

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
        <Route path="settings"    element={<CompanySettings />} />
      </Route>

      {/* Company User Portal */}
      <Route path="/user-portal" element={
        <PrivateRoute roles={['company_user']}><UserLayout /></PrivateRoute>
      }>
        <Route index element={<UserDashboard />} />
        <Route path="visits" element={<MyVisits />} />
      </Route>

      {/* Root: landing page for guests, dashboard redirect for logged-in users */}
      <Route path="/" element={
        user?.role === 'super_admin'   ? <Navigate to="/super-admin" replace /> :
        user?.role === 'company_admin' ? <Navigate to="/dashboard" replace /> :
        user?.role === 'company_user'  ? <Navigate to="/user-portal" replace /> :
        <LandingPage />
      } />
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
