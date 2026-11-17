import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastProvider, Card, Button, Badge } from '@carepal/ui';
import { PublicLayout } from './components/PublicLayout.js';
import { HeartHandshake, ShieldCheck, Clock, Users, ArrowRight } from 'lucide-react';

function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <Card variant="gradient" padding="lg" className="relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white/20 backdrop-blur-md text-white text-xs font-semibold">
            <HeartHandshake className="w-4 h-4 text-brand-teal" />
            {t('brand.tagline')}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-white leading-tight">
            {t('hero.title')}
          </h1>
          <p className="text-base sm:text-lg text-white/90 font-normal leading-relaxed">
            {t('hero.subtitle')} {t('brand.motto')}
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/careers/apply">
              <Button
                variant="ink"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                className="bg-brand-ink text-white hover:bg-black shadow-md"
              >
                Apply for Care Roles
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Trust & Care Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card variant="white" padding="md" className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-action flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-semibold text-base text-brand-heading">
            Verified Credentials
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Full background checks, nursing council registration verification, and authentic documentation.
          </p>
        </Card>

        <Card variant="white" padding="md" className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-semibold text-base text-brand-heading">
            Flexible Shifts
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Opportunities across live-in, full-time, night shifts, and specialized weekend care.
          </p>
        </Card>

        <Card variant="white" padding="md" className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-semibold text-base text-brand-heading">
            Dedicated Care Support
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Continuous support from our clinical operations team across all 8 major Indian cities.
          </p>
        </Card>
      </div>

      {/* Target cities pill overview */}
      <Card variant="softBlue" padding="md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-heading font-semibold text-sm text-brand-deepBlue">
              Currently Hiring Across 8 Cities
            </h4>
            <p className="text-xs text-brand-secondary mt-0.5">
              Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, and Coimbatore
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge label="Delhi NCR" variant="blue" size="sm" />
            <Badge label="Mumbai" variant="blue" size="sm" />
            <Badge label="Bengaluru" variant="blue" size="sm" />
            <Badge label="Chennai" variant="teal" size="sm" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <PublicLayout>
          <Routes>
            <Route path="*" element={<HomePage />} />
          </Routes>
        </PublicLayout>
      </ToastProvider>
    </BrowserRouter>
  );
}
