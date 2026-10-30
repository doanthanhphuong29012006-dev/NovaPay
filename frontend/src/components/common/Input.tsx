import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightAction,
      isPassword = false,
      type = 'text',
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={actualType}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`w-full rounded-xl border bg-white dark:bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
              ${leftIcon ? 'pl-10' : ''}
              ${isPassword || rightAction ? 'pr-11' : ''}
              ${
                error
                  ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
              }
              ${className}`}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {!isPassword && rightAction && (
            <div className="absolute right-3 flex items-center">{rightAction}</div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-rose-500 dark:text-rose-400 font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
