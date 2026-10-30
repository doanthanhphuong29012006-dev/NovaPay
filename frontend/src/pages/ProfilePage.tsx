import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  Shield,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';
import { UserAvatar } from '../components/common/UserAvatar';
import { CustomApiError } from '../api/client';

export const ProfilePage: React.FC = () => {
  const { user, hasSetupPin, setupPin, logout } = useAuth();
  const navigate = useNavigate();

  // PIN Form states
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [confirmPinError, setConfirmPinError] = useState('');

  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const validatePinForm = (): boolean => {
    let isValid = true;
    setPinError('');
    setConfirmPinError('');

    if (!pin) {
      setPinError('Vui lòng nhập mã PIN');
      isValid = false;
    } else if (!/^\d{6}$/.test(pin)) {
      setPinError('Mã PIN bắt buộc phải gồm đúng 6 chữ số');
      isValid = false;
    }

    if (pin !== confirmPin) {
      setConfirmPinError('Mã PIN xác nhận không khớp');
      isValid = false;
    }

    return isValid;
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSuccessMsg(null);
    setPinErrorMsg(null);

    if (!validatePinForm()) return;

    setIsSubmittingPin(true);
    try {
      await setupPin(pin);
      setPinSuccessMsg('Thiết lập mã PIN giao dịch 6 số thành công!');
      setPin('');
      setConfirmPin('');
    } catch (err: unknown) {
      if (err instanceof CustomApiError) {
        setPinErrorMsg(err.message);
      } else if (err instanceof Error) {
        setPinErrorMsg(err.message);
      } else {
        setPinErrorMsg('Không thể thiết lập mã PIN lúc này.');
      }
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <UserIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Hồ sơ & Bảo mật tài khoản
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quản lý thông tin định danh và cài đặt mã PIN xác thực giao dịch
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="text-center p-6">
            <div className="flex justify-center mb-4">
              <UserAvatar
                name={user?.fullName}
                email={user?.email}
                role={user?.role}
                hasPin={hasSetupPin}
                size="xl"
              />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {user?.fullName || 'Người dùng'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {user?.email}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="warning" size="sm">
                Vai trò: {user?.role || 'USER'}
              </Badge>
              <Badge variant={hasSetupPin ? 'success' : 'neutral'} size="sm" dot>
                {hasSetupPin ? 'Đã cài PIN' : 'Chưa có PIN'}
              </Badge>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                isLoading={isLoggingOut}
                className="w-full text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Đăng xuất phiên làm việc
              </Button>
            </div>
          </Card>

          {/* Security Tip Card */}
          <Card className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-950 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Bảo mật 2 lớp với PIN</span>
            </div>
            <p className="leading-relaxed opacity-90">
              Mã PIN là lớp phòng thủ cuối cùng để phê duyệt các lệnh trừ tiền tài khoản. NovaPay tự động khóa giao dịch nếu nhập sai quá 5 lần liên tiếp.
            </p>
          </Card>
        </div>

        {/* Right Column: PIN Setup & Security Configuration */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>{hasSetupPin ? 'Đổi mã PIN giao dịch' : 'Thiết lập mã PIN giao dịch mới'}</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Mã PIN gồm chính xác 6 số dùng để ký duyệt mọi giao dịch chuyển tiền
                </span>
              </div>

              {hasSetupPin ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Cần thiết lập
                </span>
              )}
            </CardHeader>

            <CardBody>
              {pinSuccessMsg && (
                <div className="mb-5">
                  <Alert type="success" onClose={() => setPinSuccessMsg(null)}>
                    {pinSuccessMsg}
                  </Alert>
                </div>
              )}

              {pinErrorMsg && (
                <div className="mb-5">
                  <Alert type="error" onClose={() => setPinErrorMsg(null)}>
                    {pinErrorMsg}
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSetupPin} className="space-y-4" noValidate>
                <Input
                  label="Mã PIN 6 chữ số"
                  isPassword
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Nhập 6 chữ số (VD: 123456)"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPin(val);
                    if (pinError) setPinError('');
                  }}
                  error={pinError}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Xác nhận lại mã PIN"
                  isPassword
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Nhập lại đúng 6 chữ số trên"
                  value={confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setConfirmPin(val);
                    if (confirmPinError) setConfirmPinError('');
                  }}
                  error={confirmPinError}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmittingPin}
                    className="w-full sm:w-auto"
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                  >
                    {hasSetupPin ? 'Cập nhật mã PIN' : 'Lưu mã PIN mới'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Account Details Specs */}
          <Card className="p-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Thông tin chi tiết tài khoản
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block mb-0.5">ID Người dùng</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 select-all">
                  {user?.id || '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block mb-0.5">Hòm thư đăng ký</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {user?.email || '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block mb-0.5">Quyền hạn hệ thống</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {user?.role === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Khách hàng cá nhân (USER)'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block mb-0.5">Cơ chế lưu trữ phiên</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  JWT Stateless Session
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
