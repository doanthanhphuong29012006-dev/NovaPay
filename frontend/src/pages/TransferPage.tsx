import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  Lock,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../api/wallet.api';
import { CustomApiError } from '../api/client';
import type { TransferResult } from '../types';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';

export const TransferPage: React.FC = () => {
  const { wallets, hasSetupPin, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Search params for pre-selected sender wallet
  const queryParams = new URLSearchParams(location.search);
  const initialFrom = queryParams.get('from') || (wallets[0]?._id ?? '');

  const [fromWalletId, setFromWalletId] = useState(initialFrom);
  const [toWalletId, setToWalletId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('Chuyển tiền qua NovaPay');
  const [pin, setPin] = useState('');

  // Submit and feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<TransferResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    isConflict?: boolean;
    isInsufficient?: boolean;
    isPinError?: boolean;
  } | null>(null);

  // Field validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedTxId, setCopiedTxId] = useState(false);

  useEffect(() => {
    if (!fromWalletId && wallets.length > 0) {
      setFromWalletId(wallets[0]._id);
    }
  }, [wallets, fromWalletId]);

  const selectedWallet = wallets.find((w) => w._id === fromWalletId);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fromWalletId) {
      newErrors.fromWalletId = 'Vui lòng chọn ví nguồn';
    }

    if (!toWalletId.trim()) {
      newErrors.toWalletId = 'Vui lòng nhập ID ví người nhận';
    } else if (!/^[0-9a-fA-F]{24}$/.test(toWalletId.trim())) {
      newErrors.toWalletId = 'ID ví nhận phải là chuỗi 24 ký tự Hex hợp lệ';
    } else if (toWalletId.trim() === fromWalletId) {
      newErrors.toWalletId = 'Không thể tự chuyển tiền cho chính ví gửi này';
    }

    const numAmount = Number(amountStr);
    if (!amountStr || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Số tiền phải là số nguyên lớn hơn 0';
    } else if (selectedWallet && numAmount > selectedWallet.balance) {
      newErrors.amount = `Số dư không đủ (hiện có: ${selectedWallet.balance.toLocaleString()} ${selectedWallet.currency})`;
    }

    if (!description.trim()) {
      newErrors.description = 'Vui lòng nhập nội dung chuyển tiền';
    } else if (description.trim().length > 255) {
      newErrors.description = 'Nội dung tối đa 255 ký tự';
    }

    if (!pin) {
      newErrors.pin = 'Vui lòng nhập mã PIN giao dịch';
    } else if (!/^\d{6}$/.test(pin)) {
      newErrors.pin = 'Mã PIN bắt buộc phải gồm đúng 6 chữ số';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessResult(null);
    setErrorDetails(null);

    if (!validate()) return;

    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);
    const idempotencyKey = `tx-${generateUUID()}`;

    try {
      const result = await walletApi.transfer(
        {
          fromWalletId,
          toWalletId: toWalletId.trim(),
          amount: Math.floor(Number(amountStr)),
          description: description.trim(),
          pin,
        },
        idempotencyKey
      );

      setSuccessResult(result);
      setPin(''); // Reset PIN immediately after submit for security
      await refreshProfile(); // Refresh wallets balance in context
    } catch (err: unknown) {
      if (err instanceof CustomApiError) {
        setErrorDetails({
          message: err.message,
          isConflict: err.isConflict,
          isInsufficient: err.isInsufficientBalance,
          isPinError: err.message.toLowerCase().includes('pin'),
        });
      } else if (err instanceof Error) {
        setErrorDetails({ message: err.message });
      } else {
        setErrorDetails({ message: 'Giao dịch thất bại. Vui lòng thử lại sau.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmountStr(val.toString());
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }));
    }
  };

  const handleCopyTxId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedTxId(true);
      setTimeout(() => setCopiedTxId(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Chuyển tiền ví nội bộ
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chuyển tiền thời gian thực với khóa phân tán chống âm tiền
            </p>
          </div>
        </div>
      </div>

      {/* Security warning if PIN not set */}
      {!hasSetupPin && (
        <Alert
          type="warning"
          title="Bạn chưa thiết lập mã PIN giao dịch"
          className="shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span>
              Để bảo vệ số dư và xác nhận lệnh chuyển tiền, vui lòng cài đặt mã PIN 6 chữ số trước.
            </span>
            <Link
              to="/profile"
              className="inline-flex items-center text-xs font-bold text-amber-700 dark:text-amber-300 underline"
            >
              Cài đặt PIN ngay
            </Link>
          </div>
        </Alert>
      )}

      {/* SUCCESS BANNER */}
      {successResult && (
        <Card className="border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 animate-in fade-in-50 duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                Chuyển tiền thành công!
              </h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                Bút toán kép đã được ghi nhận toàn vẹn vào sổ cái NovaPay.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Số tiền chuyển:</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                    {successResult.amount.toLocaleString()} {successResult.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Số dư sau giao dịch:</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {successResult.senderBalanceAfter.toLocaleString()} {successResult.currency}
                  </span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Mã giao dịch (TxID):</span>
                  <div className="flex items-center gap-1.5 font-mono font-medium text-slate-700 dark:text-slate-300">
                    <span className="truncate max-w-[200px]" title={successResult.transactionId}>
                      {successResult.transactionId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTxId(successResult.transactionId)}
                      className="p-1 hover:text-amber-500 text-slate-400 transition-colors"
                      title="Sao chép TxID"
                    >
                      {copiedTxId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSuccessResult(null);
                    setAmountStr('');
                    setToWalletId('');
                  }}
                >
                  Thực hiện giao dịch khác
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
                  Về trang tổng quan
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ERROR BANNER */}
      {errorDetails && (
        <Alert
          type={errorDetails.isConflict ? 'warning' : 'error'}
          title={
            errorDetails.isConflict
              ? 'Xung đột giao dịch đang xử lý (HTTP 409)'
              : errorDetails.isInsufficient
              ? 'Số dư không đủ để thực hiện giao dịch'
              : 'Giao dịch chuyển tiền không thành công'
          }
          onClose={() => setErrorDetails(null)}
        >
          <p>{errorDetails.message}</p>
          {errorDetails.isConflict && (
            <p className="mt-1 text-xs opacity-80">
              Yêu cầu của bạn đang được tiến trình phân tán xử lý. Vui lòng đợi vài giây và kiểm tra lại số dư trước khi gửi lại.
            </p>
          )}
          {errorDetails.isPinError && (
            <p className="mt-1 text-xs font-semibold">
              <Link to="/profile" className="underline hover:text-amber-600">
                Bấm vào đây để cài đặt hoặc kiểm tra lại mã PIN của bạn
              </Link>
            </p>
          )}
        </Alert>
      )}

      {/* MAIN TRANSFER FORM */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Chi tiết lệnh chuyển tiền
          </h2>
          <span className="text-xs text-slate-500">
            Tự động gắn mã chống trùng lặp Idempotency Key cho mỗi lần gửi
          </span>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleTransfer} className="space-y-5" noValidate>
            {/* Sender Wallet Selector */}
            <div>
              <label
                htmlFor="fromWalletId"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Ví nguồn (Người gửi) <span className="text-rose-500">*</span>
              </label>
              <select
                id="fromWalletId"
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              >
                {wallets.map((w) => (
                  <option key={w._id} value={w._id}>
                    Ví {w.currency} (Số dư: {w.balance.toLocaleString()} {w.currency}) - ID: {w._id}
                  </option>
                ))}
              </select>
              {selectedWallet && (
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Trạng thái: <strong className="text-emerald-600">{selectedWallet.status}</strong></span>
                  <span>Khả dụng: <strong className="font-mono text-amber-600 dark:text-amber-400">{selectedWallet.balance.toLocaleString()} {selectedWallet.currency}</strong></span>
                </div>
              )}
            </div>

            {/* Receiver Wallet ID */}
            <Input
              label="ID Ví nhận (24 ký tự Hex)"
              placeholder="VD: 66f1a8b2c4e5f7a8b9c0d1e2"
              value={toWalletId}
              onChange={(e) => {
                setToWalletId(e.target.value);
                if (errors.toWalletId) setErrors((prev) => ({ ...prev, toWalletId: '' }));
              }}
              error={errors.toWalletId}
              helperText="Nhập chính xác ID ví của người nhận trong hệ thống NovaPay"
              required
            />

            {/* Amount */}
            <div>
              <Input
                label="Số tiền chuyển (VND)"
                type="number"
                min="1"
                step="1"
                placeholder="VD: 100000"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                error={errors.amount}
                required
              />

              {/* Quick Amount Suggestion Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {[50_000, 100_000, 200_000, 500_000, 1_000_000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 hover:text-amber-600 transition-colors font-mono"
                  >
                    +{(val / 1000).toLocaleString()}k
                  </button>
                ))}
                {selectedWallet && selectedWallet.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(selectedWallet.balance)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 font-bold"
                  >
                    Tất cả
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <Input
              label="Nội dung chuyển tiền"
              placeholder="VD: Thanh toán tiền dịch vụ"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
              }}
              error={errors.description}
              required
            />

            {/* 6-digit Transaction PIN */}
            <Input
              label="Mã PIN giao dịch (6 chữ số)"
              isPassword
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(val);
                if (errors.pin) setErrors((prev) => ({ ...prev, pin: '' }));
              }}
              error={errors.pin}
              leftIcon={<Lock className="w-4 h-4" />}
              helperText="Mã bảo mật 6 số do bạn thiết lập để xác nhận giao dịch trừ tiền"
              required
            />

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={isSubmitting || !hasSetupPin}
                className="w-full shadow-md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Xác nhận chuyển tiền
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
