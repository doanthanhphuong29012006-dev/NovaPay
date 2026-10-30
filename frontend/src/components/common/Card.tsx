import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowOnHover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glowOnHover = false,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800
        shadow-xs transition-all duration-200
        ${glowOnHover ? 'hover:shadow-md hover:border-amber-400/50 dark:hover:border-amber-500/40' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl border-t border-slate-100 dark:border-slate-800/80 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
