import { PrismaClient, Stage, Qualification, AvailabilityType, DocumentCategory, VerificationStatus, InterviewMode, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared storage directory
const storageDir = path.resolve(__dirname, '../../../storage/uploads');

// Create storage directory if it doesn't exist
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Generate valid synthetic sample PDF with watermark
function getSamplePdfBuffer(title: string): Buffer {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 180 >>
stream
BT
/F1 22 Tf
50 720 Td
(SAMPLE, NOT REAL - THECAREPAL VERIFICATION) Tj
/F1 14 Tf
50 680 Td
(Document Type: ${title}) Tj
/F1 11 Tf
50 640 Td
(This is a synthetic sample document generated exclusively for system testing.) Tj
50 620 Td
(It does not contain real personal, medical, or identifying data.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000475 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
546
%%EOF
`;
  return Buffer.from(content, 'utf-8');
}

// Minimal 1x1 valid PNG buffer
function getSamplePngBuffer(): Buffer {
  // 1x1 transparent PNG with standard headers
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d0000000049454e44ae426082',
    'hex'
  );
}

function ensureSampleFile(filename: string, buffer: Buffer): string {
  const filePath = path.join(storageDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
  }
  return filename;
}

const samplePdfKey = ensureSampleFile('sample-id-proof.pdf', getSamplePdfBuffer('ID Proof'));
const sampleCertKey = ensureSampleFile('sample-cert.pdf', getSamplePdfBuffer('Nursing Certificate'));
const samplePhotoKey = ensureSampleFile('sample-photo.png', getSamplePngBuffer());

const CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Coimbatore',
];

const SKILLS_LIST = [
  'Elderly Care',
  'Alzheimer and Dementia Care',
  'Baby Care',
  'Post-Hospital Recovery',
  'Live-in Care',
  'Autism Care',
  'Emergency Care',
];

const CANDIDATE_PROFILES = [
  { name: 'Aarav Patel', qual: Qualification.B_SC_NURSING, city: 'Mumbai', lang: 'en', exp: 6, council: 'MNC-2018-847291' },
  { name: 'Priya Sharma', qual: Qualification.GNM, city: 'Delhi NCR', lang: 'hi', exp: 4, council: 'DNC-2020-562140' },
  { name: 'Rajesh Kumar', qual: Qualification.TRAINED_CAREGIVER, city: 'Bengaluru', lang: 'en', exp: 3, council: null },
  { name: 'Ananya Deshmukh', qual: Qualification.ANM, city: 'Pune', lang: 'hi', exp: 5, council: 'MNC-2019-332194' },
  { name: 'Karthik Raman', qual: Qualification.B_SC_NURSING, city: 'Chennai', lang: 'ta', exp: 7, council: 'TNC-2017-109283' },
  { name: 'Deepa Nair', qual: Qualification.GNM, city: 'Coimbatore', lang: 'ta', exp: 5, council: 'TNC-2019-482019' },
  { name: 'Meera Krishnan', qual: Qualification.TRAINED_CAREGIVER, city: 'Hyderabad', lang: 'en', exp: 2, council: null },
  { name: 'Vikram Singh', qual: Qualification.B_SC_NURSING, city: 'Delhi NCR', lang: 'hi', exp: 8, council: 'DNC-2016-773920' },
  { name: 'Sunita Rao', qual: Qualification.ANM, city: 'Bengaluru', lang: 'en', exp: 4, council: 'KNC-2020-948271' },
  { name: 'Arjun Reddy', qual: Qualification.TRAINED_CAREGIVER, city: 'Hyderabad', lang: 'en', exp: 3, council: null },
  { name: 'Pooja Hegde', qual: Qualification.GNM, city: 'Bengaluru', lang: 'en', exp: 5, council: 'KNC-2019-619284' },
  { name: 'Suresh Menon', qual: Qualification.B_SC_NURSING, city: 'Chennai', lang: 'ta', exp: 9, council: 'TNC-2015-883921' },
  { name: 'Lakshmi Iyer', qual: Qualification.TRAINED_CAREGIVER, city: 'Coimbatore', lang: 'ta', exp: 4, council: null },
  { name: 'Rohan Joshi', qual: Qualification.GNM, city: 'Pune', lang: 'hi', exp: 3, council: 'MNC-2021-492019' },
  { name: 'Divya Pillai', qual: Qualification.ANM, city: 'Mumbai', lang: 'en', exp: 6, council: 'MNC-2018-774920' },
  { name: 'Manoj Gupta', qual: Qualification.TRAINED_CAREGIVER, city: 'Kolkata', lang: 'hi', exp: 2, council: null },
  { name: 'Kavita Verma', qual: Qualification.B_SC_NURSING, city: 'Delhi NCR', lang: 'hi', exp: 5, council: 'DNC-2019-338291' },
  { name: 'Ramesh Babu', qual: Qualification.ANM, city: 'Hyderabad', lang: 'en', exp: 4, council: 'TNC-2020-554921' },
  { name: 'Shalini Das', qual: Qualification.GNM, city: 'Kolkata', lang: 'en', exp: 6, council: 'WBC-2018-992013' },
  { name: 'Amitabh Mukherjee', qual: Qualification.TRAINED_CAREGIVER, city: 'Kolkata', lang: 'en', exp: 3, council: null },
  { name: 'Sneha Kulkarni', qual: Qualification.B_SC_NURSING, city: 'Pune', lang: 'hi', exp: 7, council: 'MNC-2017-662910' },
  { name: 'Ganesh Murthy', qual: Qualification.GNM, city: 'Bengaluru', lang: 'en', exp: 4, council: 'KNC-2020-112948' },
  { name: 'Swati Bhatt', qual: Qualification.ANM, city: 'Mumbai', lang: 'hi', exp: 5, council: 'MNC-2019-883920' },
  { name: 'Harish Natarajan', qual: Qualification.TRAINED_CAREGIVER, city: 'Chennai', lang: 'ta', exp: 2, council: null },
  { name: 'Bhavna Chawla', qual: Qualification.B_SC_NURSING, city: 'Delhi NCR', lang: 'hi', exp: 6, council: 'DNC-2018-449201' },
  { name: 'Naveen Prasad', qual: Qualification.GNM, city: 'Hyderabad', lang: 'en', exp: 5, council: 'TNC-2019-773921' },
  { name: 'Geeta Sundaram', qual: Qualification.TRAINED_CAREGIVER, city: 'Coimbatore', lang: 'ta', exp: 4, council: null },
  { name: 'Pradeep Sen', qual: Qualification.ANM, city: 'Kolkata', lang: 'hi', exp: 3, council: 'WBC-2021-662910' },
  { name: 'Anita Kaul', qual: Qualification.B_SC_NURSING, city: 'Delhi NCR', lang: 'hi', exp: 8, council: 'DNC-2016-118293' },
  { name: 'Vinod Nayak', qual: Qualification.GNM, city: 'Pune', lang: 'en', exp: 4, council: 'MNC-2020-552910' },
  { name: 'Archana Shetty', qual: Qualification.TRAINED_CAREGIVER, city: 'Bengaluru', lang: 'en', exp: 3, council: null },
  { name: 'Ashok Subramanian', qual: Qualification.B_SC_NURSING, city: 'Chennai', lang: 'ta', exp: 10, council: 'TNC-2014-992019' },
  { name: 'Kiran Mazumdar', qual: Qualification.ANM, city: 'Kolkata', lang: 'en', exp: 5, council: 'WBC-2019-338291' },
  { name: 'Vijay Raghavan', qual: Qualification.GNM, city: 'Coimbatore', lang: 'ta', exp: 6, council: 'TNC-2018-449201' },
  { name: 'Rekha Nambiar', qual: Qualification.TRAINED_CAREGIVER, city: 'Mumbai', lang: 'en', exp: 4, council: null },
  { name: 'Siddharth Roy', qual: Qualification.B_SC_NURSING, city: 'Delhi NCR', lang: 'hi', exp: 5, council: 'DNC-2019-883921' },
  { name: 'Preeti Agarwal', qual: Qualification.ANM, city: 'Pune', lang: 'hi', exp: 3, council: 'MNC-2021-992013' },
  { name: 'Santosh Kulkarni', qual: Qualification.TRAINED_CAREGIVER, city: 'Bengaluru', lang: 'en', exp: 2, council: null },
  { name: 'Nandini Swaminathan', qual: Qualification.GNM, city: 'Chennai', lang: 'ta', exp: 7, council: 'TNC-2017-338291' },
  { name: 'Alok Chandra', qual: Qualification.TRAINED_CAREGIVER, city: 'Delhi NCR', lang: 'hi', exp: 3, council: null },
];

// Target stages distribution across 40 candidates
const STAGE_DISTRIBUTION: Stage[] = [
  // 8 Applied
  Stage.APPLIED, Stage.APPLIED, Stage.APPLIED, Stage.APPLIED,
  Stage.APPLIED, Stage.APPLIED, Stage.APPLIED, Stage.APPLIED,
  // 8 Screening
  Stage.SCREENING, Stage.SCREENING, Stage.SCREENING, Stage.SCREENING,
  Stage.SCREENING, Stage.SCREENING, Stage.SCREENING, Stage.SCREENING,
  // 8 Interview
  Stage.INTERVIEW, Stage.INTERVIEW, Stage.INTERVIEW, Stage.INTERVIEW,
  Stage.INTERVIEW, Stage.INTERVIEW, Stage.INTERVIEW, Stage.INTERVIEW,
  // 6 Verified
  Stage.VERIFIED, Stage.VERIFIED, Stage.VERIFIED,
  Stage.VERIFIED, Stage.VERIFIED, Stage.VERIFIED,
  // 6 Onboarded
  Stage.ONBOARDED, Stage.ONBOARDED, Stage.ONBOARDED,
  Stage.ONBOARDED, Stage.ONBOARDED, Stage.ONBOARDED,
  // 4 Rejected
  Stage.REJECTED, Stage.REJECTED, Stage.REJECTED, Stage.REJECTED,
];

async function main() {
  console.log('Starting synthetic seed process...');

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@thecarepal.test';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'CarePalAdmin2026!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: 'Operations Admin',
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Operations Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`Admin user seeded: ${admin.email}`);

  // 2. Seed 40 Primary Candidates
  for (let i = 0; i < CANDIDATE_PROFILES.length; i++) {
    const profile = CANDIDATE_PROFILES[i];
    const indexStr = String(i + 1).padStart(6, '0');
    const applicationId = `CP-2026-${indexStr}`;
    const phone = `+91980000${String(i + 1).padStart(4, '0')}`;
    const email = `${profile.name.toLowerCase().replace(/\s+/g, '.')}${i + 1}@thecarepal.test`;
    const targetStage = STAGE_DISTRIBUTION[i];

    // Pick 2-3 skills
    const candidateSkills = [
      SKILLS_LIST[i % SKILLS_LIST.length],
      SKILLS_LIST[(i + 2) % SKILLS_LIST.length],
      SKILLS_LIST[(i + 4) % SKILLS_LIST.length],
    ];

    const dob = new Date(1985 + (i % 15), (i * 2) % 12, 10 + (i % 18));
    const earliestStart = new Date(2026, 11, 1 + (i % 25));

    const candidate = await prisma.candidate.upsert({
      where: { phone },
      update: {
        fullName: profile.name,
        email,
        city: profile.city,
        preferredLanguage: profile.lang,
        qualification: profile.qual,
        councilRegistrationNumber: profile.council,
        experienceYears: profile.exp,
        skills: candidateSkills,
        languages: ['English', profile.lang === 'ta' ? 'Tamil' : 'Hindi'],
        preferredCities: [profile.city, CITIES[(i + 1) % CITIES.length]],
        availabilityType: i % 2 === 0 ? AvailabilityType.FULL_TIME : AvailabilityType.LIVE_IN,
        earliestStartDate: earliestStart,
        stage: targetStage,
        consentGiven: true,
      },
      create: {
        applicationId,
        fullName: profile.name,
        phone,
        email,
        dateOfBirth: dob,
        city: profile.city,
        preferredLanguage: profile.lang,
        qualification: profile.qual,
        councilRegistrationNumber: profile.council,
        experienceYears: profile.exp,
        previousWorkNote: `Experienced in home care with ${profile.exp} years of dedicated practice.`,
        skills: candidateSkills,
        languages: ['English', profile.lang === 'ta' ? 'Tamil' : 'Hindi'],
        preferredCities: [profile.city, CITIES[(i + 1) % CITIES.length]],
        availabilityType: i % 2 === 0 ? AvailabilityType.FULL_TIME : AvailabilityType.LIVE_IN,
        earliestStartDate: earliestStart,
        stage: targetStage,
        consentGiven: true,
      },
    });

    // Documents
    await prisma.document.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.document.createMany({
      data: [
        {
          candidateId: candidate.id,
          category: DocumentCategory.ID_PROOF,
          idType: 'Aadhaar',
          storageKey: samplePdfKey,
          originalName: 'aadhaar_card_front_back.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 102400,
          status: targetStage === Stage.VERIFIED || targetStage === Stage.ONBOARDED ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
        },
        {
          candidateId: candidate.id,
          category: DocumentCategory.CERTIFICATE,
          storageKey: sampleCertKey,
          originalName: 'nursing_qualification_certificate.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 153600,
          status: targetStage === Stage.VERIFIED || targetStage === Stage.ONBOARDED ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
        },
        {
          candidateId: candidate.id,
          category: DocumentCategory.PHOTO,
          storageKey: samplePhotoKey,
          originalName: 'applicant_photo.png',
          mimeType: 'image/png',
          sizeBytes: 40960,
          status: targetStage === Stage.VERIFIED || targetStage === Stage.ONBOARDED ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
        },
      ],
    });

    // Checklist items
    const isNurse = profile.qual !== Qualification.TRAINED_CAREGIVER;
    const isFullyVerified = targetStage === Stage.VERIFIED || targetStage === Stage.ONBOARDED;
    const isPartiallyVerified = targetStage === Stage.INTERVIEW || targetStage === Stage.SCREENING;

    const checklistDefs = [
      { code: 'ID_MATCH', label: 'ID proof matches applicant name', required: true },
      { code: 'PHOTO_CLEAR', label: 'Photo is clear and recent', required: true },
      { code: 'CERT_GENUINE', label: 'Qualification certificate is genuine', required: true },
      ...(isNurse ? [{ code: 'COUNCIL_REG', label: 'Nursing council registration verified', required: true }] : []),
      { code: 'EXP_CHECK', label: 'Experience claims checked', required: true },
      { code: 'REF_CALL', label: 'Reference verification call completed', required: true },
    ];

    await prisma.checklistItem.deleteMany({ where: { candidateId: candidate.id } });
    for (let cIdx = 0; cIdx < checklistDefs.length; cIdx++) {
      const def = checklistDefs[cIdx];
      let status = VerificationStatus.PENDING;
      if (isFullyVerified) {
        status = VerificationStatus.VERIFIED;
      } else if (isPartiallyVerified && cIdx < 2) {
        status = VerificationStatus.VERIFIED;
      } else if (targetStage === Stage.REJECTED && cIdx === 2) {
        status = VerificationStatus.REJECTED;
      }

      await prisma.checklistItem.create({
        data: {
          candidateId: candidate.id,
          code: def.code,
          label: def.label,
          required: def.required,
          status,
          remark: status === VerificationStatus.VERIFIED ? 'Verified by operations team.' : null,
          updatedBy: status === VerificationStatus.VERIFIED ? admin.name : null,
        },
      });
    }

    // Stage History
    await prisma.stageHistory.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.stageHistory.create({
      data: {
        candidateId: candidate.id,
        fromStage: Stage.APPLIED,
        toStage: Stage.APPLIED,
        reasonNote: 'Application submitted successfully via career portal.',
        changedById: admin.id,
        changedByName: 'System Application Flow',
      },
    });

    if (targetStage !== Stage.APPLIED) {
      if (targetStage === Stage.REJECTED) {
        await prisma.stageHistory.create({
          data: {
            candidateId: candidate.id,
            fromStage: Stage.APPLIED,
            toStage: Stage.REJECTED,
            reasonNote: 'Candidate documents did not meet qualification requirements.',
            changedById: admin.id,
            changedByName: admin.name,
          },
        });
      } else {
        await prisma.stageHistory.create({
          data: {
            candidateId: candidate.id,
            fromStage: Stage.APPLIED,
            toStage: Stage.SCREENING,
            reasonNote: 'Initial profile reviewed and shortlisted for phone screening.',
            changedById: admin.id,
            changedByName: admin.name,
          },
        });

        if (targetStage === Stage.INTERVIEW || targetStage === Stage.VERIFIED || targetStage === Stage.ONBOARDED) {
          await prisma.stageHistory.create({
            data: {
              candidateId: candidate.id,
              fromStage: Stage.SCREENING,
              toStage: Stage.INTERVIEW,
              reasonNote: 'Shortlisted for clinical interview.',
              changedById: admin.id,
              changedByName: admin.name,
            },
          });
        }

        if (targetStage === Stage.VERIFIED || targetStage === Stage.ONBOARDED) {
          await prisma.stageHistory.create({
            data: {
              candidateId: candidate.id,
              fromStage: Stage.INTERVIEW,
              toStage: Stage.VERIFIED,
              reasonNote: 'All credentials and background checks verified.',
              changedById: admin.id,
              changedByName: admin.name,
            },
          });
        }

        if (targetStage === Stage.ONBOARDED) {
          await prisma.stageHistory.create({
            data: {
              candidateId: candidate.id,
              fromStage: Stage.VERIFIED,
              toStage: Stage.ONBOARDED,
              reasonNote: 'Onboarding completed and care badge issued.',
              changedById: admin.id,
              changedByName: admin.name,
            },
          });
        }
      }
    }

    // Notes
    await prisma.note.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.note.create({
      data: {
        candidateId: candidate.id,
        authorId: admin.id,
        authorName: admin.name,
        content: `Application received for ${profile.qual}. Preferred city is ${profile.city}.`,
      },
    });

    // Email Log
    await prisma.emailLog.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.emailLog.create({
      data: {
        candidateId: candidate.id,
        recipientEmail: email,
        stage: Stage.APPLIED,
        subject: 'TheCarePal: Application Received',
        status: 'SENT',
      },
    });

    // Interview Slots for candidates in INTERVIEW stage
    if (targetStage === Stage.INTERVIEW) {
      const slotTime = new Date(Date.now() + (i + 1) * 86400000);
      const slotEnd = new Date(slotTime.getTime() + 45 * 60000);

      await prisma.interviewSlot.deleteMany({ where: { candidateId: candidate.id } });
      await prisma.interviewSlot.create({
        data: {
          startTime: slotTime,
          endTime: slotEnd,
          interviewerName: 'Dr. Kavitha S. (Clinical Lead)',
          mode: InterviewMode.VIDEO,
          candidateId: candidate.id,
          bookingToken: `slot-token-${candidate.applicationId}`,
          bookedAt: new Date(),
        },
      });
    }
  }

  // 3. Seed deliberate duplicates for testing duplicate detection
  // Duplicate 1: Matching email with candidate 2 (Priya Sharma), but distinct phone
  const dup1Phone = '+919800000041';
  await prisma.candidate.upsert({
    where: { phone: dup1Phone },
    update: {
      fullName: 'Priya Sharma',
      email: 'priya.sharma2@thecarepal.test',
      city: 'Delhi NCR',
      preferredLanguage: 'hi',
      qualification: Qualification.GNM,
      experienceYears: 4,
      skills: ['Elderly Care', 'Baby Care'],
      languages: ['English', 'Hindi'],
      preferredCities: ['Delhi NCR'],
      availabilityType: AvailabilityType.FULL_TIME,
      earliestStartDate: new Date(2026, 11, 15),
      stage: Stage.APPLIED,
      consentGiven: true,
    },
    create: {
      applicationId: 'CP-2026-000041',
      fullName: 'Priya Sharma',
      phone: dup1Phone,
      email: 'priya.sharma2@thecarepal.test',
      dateOfBirth: new Date(1989, 4, 12),
      city: 'Delhi NCR',
      preferredLanguage: 'hi',
      qualification: Qualification.GNM,
      councilRegistrationNumber: 'DNC-2020-562140',
      experienceYears: 4,
      skills: ['Elderly Care', 'Baby Care'],
      languages: ['English', 'Hindi'],
      preferredCities: ['Delhi NCR'],
      availabilityType: AvailabilityType.FULL_TIME,
      earliestStartDate: new Date(2026, 11, 15),
      stage: Stage.APPLIED,
      consentGiven: true,
    },
  });

  // Duplicate 2: Matching email with candidate 3 (Rajesh Kumar), but distinct phone
  const dup2Phone = '+919800000042';
  await prisma.candidate.upsert({
    where: { phone: dup2Phone },
    update: {
      fullName: 'Rajesh Kumar',
      email: 'rajesh.kumar3@thecarepal.test',
      city: 'Bengaluru',
      preferredLanguage: 'en',
      qualification: Qualification.TRAINED_CAREGIVER,
      experienceYears: 3,
      skills: ['Live-in Care', 'Elderly Care'],
      languages: ['English', 'Hindi'],
      preferredCities: ['Bengaluru'],
      availabilityType: AvailabilityType.LIVE_IN,
      earliestStartDate: new Date(2026, 11, 20),
      stage: Stage.APPLIED,
      consentGiven: true,
    },
    create: {
      applicationId: 'CP-2026-000042',
      fullName: 'Rajesh Kumar',
      phone: dup2Phone,
      email: 'rajesh.kumar3@thecarepal.test',
      dateOfBirth: new Date(1991, 7, 18),
      city: 'Bengaluru',
      preferredLanguage: 'en',
      qualification: Qualification.TRAINED_CAREGIVER,
      experienceYears: 3,
      skills: ['Live-in Care', 'Elderly Care'],
      languages: ['English', 'Hindi'],
      preferredCities: ['Bengaluru'],
      availabilityType: AvailabilityType.LIVE_IN,
      earliestStartDate: new Date(2026, 11, 20),
      stage: Stage.APPLIED,
      consentGiven: true,
    },
  });

  // 4. Seed a few unbooked interview slots for slot booking tests
  const unbookedTokens = ['open-slot-token-101', 'open-slot-token-102', 'open-slot-token-103'];
  for (let sIdx = 0; sIdx < unbookedTokens.length; sIdx++) {
    const sTime = new Date(Date.now() + (sIdx + 3) * 86400000 + 10 * 3600000);
    const eTime = new Date(sTime.getTime() + 45 * 60000);
    const bToken = unbookedTokens[sIdx];

    const existing = await prisma.interviewSlot.findUnique({ where: { bookingToken: bToken } });
    if (!existing) {
      await prisma.interviewSlot.create({
        data: {
          startTime: sTime,
          endTime: eTime,
          interviewerName: 'Dr. Anand Verma (Care Operations)',
          mode: InterviewMode.VIDEO,
          bookingToken: bToken,
        },
      });
    }
  }

  const totalCandidates = await prisma.candidate.count();
  const totalUsers = await prisma.user.count();
  const totalSlots = await prisma.interviewSlot.count();

  console.log(`Seed completed successfully:`);
  console.log(`- Total Candidates: ${totalCandidates}`);
  console.log(`- Total Users: ${totalUsers}`);
  console.log(`- Total Interview Slots: ${totalSlots}`);
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
