import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { calculateAddressHistoryCoverage } from '../../utils/addressHistory';
import { formatZipMask } from '../../utils/validation';
import {
  FieldWrapper,
  getInputBorderClass,
  getYearOptions,
  inputBaseClasses,
  MONTH_OPTIONS,
} from './FormControls';

interface AddressHistoryStepProps {
  form: UseFormReturn<any>;
}

export function AddressHistoryStep({ form }: AddressHistoryStepProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addressHistory.priorAddresses',
  });

  const moveInMonth = watch('addressHistory.moveInMonth');
  const moveInYear = watch('addressHistory.moveInYear');
  const priorAddresses = watch('addressHistory.priorAddresses') || [];

  const coverage = calculateAddressHistoryCoverage(
    moveInMonth,
    moveInYear,
    priorAddresses
  );

  const addrErrors = (errors.addressHistory || {}) as Record<string, any>;
  const years = getYearOptions(1950);

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="p-4 rounded-xl bg-[#FBF5E8] border border-[#D4A64A]/50 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#9A6D1B] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-slate-800 leading-relaxed">
          Your driver&apos;s license address and FOID address must match. If your FOID address is different, we can change it as part of your application. If your driver&apos;s license address is different, you must update it with the Secretary of State BEFORE we submit your CCW application. The state may charge about $6.00 for an address change.
        </p>
      </div>

      {/* Live 10-Year Coverage Indicator */}
      <div
        data-testid="address-coverage-indicator"
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          coverage.isComplete
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {coverage.isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#9A6D1B] shrink-0" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-bold tabular-nums">
              Years covered: {coverage.yearsCovered} of 10
            </p>
            <p className="text-xs opacity-85">
              {coverage.isComplete
                ? '10-year address history requirement satisfied.'
                : `Illinois State Police requires 10 full years of address history (${coverage.missingMonths} months remaining).`}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-44 h-2 bg-white/80 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full ${
              coverage.isComplete ? 'bg-emerald-600' : 'bg-[#0F2744]'
            }`}
            style={{ width: `${Math.min(100, (coverage.monthsCovered / 120) * 100)}%` }}
          />
        </div>
      </div>

      {/* Current Address */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-[#0F2744]">
          Current Residential Address
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <FieldWrapper
              id="streetAddress"
              label="Street Address"
              required
              error={addrErrors.streetAddress?.message}
            >
              <input
                id="streetAddress"
                type="text"
                {...register('addressHistory.streetAddress')}
                className={`${inputBaseClasses} ${getInputBorderClass(!!addrErrors.streetAddress)}`}
                placeholder="123 Main Street"
              />
            </FieldWrapper>
          </div>
          <div className="sm:col-span-4">
            <FieldWrapper
              id="aptBldg"
              label="Apt / Bldg #"
              error={addrErrors.aptBldg?.message}
            >
              <input
                id="aptBldg"
                type="text"
                {...register('addressHistory.aptBldg')}
                className={`${inputBaseClasses} ${getInputBorderClass(!!addrErrors.aptBldg)}`}
                placeholder="Apt 2B (optional)"
              />
            </FieldWrapper>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4">
            <FieldWrapper
              id="city"
              label="City"
              required
              error={addrErrors.city?.message}
            >
              <input
                id="city"
                type="text"
                {...register('addressHistory.city')}
                className={`${inputBaseClasses} ${getInputBorderClass(!!addrErrors.city)}`}
                placeholder="Springfield"
              />
            </FieldWrapper>
          </div>
          <div className="sm:col-span-3">
            <FieldWrapper
              id="zip"
              label="ZIP Code"
              required
              error={addrErrors.zip?.message}
            >
              <Controller
                control={control}
                name="addressHistory.zip"
                render={({ field }) => (
                  <input
                    id="zip"
                    type="text"
                    inputMode="numeric"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(formatZipMask(e.target.value))}
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!addrErrors.zip)}`}
                    placeholder="62704"
                  />
                )}
              />
            </FieldWrapper>
          </div>
          <div className="sm:col-span-3">
            <FieldWrapper
              id="moveInMonth"
              label="Moved In Month"
              required
              error={addrErrors.moveInMonth?.message}
            >
              <select
                id="moveInMonth"
                {...register('addressHistory.moveInMonth')}
                className={`${inputBaseClasses} ${getInputBorderClass(!!addrErrors.moveInMonth)}`}
              >
                <option value="">Month</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FieldWrapper>
          </div>
          <div className="sm:col-span-2">
            <FieldWrapper
              id="moveInYear"
              label="Moved In Year"
              required
              error={addrErrors.moveInYear?.message}
            >
              <select
                id="moveInYear"
                {...register('addressHistory.moveInYear')}
                className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!addrErrors.moveInYear)}`}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </FieldWrapper>
          </div>
        </div>
      </div>

      {/* Prior Addresses */}
      <div className="pt-4 border-t border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0F2744]">
              Prior Address History
            </h3>
            <p className="text-xs text-slate-600">
              If you moved into your current address less than 10 years ago, add previous addresses until 10 full years are covered.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              append({
                street: '',
                city: '',
                zip: '',
                county: '',
                moveInMonth: '',
                moveInYear: '',
                moveOutMonth: '',
                moveOutYear: '',
              })
            }
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-sm font-semibold text-[#0F2744] bg-white border border-slate-300 hover:border-[#0F2744] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Another Address</span>
          </button>
        </div>

        {addrErrors.priorAddresses?.message && (
          <div role="alert" className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {addrErrors.priorAddresses.message}
          </div>
        )}

        {fields.map((fieldItem, index) => {
          const itemErr = (addrErrors.priorAddresses?.[index] || {}) as Record<string, any>;
          return (
            <div
              key={fieldItem.id}
              className="p-5 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#0F2744]">
                  Prior Address #{index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove Prior Address #${index + 1}`}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5">
                  <FieldWrapper
                    id={`prior-${index}-street`}
                    label="Street Address"
                    required
                    error={itemErr.street?.message}
                  >
                    <input
                      id={`prior-${index}-street`}
                      type="text"
                      {...register(`addressHistory.priorAddresses.${index}.street`)}
                      className={`${inputBaseClasses} ${getInputBorderClass(!!itemErr.street)}`}
                    />
                  </FieldWrapper>
                </div>
                <div className="sm:col-span-3">
                  <FieldWrapper
                    id={`prior-${index}-city`}
                    label="City"
                    required
                    error={itemErr.city?.message}
                  >
                    <input
                      id={`prior-${index}-city`}
                      type="text"
                      {...register(`addressHistory.priorAddresses.${index}.city`)}
                      className={`${inputBaseClasses} ${getInputBorderClass(!!itemErr.city)}`}
                    />
                  </FieldWrapper>
                </div>
                <div className="sm:col-span-2">
                  <FieldWrapper
                    id={`prior-${index}-zip`}
                    label="ZIP"
                    required
                    error={itemErr.zip?.message}
                  >
                    <Controller
                      control={control}
                      name={`addressHistory.priorAddresses.${index}.zip`}
                      render={({ field }) => (
                        <input
                          id={`prior-${index}-zip`}
                          type="text"
                          inputMode="numeric"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(formatZipMask(e.target.value))}
                          className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!itemErr.zip)}`}
                        />
                      )}
                    />
                  </FieldWrapper>
                </div>
                <div className="sm:col-span-2">
                  <FieldWrapper
                    id={`prior-${index}-county`}
                    label="County"
                    required
                    error={itemErr.county?.message}
                  >
                    <input
                      id={`prior-${index}-county`}
                      type="text"
                      {...register(`addressHistory.priorAddresses.${index}.county`)}
                      className={`${inputBaseClasses} ${getInputBorderClass(!!itemErr.county)}`}
                    />
                  </FieldWrapper>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FieldWrapper
                  id={`prior-${index}-in-month`}
                  label="Moved In Month"
                  required
                  error={itemErr.moveInMonth?.message}
                >
                  <select
                    id={`prior-${index}-in-month`}
                    {...register(`addressHistory.priorAddresses.${index}.moveInMonth`)}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!itemErr.moveInMonth)}`}
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
                <FieldWrapper
                  id={`prior-${index}-in-year`}
                  label="Moved In Year"
                  required
                  error={itemErr.moveInYear?.message}
                >
                  <select
                    id={`prior-${index}-in-year`}
                    {...register(`addressHistory.priorAddresses.${index}.moveInYear`)}
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!itemErr.moveInYear)}`}
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
                <FieldWrapper
                  id={`prior-${index}-out-month`}
                  label="Moved Out Month"
                  required
                  error={itemErr.moveOutMonth?.message}
                >
                  <select
                    id={`prior-${index}-out-month`}
                    {...register(`addressHistory.priorAddresses.${index}.moveOutMonth`)}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!itemErr.moveOutMonth)}`}
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
                <FieldWrapper
                  id={`prior-${index}-out-year`}
                  label="Moved Out Year"
                  required
                  error={itemErr.moveOutYear?.message}
                >
                  <select
                    id={`prior-${index}-out-year`}
                    {...register(`addressHistory.priorAddresses.${index}.moveOutYear`)}
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!itemErr.moveOutYear)}`}
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
