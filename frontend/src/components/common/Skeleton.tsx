import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    rect: 'rounded-xl',
    circle: 'rounded-full',
  };

  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200 dark:bg-slate-800 animate-pulse ${variantStyles[variant]} ${className}`}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="circle" className="w-10 h-10" />
        <Skeleton variant="rect" className="w-20 h-6 rounded-full" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="text" className="w-48 h-8" />
      </div>
      <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Skeleton variant="rect" className="w-full h-9 rounded-xl" />
        <Skeleton variant="rect" className="w-full h-9 rounded-xl" />
      </div>
    </div>
  );
};
