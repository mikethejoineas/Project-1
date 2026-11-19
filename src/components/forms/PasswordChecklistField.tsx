import { Check, Eye, EyeOff, X } from 'lucide-react';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { evaluatePassword } from '../../utils/validation';
import { FieldWrapper, getInputBorderClass, inputBaseClasses } from './FormControls';

interface PasswordChecklistFieldProps {
  form: UseFormReturn<any>;
  helperText: string;
}

export function PasswordChecklistField({
  form,
  helperText,
}: PasswordChecklistFieldProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const [visible, setVisible] = useState(false);

  const passwordVal = watch('ispAccount.ispPassword') || '';
  const check = evaluatePassword(passwordVal);
  const ispErrors = (errors.ispAccount || {}) as Record<string, any>;

  const rules = [
    { label: '8 to 12 characters', ok: check.lengthOk },
    { label: 'At least 1 uppercase letter', ok: check.hasUpper },
    { label: 'At least 1 lowercase letter', ok: check.hasLower },
    { label: 'At least 1 number', ok: check.hasNumber },
    { label: 'At least 1 special character (! # $ % etc.)', ok: check.hasSpecial },
    { label: 'NO "@" symbol allowed', ok: check.noAtSymbol },
  ];

  return (
    <div className="space-y-3">
      <FieldWrapper
        id="ispPassword"
        label="ISP Account Password"
        required
        helperText={helperText}
        error={ispErrors.ispPassword?.message}
      >
        <div className="relative">
          <input
            id="ispPassword"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('ispAccount.ispPassword')}
            className={`${inputBaseClasses} pr-12 ${getInputBorderClass(!!ispErrors.ispPassword)}`}
            placeholder="Example: Digital2!"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-md text-slate-600 hover:text-[#0F2744] hover:bg-slate-100"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </FieldWrapper>

      <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={`flex items-center gap-2 text-xs font-medium ${
              rule.ok ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {rule.ok ? (
              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
