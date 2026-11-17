import React from 'react';
import { stageBadgeStyles } from '../tokens.js';

export interface BadgeProps {
  label: string;
  stage?: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'VERIFIED' | 'ONBOARDED' | 'REJECTED';
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple' | 'teal';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  stage,
  variant = 'gray',
  size = 'md',
  className = '',
  dot = true,
}) => {
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-semibold px-2.5 py-1',
  };

  if (stage && stageBadgeStyles[stage]) {
    const config = stageBadgeStyles[stage];
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-pill border font-medium ${config.bg} ${config.text} ${config.border} ${sizeStyles[size]} ${className}`}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
        <span>{config.label || label}</span>
      </span>
    );
  }

  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
