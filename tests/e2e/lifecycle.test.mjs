import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('E2E: Full Candidate Hiring Lifecycle (Apply to Onboarded)', () => {
  const userBase = 'http://localhost:3000';
  const adminBase = 'http://localhost:3001';
  const mailpitBase = 'http://localhost:8025';

  let applicationId = '';
  let candidateId = '';
  let adminCookie = '';
  let bookedSlotId = '';

  const testPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `e2e.deepak.${Date.now()}@thecarepal.test`;

  it('Step 1: Candidate submits public application on user portal (:3000)', async () => {
    const payload = {
      fullName: 'Deepak Varma',
      phone: testPhone,
      email: testEmail,
      dateOfBirth: '1991-03-25',
      city: 'Delhi NCR',
      preferredLanguage: 'en',
      qualification: 'B_SC_NURSING',
      councilRegistrationNumber: 'DNC-2019-456789',
      experienceYears: 6,
      previousWorkNote: 'Specialized in post-operative surgical nursing and patient rehabilitation.',
      skills: ['Post-Hospital Recovery', 'Elderly Care'],
      languages: ['English', 'Hindi'],
      preferredCities: ['Delhi NCR'],
      availabilityType: 'FULL_TIME',
      earliestStartDate: '2026-12-05',
      consentGiven: true,
      turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
    };

    const res = await fetch(`${userBase}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.applicationId);
    applicationId = data.applicationId;
  });

  it('Step 2: Candidate uploads identity documents with verified magic bytes', async () => {
    // 1. Upload Aadhaar ID Proof (PDF)
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Aadhaar Proof) >>\nendobj\n');
    const formId = new FormData();
    formId.append('category', 'ID_PROOF');
    formId.append('idType', 'Aadhaar');
    formId.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'aadhaar_card.pdf');

    const resId = await fetch(`${userBase}/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formId,
    });
    assert.strictEqual(resId.status, 201);

    // 2. Upload Nursing Qualification Certificate (PDF)
    const certBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Nursing Degree) >>\nendobj\n');
    const formCert = new FormData();
    formCert.append('category', 'CERTIFICATE');
    formCert.append('file', new Blob([certBuffer], { type: 'application/pdf' }), 'degree_cert.pdf');

    const resCert = await fetch(`${userBase}/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formCert,
    });
    assert.strictEqual(resCert.status, 201);

    // 3. Upload Applicant Photo (PNG)
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const formPhoto = new FormData();
    formPhoto.append('category', 'PHOTO');
    formPhoto.append('file', new Blob([pngBuffer], { type: 'image/png' }), 'passport_photo.png');

    const resPhoto = await fetch(`${userBase}/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formPhoto,
    });
    assert.strictEqual(resPhoto.status, 201);
  });

  it('Step 3: Admin authenticates and locates new candidate in APPLIED stage', async () => {
    const loginRes = await fetch(`${adminBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@thecarepal.test', password: 'test!123' }),
    });
    assert.strictEqual(loginRes.status, 200);
    adminCookie = loginRes.headers.get('set-cookie').split(';')[0];

    const detailRes = await fetch(`${adminBase}/api/candidates/${applicationId}`, {
      headers: { Cookie: adminCookie },
    });
    assert.strictEqual(detailRes.status, 200);
    const detail = await detailRes.json();
    assert.strictEqual(detail.applicationId, applicationId);
    assert.strictEqual(detail.stage, 'APPLIED');
    assert.strictEqual(detail.documents.length, 3);

    candidateId = detail.id;
  });

  it('Step 4: Admin moves candidate from APPLIED to SCREENING', async () => {
    const res = await fetch(`${adminBase}/api/candidates/${candidateId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ toStage: 'SCREENING' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.candidate.stage, 'SCREENING');
  });

  it('Step 5: Admin verifies all required verification checklist items', async () => {
    const detailRes = await fetch(`${adminBase}/api/candidates/${candidateId}`, {
      headers: { Cookie: adminCookie },
    });
    const detail = await detailRes.json();
    const requiredItems = detail.checklistItems.filter((chk) => chk.required);

    for (const item of requiredItems) {
      const updateRes = await fetch(`${adminBase}/api/candidates/${candidateId}/checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          status: 'VERIFIED',
          remark: 'Checked and verified during compliance audit.',
        }),
      });
      assert.strictEqual(updateRes.status, 200);
    }
  });

  it('Step 6: Admin advances candidate from SCREENING to VERIFIED (stage gate check passes)', async () => {
    const res = await fetch(`${adminBase}/api/candidates/${candidateId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ toStage: 'VERIFIED' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.candidate.stage, 'VERIFIED');
  });

  it('Step 7: Admin advances candidate from VERIFIED to INTERVIEW (sends invite email)', async () => {
    const res = await fetch(`${adminBase}/api/candidates/${candidateId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ toStage: 'INTERVIEW' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.candidate.stage, 'INTERVIEW');
  });

  it('Step 8: Candidate opens self-service booking page and claims an open slot', async () => {
    // Ensure an open interview slot is created by admin for this candidate
    const slotStartTime = new Date(Date.now() + 86400000 * 4);
    const slotEndTime = new Date(slotStartTime.getTime() + 30 * 60000);
    const createSlotRes = await fetch(`${adminBase}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        startTime: slotStartTime.toISOString(),
        endTime: slotEndTime.toISOString(),
        interviewerName: `Dr. Lifecycle Lead ${Date.now()}`,
        mode: 'VIDEO',
      }),
    });
    assert.strictEqual(createSlotRes.status, 201);

    // Fetch available slots
    const bookingDetailsRes = await fetch(`${userBase}/api/booking/${applicationId}`);
    assert.strictEqual(bookingDetailsRes.status, 200);
    const bookingData = await bookingDetailsRes.json();
    assert.strictEqual(bookingData.isBooked, false);
    assert.ok(bookingData.availableSlots.length > 0, 'Must have at least one open slot');

    const targetSlot = bookingData.availableSlots[0];
    bookedSlotId = targetSlot.id;

    // Book the slot
    const bookRes = await fetch(`${userBase}/api/booking/${applicationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: bookedSlotId }),
    });

    assert.strictEqual(bookRes.status, 200);
    const bookedResult = await bookRes.json();
    assert.strictEqual(bookedResult.success, true);
    assert.ok(bookedResult.booking);
  });

  it('Step 9: Admin advances candidate from INTERVIEW to ONBOARDED', async () => {
    const res = await fetch(`${adminBase}/api/candidates/${candidateId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ toStage: 'ONBOARDED' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.candidate.stage, 'ONBOARDED');
  });

  it('Step 10: Verifies email notifications delivered to Mailpit throughout lifecycle', async () => {
    const mailRes = await fetch(`${mailpitBase}/api/v1/messages`);
    assert.strictEqual(mailRes.status, 200);
    const mailData = await mailRes.json();

    // Check that messages were dispatched to candidate's test email
    const candidateEmails = mailData.messages.filter((msg) =>
      msg.To.some((recipient) => recipient.Address.toLowerCase() === testEmail.toLowerCase())
    );

    assert.ok(
      candidateEmails.length >= 2,
      `Expected at least 2 email notifications in Mailpit for ${testEmail}, found ${candidateEmails.length}`
    );
  });
});
