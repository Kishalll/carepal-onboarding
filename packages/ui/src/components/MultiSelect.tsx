import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Chip } from './Chip.js';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  required?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  error,
  hint,
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const removeOption = (optValue: string) => {
    onChange(value.filter((v) => v !== optValue));
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-brand-heading mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full min-h-[44px] p-2 flex items-center justify-between rounded-xl border bg-white cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-action ${
          error
            ? 'border-red-400 bg-red-50/20'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex flex-wrap gap-1.5 items-center flex-1">
          {value.length === 0 ? (
            <span className="text-gray-400 text-sm px-1.5">{placeholder}</span>
          ) : (
            value.map((val) => {
              const opt = options.find((o) => o.value === val);
              const optLabel = opt ? opt.label : val;
              return (
                <Chip
                  key={val}
                  label={optLabel}
                  size="sm"
                  variant="action"
                  onRemove={() => removeOption(val)}
                />
              );
            })
          )}
        </div>
        <div className="pl-2 text-gray-500">
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <div
                key={opt.value}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => toggleOption(opt.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleOption(opt.value);
                  }
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50/60 font-medium text-brand-deepBlue' : 'text-brand-heading'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-brand-action shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
};
