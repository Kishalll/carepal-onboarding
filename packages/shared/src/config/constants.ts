export const CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Coimbatore',
] as const;

export type City = (typeof CITIES)[number];

export const SKILLS = [
  'Elderly Care',
  'Alzheimer and Dementia Care',
  'Baby Care',
  'Post-Hospital Recovery',
  'Live-in Care',
  'Autism Care',
  'Emergency Care',
] as const;

export type Skill = (typeof SKILLS)[number];

export const QUALIFICATIONS = [
  'GNM',
  'ANM',
  'B_SC_NURSING',
  'TRAINED_CAREGIVER',
] as const;

export type QualificationType = (typeof QUALIFICATIONS)[number];

export const STAGES = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'VERIFIED',
  'ONBOARDED',
  'REJECTED',
] as const;

export type StageType = (typeof STAGES)[number];

export const AVAILABILITY_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'LIVE_IN',
  'NIGHT_SHIFTS',
  'WEEKENDS',
] as const;

export type Availability = (typeof AVAILABILITY_TYPES)[number];

export const LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Marathi',
] as const;
