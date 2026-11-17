import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ink' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-pill transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const sizeStyles = {
      sm: 'text-sm px-3.5 py-1.5 min-h-[38px] gap-1.5',
      md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
      lg: 'text-base px-6 py-3 min-h-[48px] gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-brand-action text-white hover:bg-brand-actionHover focus:ring-brand-action shadow-sm active:translate-y-px',
      secondary:
        'bg-brand-softBlueLight text-brand-deepBlue hover:bg-brand-softBlue/60 focus:ring-brand-deepBlue',
      ink:
        'bg-brand-ink text-white hover:bg-black focus:ring-brand-ink',
      outline:
        'border border-gray-300 text-brand-heading bg-white hover:bg-gray-50 focus:ring-brand-action',
      ghost:
        'text-brand-heading hover:bg-gray-100 focus:ring-gray-300',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
