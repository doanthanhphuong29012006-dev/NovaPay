import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowRightLeft,
  FileSearch,
  FileSpreadsheet,
} from 'lucide-react';
import type { Wallet } from '../../types';
import { Badge } from '../common/Badge';
import { WalletMonogram } from '../common/Logo';

interface WalletCardProps {
  wallet: Wallet;
  onTransfer?: (walletId: string) => void;
  onAudit?: (walletId: string) => void;
  onStatement?: (walletId: string) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  onTransfer,
  onAudit,
  onStatement,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(wallet._id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formattedBalance = new Intl.NumberFormat('vi-VN').format(wallet.balance);
  const isActive = wallet.status === 'ACTIVE';

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl p-6 sm:p-7 transition-all duration-300
        border shadow-md hover:shadow-xl
        ${
          isActive
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border-amber-500/30 hover:border-amber-400/60'
            : 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-slate-300 border-rose-500/30 opacity-90'
        }`}
    >
      {/* Background Decorative Solar Glow */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent pointer-events-none blur-3xl group-hover:scale-125 transition-transform duration-700" />

      {/* Card Header: Monogram, Name & Status */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <WalletMonogram
            name={wallet.customName || `Ví ${wallet.currency}`}
            currency={wallet.currency}
            size="md"
          />
          <div>
            <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
              <span>{wallet.customName || `Ví ${wallet.currency} Chính`}</span>
            </h3>
            <span className="text-xs text-amber-300/80 font-mono tracking-wider font-semibold">
              {wallet.currency} ACCOUNT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Contactless waves symbol */}
          <div className="text-amber-400/70" title="Thanh toán số dư tức thì">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.5 16.5a5 5 0 0 1 0-9" strokeLinecap="round" />
              <path d="M11.5 19a8.5 8.5 0 0 0 0-14" strokeLinecap="round" />
              <path d="M14.5 21.5a12 12 0 0 0 0-19" strokeLinecap="round" />
            </svg>
          </div>
          <Badge
            variant={isActive ? 'success' : 'error'}
            size="sm"
            dot
            className="capitalize font-semibold shadow-xs"
          >
            {isActive ? 'Hoạt động' : 'Đã khóa'}
          </Badge>
        </div>
      </div>

      {/* Balance Section */}
      <div className="my-6 relative z-10">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium tracking-wide uppercase">Số dư khả dụng</span>
          <button
            type="button"
            onClick={() => setShowBalance(!showBalance)}
            className="text-slate-400 hover:text-amber-400 transition-colors p-1"
            title={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
            aria-label={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          {showBalance ? (
            <>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                {formattedBalance}
              </span>
              <span className="text-sm sm:text-base font-bold text-amber-400">
                {wallet.currency}
              </span>
            </>
          ) : (
            <span className="text-3xl font-mono text-slate-500 tracking-widest">
              ••••••••••
            </span>
          )}
        </div>
      </div>

      {/* Wallet ID with Copy Action */}
      <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-mono text-[11px] truncate max-w-[170px] sm:max-w-[210px]" title={wallet._id}>
            ID: {wallet._id}
          </span>
          <button
            type="button"
            onClick={handleCopyId}
            className="p-1 hover:text-amber-400 rounded-md transition-colors"
            title="Sao chép ID ví"
            aria-label="Sao chép ID ví"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {copied && <span className="text-[10px] text-emerald-400 font-semibold">Đã chép!</span>}
        </div>
      </div>

      {/* Card Action Quick Buttons */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-700/60 relative z-10">
        <button
          type="button"
          onClick={() => (onTransfer ? onTransfer(wallet._id) : navigate(`/transfer?from=${wallet._id}`))}
          disabled={!isActive}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold
            bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950
            border border-amber-500/30 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Chuyển</span>
        </button>

        <button
          type="button"
          onClick={() => (onAudit ? onAudit(wallet._id) : navigate(`/audit?walletId=${wallet._id}`))}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold
            bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white
            border border-slate-700 transition-all duration-150"
        >
          <FileSearch className="w-3.5 h-3.5 text-amber-400" />
          <span>Đối soát</span>
        </button>

        <button
          type="button"
          onClick={() => (onStatement ? onStatement(wallet._id) : navigate(`/statements?walletId=${wallet._id}`))}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold
            bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white
            border border-slate-700 transition-all duration-150"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
          <span>Sao kê</span>
        </button>
      </div>
    </div>
  );
};
