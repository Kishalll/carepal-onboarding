import { z } from 'zod';
import { CITIES, QUALIFICATIONS, AVAILABILITY_TYPES } from '../config/constants.js';

// Normalizes Indian 10-digit mobile number to +91XXXXXXXXXX
export function normalizeIndianPhone(phone: string): string | null {
  if (!phone) return null;
  // Strip spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Match +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, or XXXXXXXXXX
  const match = cleaned.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (!match) return null;
  return `+91${match[1]}`;
}

export function isAtLeast18YearsOld(dateStr: string | Date): boolean {
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

export const applicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(100, { message: 'Full name cannot exceed 100 characters' }),

  phone: z
    .string()
    .trim()
    .refine((val) => normalizeIndianPhone(val) !== null, {
      message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
    }),

  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address' })
    .max(100),

  dateOfBirth: z
    .string()
    .refine((val) => isAtLeast18YearsOld(val), {
      message: 'You must be at least 18 years old to apply',
    }),

  city: z.enum(CITIES, {
    errorMap: () => ({ message: 'Please select a valid city of residence' }),
  }),

  preferredLanguage: z.enum(['en', 'hi', 'ta'], {
    errorMap: () => ({ message: 'Please select a preferred language' }),
  }),

  qualification: z.enum(QUALIFICATIONS, {
    errorMap: () => ({ message: 'Please select your primary qualification' }),
  }),

  councilRegistrationNumber: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable(),

  experienceYears: z.coerce
    .number({ invalid_type_error: 'Experience years must be a number' })
    .int({ message: 'Experience years must be a whole number' })
    .min(0, { message: 'Experience cannot be negative' })
    .max(50, { message: 'Please enter a realistic number of years' }),

  previousWorkNote: z
    .string()
    .trim()
    .max(1000, { message: 'Work note cannot exceed 1000 characters' })
    .optional()
    .nullable(),

  skills: z
    .array(z.string())
    .min(1, { message: 'Please select at least one caregiving skill' }),

  languages: z
    .array(z.string())
    .min(1, { message: 'Please select at least one language you speak' }),

  preferredCities: z
    .array(z.string())
    .min(1, { message: 'Please select at least one preferred city for work' }),

  availabilityType: z.enum(AVAILABILITY_TYPES, {
    errorMap: () => ({ message: 'Please select your availability schedule' }),
  }),

  earliestStartDate: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Please select a valid start date',
    }),

  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'You must consent to data processing to submit your application' }),
  }),

  turnstileToken: z.string().optional(),
  website_hp: z.string().optional(), // Honeypot field
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
