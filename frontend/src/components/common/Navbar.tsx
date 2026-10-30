import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  FileSearch,
  FileSpreadsheet,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Logo } from './Logo';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, hasSetupPin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Tổng quan', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Chuyển tiền', path: '/transfer', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { label: 'Đối soát sổ cái', path: '/audit', icon: <FileSearch className="w-4 h-4" /> },
    { label: 'Xuất sao kê', path: '/statements', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-200/50 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg p-1"
          >
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Menu chính">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150
                      ${
                        active
                          ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 font-bold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
              aria-label="Đổi giao diện sáng/tối"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Security PIN badge indicator */}
                <Link
                  to="/profile"
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors
                    ${
                      hasSetupPin
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                        : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse'
                    }`}
                  title={hasSetupPin ? 'Đã cài đặt mã PIN giao dịch' : 'Chưa cài mã PIN! Bấm để thiết lập'}
                >
                  {hasSetupPin ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã bảo vệ PIN</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cài PIN ngay</span>
                    </>
                  )}
                </Link>

                {/* Profile Link */}
                <Link
                  to="/profile"
                  className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-sm font-semibold transition-colors
                    ${
                      isActive('/profile')
                        ? 'bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                >
                  <UserAvatar
                    name={user?.fullName}
                    email={user?.email}
                    role={user?.role}
                    hasPin={hasSetupPin}
                    size="sm"
                  />
                  <span className="hidden sm:inline-block max-w-[130px] truncate">{user?.fullName || 'Tài khoản'}</span>
                </Link>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Đăng xuất khỏi hệ thống"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-600 px-3 py-2 rounded-xl"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl shadow-xs"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Mở menu điều hướng di động"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                  ${
                    active
                      ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              <UserAvatar
                name={user?.fullName}
                email={user?.email}
                role={user?.role}
                hasPin={hasSetupPin}
                size="xs"
              />
              <span>Hồ sơ & Bảo mật</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 py-1 px-2.5 rounded-lg hover:bg-rose-50"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
