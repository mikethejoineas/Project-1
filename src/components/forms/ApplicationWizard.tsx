import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Info,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getCsrfToken } from '../../lib/api';
import { usePageMeta, useRouter } from '../../lib/router';
import {
  EYE_COLORS,
  HAIR_COLORS,
  SECURITY_QUESTIONS,
  SERVICE_FEE_USD,
  US_STATES,
} from '../../shared/config';
import { CRIMINAL_HISTORY_QUESTIONS } from '../../utils/criminalQuestions';
import {
  addressHistorySchema,
  authorizationSchema,
  criminalHistorySchema,
  driversLicenseSchema,
  foidCitizenshipSchema,
  formatDateMask,
  formatDriversLicenseMask,
  formatPhoneMask,
  ispAccountNewSchema,
  ispAccountRenewalSchema,
  personalInfoSchema,
} from '../../utils/validation';
import { AddressHistoryStep } from './AddressHistoryStep';
import { FieldWrapper, getInputBorderClass, inputBaseClasses } from './FormControls';
import { PasswordChecklistField } from './PasswordChecklistField';
import { SignaturePad } from './SignaturePad';

interface ApplicationWizardProps {
  formType: 'new' | 'renewal';
}

function getTodayFormatted(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function buildDefaultValues(formType: 'new' | 'renewal') {
  const defaultCriminal: Record<string, string> = {};
  if (formType === 'new') {
    for (let i = 1; i <= 19; i++) {
      defaultCriminal[`q${i}`] = '';
    }
  }
  return {
    personalInfo: {
      lastName: '',
      firstName: '',
      middleName: '',
      suffix: '',
      placeOfBirth: '',
      dateOfBirth: '',
      email: '',
      primaryPhone: '',
      retiredPoliceOfficer: '',
    },
    driversLicense: {
      dlNumber: '',
      stateIssued: 'IL',
      dateIssued: '',
      expirationDate: '',
      dlClass: 'D',
      sex: '',
      heightFeet: '',
      heightInches: '',
      weightLbs: '',
      hairColor: '',
      eyeColor: '',
      ddNumber: '',
    },
    foidCitizenship: {
      foidNumber: '',
      foidHeightFeet: '',
      foidHeightInches: '',
      foidWeightLbs: '',
      tcnNumber: '',
      isUsCitizen: '',
      arnNumber: '',
      i94Number: '',
      exceptionNumber: '',
    },
    addressHistory: {
      streetAddress: '',
      aptBldg: '',
      city: '',
      zip: '',
      moveInMonth: '',
      moveInYear: '',
      priorAddresses: [],
    },
    ispAccount: {
      ispUserId: '',
      ispEmail: '',
      ispPassword: '',
      ...(formType === 'new'
        ? { sq1Answer: '', sq2Answer: '', sq3Answer: '', sq4Answer: '' }
        : {}),
    },
    criminalAnswers: defaultCriminal,
    authorization: {
      authorized: false,
      printedName: '',
      signatureData: '',
      signatureDate: getTodayFormatted(),
    },
  };
}

export function ApplicationWizard({ formType }: ApplicationWizardProps) {
  const { navigate } = useRouter();
  const isNew = formType === 'new';

  usePageMeta(
    isNew
      ? 'New Concealed Carry & FOID Application – EasyApp Processing'
      : 'Concealed Carry & FOID Renewal Application – EasyApp Processing',
    isNew
      ? 'Complete your Illinois Concealed Carry License (CCL) and FOID new application securely online with EasyApp Processing.'
      : 'Complete your Illinois Concealed Carry License (CCL) and FOID renewal application securely online with EasyApp Processing.'
  );

  const storageKey = `easyapp_draft_${formType}`;

  const steps = useMemo(
    () =>
      isNew
        ? [
            { id: 'personal', label: 'Personal Info' },
            { id: 'dl', label: "Driver's License" },
            { id: 'foid', label: 'FOID & Citizenship' },
            { id: 'address', label: '10-Yr Address' },
            { id: 'isp', label: 'ISP Account' },
            { id: 'criminal', label: 'Eligibility (19 Qs)' },
            { id: 'certificate', label: 'Certificate' },
            { id: 'authorization', label: 'Authorization' },
            { id: 'review', label: 'Review & Pay' },
          ]
        : [
            { id: 'personal', label: 'Personal Info' },
            { id: 'dl', label: "Driver's License" },
            { id: 'foid', label: 'FOID & Citizenship' },
            { id: 'address', label: '10-Yr Address' },
            { id: 'isp', label: 'ISP Account' },
            { id: 'certificate', label: 'Certificate' },
            { id: 'authorization', label: 'Authorization' },
            { id: 'review', label: 'Review & Pay' },
          ],
    [isNew]
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialDefaults = useMemo(() => {
    const base = buildDefaultValues(formType);
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...base,
          ...parsed,
          authorization: {
            ...base.authorization,
            ...parsed.authorization,
            signatureDate: getTodayFormatted(),
          },
        };
      }
    } catch {
      // Ignore invalid session storage
    }
    return base;
  }, [formType, storageKey]);

  const form = useForm({
    defaultValues: initialDefaults,
    mode: 'onBlur',
  });

  const {
    register,
    control,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  const watchedAll = watch();
  const isUsCitizen = watch('foidCitizenship.isUsCitizen');

  // Auto-save form draft to browser sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(watchedAll));
    } catch {
      // Ignore quota errors
    }
  }, [watchedAll, storageKey]);

  // Reset step & form cleanly if switching between Form A and Form B
  useEffect(() => {
    setCurrentStep(0);
    setCertificateFile(null);
    setCertificateError(null);
    setSubmitError(null);
  }, [formType]);

  function applyZodErrors(prefix: string, issues: Array<{ path: PropertyKey[]; message: string }>) {
    for (const issue of issues) {
      const joined = issue.path.map(String).join('.');
      const target = prefix ? `${prefix}.${joined}` : joined;
      setError(target as any, { type: 'manual', message: issue.message });
    }
  }

  function validateCurrentStep(): boolean {
    const stepId = steps[currentStep].id;
    const values = getValues();
    clearErrors();
    setCertificateError(null);

    if (stepId === 'personal') {
      const res = personalInfoSchema.safeParse(values.personalInfo);
      if (!res.success) {
        applyZodErrors('personalInfo', res.error.issues);
        return false;
      }
      return true;
    }

    if (stepId === 'dl') {
      const res = driversLicenseSchema.safeParse(values.driversLicense);
      if (!res.success) {
        applyZodErrors('driversLicense', res.error.issues);
        return false;
      }
      return true;
    }

    if (stepId === 'foid') {
      const res = foidCitizenshipSchema.safeParse(values.foidCitizenship);
      if (!res.success) {
        applyZodErrors('foidCitizenship', res.error.issues);
        return false;
      }
      return true;
    }

    if (stepId === 'address') {
      const res = addressHistorySchema.safeParse(values.addressHistory);
      if (!res.success) {
        applyZodErrors('addressHistory', res.error.issues);
        return false;
      }
      return true;
    }

    if (stepId === 'isp') {
      const schema = isNew ? ispAccountNewSchema : ispAccountRenewalSchema;
      const res = schema.safeParse(values.ispAccount);
      if (!res.success) {
        applyZodErrors('ispAccount', res.error.issues);
        return false;
      }
      return true;
    }

    if (stepId === 'criminal') {
      const res = criminalHistorySchema.safeParse({
        criminalAnswers: values.criminalAnswers,
      });
      if (!res.success) {
        setError('criminalAnswers' as any, {
          type: 'manual',
          message: res.error.issues[0]?.message || 'Please answer Yes or No to all 19 questions.',
        });
        return false;
      }
      return true;
    }

    if (stepId === 'certificate') {
      if (!certificateFile) {
        setCertificateError('Please attach a copy of your training certificate (PDF, JPG, or PNG, max 10 MB).');
        return false;
      }
      if (certificateFile.size > 10 * 1024 * 1024) {
        setCertificateError('File exceeds the 10 MB limit.');
        return false;
      }
      return true;
    }

    if (stepId === 'authorization') {
      const res = authorizationSchema.safeParse(values.authorization);
      if (!res.success) {
        applyZodErrors('authorization', res.error.issues);
        return false;
      }
      return true;
    }

    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleFinalSubmit() {
    setSubmitError(null);
    if (!certificateFile) {
      setSubmitError('Training certificate file is required before proceeding to payment.');
      return;
    }

    setSubmitting(true);
    try {
      const csrfToken = await getCsrfToken();
      const values = getValues();
      const fd = new FormData();
      fd.append('formType', formType);
      fd.append('payload', JSON.stringify(values));
      fd.append('certificate', certificateFile);

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        body: fd,
        credentials: 'same-origin',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to submit application');
      }

      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }

      navigate(`/payment?ref=${encodeURIComponent(data.referenceId)}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to save application. Please verify all fields.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const activeStepId = steps[currentStep].id;
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  const pErrors = (errors.personalInfo || {}) as Record<string, any>;
  const dlErrors = (errors.driversLicense || {}) as Record<string, any>;
  const foidErrors = (errors.foidCitizenship || {}) as Record<string, any>;
  const ispErrors = (errors.ispAccount || {}) as Record<string, any>;
  const authErrors = (errors.authorization || {}) as Record<string, any>;

  const values = getValues();

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Header & Instruction Banner */}
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
            {isNew ? 'Form A · New Applicant' : 'Form B · Renewal Applicant'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2744]">
            {isNew
              ? 'New Concealed Carry & FOID Application'
              : 'Concealed Carry & FOID Renewal Application Information'}
          </h1>
        </div>

        <div className="p-4 rounded-xl bg-[#0F2744] text-white flex items-start gap-3">
          <Info className="w-5 h-5 text-[#D4A64A] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm leading-relaxed">
            {isNew
              ? "Enter your personal information exactly as registered on your valid Illinois Driver's License/ID and FOID Card."
              : "Enter your personal information exactly as registered on your valid Illinois Driver's License, Identification Card and FOID Card."}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[#0F2744] tabular-nums">
          <span>
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0F2744] transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="hidden md:flex items-center justify-between gap-2 pt-1">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              disabled={idx > currentStep}
              onClick={() => {
                if (idx <= currentStep) setCurrentStep(idx);
              }}
              className={`text-xs truncate transition-colors ${
                idx === currentStep
                  ? 'font-bold text-[#0F2744]'
                  : idx < currentStep
                  ? 'font-medium text-emerald-700 hover:underline'
                  : 'text-slate-400 cursor-default'
              }`}
            >
              {idx + 1}. {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        {/* STEP: PERSONAL INFO */}
        {activeStepId === 'personal' && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#0F2744]">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4">
                <FieldWrapper
                  id="lastName"
                  label="Last Name"
                  required
                  error={pErrors.lastName?.message}
                >
                  <input
                    id="lastName"
                    type="text"
                    {...register('personalInfo.lastName')}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!pErrors.lastName)}`}
                  />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-4">
                <FieldWrapper
                  id="firstName"
                  label="First Name"
                  required
                  error={pErrors.firstName?.message}
                >
                  <input
                    id="firstName"
                    type="text"
                    {...register('personalInfo.firstName')}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!pErrors.firstName)}`}
                  />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper
                  id="middleName"
                  label="Middle"
                  error={pErrors.middleName?.message}
                >
                  <input
                    id="middleName"
                    type="text"
                    {...register('personalInfo.middleName')}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!pErrors.middleName)}`}
                  />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper
                  id="suffix"
                  label="Suffix"
                  error={pErrors.suffix?.message}
                >
                  <input
                    id="suffix"
                    type="text"
                    {...register('personalInfo.suffix')}
                    placeholder="Jr., III"
                    className={`${inputBaseClasses} ${getInputBorderClass(!!pErrors.suffix)}`}
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWrapper
                id="placeOfBirth"
                label="Place of Birth (State or Country)"
                required
                error={pErrors.placeOfBirth?.message}
              >
                <input
                  id="placeOfBirth"
                  type="text"
                  {...register('personalInfo.placeOfBirth')}
                  placeholder="Illinois"
                  className={`${inputBaseClasses} ${getInputBorderClass(!!pErrors.placeOfBirth)}`}
                />
              </FieldWrapper>

              <FieldWrapper
                id="dateOfBirth"
                label="Date of Birth (MM/DD/YYYY)"
                required
                error={pErrors.dateOfBirth?.message}
              >
                <Controller
                  control={control}
                  name="personalInfo.dateOfBirth"
                  render={({ field }) => (
                    <input
                      id="dateOfBirth"
                      type="text"
                      inputMode="numeric"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(formatDateMask(e.target.value))}
                      placeholder="MM/DD/YYYY"
                      className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!pErrors.dateOfBirth)}`}
                    />
                  )}
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWrapper
                id="email"
                label="Email Address"
                required
                helperText="Must have an email to submit application"
                error={pErrors.email?.message}
              >
                <input
                  id="email"
                  type="email"
                  {...register('personalInfo.email')}
                  placeholder="you@example.com"
                  className={`${inputBaseClasses} ${getInputBorderClass(!!pErrors.email)}`}
                />
              </FieldWrapper>

              <FieldWrapper
                id="primaryPhone"
                label="Primary Phone Number"
                required
                error={pErrors.primaryPhone?.message}
              >
                <Controller
                  control={control}
                  name="personalInfo.primaryPhone"
                  render={({ field }) => (
                    <input
                      id="primaryPhone"
                      type="tel"
                      inputMode="tel"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(formatPhoneMask(e.target.value))}
                      placeholder="(217) 555-0100"
                      className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!pErrors.primaryPhone)}`}
                    />
                  )}
                />
              </FieldWrapper>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-800">
                Are you a retired police officer? <span className="text-red-700">*</span>
              </legend>
              <div className="flex items-center gap-4">
                {(['Yes', 'No'] as const).map((option) => (
                  <label
                    key={option}
                    className="inline-flex items-center gap-2.5 min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      value={option}
                      {...register('personalInfo.retiredPoliceOfficer')}
                      className="w-4 h-4 accent-[#0F2744]"
                    />
                    <span className="text-sm font-medium text-slate-800">{option}</span>
                  </label>
                ))}
              </div>
              {pErrors.retiredPoliceOfficer && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {pErrors.retiredPoliceOfficer.message}
                </p>
              )}
            </fieldset>
          </div>
        )}

        {/* STEP: DRIVER'S LICENSE / ID */}
        {activeStepId === 'dl' && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#0F2744]">
              Driver&apos;s License / State ID Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-6">
                <FieldWrapper
                  id="dlNumber"
                  label="Driver's License or State ID #"
                  required
                  helperText="3 segments separated by dashes (e.g., XXXX-XXXX-XXXX)"
                  error={dlErrors.dlNumber?.message}
                >
                  <Controller
                    control={control}
                    name="driversLicense.dlNumber"
                    render={({ field }) => (
                      <input
                        id="dlNumber"
                        type="text"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(formatDriversLicenseMask(e.target.value))
                        }
                        placeholder="S123-4567-8901"
                        className={`${inputBaseClasses} font-mono uppercase tabular-nums ${getInputBorderClass(
                          !!dlErrors.dlNumber
                        )}`}
                      />
                    )}
                  />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-3">
                <FieldWrapper
                  id="stateIssued"
                  label="State Issued"
                  required
                  error={dlErrors.stateIssued?.message}
                >
                  <select
                    id="stateIssued"
                    {...register('driversLicense.stateIssued')}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!dlErrors.stateIssued)}`}
                  >
                    {US_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
              <div className="sm:col-span-3">
                <FieldWrapper
                  id="dlClass"
                  label="Class"
                  required
                  error={dlErrors.dlClass?.message}
                >
                  <input
                    id="dlClass"
                    type="text"
                    {...register('driversLicense.dlClass')}
                    placeholder="D"
                    className={`${inputBaseClasses} uppercase ${getInputBorderClass(!!dlErrors.dlClass)}`}
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FieldWrapper
                id="dateIssued"
                label="Date Issued (MM/DD/YYYY)"
                required
                error={dlErrors.dateIssued?.message}
              >
                <Controller
                  control={control}
                  name="driversLicense.dateIssued"
                  render={({ field }) => (
                    <input
                      id="dateIssued"
                      type="text"
                      inputMode="numeric"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(formatDateMask(e.target.value))}
                      placeholder="MM/DD/YYYY"
                      className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!dlErrors.dateIssued)}`}
                    />
                  )}
                />
              </FieldWrapper>

              <FieldWrapper
                id="expirationDate"
                label="Expiration Date (MM/DD/YYYY)"
                required
                error={dlErrors.expirationDate?.message}
              >
                <Controller
                  control={control}
                  name="driversLicense.expirationDate"
                  render={({ field }) => (
                    <input
                      id="expirationDate"
                      type="text"
                      inputMode="numeric"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(formatDateMask(e.target.value))}
                      placeholder="MM/DD/YYYY"
                      className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(
                        !!dlErrors.expirationDate
                      )}`}
                    />
                  )}
                />
              </FieldWrapper>

              <FieldWrapper
                id="ddNumber"
                label="DD # (Document Discriminator)"
                required
                error={dlErrors.ddNumber?.message}
              >
                <input
                  id="ddNumber"
                  type="text"
                  {...register('driversLicense.ddNumber')}
                  placeholder="Located on front/back of ID"
                  className={`${inputBaseClasses} font-mono ${getInputBorderClass(!!dlErrors.ddNumber)}`}
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-3">
                <FieldWrapper
                  id="sex"
                  label="Sex"
                  required
                  error={dlErrors.sex?.message}
                >
                  <select
                    id="sex"
                    {...register('driversLicense.sex')}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!dlErrors.sex)}`}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper
                  id="heightFeet"
                  label="Height (ft)"
                  required
                  error={dlErrors.heightFeet?.message}
                >
                  <select
                    id="heightFeet"
                    {...register('driversLicense.heightFeet')}
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!dlErrors.heightFeet)}`}
                  >
                    <option value="">Ft</option>
                    {['4', '5', '6', '7'].map((ft) => (
                      <option key={ft} value={ft}>
                        {ft} ft
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper
                  id="heightInches"
                  label="Height (in)"
                  required
                  error={dlErrors.heightInches?.message}
                >
                  <select
                    id="heightInches"
                    {...register('driversLicense.heightInches')}
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!dlErrors.heightInches)}`}
                  >
                    <option value="">In</option>
                    {Array.from({ length: 12 }, (_, i) => String(i)).map((inc) => (
                      <option key={inc} value={inc}>
                        {inc} in
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper
                  id="weightLbs"
                  label="Weight (lbs)"
                  required
                  error={dlErrors.weightLbs?.message}
                >
                  <input
                    id="weightLbs"
                    type="text"
                    inputMode="numeric"
                    {...register('driversLicense.weightLbs')}
                    placeholder="180"
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(!!dlErrors.weightLbs)}`}
                  />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-3">
                <FieldWrapper
                  id="hairColor"
                  label="Hair Color"
                  required
                  error={dlErrors.hairColor?.message}
                >
                  <select
                    id="hairColor"
                    {...register('driversLicense.hairColor')}
                    className={`${inputBaseClasses} ${getInputBorderClass(!!dlErrors.hairColor)}`}
                  >
                    <option value="">Select</option>
                    {HAIR_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <FieldWrapper
                id="eyeColor"
                label="Eye Color"
                required
                error={dlErrors.eyeColor?.message}
              >
                <select
                  id="eyeColor"
                  {...register('driversLicense.eyeColor')}
                  className={`${inputBaseClasses} ${getInputBorderClass(!!dlErrors.eyeColor)}`}
                >
                  <option value="">Select</option>
                  {EYE_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
            </div>
          </div>
        )}

        {/* STEP: FOID & CITIZENSHIP */}
        {activeStepId === 'foid' && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#0F2744]">
              FOID Card, Fingerprints &amp; Citizenship
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-5">
                <FieldWrapper
                  id="foidNumber"
                  label="FOID Card #"
                  required
                  error={foidErrors.foidNumber?.message}
                >
                  <input
                    id="foidNumber"
                    type="text"
                    {...register('foidCitizenship.foidNumber')}
                    placeholder="Enter FOID number"
                    className={`${inputBaseClasses} font-mono tabular-nums ${getInputBorderClass(
                      !!foidErrors.foidNumber
                    )}`}
                  />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper
                  id="foidHeightFeet"
                  label="FOID Ht (ft)"
                  required
                  error={foidErrors.foidHeightFeet?.message}
                >
                  <select
                    id="foidHeightFeet"
                    {...register('foidCitizenship.foidHeightFeet')}
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(
                      !!foidErrors.foidHeightFeet
                    )}`}
                  >
                    <option value="">Ft</option>
                    {['4', '5', '6', '7'].map((ft) => (
                      <option key={ft} value={ft}>
                        {ft} ft
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper
                  id="foidHeightInches"
                  label="FOID Ht (in)"
                  required
                  error={foidErrors.foidHeightInches?.message}
                >
                  <select
                    id="foidHeightInches"
                    {...register('foidCitizenship.foidHeightInches')}
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(
                      !!foidErrors.foidHeightInches
                    )}`}
                  >
                    <option value="">In</option>
                    {Array.from({ length: 12 }, (_, i) => String(i)).map((inc) => (
                      <option key={inc} value={inc}>
                        {inc} in
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
              <div className="sm:col-span-3">
                <FieldWrapper
                  id="foidWeightLbs"
                  label="Weight (as on FOID)"
                  required
                  error={foidErrors.foidWeightLbs?.message}
                >
                  <input
                    id="foidWeightLbs"
                    type="text"
                    inputMode="numeric"
                    {...register('foidCitizenship.foidWeightLbs')}
                    placeholder="lbs"
                    className={`${inputBaseClasses} tabular-nums ${getInputBorderClass(
                      !!foidErrors.foidWeightLbs
                    )}`}
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="space-y-3">
              <FieldWrapper
                id="tcnNumber"
                label="TCN # for Fingerprints (Optional)"
                helperText="You will get this from Digital Synergy if you were fingerprinted. Optional."
                error={foidErrors.tcnNumber?.message}
              >
                <input
                  id="tcnNumber"
                  type="text"
                  {...register('foidCitizenship.tcnNumber')}
                  placeholder="Optional TCN number"
                  className={`${inputBaseClasses} font-mono ${getInputBorderClass(!!foidErrors.tcnNumber)}`}
                />
              </FieldWrapper>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                Fingerprints are not required for a concealed carry application but are suggested, since they may speed up processing beyond 120 days and help avoid delays caused by name-only background checks.
              </div>
            </div>

            <fieldset className="space-y-2 pt-2">
              <legend className="text-sm font-semibold text-slate-800">
                Are you a US Citizen? <span className="text-red-700">*</span>
              </legend>
              <div className="flex items-center gap-4">
                {(['Yes', 'No'] as const).map((option) => (
                  <label
                    key={option}
                    className="inline-flex items-center gap-2.5 min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      value={option}
                      {...register('foidCitizenship.isUsCitizen')}
                      className="w-4 h-4 accent-[#0F2744]"
                    />
                    <span className="text-sm font-medium text-slate-800">{option}</span>
                  </label>
                ))}
              </div>
              {foidErrors.isUsCitizen && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {foidErrors.isUsCitizen.message}
                </p>
              )}
            </fieldset>

            {isUsCitizen === 'No' && (
              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldWrapper
                  id="arnNumber"
                  label="ARN #"
                  error={foidErrors.arnNumber?.message}
                >
                  <input
                    id="arnNumber"
                    type="text"
                    {...register('foidCitizenship.arnNumber')}
                    className={`${inputBaseClasses} font-mono ${getInputBorderClass(!!foidErrors.arnNumber)}`}
                  />
                </FieldWrapper>
                <FieldWrapper
                  id="i94Number"
                  label="I-94 #"
                  error={foidErrors.i94Number?.message}
                >
                  <input
                    id="i94Number"
                    type="text"
                    {...register('foidCitizenship.i94Number')}
                    className={`${inputBaseClasses} font-mono ${getInputBorderClass(!!foidErrors.i94Number)}`}
                  />
                </FieldWrapper>
                <FieldWrapper
                  id="exceptionNumber"
                  label="Exception #"
                  required
                  error={foidErrors.exceptionNumber?.message}
                >
                  <input
                    id="exceptionNumber"
                    type="text"
                    {...register('foidCitizenship.exceptionNumber')}
                    className={`${inputBaseClasses} font-mono ${getInputBorderClass(
                      !!foidErrors.exceptionNumber
                    )}`}
                  />
                </FieldWrapper>
              </div>
            )}
          </div>
        )}

        {/* STEP: 10-YEAR ADDRESS HISTORY */}
        {activeStepId === 'address' && <AddressHistoryStep form={form} />}

        {/* STEP: ISP ACCOUNT */}
        {activeStepId === 'isp' && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#0F2744]">
              Illinois State Police (ISP) Account Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWrapper
                id="ispUserId"
                label="ISP User ID"
                required
                helperText="Suggested: First Initial + Middle Initial + Last Name. If you already have an account on the ISP Firearm Services website for your FOID card, use that."
                error={ispErrors.ispUserId?.message}
              >
                <input
                  id="ispUserId"
                  type="text"
                  {...register('ispAccount.ispUserId')}
                  className={`${inputBaseClasses} ${getInputBorderClass(!!ispErrors.ispUserId)}`}
                />
              </FieldWrapper>

              <FieldWrapper
                id="ispEmail"
                label="ISP Account Email"
                required
                error={ispErrors.ispEmail?.message}
              >
                <input
                  id="ispEmail"
                  type="email"
                  {...register('ispAccount.ispEmail')}
                  className={`${inputBaseClasses} ${getInputBorderClass(!!ispErrors.ispEmail)}`}
                />
              </FieldWrapper>
            </div>

            <PasswordChecklistField
              form={form}
              helperText={
                isNew
                  ? 'Must be 8 to 12 characters, at least one uppercase, one lowercase, one number, one special character, and NO "@" symbol. Example: Digital2!'
                  : 'Must be 8 to 12 characters (maximum 12). No @ symbol. If you already have an account on the ISP Firearm Services website, use it.'
              }
            />

            {isNew && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0F2744]">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  <span>ISP Account Security Questions (Encrypted at Rest)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldWrapper
                    id="sq1Answer"
                    label={SECURITY_QUESTIONS[0].label}
                    required
                    error={ispErrors.sq1Answer?.message}
                  >
                    <input
                      id="sq1Answer"
                      type="text"
                      {...register('ispAccount.sq1Answer')}
                      className={`${inputBaseClasses} ${getInputBorderClass(!!ispErrors.sq1Answer)}`}
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    id="sq2Answer"
                    label={SECURITY_QUESTIONS[1].label}
                    required
                    error={ispErrors.sq2Answer?.message}
                  >
                    <input
                      id="sq2Answer"
                      type="text"
                      {...register('ispAccount.sq2Answer')}
                      className={`${inputBaseClasses} ${getInputBorderClass(!!ispErrors.sq2Answer)}`}
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    id="sq3Answer"
                    label={SECURITY_QUESTIONS[2].label}
                    required
                    helperText="Last 4 digits only (e.g., 1234)"
                    error={ispErrors.sq3Answer?.message}
                  >
                    <input
                      id="sq3Answer"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      {...register('ispAccount.sq3Answer')}
                      className={`${inputBaseClasses} font-mono tabular-nums ${getInputBorderClass(
                        !!ispErrors.sq3Answer
                      )}`}
                      placeholder="••••"
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    id="sq4Answer"
                    label={SECURITY_QUESTIONS[3].label}
                    required
                    error={ispErrors.sq4Answer?.message}
                  >
                    <input
                      id="sq4Answer"
                      type="text"
                      {...register('ispAccount.sq4Answer')}
                      className={`${inputBaseClasses} ${getInputBorderClass(!!ispErrors.sq4Answer)}`}
                    />
                  </FieldWrapper>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP: CRIMINAL HISTORY & ELIGIBILITY (FORM A ONLY) */}
        {activeStepId === 'criminal' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-[#0F2744]">
                Criminal History &amp; Eligibility Questions
              </h2>
              <div className="p-4 rounded-xl bg-[#FBF5E8] border border-[#D4A64A]/50 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#9A6D1B] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-900">
                  You must answer Yes or No to every question. A YES answer could cause denial of your application.
                </p>
              </div>
            </div>

            {(errors.criminalAnswers as any)?.message && (
              <div role="alert" className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {(errors.criminalAnswers as any).message}
              </div>
            )}

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {CRIMINAL_HISTORY_QUESTIONS.map((q) => (
                <div
                  key={q.id}
                  className="p-4 sm:p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <p className="text-sm text-slate-800 leading-relaxed flex-1">
                    <span className="font-mono font-bold text-[#0F2744] mr-2">
                      {q.number})
                    </span>
                    {q.text}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    {(['Yes', 'No'] as const).map((ans) => (
                      <label
                        key={ans}
                        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="radio"
                          value={ans}
                          {...register(`criminalAnswers.${q.id}`)}
                          className="w-4 h-4 accent-[#0F2744]"
                        />
                        <span className="text-sm font-semibold text-slate-800">
                          {ans}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP: TRAINING CERTIFICATE UPLOAD */}
        {activeStepId === 'certificate' && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#0F2744]">
              Training Certificate Upload
            </h2>
            <p className="text-sm text-slate-600">
              Please attach a copy of your training certificate. Accepted formats: PDF, JPG, or PNG (maximum 10 MB). Uploaded files are encrypted at rest with AES-256-GCM.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 sm:p-8 bg-[#F8FAFC] text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0F2744]/10 text-[#0F2744]">
                <FileUp className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="training-certificate-input"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#0F2744] hover:bg-[#17365D] text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  <span>
                    {certificateFile ? 'Replace Certificate File' : 'Select Certificate File'}
                  </span>
                </label>
                <input
                  id="training-certificate-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCertificateError(null);
                    if (file && file.size > 10 * 1024 * 1024) {
                      setCertificateError('File exceeds 10 MB maximum size.');
                      setCertificateFile(null);
                      return;
                    }
                    setCertificateFile(file);
                  }}
                />
                <p className="text-xs text-slate-500 pt-1">
                  PDF, JPG, or PNG · Max 10 MB
                </p>
              </div>

              {certificateFile && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>
                    {certificateFile.name} ({(certificateFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              )}
            </div>

            {certificateError && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {certificateError}
              </p>
            )}
          </div>
        )}

        {/* STEP: AUTHORIZATION & SIGNATURE */}
        {activeStepId === 'authorization' && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-[#0F2744]">
              Disclosure, Authorization &amp; Signature
            </h2>

            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                Bob Sumption (EasyApp Processing) is an independent service and is not affiliated with High Caliber or any training provider, and is not employed by ISP. You may not hold EasyApp Processing/Bob Sumption liable for any actions, statements, etc. taken or provided by any training provider, or should your application be denied due to the information you provide.
              </p>
              {!isNew && (
                <p className="font-medium text-slate-800">
                  I understand EasyApp Processing is not employed by ISP, and that this document&apos;s information is deleted once my application has been submitted.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-300 bg-white cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  {...register('authorization.authorized')}
                  className="mt-1 w-5 h-5 accent-[#0F2744] shrink-0"
                />
                <span className="text-sm text-slate-800 leading-relaxed">
                  {isNew
                    ? 'I give EasyApp Processing/Bob Sumption permission to use all information included in this form for the purposes of creating my digital ID, filling out and submitting my concealed carry application and, if needed, changing the address on my FOID card. I will not hold EasyApp Processing/Bob Sumption liable for using my personal information to submit the application.'
                    : 'I give EasyApp Processing/Bob Sumption permission to use all information included in this form for purposes of creating my digital ID, filling out, submitting my conceal carry renewal application and change of address on FOID card if needed. I will not hold EasyApp Processing/Bob Sumption liable for using my personal information to submit the application.'}
                </span>
              </label>
              {authErrors.authorized && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {authErrors.authorized.message}
                </p>
              )}
            </div>

            <SignaturePad form={form} />
          </div>
        )}

        {/* STEP: FINAL REVIEW SCREEN */}
        {activeStepId === 'review' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-[#0F2744]">
                Review Your Application Before Payment
              </h2>
              <p className="text-sm text-slate-600">
                Confirm your details below. After proceeding, your application is encrypted and saved as Pending Payment while you complete the ${SERVICE_FEE_USD}.00 service fee checkout.
              </p>
            </div>

            {submitError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 sm:p-5 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-[#0F2744]">Personal Info</p>
                  <p className="text-slate-700">
                    {values.personalInfo.firstName} {values.personalInfo.middleName}{' '}
                    {values.personalInfo.lastName} {values.personalInfo.suffix}
                  </p>
                  <p className="text-slate-600 tabular-nums">
                    DOB: {values.personalInfo.dateOfBirth} · Birthplace: {values.personalInfo.placeOfBirth}
                  </p>
                  <p className="text-slate-600">
                    {values.personalInfo.email} · {values.personalInfo.primaryPhone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  className="text-xs font-semibold text-[#0F2744] underline shrink-0"
                >
                  Edit
                </button>
              </div>

              <div className="p-4 sm:p-5 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-[#0F2744]">Driver&apos;s License &amp; FOID</p>
                  <p className="text-slate-700 font-mono tabular-nums">
                    DL #: {values.driversLicense.dlNumber} ({values.driversLicense.stateIssued}, Class{' '}
                    {values.driversLicense.dlClass})
                  </p>
                  <p className="text-slate-600 font-mono tabular-nums">
                    FOID #: {values.foidCitizenship.foidNumber} · US Citizen:{' '}
                    {values.foidCitizenship.isUsCitizen}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-semibold text-[#0F2744] underline shrink-0"
                >
                  Edit
                </button>
              </div>

              <div className="p-4 sm:p-5 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-[#0F2744]">Address History</p>
                  <p className="text-slate-700">
                    {values.addressHistory.streetAddress}{' '}
                    {values.addressHistory.aptBldg}, {values.addressHistory.city}{' '}
                    {values.addressHistory.zip} (Since {values.addressHistory.moveInMonth}/
                    {values.addressHistory.moveInYear})
                  </p>
                  <p className="text-slate-600">
                    Prior addresses included: {values.addressHistory.priorAddresses?.length || 0}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-semibold text-[#0F2744] underline shrink-0"
                >
                  Edit
                </button>
              </div>

              <div className="p-4 sm:p-5 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-[#0F2744]">ISP Account &amp; Certificate</p>
                  <p className="text-slate-700">
                    User ID: {values.ispAccount.ispUserId} · Email: {values.ispAccount.ispEmail}
                  </p>
                  <p className="text-slate-600">
                    Certificate: {certificateFile?.name || 'Not attached'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-semibold text-[#0F2744] underline shrink-0"
                >
                  Edit
                </button>
              </div>

              <div className="p-4 sm:p-5 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-[#0F2744]">Authorization &amp; Signature</p>
                  <p className="text-slate-700">
                    Signed by {values.authorization.printedName} on{' '}
                    {values.authorization.signatureDate}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(steps.length - 2)}
                  className="text-xs font-semibold text-[#0F2744] underline shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between gap-4">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {activeStepId !== 'review' ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-lg transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-2 min-h-[48px] px-6 py-3 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] disabled:opacity-60 rounded-lg transition-colors"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>
                {submitting
                  ? 'Encrypting & Saving...'
                  : `Proceed to Payment ($${SERVICE_FEE_USD}.00)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
