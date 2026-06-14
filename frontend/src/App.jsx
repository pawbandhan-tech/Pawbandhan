import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CustomerAuth from './pages/customer/CustomerAuth';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPortal from './pages/admin/AdminPortal';
import { NgoAuth, DoctorAuth, RepAuth } from './pages/partners/PartnerAuth';
import { NgoDashboard, DoctorDashboard, RepApp } from './pages/partners/PartnerDashboard';

const LEGACY = {
  'index.html': '/',
  'customer_auth.html': '/auth/customer',
  'dashboard.html': '/dashboard',
  'admin_auth.html': '/admin/login',
  'admin_portal.html': '/admin',
  'ngo_auth.html': '/ngo/login',
  'ngo_dashboard.html': '/ngo/dashboard',
  'ngo_onboarding.html': '/ngo/login',
  'doctor_auth.html': '/doctor/login',
  'doctor_dashboard.html': '/doctor/dashboard',
  'doctor_onboarding.html': '/doctor/login',
  'representative_auth.html': '/rep/login',
  'representative_app.html': '/rep/app',
  'representative_onboarding.html': '/rep/login',
  'kyc_verification.html': '/'
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/customer" element={<CustomerAuth />} />
      <Route path="/dashboard" element={<CustomerDashboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminPortal />} />
      <Route path="/ngo/login" element={<NgoAuth />} />
      <Route path="/ngo/dashboard" element={<NgoDashboard />} />
      <Route path="/doctor/login" element={<DoctorAuth />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      <Route path="/rep/login" element={<RepAuth />} />
      <Route path="/rep/app" element={<RepApp />} />
      {Object.entries(LEGACY).map(([html, target]) => (
        <Route key={html} path={`/${html}`} element={<Navigate to={target} replace />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
