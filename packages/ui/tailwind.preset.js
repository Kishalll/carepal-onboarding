/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        brand: {
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
        },
        stage: {
          applied: '#2563EB',
          screening: '#D97706',
          interview: '#4F46E5',
          verified: '#0D9488',
          onboarded: '#16A34A',
          rejected: '#DC2626',
        },
      },
      fontFamily: {
        heading: ['Lexend', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'sans-serif'],
        sans: ['Inter', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'sans-serif'],
      },
      borderRadius: {
        card: '22px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(16, 24, 32, 0.06), 0 2px 6px -1px rgba(16, 24, 32, 0.04)',
        soft: '0 2px 10px rgba(0, 116, 255, 0.08)',
        header: '0 2px 8px rgba(16, 24, 32, 0.04)',
      },
    },
  },
  plugins: [],
};
