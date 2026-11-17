import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Button,
  Input,
  Select,
  MultiSelect,
  Chip,
  Card,
  Stepper,
  useToast,
  Badge,
} from '@carepal/ui';
import { CITIES, QUALIFICATIONS, AVAILABILITY_TYPES, SKILLS, LANGUAGES } from '@carepal/shared';
import {
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  User,
  UploadCloud,
  FileText,
  Camera,
  Trash2,
  FileCheck2,
} from 'lucide-react';
import { TurnstileWidget } from '../../components/TurnstileWidget';

const DRAFT_KEY = 'carepal_application_draft';

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  city: string;
  preferredLanguage: string;
  qualification: string;
  councilRegistrationNumber: string;
  experienceYears: number | string;
  skills: string[];
  languages: string[];
  previousWorkNote: string;
  preferredCities: string[];
  availabilityType: string;
  earliestStartDate: string;
  consentGiven: boolean;
  website_hp: string;
}

const defaultState: FormState = {
  fullName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  city: '',
  preferredLanguage: 'en',
  qualification: '',
  councilRegistrationNumber: '',
  experienceYears: '',
  skills: [],
  languages: ['English'],
  previousWorkNote: '',
  preferredCities: [],
  availabilityType: '',
  earliestStartDate: '',
  consentGiven: false,
  website_hp: '',
};

export const ApplyForm: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { error: toastError } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          return { ...defaultState, ...JSON.parse(saved) };
        } catch {
          // ignore parsing error
        }
      }
    }
    return defaultState;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicatePhoneNotice, setDuplicatePhoneNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // Document upload state for Step 4
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idType, setIdType] = useState('AADHAAR');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [certificateFiles, setCertificateFiles] = useState<File[]>([]);

  // Drag over states
  const [dragActiveId, setDragActiveId] = useState(false);
  const [dragActivePhoto, setDragActivePhoto] = useState(false);
  const [dragActiveCert, setDragActiveCert] = useState(false);

  // Hidden file inputs
  const idInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  // Preview object URL lifecycle
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const validateClientFile = (file: File): string | null => {
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return `File size is ${mb} MB. Maximum allowed size is 5 MB.`;
    }
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lower.endsWith(ext));
    if (!hasValidExt) {
      return 'Only PDF, JPEG, and PNG files are allowed.';
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setFieldErrors((prev) => {
      if (!prev.turnstile) return prev;
      const next = { ...prev };
      delete next.turnstile;
      return next;
    });
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('');
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!submittedAppId) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }
  }, [formData, submittedAppId]);

  // Keep preferredLanguage synced with active i18n language
  useEffect(() => {
    if (i18n.language && formData.preferredLanguage !== i18n.language) {
      setFormData((prev) => ({ ...prev, preferredLanguage: i18n.language }));
    }
  }, [i18n.language, formData.preferredLanguage]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (field === 'phone' && duplicatePhoneNotice) {
      setDuplicatePhoneNotice(null);
    }
  };

  const handleClearDraft = () => {
    if (window.confirm('Are you sure you want to clear your saved draft and start fresh?')) {
      localStorage.removeItem(DRAFT_KEY);
      setFormData(defaultState);
      setCurrentStep(0);
      setFieldErrors({});
      setDuplicatePhoneNotice(null);
    }
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
        errors.fullName = 'Full name must be at least 2 characters';
      }
      const cleanedPhone = formData.phone.replace(/[\s\-()]/g, '');
      if (!/^(?:\+?91|0)?([6-9]\d{9})$/.test(cleanedPhone)) {
        errors.phone = 'Enter a valid 10-digit Indian mobile starting with 6, 7, 8, or 9';
      }
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Enter a valid email address';
      }
      if (!formData.dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required';
      } else {
        const dob = new Date(formData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age < 18) {
          errors.dateOfBirth = 'You must be at least 18 years old to apply';
        }
      }
      if (!formData.city) {
        errors.city = 'Please select your current city of residence';
      }
    } else if (currentStep === 1) {
      if (!formData.qualification) {
        errors.qualification = 'Please select your healthcare qualification';
      }
      if (formData.experienceYears === '' || Number(formData.experienceYears) < 0) {
        errors.experienceYears = 'Experience years must be 0 or more';
      }
      if (formData.skills.length === 0) {
        errors.skills = 'Select at least one caregiving skill';
      }
      if (formData.languages.length === 0) {
        errors.languages = 'Select at least one spoken language';
      }
    } else if (currentStep === 2) {
      if (formData.preferredCities.length === 0) {
        errors.preferredCities = 'Select at least one preferred city for assignments';
      }
      if (!formData.availabilityType) {
        errors.availabilityType = 'Please select your shift availability';
      }
      if (!formData.earliestStartDate) {
        errors.earliestStartDate = 'Please select your earliest start date';
      }
    } else if (currentStep === 3) {
      if (!idProofFile) {
        errors.idProof = 'Please upload an official identity proof document';
      }
      if (!photoFile) {
        errors.photo = 'Please upload a passport-size photograph';
      }
    } else if (currentStep === 4) {
      if (!formData.consentGiven) {
        errors.consentGiven = 'Consent to verification is required to submit your application';
      }
      if (!turnstileToken) {
        errors.turnstile = 'Security challenge token is required';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((s) => Math.min(4, s + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setDuplicatePhoneNotice(null);

    try {
      const payload = new FormData();
      payload.append('fullName', formData.fullName);
      payload.append('phone', formData.phone);
      payload.append('email', formData.email);
      payload.append('dateOfBirth', formData.dateOfBirth);
      payload.append('city', formData.city);
      payload.append('preferredLanguage', formData.preferredLanguage);
      payload.append('qualification', formData.qualification);
      if (formData.councilRegistrationNumber) {
        payload.append('councilRegistrationNumber', formData.councilRegistrationNumber);
      }
      payload.append('experienceYears', String(formData.experienceYears));
      if (formData.previousWorkNote) {
        payload.append('previousWorkNote', formData.previousWorkNote);
      }
      payload.append('skills', JSON.stringify(formData.skills));
      payload.append('languages', JSON.stringify(formData.languages));
      payload.append('preferredCities', JSON.stringify(formData.preferredCities));
      payload.append('availabilityType', formData.availabilityType);
      payload.append('earliestStartDate', formData.earliestStartDate);
      payload.append('consentGiven', String(formData.consentGiven));
      payload.append('website_hp', formData.website_hp);
      payload.append('turnstileToken', turnstileToken);

      if (idProofFile) {
        payload.append('idProof', idProofFile);
        payload.append('idType', idType);
      }
      if (photoFile) {
        payload.append('photo', photoFile);
      }
      for (const cert of certificateFiles) {
        payload.append('certificates', cert);
      }

      const response = await fetch('/api/applications', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();

      if (response.status === 409) {
        setDuplicatePhoneNotice(data.message || 'An application with this mobile number already exists.');
        setCurrentStep(0); // Jump back to step 1 so applicant sees the notice next to phone
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (!response.ok) {
        toastError(data.message || 'Failed to submit application. Please check your entries.');
        if (data.details) {
          const newErrors: Record<string, string> = {};
          for (const key of Object.keys(data.details)) {
            if (data.details[key]?._errors?.[0]) {
              newErrors[key] = data.details[key]._errors[0];
            }
          }
          setFieldErrors(newErrors);
        }
        return;
      }

      // Success
      localStorage.removeItem(DRAFT_KEY);
      setSubmittedAppId(data.applicationId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission error:', err);
      toastError('Network error. Please verify your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (submittedAppId) {
      navigator.clipboard.writeText(submittedAppId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  // SUCCESS SCREEN
  if (submittedAppId) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <Card variant="white" padding="lg" className="text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-green-50/50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-green-50 text-green-800 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            Verified Submission
          </span>

          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
            {t('apply.success.title')}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {t('apply.success.subtitle')}
          </p>

          {/* Reference ID card */}
          <div className="my-6 p-5 rounded-2xl bg-brand-softBlueLight border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-xs text-brand-deepBlue uppercase font-semibold tracking-wider">
                {t('apply.success.appId')}
              </span>
              <div className="text-2xl font-heading font-bold text-brand-heading mt-0.5 tracking-tight">
                {submittedAppId}
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyId}
            >
              {copiedId ? t('apply.success.copied') : t('apply.success.copyId')}
            </Button>
          </div>

          {/* Timeline of Next Steps */}
          <div className="text-left border-t border-gray-100 pt-6 mt-6">
            <h4 className="text-sm font-heading font-semibold text-brand-heading mb-4">
              {t('apply.success.nextStepsTitle')}
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-brand-action flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {t('apply.success.step1')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {t('apply.success.step2')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {t('apply.success.step3')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={`/careers/apply/${submittedAppId}/documents`}>
              <Button
                variant="primary"
                size="md"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Upload Verification Documents Now
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="md">
                {t('apply.success.backHome')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const stepsList = [
    { id: 1, title: t('apply.step1.title'), description: t('apply.step1.desc') },
    { id: 2, title: t('apply.step2.title'), description: t('apply.step2.desc') },
    { id: 3, title: t('apply.step3.title'), description: t('apply.step3.desc') },
    { id: 4, title: t('apply.step4.title'), description: t('apply.step4.desc') },
    { id: 5, title: t('apply.step5.title'), description: t('apply.step5.desc') },
  ];

  const cityOptions = CITIES.map((c) => ({ value: c, label: c }));
  const qualOptions = QUALIFICATIONS.map((q) => {
    const labels: Record<string, string> = {
      GNM: 'General Nursing & Midwifery (GNM)',
      ANM: 'Auxiliary Nurse Midwife (ANM)',
      B_SC_NURSING: 'B.Sc Nursing',
      TRAINED_CAREGIVER: 'Trained Caregiver',
    };
    return { value: q, label: labels[q] || q };
  });

  const availOptions = AVAILABILITY_TYPES.map((a) => {
    const labels: Record<string, string> = {
      FULL_TIME: 'Full Time (12h shifts)',
      PART_TIME: 'Part Time (4-6h shifts)',
      LIVE_IN: 'Live-In Care (24x7 with family)',
      NIGHT_SHIFTS: 'Night Shifts Only',
      WEEKENDS: 'Weekends & Emergency Relief',
    };
    return { value: a, label: labels[a] || a };
  });

  const skillOptions = SKILLS.map((s) => ({ value: s, label: s }));
  const langOptions = LANGUAGES.map((l) => ({ value: l, label: l }));

  return (
    <div className="max-w-3xl mx-auto py-2">
      {/* Title & draft status banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
            {t('apply.pageTitle')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('apply.pageSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-gray-100 text-gray-600 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t('common.draftSaved')}
          </span>
          <button
            type="button"
            onClick={handleClearDraft}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors"
            title={t('common.clearDraft')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Duplicate Phone Notice Alert */}
      {duplicatePhoneNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Application Already on File</div>
            <p className="mt-0.5 text-xs text-amber-800">{duplicatePhoneNotice}</p>
          </div>
        </div>
      )}

      {/* Stepper Progress */}
      <div className="mb-8">
        <Stepper
          steps={stepsList}
          currentStep={currentStep}
          onStepClick={(idx) => idx < currentStep && setCurrentStep(idx)}
        />
      </div>

      {/* Multi-Step Card */}
      <Card variant="white" padding="lg" className="shadow-lg">
        <form onSubmit={handleSubmit} noValidate>
          {/* Honeypot field (hidden from real users) */}
          <input
            type="text"
            name="website_hp"
            value={formData.website_hp}
            onChange={(e) => updateField('website_hp', e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* STEP 1: Personal Details */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-heading font-semibold text-brand-heading">
                  {t('apply.step1.title')}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('apply.step1.desc')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Input
                    label={t('apply.step1.fullName')}
                    placeholder={t('apply.step1.fullNamePlaceholder')}
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    error={fieldErrors.fullName}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />
                </div>

                <Input
                  label={t('apply.step1.phone')}
                  placeholder={t('apply.step1.phonePlaceholder')}
                  hint={t('apply.step1.phoneHint')}
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  error={fieldErrors.phone}
                  leftIcon={<Phone className="w-4 h-4" />}
                  required
                />

                <Input
                  label={t('apply.step1.email')}
                  type="email"
                  placeholder={t('apply.step1.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  error={fieldErrors.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <Input
                  label={t('apply.step1.dob')}
                  type="date"
                  hint={t('apply.step1.dobHint')}
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  error={fieldErrors.dateOfBirth}
                  leftIcon={<Calendar className="w-4 h-4" />}
                  required
                />

                <Select
                  label={t('apply.step1.city')}
                  placeholder={t('apply.step1.cityPlaceholder')}
                  options={cityOptions}
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  error={fieldErrors.city}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 2: Qualifications & Skills */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-heading font-semibold text-brand-heading">
                  {t('apply.step2.title')}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('apply.step2.desc')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Select
                    label={t('apply.step2.qualification')}
                    placeholder={t('apply.step2.qualPlaceholder')}
                    options={qualOptions}
                    value={formData.qualification}
                    onChange={(e) => updateField('qualification', e.target.value)}
                    error={fieldErrors.qualification}
                    required
                  />
                </div>

                {/* Show Nursing Council field for GNM, ANM, B.Sc */}
                {formData.qualification && formData.qualification !== 'TRAINED_CAREGIVER' && (
                  <div className="sm:col-span-2">
                    <Input
                      label={t('apply.step2.council')}
                      placeholder={t('apply.step2.councilPlaceholder')}
                      hint={t('apply.step2.councilHint')}
                      value={formData.councilRegistrationNumber}
                      onChange={(e) => updateField('councilRegistrationNumber', e.target.value)}
                      error={fieldErrors.councilRegistrationNumber}
                    />
                  </div>
                )}

                <Input
                  label={t('apply.step2.experience')}
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 4"
                  value={formData.experienceYears}
                  onChange={(e) => updateField('experienceYears', e.target.value)}
                  error={fieldErrors.experienceYears}
                  required
                />

                <div className="sm:col-span-2">
                  <MultiSelect
                    label={t('apply.step2.skills')}
                    hint={t('apply.step2.skillsHint')}
                    options={skillOptions}
                    value={formData.skills}
                    onChange={(skills) => updateField('skills', skills)}
                    error={fieldErrors.skills}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <MultiSelect
                    label={t('apply.step2.languages')}
                    hint={t('apply.step2.languagesHint')}
                    options={langOptions}
                    value={formData.languages}
                    onChange={(langs) => updateField('languages', langs)}
                    error={fieldErrors.languages}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-brand-heading mb-1.5">
                    {t('apply.step2.workNote')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={t('apply.step2.workNotePlaceholder')}
                    value={formData.previousWorkNote}
                    onChange={(e) => updateField('previousWorkNote', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-action focus:border-brand-action"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Cities & Availability */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-heading font-semibold text-brand-heading">
                  {t('apply.step3.title')}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('apply.step3.desc')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <MultiSelect
                    label={t('apply.step3.preferredCities')}
                    hint={t('apply.step3.preferredCitiesHint')}
                    options={cityOptions}
                    value={formData.preferredCities}
                    onChange={(cities) => updateField('preferredCities', cities)}
                    error={fieldErrors.preferredCities}
                    required
                  />
                </div>

                <Select
                  label={t('apply.step3.availability')}
                  placeholder={t('apply.step3.availPlaceholder')}
                  options={availOptions}
                  value={formData.availabilityType}
                  onChange={(e) => updateField('availabilityType', e.target.value)}
                  error={fieldErrors.availabilityType}
                  required
                />

                <Input
                  label={t('apply.step3.startDate')}
                  type="date"
                  value={formData.earliestStartDate}
                  onChange={(e) => updateField('earliestStartDate', e.target.value)}
                  error={fieldErrors.earliestStartDate}
                  leftIcon={<Calendar className="w-4 h-4" />}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 4: Document Upload */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-heading font-semibold text-brand-heading">
                  {t('apply.step4.title')}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('apply.step4.desc')}</p>
              </div>

              {/* Slot 1: ID Proof */}
              <div className="p-4 rounded-2xl bg-white border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-brand-action" />
                    <span className="text-sm font-heading font-semibold text-brand-heading">
                      {t('apply.step4.idProofTitle')}
                    </span>
                  </div>
                  {idProofFile ? (
                    <Badge label="Attached" variant="green" size="sm" />
                  ) : (
                    <Badge label="Required" variant="neutral" size="sm" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{t('apply.step4.idProofDesc')}</p>

                <div className="max-w-xs">
                  <Select
                    label="Identity Document Type"
                    options={[
                      { value: 'AADHAAR', label: 'Aadhaar Card (Masked)' },
                      { value: 'VOTER_ID', label: 'Voter ID' },
                      { value: 'PASSPORT', label: 'Passport' },
                      { value: 'DRIVING_LICENSE', label: 'Driving License' },
                    ]}
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                  />
                </div>

                {idProofFile ? (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="text-xs font-semibold text-brand-heading truncate">
                        {idProofFile.name}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        ({formatFileSize(idProofFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIdProofFile(null)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActiveId(true);
                    }}
                    onDragLeave={() => setDragActiveId(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActiveId(false);
                      if (e.dataTransfer.files?.[0]) {
                        const err = validateClientFile(e.dataTransfer.files[0]);
                        if (err) {
                          setFieldErrors((prev) => ({ ...prev, idProof: err }));
                        } else {
                          setIdProofFile(e.dataTransfer.files[0]);
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.idProof;
                            return c;
                          });
                        }
                      }
                    }}
                    onClick={() => idInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                      dragActiveId
                        ? 'border-brand-action bg-blue-50/50'
                        : 'border-gray-200 hover:border-brand-action/50 hover:bg-gray-50/50'
                    }`}
                  >
                    <UploadCloud className="w-5 h-5 text-brand-action mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-brand-heading block">
                      Click to choose or drag ID proof file
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      PDF, JPEG, or PNG up to 5 MB
                    </span>
                  </div>
                )}
                {fieldErrors.idProof && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.idProof}</p>
                )}
                <input
                  id="id-proof-input"
                  ref={idInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const err = validateClientFile(e.target.files[0]);
                      if (err) {
                        setFieldErrors((prev) => ({ ...prev, idProof: err }));
                      } else {
                        setIdProofFile(e.target.files[0]);
                        setFieldErrors((prev) => {
                          const c = { ...prev };
                          delete c.idProof;
                          return c;
                        });
                      }
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Slot 2: Passport Photo */}
              <div className="p-4 rounded-2xl bg-white border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-brand-action" />
                    <span className="text-sm font-heading font-semibold text-brand-heading">
                      {t('apply.step4.photoTitle')}
                    </span>
                  </div>
                  {photoFile ? (
                    <Badge label="Attached" variant="green" size="sm" />
                  ) : (
                    <Badge label="Required" variant="neutral" size="sm" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{t('apply.step4.photoDesc')}</p>

                {photoFile ? (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 truncate">
                      {photoPreviewUrl ? (
                        <img
                          src={photoPreviewUrl}
                          alt="Passport Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-gray-300 shrink-0"
                        />
                      ) : (
                        <Camera className="w-5 h-5 text-brand-action shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-brand-heading truncate">
                        {photoFile.name}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        ({formatFileSize(photoFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotoFile(null)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActivePhoto(true);
                    }}
                    onDragLeave={() => setDragActivePhoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActivePhoto(false);
                      if (e.dataTransfer.files?.[0]) {
                        const err = validateClientFile(e.dataTransfer.files[0]);
                        if (err) {
                          setFieldErrors((prev) => ({ ...prev, photo: err }));
                        } else {
                          setPhotoFile(e.dataTransfer.files[0]);
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.photo;
                            return c;
                          });
                        }
                      }
                    }}
                    onClick={() => photoInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                      dragActivePhoto
                        ? 'border-brand-action bg-blue-50/50'
                        : 'border-gray-200 hover:border-brand-action/50 hover:bg-gray-50/50'
                    }`}
                  >
                    <Camera className="w-5 h-5 text-brand-action mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-brand-heading block">
                      Click to choose or drag passport photo
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      JPEG or PNG up to 5 MB
                    </span>
                  </div>
                )}
                {fieldErrors.photo && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.photo}</p>
                )}
                <input
                  id="photo-input"
                  ref={photoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const err = validateClientFile(e.target.files[0]);
                      if (err) {
                        setFieldErrors((prev) => ({ ...prev, photo: err }));
                      } else {
                        setPhotoFile(e.target.files[0]);
                        setFieldErrors((prev) => {
                          const c = { ...prev };
                          delete c.photo;
                          return c;
                        });
                      }
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Slot 3: Certificates */}
              <div className="p-4 rounded-2xl bg-white border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-action" />
                    <span className="text-sm font-heading font-semibold text-brand-heading">
                      {t('apply.step4.certsTitle')}
                    </span>
                  </div>
                  <Badge
                    label={`${certificateFiles.length}/5 attached`}
                    variant={certificateFiles.length > 0 ? 'blue' : 'neutral'}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-gray-500">{t('apply.step4.certsDesc')}</p>

                {certificateFiles.length > 0 && (
                  <div className="space-y-2">
                    {certificateFiles.map((cert, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-brand-action shrink-0" />
                          <span className="text-xs font-semibold text-brand-heading truncate">
                            {cert.name}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            ({formatFileSize(cert.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCertificateFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-white"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {certificateFiles.length < 5 && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActiveCert(true);
                    }}
                    onDragLeave={() => setDragActiveCert(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActiveCert(false);
                      if (e.dataTransfer.files?.[0]) {
                        const err = validateClientFile(e.dataTransfer.files[0]);
                        if (err) {
                          setFieldErrors((prev) => ({ ...prev, certificates: err }));
                        } else {
                          setCertificateFiles((prev) => [...prev, e.dataTransfer.files[0]]);
                        }
                      }
                    }}
                    onClick={() => certInputRef.current?.click()}
                    className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                      dragActiveCert
                        ? 'border-brand-action bg-blue-50/50'
                        : 'border-gray-200 hover:border-brand-action/50 hover:bg-gray-50/50'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4 text-brand-action mx-auto mb-1" />
                    <span className="text-xs font-semibold text-brand-heading block">
                      Add qualification certificate ({5 - certificateFiles.length} slots left)
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      PDF, JPEG, or PNG up to 5 MB
                    </span>
                  </div>
                )}
                {fieldErrors.certificates && (
                  <p className="text-xs text-red-600 font-medium">
                    {fieldErrors.certificates}
                  </p>
                )}
                <input
                  id="cert-input"
                  ref={certInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const err = validateClientFile(e.target.files[0]);
                      if (err) {
                        setFieldErrors((prev) => ({ ...prev, certificates: err }));
                      } else {
                        setCertificateFiles((prev) => [...prev, e.target.files[0]]);
                      }
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Review & Consent */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-heading font-semibold text-brand-heading">
                  {t('apply.step5.title')}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('apply.step5.desc')}</p>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-semibold text-brand-heading">
                    {t('apply.step5.summaryHeading')}
                  </h3>
                  <Badge label={formData.qualification} variant="blue" size="sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">Candidate Name</span>
                    <span className="font-semibold text-brand-heading text-sm">
                      {formData.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Mobile & Email</span>
                    <span className="font-medium text-brand-heading">
                      {formData.phone} | {formData.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Residence City & Experience</span>
                    <span className="font-medium text-brand-heading">
                      {formData.city} ({formData.experienceYears} years)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Availability</span>
                    <span className="font-medium text-brand-heading">
                      {formData.availabilityType}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60">
                  <span className="text-gray-400 text-xs block mb-1.5">Selected Skills:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.skills.map((s) => (
                      <Chip key={s} label={s} size="sm" variant="action" />
                    ))}
                  </div>
                </div>

                {/* Attached Documents Overview */}
                <div className="pt-3 border-t border-gray-200/60">
                  <span className="text-gray-400 text-xs block mb-2 font-medium">
                    {t('apply.step5.attachedDocs')}:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200/80 flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-brand-action shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {idProofFile?.name || 'No file'}
                        </span>
                        <span className="text-[10px] text-gray-400">{idType}</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200/80 flex items-center gap-2">
                      {photoPreviewUrl ? (
                        <img
                          src={photoPreviewUrl}
                          alt="Preview"
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <Camera className="w-4 h-4 text-brand-action shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {photoFile?.name || 'No photo'}
                        </span>
                        <span className="text-[10px] text-gray-400">Passport Photo</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200/80 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-action shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {certificateFiles.length} Certificate{certificateFiles.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-[10px] text-gray-400">Qualification</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Turnstile Bot Verification Box */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-brand-action" />
                    <div>
                      <span className="text-xs font-semibold text-brand-heading block">
                        {t('apply.step5.securityCheck')}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Cloudflare Turnstile Verification
                      </span>
                    </div>
                  </div>
                  {turnstileToken ? (
                    <Badge label="Verified" variant="green" size="sm" />
                  ) : (
                    <Badge label="Required" variant="neutral" size="sm" />
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-blue-100/60">
                  <TurnstileWidget
                    onVerify={handleTurnstileVerify}
                    onExpire={handleTurnstileExpire}
                  />
                  {fieldErrors.turnstile && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {fieldErrors.turnstile}
                    </p>
                  )}
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.consentGiven}
                    onChange={(e) => updateField('consentGiven', e.target.checked)}
                    className="w-4 h-4 rounded mt-0.5 text-brand-action focus:ring-brand-action border-gray-300"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed">
                    {t('apply.step5.consentText')}
                  </span>
                </label>
                {fieldErrors.consentGiven && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">
                    {fieldErrors.consentGiven}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Navigation Buttons */}
          <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleBack}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                {t('common.back')}
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {t('common.next')}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {isSubmitting ? t('common.submitting') : t('common.submit')}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
