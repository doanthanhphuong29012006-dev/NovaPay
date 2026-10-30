import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { CustomApiError } from '../api/client';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation errors
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validate = (): boolean => {
    let isValid = true;
    setFullNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!fullName.trim()) {
      setFullNameError('Vui lòng nhập họ và tên');
      isValid = false;
    } else if (fullName.trim().length < 2) {
      setFullNameError('Họ và tên tối thiểu 2 ký tự');
      isValid = false;
    }

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
    } else if (password.length < 6) {
      setPasswordError('Mật khẩu tối thiểu 6 ký tự');
      isValid = false;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp');
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
      await register(email.trim(), fullName.trim(), password);
      // Automatically redirected to dashboard upon successful registration and auto-login
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof CustomApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/50 via-stone-50 to-stone-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Tạo tài khoản NovaPay
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Khởi tạo ví VND mặc định miễn phí chỉ trong 30 giây
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Họ và tên"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fullNameError}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

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
              autoComplete="new-password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Input
              label="Xác nhận mật khẩu"
              isPassword
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPasswordError}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Hoàn tất đăng ký
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Thông tin được mã hóa bảo mật tuyệt đối</span>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Đã có tài khoản ví?{' '}
          <Link
            to="/login"
            className="font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 underline underline-offset-4"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
