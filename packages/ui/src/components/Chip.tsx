import React from 'react';
import { X } from 'lucide-react';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'action' | 'teal' | 'ink';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onClick,
  onRemove,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
}) => {
  const isInteractive = Boolean(onClick);

  const baseStyles =
    'inline-flex items-center rounded-pill font-medium transition-colors duration-150 select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 min-h-[30px] gap-1',
    md: 'text-sm px-3.5 py-1.5 min-h-[36px] gap-1.5',
  };

  const getVariantStyles = () => {
    if (selected) {
      return 'bg-brand-action text-white shadow-sm';
    }
    switch (variant) {
      case 'action':
        return 'bg-blue-50 text-brand-action border border-blue-200 hover:bg-blue-100';
      case 'teal':
        return 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100';
      case 'ink':
        return 'bg-gray-100 text-brand-ink hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent';
    }
  };

  const interactiveStyles = isInteractive
    ? 'cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-action'
    : '';

  return (
    <span
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`${baseStyles} ${sizeStyles[size]} ${getVariantStyles()} ${interactiveStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10 focus:outline-none"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
};
