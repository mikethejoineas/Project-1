import { z } from 'zod';
import { calculateAddressHistoryCoverage } from './addressHistory.ts';

export interface PasswordValidationCheck {
  lengthOk: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  noAtSymbol: boolean;
  isValid: boolean;
}

export function evaluatePassword(password: string): PasswordValidationCheck {
  const lengthOk = password.length >= 8 && password.length <= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9@]/.test(password);
  const noAtSymbol = !password.includes('@');
  return {
    lengthOk,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    noAtSymbol,
    isValid: lengthOk && hasUpper && hasLower && hasNumber && hasSpecial && noAtSymbol,
  };
}

export function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatDriversLicenseMask(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
}

export function formatZipMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidDateMMDDYYYY(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || year < 1900 || year > 2100) return false;
  const dt = new Date(year, month - 1, day);
  return (
    dt.getFullYear() === year &&
    dt.getMonth() === month - 1 &&
    dt.getDate() === day
  );
}

const dateSchema = z
  .string()
  .trim()
  .refine(isValidDateMMDDYYYY, 'Enter a valid date in MM/DD/YYYY format');

const phoneSchema = z
  .string()
  .trim()
  .refine(
    (v) => v.replace(/\D/g, '').length === 10,
    'Enter a valid 10-digit phone number'
  );

const zipSchema = z
  .string()
  .trim()
  .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid 5-digit or 9-digit ZIP code');

const dlNumberSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i,
    'Enter DL/ID # in 3-segment format (e.g., XXXX-XXXX-XXXX)'
  );

export const personalInfoSchema = z.object({
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  middleName: z.string().trim().max(80).optional().default(''),
  suffix: z.string().trim().max(20).optional().default(''),
  placeOfBirth: z.string().trim().min(2, 'Place of birth (State or Country) is required').max(100),
  dateOfBirth: dateSchema,
  email: z.string().trim().email('A valid email address is required to submit'),
  primaryPhone: phoneSchema,
  retiredPoliceOfficer: z.enum(['Yes', 'No'], {
    error: 'Please select Yes or No',
  }),
});

export const driversLicenseSchema = z.object({
  dlNumber: dlNumberSchema,
  stateIssued: z.string().trim().min(2, 'State issued is required').max(30),
  dateIssued: dateSchema,
  expirationDate: dateSchema,
  dlClass: z.string().trim().min(1, 'License class is required').max(15),
  sex: z.enum(['Male', 'Female'], { error: 'Please select sex' }),
  heightFeet: z.string().trim().regex(/^[3-8]$/, 'Select feet (3-8)'),
  heightInches: z.string().trim().regex(/^(0?[0-9]|1[0-1])$/, 'Select inches (0-11)'),
  weightLbs: z.string().trim().regex(/^\d{2,3}$/, 'Enter weight in lbs'),
  hairColor: z.string().trim().min(1, 'Hair color is required'),
  eyeColor: z.string().trim().min(1, 'Eye color is required'),
  ddNumber: z.string().trim().min(1, 'DD # (Document Discriminator) is required').max(40),
});

export const foidCitizenshipSchema = z
  .object({
    foidNumber: z.string().trim().min(4, 'FOID Card # is required').max(30),
    foidHeightFeet: z.string().trim().regex(/^[3-8]$/, 'Select feet (3-8)'),
    foidHeightInches: z.string().trim().regex(/^(0?[0-9]|1[0-1])$/, 'Select inches (0-11)'),
    foidWeightLbs: z.string().trim().regex(/^\d{2,3}$/, 'Enter weight as on FOID'),
    tcnNumber: z.string().trim().max(40).optional().default(''),
    isUsCitizen: z.enum(['Yes', 'No'], { error: 'Please select Yes or No' }),
    arnNumber: z.string().trim().max(40).optional().default(''),
    i94Number: z.string().trim().max(40).optional().default(''),
    exceptionNumber: z.string().trim().max(40).optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.isUsCitizen === 'No') {
      if (!data.arnNumber && !data.i94Number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['arnNumber'],
          message: 'ARN # or I-94 # is required for non-US citizens',
        });
      }
      if (!data.exceptionNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['exceptionNumber'],
          message: 'Exception # is required for non-US citizens',
        });
      }
    }
  });

export const priorAddressItemSchema = z.object({
  street: z.string().trim().min(2, 'Street address is required'),
  city: z.string().trim().min(2, 'City is required'),
  zip: zipSchema,
  county: z.string().trim().min(2, 'County is required'),
  moveInMonth: z.string().trim().min(1, 'Month required'),
  moveInYear: z.string().trim().regex(/^\d{4}$/, '4-digit year required'),
  moveOutMonth: z.string().trim().min(1, 'Month required'),
  moveOutYear: z.string().trim().regex(/^\d{4}$/, '4-digit year required'),
});

export const addressHistorySchema = z
  .object({
    streetAddress: z.string().trim().min(3, 'Street address is required').max(150),
    aptBldg: z.string().trim().max(40).optional().default(''),
    city: z.string().trim().min(2, 'City is required').max(80),
    zip: zipSchema,
    moveInMonth: z.string().trim().min(1, 'Move-in month is required'),
    moveInYear: z.string().trim().regex(/^\d{4}$/, '4-digit year required'),
    priorAddresses: z.array(priorAddressItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const coverage = calculateAddressHistoryCoverage(
      data.moveInMonth,
      data.moveInYear,
      data.priorAddresses
    );
    if (!coverage.isComplete) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priorAddresses'],
        message: `Address history must cover at least 10 full years (currently ${coverage.yearsCovered} of 10 years covered). Please add prior addresses.`,
      });
    }
  });

export const ispAccountNewSchema = z.object({
  ispUserId: z.string().trim().min(3, 'ISP User ID is required').max(60),
  ispEmail: z.string().trim().email('Valid email required for ISP account'),
  ispPassword: z
    .string()
    .refine(
      (v) => evaluatePassword(v).isValid,
      'Password must be 8-12 characters with uppercase, lowercase, number, special character, and NO @ symbol'
    ),
  sq1Answer: z.string().trim().min(1, 'Security question #1 answer is required').max(120),
  sq2Answer: z.string().trim().min(1, 'Security question #2 answer is required').max(120),
  sq3Answer: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter the last 4 digits of your SSN'),
  sq4Answer: z.string().trim().min(1, 'Security question #4 answer is required').max(120),
});

export const ispAccountRenewalSchema = z.object({
  ispUserId: z.string().trim().min(3, 'ISP User ID is required').max(60),
  ispEmail: z.string().trim().email('Valid email required for ISP account'),
  ispPassword: z
    .string()
    .refine(
      (v) => evaluatePassword(v).isValid,
      'Password must be 8-12 characters (max 12) with uppercase, lowercase, number, special character, and NO @ symbol'
    ),
});

export const criminalHistorySchema = z.object({
  criminalAnswers: z
    .record(z.string(), z.enum(['Yes', 'No']))
    .refine(
      (answers) => {
        for (let i = 1; i <= 19; i++) {
          const val = answers[`q${i}`];
          if (val !== 'Yes' && val !== 'No') return false;
        }
        return true;
      },
      'You must answer Yes or No to all 19 questions'
    ),
});

export const authorizationSchema = z.object({
  authorized: z.literal(true, {
    error: 'You must agree to the authorization statement to submit',
  }),
  printedName: z.string().trim().min(2, 'Printed full name is required').max(120),
  signatureData: z.string().trim().min(2, 'Please provide your signature').max(150000),
  signatureDate: z.string().trim().min(4, 'Signature date is required'),
});
