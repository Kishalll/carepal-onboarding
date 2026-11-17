import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: number | string;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number; // 0-indexed
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Mobile step progress summary */}
      <div className="md:hidden flex items-center justify-between mb-4 bg-brand-softBlueLight p-3.5 rounded-xl border border-blue-100">
        <div>
          <span className="text-xs font-semibold text-brand-deepBlue uppercase tracking-wider">
            Step {currentStep + 1} of {steps.length}
          </span>
          <h4 className="text-sm font-semibold text-brand-heading">
            {steps[currentStep]?.title}
          </h4>
        </div>
        <div className="flex gap-1">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 rounded-full transition-all duration-200 ${
                idx === currentStep
                  ? 'w-6 bg-brand-action'
                  : idx < currentStep
                  ? 'w-2 bg-brand-deepBlue'
                  : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop horizontal stepper */}
      <div className="hidden md:flex items-center justify-between relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isClickable = Boolean(onStepClick && idx <= currentStep);

          return (
            <React.Fragment key={step.id}>
              {/* Connector line between steps */}
              {idx > 0 && (
                <div
                  className={`flex-1 h-0.5 mx-3 transition-colors duration-200 ${
                    idx <= currentStep ? 'bg-brand-action' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Step indicator */}
              <div
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={() => isClickable && onStepClick?.(idx)}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onStepClick?.(idx);
                  }
                }}
                className={`flex items-center gap-3 select-none ${
                  isClickable ? 'cursor-pointer' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 shrink-0 ${
                    isCompleted
                      ? 'bg-brand-action text-white shadow-sm'
                      : isCurrent
                      ? 'bg-brand-deepBlue text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                </div>
                <div className="text-left">
                  <div
                    className={`text-sm font-semibold transition-colors ${
                      isCurrent
                        ? 'text-brand-heading'
                        : isCompleted
                        ? 'text-gray-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-xs text-gray-400 font-normal">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
