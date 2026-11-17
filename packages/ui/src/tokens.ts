export const colors = {
  ink: '#101820',
  teal: '#3FB6AD',
  action: '#0074FF',
  actionHover: '#005fe0',
  deepBlue: '#2563EB',
  softBlue: '#C5DBFF',
  softBlueLight: '#EEF5FF',
  periwinkle: '#709FFA',
  heading: '#1F2937',
  secondary: '#33454F',
  muted: '#6B7280',
  border: '#E5E7EB',
  stage: {
    applied: '#2563EB',
    screening: '#D97706',
    interview: '#4F46E5',
    verified: '#0D9488',
    onboarded: '#16A34A',
    rejected: '#DC2626',
  },
} as const;

export const stageBadgeStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  APPLIED: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Applied',
  },
  SCREENING: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    label: 'Screening',
  },
  INTERVIEW: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    label: 'Interview',
  },
  VERIFIED: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    label: 'Verified',
  },
  ONBOARDED: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    label: 'Onboarded',
  },
  REJECTED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    label: 'Rejected',
  },
};
