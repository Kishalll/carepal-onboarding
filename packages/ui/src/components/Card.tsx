import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'softBlue' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'white',
      padding = 'md',
      interactive = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-card transition-all duration-200 overflow-hidden';

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const variantStyles = {
      white: 'bg-white border border-gray-100 shadow-card text-brand-heading',
      softBlue: 'bg-brand-softBlueLight border border-blue-100 text-brand-heading',
      gradient:
        'bg-gradient-to-r from-[#2255A2] to-[#2B73DE] text-white shadow-soft',
    };

    const interactiveStyles = interactive
      ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
