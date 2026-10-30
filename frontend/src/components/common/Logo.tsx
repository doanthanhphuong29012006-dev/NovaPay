import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 38, text: 'text-xl', sub: 'text-[11px]' },
    lg: { icon: 52, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 68, text: 'text-3xl', sub: 'text-sm' },
  };

  const { icon: px, text: textClass, sub: subClass } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Custom Vector SVG: Sun + Wallet + Monogram N */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 54 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-200"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sunBurstGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="walletLeather" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0B132B" />
          </linearGradient>
          <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <filter id="solarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Solar Aura */}
        <circle cx="27" cy="27" r="25" fill="#FEF3C7" fillOpacity="0.45" />
        <circle cx="27" cy="27" r="21" fill="url(#sunBurstGrad)" filter="url(#solarGlow)" />

        {/* 8 Sun Flare Points */}
        <path d="M27 3L29.5 8H24.5L27 3Z" fill="#F59E0B" opacity="0.8" />
        <path d="M27 51L24.5 46H29.5L27 51Z" fill="#D97706" opacity="0.8" />
        <path d="M3 27L8 24.5V29.5L3 27Z" fill="#F59E0B" opacity="0.8" />
        <path d="M51 27L46 29.5V24.5L51 27Z" fill="#D97706" opacity="0.8" />

        {/* Modern Curved Wallet Base */}
        <rect x="13" y="16" width="28" height="22" rx="5" fill="url(#walletLeather)" stroke="#F59E0B" strokeWidth="1.2" />

        {/* Wallet Flap Top Arc */}
        <path d="M13 22C13 18.6863 15.6863 16 19 16H35C38.3137 16 41 18.6863 41 22V23H13V22Z" fill="#334155" />

        {/* Gold Magnetic Clip */}
        <rect x="33" y="23" width="9" height="8" rx="2.5" fill="url(#goldTrim)" />
        <circle cx="37.5" cy="27" r="1.8" fill="#0F172A" />

        {/* Monogram N */}
        <path
          d="M19 32V21.5L26.5 32V21.5"
          stroke="#FEF3C7"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Sun Spark Accent on Top-Right */}
        <circle cx="39" cy="15" r="2" fill="#FDE68A" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-extrabold tracking-tight ${textClass}`}>
            <span className="text-slate-900 dark:text-white">Nova</span>
            <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 bg-clip-text text-transparent ml-0.5">
              Pay
            </span>
          </div>
          <span className={`text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase ${subClass}`}>
            Fintech Sunshine
          </span>
        </div>
      )}
    </div>
  );
};

export const WalletMonogram: React.FC<{
  name?: string;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ name, currency = 'VND', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  // Strip Vietnamese prefix 'Ví' or 'Tài khoản' to get the actual currency/identifier
  const clean = (name || '')
    .replace(/^(ví|tài khoản|tk)\s+/i, '')
    .trim();
  const label = clean ? clean.slice(0, 3).toUpperCase() : currency.slice(0, 3).toUpperCase();

  return (
    <div
      className={`relative rounded-2xl flex items-center justify-center font-mono font-black tracking-wider
        bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 text-slate-950 select-none
        border border-amber-200/80 ring-2 ring-amber-400/30 shadow-md shadow-amber-500/20
        group-hover:scale-105 group-hover:shadow-amber-500/40 transition-all duration-200 overflow-hidden ${sizeClasses[size]} ${className}`}
      title={name || currency}
    >
      {/* Gloss reflection overlay */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

      {/* Background sunbeam watermark */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        viewBox="0 0 40 40"
        fill="currentColor"
      >
        <circle cx="20" cy="20" r="14" stroke="#000" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M20 0L20 40M0 20L40 20" stroke="#000" strokeWidth="1.5" />
      </svg>

      <span className="relative z-10 drop-shadow-xs">{label}</span>
    </div>
  );
};
