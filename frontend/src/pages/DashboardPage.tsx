import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  ArrowRightLeft,
  FileSearch,
  FileSpreadsheet,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WalletCard } from '../components/wallet/WalletCard';
import { UserAvatar } from '../components/common/UserAvatar';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';

export const DashboardPage: React.FC = () => {
  const { user, wallets, hasSetupPin, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Calculate total balance (assuming VND primary)
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const formattedTotal = new Intl.NumberFormat('vi-VN').format(totalBalance);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Welcome & Quick Balance Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-6 sm:p-8 shadow-lg">
        {/* Decorative solar bursts */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-amber-300/15 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={user?.fullName}
              email={user?.email}
              role={user?.role}
              hasPin={hasSetupPin}
              size="lg"
              className="hidden sm:inline-flex ring-2 ring-white/50"
            />
            <div>
              <div className="flex items-center gap-2 text-amber-200 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Ví Điện Tử Ánh Mặt Trời</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Xin chào, {user?.fullName || 'Quý khách'}!
              </h1>
              <p className="mt-1 text-sm text-amber-100 max-w-xl">
                Hệ thống sổ cái giao dịch kép bảo toàn số dư với khả năng đối soát minh bạch tức thì.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/20 min-w-[260px] flex flex-col justify-between">
            <span className="text-xs text-amber-200/90 font-medium uppercase tracking-wider">
              Tổng giá trị tài sản
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
                {formattedTotal}
              </span>
              <span className="text-sm font-bold text-amber-300">VND</span>
            </div>
            <span className="text-[11px] text-amber-200/70 mt-1">
              {wallets.length} ví hoạt động trong tài khoản
            </span>
          </div>
        </div>
      </div>

      {/* Security Notice If PIN Not Configured */}
      {!hasSetupPin && (
        <Alert
          type="warning"
          title="Tài khoản chưa thiết lập mã PIN giao dịch!"
          className="border-amber-400/80 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span>
              Để thực hiện lệnh chuyển tiền bảo mật, bạn cần cài đặt mã PIN gồm đúng 6 chữ số.
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/profile')}
              leftIcon={<ShieldAlert className="w-4 h-4" />}
              className="shrink-0"
            >
              Cài đặt PIN ngay
            </Button>
          </div>
        </Alert>
      )}

      {/* Quick Action Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate('/transfer')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800
            hover:border-amber-400/60 dark:hover:border-amber-500/50 hover:shadow-md transition-all duration-200
            flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Chuyển tiền</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tức thì & bảo mật</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/audit')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800
            hover:border-amber-400/60 dark:hover:border-amber-500/50 hover:shadow-md transition-all duration-200
            flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <FileSearch className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Đối soát Sổ cái</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kiểm toán toàn vẹn</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/statements')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800
            hover:border-amber-400/60 dark:hover:border-amber-500/50 hover:shadow-md transition-all duration-200
            flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Xuất sao kê</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Báo cáo chuẩn CSV</span>
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800
            hover:border-amber-400/60 dark:hover:border-amber-500/50 hover:shadow-md transition-all duration-200
            flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Làm mới số dư</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cập nhật tức thời</span>
        </button>
      </div>

      {/* Wallets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Danh mục Ví của bạn
            </h2>
            <span className="ml-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              {wallets.length}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Đồng bộ
          </Button>
        </div>

        {wallets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet._id}
                wallet={wallet}
                onTransfer={(id) => navigate(`/transfer?from=${id}`)}
                onAudit={(id) => navigate(`/audit?walletId=${id}`)}
                onStatement={(id) => navigate(`/statements?walletId=${id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-4">
              <WalletIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chưa tìm thấy ví</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Bạn có thể làm mới kết nối hoặc liên hệ quản trị viên để khởi tạo ví VND.
            </p>
            <Button variant="primary" onClick={handleRefresh}>
              Thử tải lại dữ liệu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
