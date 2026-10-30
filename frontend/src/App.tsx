import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, PublicRoute } from './components/routing/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransferPage } from './pages/TransferPage';
import { AuditPage } from './pages/AuditPage';
import { StatementPage } from './pages/StatementPage';
import { ProfilePage } from './pages/ProfilePage';
import { Logo } from './components/common/Logo';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <span>&copy; {new Date().getFullYear()} NovaPay Fintech. Hệ thống ví điện tử phân tán bảo mật cao.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Sổ cái kép</span>
            <span>•</span>
            <span>Khóa phân tán</span>
            <span>•</span>
            <span>Idempotency</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Protected Private Routes with Navbar Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/transfer" element={<TransferPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/statements" element={<StatementPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Default Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
