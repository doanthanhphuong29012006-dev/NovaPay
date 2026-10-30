import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileSpreadsheet,
  Calendar,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../api/wallet.api';
import { CustomApiError } from '../api/client';
import type { StatementJobStatusResponse } from '../types';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';

export const StatementPage: React.FC = () => {
  const { user, wallets } = useAuth();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialWalletId = queryParams.get('walletId') || wallets[0]?._id || '';

  const [selectedWalletId, setSelectedWalletId] = useState(initialWalletId);

  // Default date range: current month (1st of current month to today)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);
  const [userEmail, setUserEmail] = useState(user?.email || '');

  // Submitting and Job tracking
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<StatementJobStatusResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validation
  const [dateError, setDateError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Polling ref to safely clear interval
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user?.email && !userEmail) {
      setUserEmail(user.email);
    }
  }, [user, userEmail]);

  useEffect(() => {
    if (!selectedWalletId && wallets.length > 0) {
      setSelectedWalletId(wallets[0]._id);
    }
  }, [wallets, selectedWalletId]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const validate = (): boolean => {
    let isValid = true;
    setDateError('');
    setEmailError('');

    if (!fromDate) {
      setDateError('Vui lòng chọn ngày bắt đầu');
      isValid = false;
    } else if (!toDate) {
      setDateError('Vui lòng chọn ngày kết thúc');
      isValid = false;
    } else if (new Date(fromDate) > new Date(toDate)) {
      setDateError('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      isValid = false;
    }

    if (!userEmail.trim()) {
      setEmailError('Vui lòng nhập email nhận sao kê');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())) {
      setEmailError('Địa chỉ email không hợp lệ');
      isValid = false;
    }

    return isValid;
  };

  const pollJobStatus = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const status = await walletApi.getStatementJobStatus(jobId);
        setJobStatus(status);

        // STOP POLLING when completed or failed
        if (status.state === 'completed' || status.state === 'failed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch {
        // If query fails, continue polling or clear on fatal
      }
    }, 2500);
  };

  const handleRequestExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setJobStatus(null);

    if (!validate()) return;
    if (!selectedWalletId) {
      setErrorMsg('Vui lòng chọn một ví để xuất sao kê');
      return;
    }

    setIsSubmitting(true);
    try {
      // Format to ISO 8601 strings required by exportStatementSchema
      const startIso = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      const endIso = new Date(`${toDate}T23:59:59.999Z`).toISOString();

      const response = await walletApi.requestStatementExport(selectedWalletId, {
        userEmail: userEmail.trim(),
        fromDate: startIso,
        toDate: endIso,
      });

      setJobStatus({
        jobId: response.jobId,
        state: response.status || 'queued',
        progress: 0,
        result: null,
        faildReason: null,
      });

      // Start Polling job status
      pollJobStatus(response.jobId);
    } catch (err: unknown) {
      if (err instanceof CustomApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể gửi yêu cầu xuất sao kê. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getJobBadgeVariant = (state: string) => {
    switch (state) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'active':
      case 'queued':
      case 'waiting':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getJobStatusLabel = (state: string) => {
    switch (state) {
      case 'completed':
        return 'Đã hoàn tất xuất file';
      case 'failed':
        return 'Thất bại';
      case 'active':
        return 'Đang khởi tạo & ghi dữ liệu CSV...';
      case 'queued':
      case 'waiting':
        return 'Đang trong hàng đợi xử lý ngầm (BullMQ)';
      default:
        return state;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Xuất sao kê giao dịch
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống background worker xử lý hàng triệu bản ghi xuất file CSV chuẩn kế toán
          </p>
        </div>
      </div>

      {errorMsg && (
        <Alert type="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* ACTIVE JOB TRACKER STATUS */}
      {jobStatus && (
        <Card className="border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20 p-6 animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 shadow-xs border border-amber-200 dark:border-amber-800">
              {jobStatus.state === 'completed' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              ) : jobStatus.state === 'failed' ? (
                <AlertCircle className="w-7 h-7 text-rose-500" />
              ) : (
                <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getJobBadgeVariant(jobStatus.state)} size="md" dot>
                    {getJobStatusLabel(jobStatus.state)}
                  </Badge>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Job ID: {jobStatus.jobId}
                  </span>
                </div>

                {jobStatus.state !== 'completed' && jobStatus.state !== 'failed' && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    Đang tự động cập nhật trạng thái...
                  </span>
                )}
              </div>

              {/* COMPLETED DETAILS */}
              {jobStatus.state === 'completed' && jobStatus.result && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <span>File sao kê đã sẵn sàng: {jobStatus.result.filename}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block">Tổng số bút toán:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                        {jobStatus.result.totalRecords.toLocaleString()} dòng
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tổng tiền ghi Có (Vào):</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        +{jobStatus.result.totalCredit.toLocaleString()} VND
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tổng tiền ghi Nợ (Ra):</span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono text-sm">
                        -{jobStatus.result.totalDebit.toLocaleString()} VND
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời gian hoàn thành:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(jobStatus.result.completedAt).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Security notice: Do NOT expose server path */}
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    * Bản sao kê chi tiết đã được gửi tới hòm thư <strong>{userEmail}</strong> và lưu trữ an toàn trên máy chủ.
                  </p>
                </div>
              )}

              {/* FAILED DETAILS */}
              {jobStatus.state === 'failed' && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
                  Lý do lỗi: {jobStatus.faildReason || 'Tiến trình xuất file gặp sự cố'}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* EXPORT REQUEST FORM */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Thông số xuất báo cáo sao kê
          </h2>
          <span className="text-xs text-slate-500">
            Hệ thống lọc toàn bộ bút toán Ledger phát sinh trong khung thời gian lựa chọn
          </span>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleRequestExport} className="space-y-5" noValidate>
            {/* Wallet Selection */}
            <div>
              <label
                htmlFor="statementWallet"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Chọn ví cần xuất <span className="text-rose-500">*</span>
              </label>
              <select
                id="statementWallet"
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {wallets.map((w) => (
                  <option key={w._id} value={w._id}>
                    Ví {w.currency} (Số dư: {w.balance.toLocaleString()} {w.currency}) - ID: {w._id}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Từ ngày (Bắt đầu)"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
                required
              />

              <Input
                label="Đến ngày (Kết thúc)"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
                required
              />
            </div>

            {dateError && (
              <p className="text-xs text-rose-500 font-medium -mt-2">{dateError}</p>
            )}

            {/* Target Email */}
            <Input
              label="Email nhận thông báo kết quả"
              type="email"
              placeholder="tenban@example.com"
              value={userEmail}
              onChange={(e) => {
                setUserEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              error={emailError}
              leftIcon={<Mail className="w-4 h-4" />}
              helperText="Hệ thống gửi thông báo và đường dẫn file CSV khi hoàn tất"
              required
            />

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Bắt đầu xuất sao kê ngầm
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
