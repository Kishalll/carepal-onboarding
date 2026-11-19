import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '../db.js';
import { Stage } from '@prisma/client';

interface EmailTemplate {
  subject: string;
  headline: string;
  bodyHtml: string;
  bodyText: string;
}

interface SendStageEmailParams {
  candidateId: string;
  candidateName: string;
  recipientEmail: string;
  stage: Stage;
  preferredLanguage?: string | null;
  applicationId: string;
  reasonNote?: string | null;
  interviewDetails?: {
    startTime?: Date;
    bookingToken?: string;
    interviewerName?: string;
    mode?: string;
  };
}

// Mail Transporter Singleton
let transporterInstance: Transporter | null = null;

export function getMailTransporter(): Transporter {
  if (!transporterInstance) {
    const host = process.env.MAIL_HOST || 'localhost';
    const port = Number(process.env.MAIL_PORT) || 1025;
    const user = process.env.MAIL_USER || '';
    const pass = process.env.MAIL_PASS || '';
    const secure = process.env.MAIL_SECURE === 'true';

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporterInstance;
}

// Localized Stage Templates (EN, HI, TA)
function getTemplate(
  stage: Stage,
  lang: string,
  candidateName: string,
  applicationId: string,
  reasonNote?: string | null
): EmailTemplate {
  const normLang = lang === 'hi' || lang === 'ta' ? lang : 'en';

  if (normLang === 'hi') {
    switch (stage) {
      case Stage.APPLIED:
        return {
          subject: `TheCarePal: आवेदन प्राप्त हुआ (${applicationId})`,
          headline: 'आपका आवेदन सफलतापूर्वक प्राप्त हुआ',
          bodyHtml: `
            <p>नमस्ते <b>${candidateName}</b>,</p>
            <p>TheCarePal हेल्थकेयर टीम के साथ आवेदन करने के लिए धन्यवाद। आपका आवेदन आईडी <b>${applicationId}</b> है।</p>
            <p>हमारी ऑपरेशंस टीम आपके दस्तावेजों की प्रारंभिक समीक्षा करेगी और जल्द ही अगले चरण के लिए संपर्क करेगी।</p>
          `,
          bodyText: `नमस्ते ${candidateName},\n\nTheCarePal हेल्थकेयर टीम के साथ आवेदन करने के लिए धन्यवाद। आपका आवेदन आईडी ${applicationId} है। हमारी टीम जल्द ही आपसे संपर्क करेगी।`,
        };
      case Stage.SCREENING:
        return {
          subject: `TheCarePal: प्रोफाइल स्क्रीनिंग के लिए शॉर्टलिस्ट (${applicationId})`,
          headline: 'आपकी प्रोफाइल स्क्रीनिंग के लिए आगे बढ़ाई गई है',
          bodyHtml: `
            <p>नमस्ते <b>${candidateName}</b>,</p>
            <p>हमें यह बताते हुए खुशी हो रही है कि आपकी प्रोफाइल प्रारंभिक समीक्षा में पास हो गई है और अब स्क्रीनिंग चरण में है।</p>
            <p>हमारा एक विशेषज्ञ आपसे जल्द ही 10 मिनट के टेलीफोनिक इंटरव्यू के लिए संपर्क करेगा। कृपया अपने दस्तावेज़ तैयार रखें।</p>
          `,
          bodyText: `नमस्ते ${candidateName},\n\nआपकी प्रोफाइल प्रारंभिक समीक्षा में पास हो गई है। हमारी टीम 10 मिनट के टेलीफोनिक साक्षात्कार के लिए संपर्क करेगी।`,
        };
      case Stage.INTERVIEW:
        return {
          subject: `TheCarePal: साक्षात्कार आमंत्रण (${applicationId})`,
          headline: 'साक्षात्कार चरण में आपका स्वागत है',
          bodyHtml: `
            <p>नमस्ते <b>${candidateName}</b>,</p>
            <p>बधाई हो! आप TheCarePal के क्लिनिकल और तकनीकी साक्षात्कार दौर के लिए आमंत्रित हैं।</p>
            <p>साक्षात्कार स्लॉट का चयन करने और समय की पुष्टि करने के लिए हमारी टीम आपसे संपर्क करेगी या आपको स्लॉट बुकिंग लिंक भेजेगी।</p>
          `,
          bodyText: `नमस्ते ${candidateName},\n\nबधाई हो! आप साक्षात्कार दौर के लिए आमंत्रित हैं। ऑपरेशंस टीम समय और लिंक की पुष्टि करेगी।`,
        };
      case Stage.VERIFIED:
        return {
          subject: `TheCarePal: सत्यापन सफल, क्रेडेंशियल स्वीकृत (${applicationId})`,
          headline: 'आपके सभी दस्तावेज़ और क्रेडेंशियल सत्यापित हैं',
          bodyHtml: `
            <p>नमस्ते <b>${candidateName}</b>,</p>
            <p>शानदार समाचार! आपकी योग्यताएं, नर्सिंग काउंसिल पंजीकरण और पहचान प्रमाण पूरी तरह सत्यापित हो चुके हैं।</p>
            <p>आप अब TheCarePal केयर असाइनमेंट के लिए पूरी तरह योग्य हैं। अगला कदम अंतिम ऑनबोर्डिंग है।</p>
          `,
          bodyText: `नमस्ते ${candidateName},\n\nशानदार समाचार! आपके सभी दस्तावेज़ और क्रेडेंशियल सत्यापित हो चुके हैं। आप अब केयर असाइनमेंट के लिए पात्र हैं।`,
        };
      case Stage.ONBOARDED:
        return {
          subject: `TheCarePal: टीम में आपका स्वागत है! (${applicationId})`,
          headline: 'TheCarePal परिवार में आपका हार्दिक स्वागत है',
          bodyHtml: `
            <p>नमस्ते <b>${candidateName}</b>,</p>
            <p>बधाई हो! आपकी ऑनबोर्डिंग प्रक्रिया पूरी हो गई है और आप आधिकारिक तौर पर TheCarePal हेल्थकेयर टीम के सदस्य हैं।</p>
            <p>हमारा ऑपरेशंस लीड जल्द ही आपको पहली केयर असाइनमेंट और शिफ्ट शेड्यूल के लिए संपर्क करेगा।</p>
          `,
          bodyText: `नमस्ते ${candidateName},\n\nबधाई हो! आपकी ऑनबोर्डिंग पूरी हो चुकी है। TheCarePal परिवार में आपका स्वागत है।`,
        };
      case Stage.REJECTED:
        return {
          subject: `TheCarePal: आवेदन स्थिति अपडेट (${applicationId})`,
          headline: 'आपके आवेदन की वर्तमान स्थिति',
          bodyHtml: `
            <p>नमस्ते <b>${candidateName}</b>,</p>
            <p>TheCarePal के साथ आवेदन करने और समय देने के लिए धन्यवाद।</p>
            <p>गहन समीक्षा के बाद, हम वर्तमान में आपके आवेदन को आगे बढ़ाने में असमर्थ हैं।</p>
            ${reasonNote ? `<p><b>टिप्पणी:</b> ${reasonNote}</p>` : ''}
            <p>हम आपके उज्ज्वल भविष्य की कामना करते हैं।</p>
          `,
          bodyText: `नमस्ते ${candidateName},\n\nआवेदन करने के लिए धन्यवाद। वर्तमान में हम आपके आवेदन को आगे बढ़ाने में असमर्थ हैं।${reasonNote ? `\nकारण: ${reasonNote}` : ''}\nशुभकामनाएं।`,
        };
    }
  }

  if (normLang === 'ta') {
    switch (stage) {
      case Stage.APPLIED:
        return {
          subject: `TheCarePal: விண்ணப்பம் பெறப்பட்டது (${applicationId})`,
          headline: 'உங்கள் விண்ணப்பம் வெற்றிகரமாக பெறப்பட்டது',
          bodyHtml: `
            <p>வணக்கம் <b>${candidateName}</b>,</p>
            <p>TheCarePal ஹெல்த்கேர் நெட்வொர்க்கில் விண்ணப்பித்தமைக்கு நன்றி. உங்கள் விண்ணப்ப எண் <b>${applicationId}</b>.</p>
            <p>எங்கள் செயல்பாட்டுக் குழு உங்கள் சான்றிதழ்களை மதிப்பாய்வு செய்து அடுத்த கட்ட தகவல்களுடன் தொடர்புகொள்வார்கள்.</p>
          `,
          bodyText: `வணக்கம் ${candidateName},\n\nTheCarePal-ல் விண்ணப்பித்தமைக்கு நன்றி. உங்கள் விண்ணப்ப எண் ${applicationId}. எங்கள் குழு விரைவில் தொடர்புகொள்ளும்.`,
        };
      case Stage.SCREENING:
        return {
          subject: `TheCarePal: திரையிடலுக்கு தேர்ந்தெடுக்கப்பட்டீர்கள் (${applicationId})`,
          headline: 'உங்கள் சுயவிவரம் திரையிடலுக்கு தேர்வு செய்யப்பட்டுள்ளது',
          bodyHtml: `
            <p>வணக்கம் <b>${candidateName}</b>,</p>
            <p>உங்கள் சுயவிவரம் முதற்கட்ட மதிப்பாய்வில் தேர்வாகி இப்போது திரையிடல் கட்டத்திற்கு முன்னேறியுள்ளது என்பதை மகிழ்ச்சியுடன் தெரிவித்துக் கொள்கிறோம்.</p>
            <p>எங்கள் நிபுணர் 10 நிமிட தொலைபேசி அழைப்பு மூலம் உங்களைத் தொடர்புகொள்வார்.</p>
          `,
          bodyText: `வணக்கம் ${candidateName},\n\nஉங்கள் சுயவிவரம் திரையிடலுக்கு தேர்வாகியுள்ளது. எங்கள் நிபுணர் விரைவில் தொலைபேசியில் தொடர்புகொள்வார்.`,
        };
      case Stage.INTERVIEW:
        return {
          subject: `TheCarePal: நேர்காணல் அழைப்பு (${applicationId})`,
          headline: 'மருத்துவ நேர்காணல் சுற்றுக்கு உங்களை வரவேற்கிறோம்',
          bodyHtml: `
            <p>வணக்கம் <b>${candidateName}</b>,</p>
            <p>வாழ்த்துகள்! TheCarePal மருத்துவ மற்றும் தொழில்நுட்ப நேர்காணல் சுற்றுக்கு நீங்கள் அழைக்கப்பட்டுள்ளீர்கள்.</p>
            <p>நேர்காணல் நேரத்தைத் தேர்வு செய்ய எங்கள் குழு உங்களைத் தொடர்புகொள்வார்கள்.</p>
          `,
          bodyText: `வணக்கம் ${candidateName},\n\nவாழ்த்துகள்! நீங்கள் நேர்காணல் சுற்றுக்கு அழைக்கப்பட்டுள்ளீர்கள். விவரங்கள் விரைவில் பகிரப்படும்.`,
        };
      case Stage.VERIFIED:
        return {
          subject: `TheCarePal: சான்றிதழ்கள் சரிபார்க்கப்பட்டன (${applicationId})`,
          headline: 'உங்கள் சான்றிதழ்கள் அனைத்தும் வெற்றிகரமாக அங்கீகரிக்கப்பட்டன',
          bodyHtml: `
            <p>வணக்கம் <b>${candidateName}</b>,</p>
            <p>மகிழ்ச்சியான செய்தி! உங்கள் கல்விச் சான்றிதழ்கள், நர்சிங் கவுன்சில் பதிவு மற்றும் அடையாள ஆவணங்கள் முழுமையாக சரிபார்க்கப்பட்டுவிட்டன.</p>
            <p>நீங்கள் இப்போது நேரடிப் பணி நியமனங்களுக்கு தகுதி பெற்றுள்ளீர்கள்.</p>
          `,
          bodyText: `வணக்கம் ${candidateName},\n\nஉங்கள் சான்றிதழ்கள் அனைத்தும் சரிபார்க்கப்பட்டுவிட்டன. நீங்கள் பணி நியமனங்களுக்கு தகுதி பெற்றுள்ளீர்கள்.`,
        };
      case Stage.ONBOARDED:
        return {
          subject: `TheCarePal: குழுவிற்கு உங்களை வரவேற்கிறோம்! (${applicationId})`,
          headline: 'TheCarePal குடும்பத்திற்கு உங்களை அன்புடன் வரவேற்கிறோம்',
          bodyHtml: `
            <p>வணக்கம் <b>${candidateName}</b>,</p>
            <p>வாழ்த்துகள்! உங்கள் பணி அமர்வு செயல்முறைகள் நிறைவடைந்துவிட்டன. நீங்கள் இப்போது TheCarePal குழுவின் அதிகாரப்பூர்வ உறுப்பினர்.</p>
            <p>உங்கள் முதல் பணி ஒதுக்கீடு குறித்த விவரங்களுடன் எங்கள் குழு விரைவில் உங்களைத் தொடர்புகொள்வார்கள்.</p>
          `,
          bodyText: `வணக்கம் ${candidateName},\n\nவாழ்த்துகள்! நீங்கள் இப்போது TheCarePal குடும்பத்தின் அதிகாரப்பூர்வ உறுப்பினர். வாழ்த்துகள்!`,
        };
      case Stage.REJECTED:
        return {
          subject: `TheCarePal: விண்ணப்ப நிலை குறித்த தகவல் (${applicationId})`,
          headline: 'உங்கள் விண்ணப்பம் குறித்த நிலை',
          bodyHtml: `
            <p>வணக்கம் <b>${candidateName}</b>,</p>
            <p>TheCarePal உடன் விண்ணப்பித்தமைக்கு நன்றி.</p>
            <p>கவனமான மதிப்பாய்வுக்குப் பிறகு, இந்த நேரத்தில் உங்கள் விண்ணப்பத்தை முன்னோக்கி நகர்த்த முடியவில்லை என்பதை தெரிவித்துக் கொள்கிறோம்.</p>
            ${reasonNote ? `<p><b>காரணம்:</b> ${reasonNote}</p>` : ''}
            <p>உங்கள் எதிர்கால முயற்சிகள் சிறக்க வாழ்த்துகிறோம்.</p>
          `,
          bodyText: `வணக்கம் ${candidateName},\n\nவிண்ணப்பித்தமைக்கு நன்றி. இந்த நேரத்தில் உங்கள் விண்ணப்பத்தை தொடர முடியவில்லை.${reasonNote ? `\nகாரணம்: ${reasonNote}` : ''}\nவாழ்த்துகள்.`,
        };
    }
  }

  // Default: English
  switch (stage) {
    case Stage.APPLIED:
      return {
        subject: `TheCarePal: Application Received (${applicationId})`,
        headline: 'Your Application Has Been Received',
        bodyHtml: `
          <p>Dear <b>${candidateName}</b>,</p>
          <p>Thank you for applying to join TheCarePal healthcare team. Your application ID is <b>${applicationId}</b>.</p>
          <p>Our clinical operations staff will review your submitted documents and qualifications. We will notify you once screening begins.</p>
        `,
        bodyText: `Dear ${candidateName},\n\nThank you for applying to TheCarePal. Your application ID is ${applicationId}.\nOur team is reviewing your documents and will be in touch shortly.`,
      };
    case Stage.SCREENING:
      return {
        subject: `TheCarePal: Shortlisted for Screening (${applicationId})`,
        headline: 'Profile Shortlisted for Initial Screening',
        bodyHtml: `
          <p>Dear <b>${candidateName}</b>,</p>
          <p>Great news! Your profile has passed our initial document audit and has moved to the <b>Screening</b> stage.</p>
          <p>An operations coordinator will contact you shortly for a brief 10-minute telephone discussion regarding your experience and availability preferences.</p>
        `,
        bodyText: `Dear ${candidateName},\n\nYour profile has passed initial review and is now in Screening.\nA coordinator will contact you shortly for a brief phone conversation.`,
      };
    case Stage.INTERVIEW:
      return {
        subject: `TheCarePal: Interview Round Invitation (${applicationId})`,
        headline: 'You Are Invited to Interview',
        bodyHtml: `
          <p>Dear <b>${candidateName}</b>,</p>
          <p>Congratulations! You have successfully passed our screening stage and are invited to the <b>Clinical Interview Round</b> with our healthcare leads.</p>
          <p>Our team will assign your interview slot and send confirmation details shortly.</p>
        `,
        bodyText: `Dear ${candidateName},\n\nCongratulations! You are invited to the Clinical Interview Round with TheCarePal.\nOur team will confirm your interview slot shortly.`,
      };
    case Stage.VERIFIED:
      return {
        subject: `TheCarePal: Credentials Approved and Verified (${applicationId})`,
        headline: 'All Verification Requirements Met',
        bodyHtml: `
          <p>Dear <b>${candidateName}</b>,</p>
          <p>We are delighted to confirm that your identity documents, council registration, and clinical experience claims have been fully verified.</p>
          <p>You have cleared all verification stage gates and are now approved for active care placements.</p>
        `,
        bodyText: `Dear ${candidateName},\n\nAll your verification requirements have been completed and approved.\nYou are now cleared for active care placements with TheCarePal.`,
      };
    case Stage.ONBOARDED:
      return {
        subject: `TheCarePal: Welcome to the Care Team! (${applicationId})`,
        headline: 'Welcome to TheCarePal Family',
        bodyHtml: `
          <p>Dear <b>${candidateName}</b>,</p>
          <p>Welcome aboard! Your onboarding is complete, and you are officially registered as a caregiver with TheCarePal.</p>
          <p>Your local clinical coordinator will reach out with your care schedule, protocol kit, and initial shift details.</p>
        `,
        bodyText: `Dear ${candidateName},\n\nWelcome to TheCarePal! Your onboarding is complete.\nYour clinical coordinator will contact you shortly with your shift schedule.`,
      };
    case Stage.REJECTED:
      return {
        subject: `TheCarePal: Application Status Update (${applicationId})`,
        headline: 'Update on Your Application',
        bodyHtml: `
          <p>Dear <b>${candidateName}</b>,</p>
          <p>Thank you for taking the time to apply with TheCarePal and sharing your credentials.</p>
          <p>After careful evaluation of our current staffing needs and requirements, we are unable to proceed with your application at this time.</p>
          ${reasonNote ? `<p><b>Operational Note:</b> ${reasonNote}</p>` : ''}
          <p>We wish you the very best in your professional healthcare career.</p>
        `,
        bodyText: `Dear ${candidateName},\n\nThank you for applying with TheCarePal. We are unable to proceed with your application at this time.${reasonNote ? `\nNote: ${reasonNote}` : ''}\nWe wish you all the best.`,
      };
  }
}

// Build clean branded HTML wrapper
function buildEmailHtml(headline: string, bodyContent: string, applicationId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0d1e38; padding: 28px 32px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">TheCarePal</span>
                    <span style="display: block; font-size: 11px; color: #00A389; margin-top: 2px; font-weight: 600;">CARE AT HOME</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.1); color: #cbd5e1; font-size: 11px; font-family: monospace;">${applicationId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${headline}
              </h2>
              <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                ${bodyContent}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 6px 0;">TheCarePal Hiring &amp; Clinical Operations Team</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">Hiring verified nurses and trained caregivers across Indian cities.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches an automated stage transition email and logs the result in PostgreSQL.
 */
export async function sendStageEmail(
  params: SendStageEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    candidateId,
    candidateName,
    recipientEmail,
    stage,
    preferredLanguage = 'en',
    applicationId,
    reasonNote,
  } = params;

  const template = getTemplate(
    stage,
    preferredLanguage || 'en',
    candidateName,
    applicationId,
    reasonNote
  );

  const fromAddress = process.env.EMAIL_FROM || '"TheCarePal Operations" <careers@thecarepal.test>';
  const fullHtml = buildEmailHtml(template.headline, template.bodyHtml, applicationId);

  try {
    const transporter = getMailTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: template.subject,
      text: template.bodyText,
      html: fullHtml,
    });

    // Record success in EmailLog
    await prisma.emailLog.create({
      data: {
        candidateId,
        recipientEmail,
        stage,
        subject: template.subject,
        status: 'SENT',
        error: null,
      },
    });

    console.log(`[Email] Stage ${stage} email successfully dispatched to ${recipientEmail} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const errorMsg = (err as Error).message || 'Unknown email delivery error';
    console.error(`[Email Error] Failed to send stage ${stage} email to ${recipientEmail}:`, errorMsg);

    // Record failure in EmailLog so admin can see and resend
    try {
      await prisma.emailLog.create({
        data: {
          candidateId,
          recipientEmail,
          stage,
          subject: template.subject,
          status: 'FAILED',
          error: errorMsg,
        },
      });
    } catch (logErr) {
      console.error('[Email Log Error] Failed to write failure record to database:', logErr);
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Resends a previously logged email or re-triggers delivery.
 */
export async function resendEmailLog(
  emailLogId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const log = await prisma.emailLog.findUnique({
    where: { id: emailLogId },
    include: { candidate: true },
  });

  if (!log) {
    throw new Error('Email record not found');
  }

  const { candidate } = log;
  return sendStageEmail({
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    recipientEmail: log.recipientEmail,
    stage: log.stage,
    preferredLanguage: candidate.preferredLanguage,
    applicationId: candidate.applicationId,
  });
}
