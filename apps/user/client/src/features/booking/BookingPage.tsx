import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Badge,
  Input,
  useToast,
  Skeleton,
} from '@carepal/ui';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  User,
  HeartHandshake,
  Check,
  CalendarCheck,
} from 'lucide-react';

interface CandidateSummary {
  id: string;
  applicationId: string;
  fullName: string;
  city: string;
  qualification: string;
  preferredLanguage: string;
}

interface InterviewSlot {
  id: string;
  startTime: string;
  endTime: string;
  interviewerName: string;
  mode: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  bookingToken: string;
  candidateId?: string | null;
  bookedAt?: string | null;
}

export const BookingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();

  const currentLang = (i18n.language || 'en').slice(0, 2);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateSummary | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [isSlotToken, setIsSlotToken] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<InterviewSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<InterviewSlot[]>([]);

  // Selection & booking state
  const [selectedSlot, setSelectedSlot] = useState<InterviewSlot | null>(null);
  const [candidateIdentifier, setCandidateIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBookingInfo = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/booking/${token}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Unable to retrieve interview booking details.');
      }

      const data = await res.json();
      setCandidate(data.candidate);
      setIsBooked(data.isBooked);
      setIsSlotToken(!!data.isSlotToken);

      if (data.isBooked && data.existingBooking) {
        setConfirmedBooking(data.existingBooking);
      } else {
        setAvailableSlots(data.availableSlots || []);
        if (data.isSlotToken && data.targetSlot) {
          setSelectedSlot(data.targetSlot);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading booking details';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBookingInfo();
  }, [fetchBookingInfo]);

  const handleConfirmBooking = async () => {
    if (!token || !selectedSlot) return;

    if (!candidate && !candidateIdentifier.trim()) {
      toastError(
        currentLang === 'hi'
          ? 'कृपया स्लॉट सुरक्षित करने के लिए अपना आवेदन आईडी या पंजीकृत मोबाइल नंबर दर्ज करें।'
          : currentLang === 'ta'
          ? 'நேரத்தை பதிவு செய்ய உங்கள் விண்ணப்ப எண் அல்லது மொபைல் எண்ணை உள்ளிடவும்.'
          : 'Please enter your Application ID or registered mobile number to confirm this slot.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/booking/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          candidateIdentifier: candidateIdentifier.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toastError(data.message || 'This slot was just booked by another candidate. Please choose an alternate slot.');
          fetchBookingInfo();
          setSelectedSlot(null);
          return;
        }
        throw new Error(data.message || 'Failed to book slot.');
      }

      toastSuccess('Interview successfully scheduled!');
      setConfirmedBooking(data.booking);
      if (data.booking?.candidate) {
        setCandidate(data.booking.candidate);
      }
      setIsBooked(true);
      setSelectedSlot(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule appointment';
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'PHONE':
        return <Phone className="w-4 h-4" />;
      case 'IN_PERSON':
        return <MapPin className="w-4 h-4" />;
      case 'VIDEO':
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const getModeLabel = (mode: string) => {
    if (currentLang === 'hi') {
      if (mode === 'PHONE') return 'टेलीफोन साक्षात्कार';
      if (mode === 'IN_PERSON') return 'व्यक्तिगत साक्षात्कार';
      return 'वीडियो कॉल (Google Meet)';
    }
    if (currentLang === 'ta') {
      if (mode === 'PHONE') return 'தொலைபேசி நேர்காணல்';
      if (mode === 'IN_PERSON') return 'நேரில் நேர்காணல்';
      return 'வீடியோ அழைப்பு (Google Meet)';
    }
    if (mode === 'PHONE') return 'Phone Call';
    if (mode === 'IN_PERSON') return 'In-Person Clinic';
    return 'Video Call (Google Meet)';
  };

  // Group available slots by date
  const slotsByDate = availableSlots.reduce<Record<string, InterviewSlot[]>>((acc, slot) => {
    const dateKey = new Date(slot.startTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <Skeleton className="h-10 w-3/4 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card variant="white" padding="lg" className="text-center shadow-lg border-red-100">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-heading font-bold text-brand-heading">
            {currentLang === 'hi'
              ? 'अमान्य या समाप्त लिंक'
              : currentLang === 'ta'
              ? 'செல்லுபடியாகாத இணைப்பு'
              : 'Invalid or Expired Link'}
          </h2>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            {errorMsg}
          </p>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link to="/careers/apply">
              <Button variant="primary" size="md">
                {currentLang === 'hi' ? 'आवेदन पृष्ठ पर जाएं' : currentLang === 'ta' ? 'விண்ணப்ப பக்கம்' : 'Go to Careers'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Candidate Profile Top Banner */}
      {candidate ? (
        <Card variant="softBlue" padding="md" className="border border-blue-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white text-brand-action shadow-xs flex items-center justify-center font-bold text-sm">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-deepBlue uppercase tracking-wider block">
                  {currentLang === 'hi' ? 'अभ्यर्थी साक्षात्कार' : currentLang === 'ta' ? 'விண்ணப்பதாரர் நேர்காணல்' : 'Candidate Interview'}
                </span>
                <h2 className="text-lg font-heading font-bold text-brand-heading">
                  {candidate.fullName}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge label={`ID: ${candidate.applicationId}`} variant="blue" size="md" />
              <Badge label={candidate.city} variant="neutral" size="md" />
            </div>
          </div>
        </Card>
      ) : isSlotToken ? (
        <Card variant="softBlue" padding="md" className="border border-blue-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white text-brand-action shadow-xs flex items-center justify-center font-bold text-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-deepBlue uppercase tracking-wider block">
                  {currentLang === 'hi' ? 'साक्षात्कार स्लॉट बुकिंग' : currentLang === 'ta' ? 'நேர்காணல் நேரம் பதிவு' : 'Interview Slot Booking'}
                </span>
                <h2 className="text-base font-heading font-bold text-brand-heading">
                  {currentLang === 'hi'
                    ? 'अपना आवेदन संदर्भ दर्ज करके इस स्लॉट की पुष्टि करें'
                    : currentLang === 'ta'
                    ? 'உங்கள் விண்ணப்ப எண் மூலம் இந்த நேரத்தை உறுதிப்படுத்தவும்'
                    : 'Claim this appointment slot with your Application ID'}
                </h2>
              </div>
            </div>
            <Badge label="Stage: Interview" variant="teal" size="md" />
          </div>
        </Card>
      ) : null}

      {/* CONFIRMED APPOINTMENT STATE */}
      {isBooked && confirmedBooking ? (
        <Card variant="white" padding="lg" className="shadow-lg border-green-100 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-green-50/50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-green-50 text-green-800 text-xs font-semibold mb-2">
            <CalendarCheck className="w-4 h-4 text-green-600" />
            {currentLang === 'hi' ? 'पुष्टि की गई नियुक्ति' : currentLang === 'ta' ? 'உறுதிப்படுத்தப்பட்ட நேரம்' : 'Confirmed Appointment'}
          </span>

          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
            {currentLang === 'hi'
              ? 'आपका साक्षात्कार निर्धारित है!'
              : currentLang === 'ta'
              ? 'உங்கள் நேர்காணல் நேரம் பதிவு செய்யப்பட்டது!'
              : 'Your Interview is Scheduled!'}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {currentLang === 'hi'
              ? 'एक पुष्टिकरण ईमेल आपके पंजीकृत ईमेल पते पर भेज दिया गया है।'
              : currentLang === 'ta'
              ? 'உறுதிப்படுத்தல் தகவல் உங்கள் மின்னஞ்சல் முகவரிக்கு அனுப்பப்பட்டுள்ளது.'
              : 'A calendar invitation and confirmation email have been dispatched to your email address.'}
          </p>

          {/* Appointment Details Box */}
          <div className="my-6 p-5 rounded-2xl bg-gray-50 border border-gray-200/80 text-left space-y-4 max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-brand-action shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-gray-400 block">
                  {currentLang === 'hi' ? 'दिनांक और समय' : currentLang === 'ta' ? 'தேதி மற்றும் நேரம்' : 'Date & Time'}
                </span>
                <span className="font-heading font-bold text-brand-heading text-sm">
                  {new Intl.DateTimeFormat('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(confirmedBooking.startTime))}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-3 border-t border-gray-200/60">
              <User className="w-5 h-5 text-brand-action shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-gray-400 block">
                  {currentLang === 'hi' ? 'साक्षात्कारकर्ता' : currentLang === 'ta' ? 'நேர்காணலாளர்' : 'Interviewer'}
                </span>
                <span className="font-semibold text-brand-heading text-xs">
                  {confirmedBooking.interviewerName}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-3 border-t border-gray-200/60">
              <div className="text-brand-action shrink-0 mt-0.5">
                {getModeIcon(confirmedBooking.mode)}
              </div>
              <div>
                <span className="text-xs text-gray-400 block">
                  {currentLang === 'hi' ? 'माध्यम' : currentLang === 'ta' ? 'முறை' : 'Interview Mode'}
                </span>
                <span className="font-semibold text-brand-heading text-xs">
                  {getModeLabel(confirmedBooking.mode)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-gray-500">
            {currentLang === 'hi'
              ? 'यदि आपको समय बदलना है, तो कृपया TheCarePal हेल्पलाइन से संपर्क करें।'
              : currentLang === 'ta'
              ? 'நேரத்தை மாற்ற விரும்பினால், TheCarePal ஆதரவு குழுவைத் தொடர்புகொள்ளவும்.'
              : 'Need to reschedule or have questions? Contact support via WhatsApp or email.'}
          </div>
        </Card>
      ) : (
        /* AVAILABLE SLOTS SELECTION STATE */
        <Card variant="white" padding="lg" className="shadow-lg space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-brand-heading">
              {currentLang === 'hi'
                ? 'साक्षात्कार स्लॉट चुनें'
                : currentLang === 'ta'
                ? 'நேர்காணல் நேரத்தைத் தேர்ந்தெடுக்கவும்'
                : 'Select Your Interview Slot'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {currentLang === 'hi'
                ? 'अपनी उपलब्धता के अनुसार सुविधाजनक समय चुनें। स्लॉट तुरंत सुरक्षित कर दिया जाएगा।'
                : currentLang === 'ta'
                ? 'உங்கள் வசதிக்கேற்ப ஒரு நேரத்தைத் தேர்வு செய்யவும். நேரம் உடனடியாக பதிவு செய்யப்படும்.'
                : 'Choose a convenient date and time for your clinical conversation with our operations leads.'}
            </p>
          </div>

          {availableSlots.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-action flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-heading font-semibold text-brand-heading">
                {currentLang === 'hi'
                  ? 'वर्तमान में कोई स्लॉट उपलब्ध नहीं है'
                  : currentLang === 'ta'
                  ? 'தற்போது நேரங்கள் எதுவும் கிடைக்கவில்லை'
                  : 'No Slots Currently Available'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {currentLang === 'hi'
                  ? 'हमारी टीम नए साक्षात्कार स्लॉट जोड़ रही है। कृपया थोड़ी देर बाद पुनः देखें।'
                  : currentLang === 'ta'
                  ? 'எங்கள் குழு புதிய நேரங்களை விரைவில் சேர்க்கும். சிறிது நேரம் கழித்து பார்க்கவும்.'
                  : 'Our operations team is opening new slots shortly. Please check back soon.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(slotsByDate).map(([dateLabel, dateSlots]) => (
                <div key={dateLabel} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-action" />
                    <h3 className="text-sm font-heading font-bold text-brand-heading">
                      {dateLabel}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dateSlots.map((slot) => {
                      const startTimeStr = new Intl.DateTimeFormat('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(slot.startTime));

                      const endTimeStr = new Intl.DateTimeFormat('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(slot.endTime));

                      const isSelected = selectedSlot?.id === slot.id;

                      return (
                        <div
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-action bg-blue-50/60 ring-2 ring-brand-action/40 shadow-sm'
                              : 'border-gray-200/80 bg-white hover:border-brand-action/40 hover:bg-gray-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-heading font-bold text-sm text-brand-heading flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-brand-action" />
                              {startTimeStr} - {endTimeStr}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-brand-action text-white flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="truncate">
                              {slot.interviewerName}
                            </div>
                            <div className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium pt-1">
                              {getModeIcon(slot.mode)}
                              <span>{getModeLabel(slot.mode)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Bar */}
          {selectedSlot && (
            <div className="p-5 rounded-2xl bg-brand-softBlueLight border border-blue-200/80 flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-brand-deepBlue uppercase font-semibold">
                    {currentLang === 'hi' ? 'चयनित समय' : currentLang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட நேரம்' : 'Selected Appointment'}
                  </span>
                  <div className="text-sm font-heading font-bold text-brand-heading">
                    {new Intl.DateTimeFormat('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(selectedSlot.startTime))}{' '}
                    with {selectedSlot.interviewerName} ({getModeLabel(selectedSlot.mode)})
                  </div>
                </div>
              </div>

              {!candidate && (
                <div className="pt-2 border-t border-blue-200/60 max-w-md">
                  <Input
                    label={
                      currentLang === 'hi'
                        ? 'अपना आवेदन आईडी या मोबाइल नंबर दर्ज करें'
                        : currentLang === 'ta'
                        ? 'உங்கள் விண்ணப்ப எண் அல்லது மொபைல் எண்ணை உள்ளிடவும்'
                        : 'Enter your Application ID or Mobile Number'
                    }
                    placeholder="e.g. CP-2026-000009 or 9876543210"
                    value={candidateIdentifier}
                    onChange={(e) => setCandidateIdentifier(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSlot(null)}
                >
                  {currentLang === 'hi' ? 'रद्द करें' : currentLang === 'ta' ? 'ரத்து' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  loading={submitting}
                  icon={<Check className="w-4 h-4" />}
                  onClick={handleConfirmBooking}
                >
                  {currentLang === 'hi' ? 'पुष्टि करें और बुक करें' : currentLang === 'ta' ? 'உறுதிப்படுத்துக' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
