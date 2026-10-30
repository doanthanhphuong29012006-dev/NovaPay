import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { CustomApiError } from '../api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Vui lòng nhập địa chỉ email');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Địa chỉ email không đúng định dạng');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof CustomApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Đăng nhập thất bại. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/50 via-stone-50 to-stone-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative Warm Solar Glow in Background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Chào mừng quay trở lại
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Ví điện tử an toàn với công nghệ đối soát số dư thời gian thực
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-amber-200/60 dark:border-slate-800">
          {errorMsg && (
            <div className="mb-6">
              <Alert type="error" onClose={() => setErrorMsg(null)}>
                {errorMsg}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Địa chỉ Email"
              type="email"
              autoComplete="email"
              placeholder="tenban@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Mật khẩu"
              isPassword
              autoComplete="current-password"
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            {/* Quick Demo Fill */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold">Tài khoản demo nạp sẵn:</p>
                  <p className="text-amber-700 dark:text-amber-300 font-mono">demo@novapay.vn (10 triệu VND)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@novapay.vn');
                  setPassword('Password123!');
                  setEmailError('');
                  setPasswordError('');
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shadow-sm"
              >
                Điền nhanh
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Đăng nhập ngay
            </Button>
          </form>

          {/* Security Guarantee Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Mã hóa bảo mật phiên làm việc chuẩn SSL/TLS</span>
          </div>
        </div>

        {/* Link to Register */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Chưa có tài khoản NovaPay?{' '}
          <Link
            to="/register"
            className="font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 underline underline-offset-4"
          >
            Đăng ký ví mới
          </Link>
        </p>
      </div>
    </div>
  );
};
