import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileSearch,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../api/wallet.api';
import { CustomApiError } from '../api/client';
import type { AuditResult } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';
import { Skeleton } from '../components/common/Skeleton';

export const AuditPage: React.FC = () => {
  const { wallets } = useAuth();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialWalletId = queryParams.get('walletId') || wallets[0]?._id || '';

  const [selectedWalletId, setSelectedWalletId] = useState(initialWalletId);
  const [auditData, setAuditData] = useState<AuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAudit = useCallback(async (walletId: string) => {
    if (!walletId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await walletApi.auditWallet(walletId);
      setAuditData(data);
    } catch (err: unknown) {
      if (err instanceof CustomApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể đối soát ví vào lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWalletId) {
      runAudit(selectedWalletId);
    }
  }, [selectedWalletId, runAudit]);

  const selectedWallet = wallets.find((w) => w._id === selectedWalletId);
  const isMatched = auditData ? auditData.discrepancy === 0 : true;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Đối soát toàn vẹn Sổ cái
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kiểm tra tính bất biến giữa số dư ví hiện tại và tổng các bút toán Nợ / Có
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => runAudit(selectedWalletId)}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Đối soát lại
        </Button>
      </div>

      {/* Wallet Selector Dropdown */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label
            htmlFor="auditWalletSelect"
            className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
          >
            Chọn ví cần kiểm toán:
          </label>
          <select
            id="auditWalletSelect"
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            {wallets.map((w) => (
              <option key={w._id} value={w._id}>
                Ví {w.currency} (Số dư: {w.balance.toLocaleString()} {w.currency}) - {w._id}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {errorMsg && (
        <Alert type="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Loading Skeleton */}
      {isLoading && !auditData && (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      )}

      {/* Audit Result Display */}
      {auditData && !isLoading && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Main Status Hero Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 shadow-md ${
              isMatched
                ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30'
                : 'bg-gradient-to-br from-amber-500/15 via-rose-500/5 to-transparent border-amber-500/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    isMatched
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {isMatched ? (
                    <ShieldCheck className="w-8 h-8" />
                  ) : (
                    <AlertTriangle className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={isMatched ? 'success' : 'warning'} size="md" dot>
                      {isMatched ? 'DỮ LIỆU TOÀN VẸN 100%' : 'CẢNH BÁO: PHÁT HIỆN LỆCH SỔ CÁI'}
                    </Badge>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {isMatched
                      ? 'Số dư ví khớp hoàn hảo với Sổ cái'
                      : 'Cần kiểm tra: Số dư ví khác với tổng bút toán'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    Mã ví: {auditData.walletId}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-slate-500 block font-medium">
                  Độ chênh lệch (Discrepancy)
                </span>
                <span
                  className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                    auditData.discrepancy === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {auditData.discrepancy > 0 ? '+' : ''}
                  {auditData.discrepancy.toLocaleString()} VND
                </span>
              </div>
            </div>

            {/* Non-panicking Advice If Mismatch */}
            {!isMatched && (
              <div className="mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Hướng dẫn xử lý chênh lệch:</span>
                </div>
                <p>
                  Hệ thống phát hiện sai lệch {auditData.discrepancy.toLocaleString()} VND giữa số dư hiển thị và tổng bút toán Ledger. Đừng lo lắng, điều này có thể do một giao dịch vừa hoàn tất đang được ghi nhận đồng bộ. Vui lòng thử bấm <strong>Đối soát lại</strong> hoặc gửi ID ví này cho đội ngũ kỹ thuật để được hỗ trợ kiểm toán tự động.
                </p>
              </div>
            )}
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                1. Số dư ví thực tế
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {auditData.currentBalance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-500">
                  {selectedWallet?.currency || 'VND'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Số dư hiện hành lưu trên bảng ví
              </span>
            </Card>

            <Card className="p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                2. Tính toán từ Sổ cái (Ledger)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {auditData.ledgerCalculatedBalance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-500">
                  {selectedWallet?.currency || 'VND'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Tổng bút toán (CREDIT - DEBIT)
              </span>
            </Card>

            <Card className="p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                3. Sai lệch đối soát
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold font-mono ${
                    auditData.discrepancy === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600'
                  }`}
                >
                  {auditData.discrepancy.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-500">VND</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                (Số dư ví) - (Tổng sổ cái)
              </span>
            </Card>
          </div>

          {/* Educational Note about Double-entry bookkeeping */}
          <Card className="p-5 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                Nguyên lý kế toán kép (Double-Entry Bookkeeping) tại NovaPay:
              </span>
              Mỗi đồng tiền ra vào hệ thống đều được hạch toán đồng thời dưới dạng 2 bút toán Nợ (Debit) và Có (Credit) vào Sổ cái bất biến. Khi đối soát, hệ thống quét toàn bộ dòng bút toán theo thời gian để chứng minh số dư ví là chính xác tuyệt đối mà không thể bị chỉnh sửa trái phép.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
