import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const styles: Record<AlertType, { container: string; icon: React.ReactNode; iconColor: string }> = {
    info: {
      container:
        'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60 text-sky-900 dark:text-sky-200',
      icon: <Info className="w-5 h-5" />,
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
    success: {
      container:
        'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
      container:
        'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-200',
      icon: <AlertTriangle className="w-5 h-5" />,
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    error: {
      container:
        'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200',
      icon: <AlertCircle className="w-5 h-5" />,
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  };

  const { container, icon, iconColor } = styles[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm shadow-xs ${container} ${className}`}
    >
      <div className={`shrink-0 mt-0.5 ${iconColor}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div className="leading-relaxed opacity-95 break-words">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
