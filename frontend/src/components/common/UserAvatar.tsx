import React from 'react';
import { Crown, ShieldCheck } from 'lucide-react';

export interface UserAvatarProps {
  name?: string;
  email?: string;
  role?: string;
  hasPin?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

export const getInitials = (name?: string, email?: string): string => {
  if (name && name.trim()) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const first = words[0].charAt(0);
      const last = words[words.length - 1].charAt(0);
      return (first + last).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return 'NP';
};

// Deterministic solar gradient based on name/email
const getSolarGradient = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const gradients = [
    'from-amber-400 via-amber-500 to-amber-600',
    'from-yellow-400 via-amber-500 to-orange-500',
    'from-amber-300 via-orange-400 to-amber-600',
    'from-amber-400 via-yellow-500 to-amber-700',
  ];
  return gradients[Math.abs(hash) % gradients.length];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  email,
  role,
  hasPin,
  size = 'md',
  showBadge = true,
  className = '',
}) => {
  const initials = getInitials(name, email);
  const key = name || email || 'NovaPay';
  const gradient = getSolarGradient(key);
  const isAdmin = role?.toUpperCase() === 'ADMIN';

  const sizeStyles = {
    xs: {
      box: 'w-7 h-7 text-[11px] rounded-lg',
      badge: 'w-3 h-3 -bottom-0.5 -right-0.5',
      badgeIcon: 'w-2 h-2',
      ring: 'ring-1.5',
    },
    sm: {
      box: 'w-9 h-9 text-xs rounded-xl',
      badge: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
      badgeIcon: 'w-2.5 h-2.5',
      ring: 'ring-2',
    },
    md: {
      box: 'w-11 h-11 text-sm rounded-2xl',
      badge: 'w-4 h-4 -bottom-1 -right-1',
      badgeIcon: 'w-3 h-3',
      ring: 'ring-2',
    },
    lg: {
      box: 'w-14 h-14 text-lg rounded-2xl',
      badge: 'w-5 h-5 -bottom-1 -right-1',
      badgeIcon: 'w-3.5 h-3.5',
      ring: 'ring-2.5',
    },
    xl: {
      box: 'w-20 h-20 text-2xl rounded-3xl',
      badge: 'w-6 h-6 -bottom-1.5 -right-1.5',
      badgeIcon: 'w-4 h-4',
      ring: 'ring-3',
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none group ${className}`}>
      {/* Outer Solar Aura Ring */}
      <div
        className={`relative ${currentSize.box} ${currentSize.ring} ring-amber-400/40 dark:ring-amber-500/30
          bg-gradient-to-br ${gradient} text-slate-950 font-black tracking-wider flex items-center justify-center
          shadow-sm shadow-amber-500/20 group-hover:shadow-md group-hover:shadow-amber-500/30
          group-hover:scale-105 transition-all duration-200 overflow-hidden`}
        title={name || email || 'NovaPay User'}
      >
        {/* Subtle SVG Sunbeam Micro Pattern in Background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="30" stroke="#000" strokeWidth="4" strokeDasharray="6 6" />
          <path d="M50 0L50 100M0 50L100 50" stroke="#000" strokeWidth="3" />
          <path d="M15 15L85 85M15 85L85 15" stroke="#000" strokeWidth="2" />
        </svg>

        {/* Monogram Initials */}
        <span className="relative z-10 drop-shadow-xs font-mono">{initials}</span>

        {/* Gloss Shimmer Flare on Top */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
      </div>

      {/* Role / PIN Status Badge */}
      {showBadge && (isAdmin || hasPin) && (
        <div
          className={`absolute ${currentSize.badge} rounded-full flex items-center justify-center
            ${
              isAdmin
                ? 'bg-amber-600 text-yellow-200 ring-1.5 ring-white dark:ring-slate-900 shadow-xs'
                : 'bg-emerald-500 text-white ring-1.5 ring-white dark:ring-slate-900 shadow-xs'
            }`}
          title={isAdmin ? 'Quản trị viên (Admin)' : 'Đã bảo vệ mã PIN'}
        >
          {isAdmin ? (
            <Crown className={currentSize.badgeIcon} />
          ) : (
            <ShieldCheck className={currentSize.badgeIcon} />
          )}
        </div>
      )}
    </div>
  );
};
