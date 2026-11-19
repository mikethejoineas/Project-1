import React from 'react';

interface FieldWrapperProps {
  id: string;
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
}

export function FieldWrapper({
  id,
  label,
  required,
  helperText,
  error,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
        {required && (
          <span className="text-red-700 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {helperText && !error && (
        <p id={`${id}-help`} className="text-xs text-slate-500 leading-relaxed">
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputBaseClasses =
  'w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border bg-white text-slate-900 text-sm sm:text-base transition-colors placeholder:text-slate-400';

export function getInputBorderClass(hasError?: boolean) {
  return hasError
    ? 'border-red-500 focus:border-red-600'
    : 'border-slate-300 focus:border-[#0F2744]';
}

export const MONTH_OPTIONS = [
  { value: '01', label: '01 - Jan' },
  { value: '02', label: '02 - Feb' },
  { value: '03', label: '03 - Mar' },
  { value: '04', label: '04 - Apr' },
  { value: '05', label: '05 - May' },
  { value: '06', label: '06 - Jun' },
  { value: '07', label: '07 - Jul' },
  { value: '08', label: '08 - Aug' },
  { value: '09', label: '09 - Sep' },
  { value: '10', label: '10 - Oct' },
  { value: '11', label: '11 - Nov' },
  { value: '12', label: '12 - Dec' },
];

export function getYearOptions(startYear = 1940): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= startYear; y--) {
    years.push(y);
  }
  return years;
}
