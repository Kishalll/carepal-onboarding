import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HeartHandshake, Globe, MessageCircle } from 'lucide-react';
import { changeLanguage } from '../i18n/index.js';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const currentLang = i18n.language || 'en';

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  ];

  const handleSelectLang = (code: string) => {
    changeLanguage(code);
    setLangMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-brand-action rounded-xl p-1">
            <div className="w-10 h-10 rounded-xl bg-brand-ink flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <HeartHandshake className="w-6 h-6 text-brand-teal" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg text-brand-ink leading-tight tracking-tight">
                TheCarePal
              </span>
              <span className="text-[11px] font-medium text-brand-secondary -mt-0.5 hidden sm:block">
                Care at Home
              </span>
            </div>
          </Link>

          {/* Navigation Links and Language Switcher */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1.5 sm:gap-2 mr-1">
              <Link
                to="/"
                className="text-sm font-semibold px-4 py-2 rounded-pill bg-brand-softBlueLight text-brand-deepBlue hover:bg-brand-softBlue/60 transition-colors"
              >
                {t('nav.apply')}
              </Link>
            </nav>

            {/* Language Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-brand-heading shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-action"
                aria-label="Change language"
              >
                <Globe className="w-3.5 h-3.5 text-brand-action" />
                <span className="uppercase">{currentLang}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLang(lang.code)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-brand-softBlueLight transition-colors ${
                        currentLang === lang.code
                          ? 'font-bold text-brand-deepBlue bg-blue-50/50'
                          : 'text-brand-heading font-medium'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] text-gray-400 uppercase">{lang.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Floating WhatsApp Support Button */}
      <aside aria-label="Support">
        <a
          href="https://wa.me/919999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-3 rounded-pill shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-3 focus:ring-[#25D366] focus:ring-offset-2 select-none"
          title="Chat on WhatsApp"
        >
          <MessageCircle className="w-5 h-5 fill-current" />
          <span className="text-sm font-semibold hidden sm:inline">
            {t('nav.support')}
          </span>
        </a>
      </aside>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-heading font-bold text-sm text-brand-ink">
                TheCarePal
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-brand-secondary">
                {t('brand.tagline')}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t('brand.motto')}
            </p>
          </div>
          <div className="text-xs text-gray-400">
            &copy; 2026 TheCarePal Healthcare Pvt Ltd. Synthetic demo environment.
          </div>
        </div>
      </footer>
    </div>
  );
};
