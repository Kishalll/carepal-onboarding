import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Integration: User and Admin API Endpoints', () => {
  const userBase = 'http://localhost:3000';
  const adminBase = 'http://localhost:3001';
  let adminCookie = '';
  let testCandidateId = '';
  let testAppId = '';
  const testPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `integration.${Date.now()}@thecarepal.test`;

  it('verifies user and admin health endpoints return status 200 OK', async () => {
    const [userHealth, adminHealth] = await Promise.all([
      fetch(`${userBase}/api/health`),
      fetch(`${adminBase}/api/health`),
    ]);

    assert.strictEqual(userHealth.status, 200);
    assert.strictEqual(adminHealth.status, 200);

    const userData = await userHealth.json();
    const adminData = await adminHealth.json();
    assert.strictEqual(userData.status, 'ok');
    assert.strictEqual(adminData.status, 'ok');
  });

  it('rejects unauthenticated requests to protected admin endpoints with 401', async () => {
    const res = await fetch(`${adminBase}/api/candidates`);
    assert.strictEqual(res.status, 401);
  });

  it('authenticates admin user and establishes httpOnly session cookie', async () => {
    const res = await fetch(`${adminBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@thecarepal.test', password: 'test!123' }),
    });

    assert.strictEqual(res.status, 200);
    const cookieHeader = res.headers.get('set-cookie');
    assert.ok(cookieHeader);
    assert.match(cookieHeader, /carepal_admin_session=/);
    assert.match(cookieHeader, /HttpOnly/i);

    adminCookie = cookieHeader.split(';')[0];
  });

  it('rejects applications with missing or invalid Turnstile token', async () => {
    // 1. Missing token
    const resMissing = await fetch(`${userBase}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Bot', phone: '9876543210' }),
    });
    assert.strictEqual(resMissing.status, 400);
    const dataMissing = await resMissing.json();
    assert.strictEqual(dataMissing.error, 'turnstile_missing');

    // 2. Invalid token
    const resInvalid = await fetch(`${userBase}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Bot', phone: '9876543210', turnstileToken: 'REJECT_ME' }),
    });
    assert.strictEqual(resInvalid.status, 400);
    const dataInvalid = await resInvalid.json();
    assert.strictEqual(dataInvalid.error, 'turnstile_failed');
  });

  it('submits a new caregiver application successfully via user app (201 Created)', async () => {
    const payload = {
      fullName: 'Meena Kumari',
      phone: testPhone,
      email: testEmail,
      dateOfBirth: '1993-08-20',
      city: 'Delhi NCR',
      preferredLanguage: 'en',
      qualification: 'GNM',
      councilRegistrationNumber: 'DNC-2021-998877',
      experienceYears: 5,
      previousWorkNote: 'Experienced home caregiver with geriatric specialization.',
      skills: ['Elderly Care', 'Dementia Care'],
      languages: ['English', 'Hindi'],
      preferredCities: ['Delhi NCR'],
      availabilityType: 'FULL_TIME',
      earliestStartDate: '2026-12-01',
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
    assert.strictEqual(data.fullName, 'Meena Kumari');

    testAppId = data.applicationId;
  });

  it('blocks duplicate application submissions using the same phone number (409 Conflict)', async () => {
    const duplicatePayload = {
      fullName: 'Meena Kumari (Duplicate Submission)',
      phone: testPhone, // Exact same phone
      email: 'another.email@thecarepal.test',
      dateOfBirth: '1993-08-20',
      city: 'Mumbai',
      preferredLanguage: 'en',
      qualification: 'GNM',
      experienceYears: 5,
      skills: ['Elderly Care'],
      languages: ['English'],
      preferredCities: ['Mumbai'],
      availabilityType: 'FULL_TIME',
      earliestStartDate: '2026-12-01',
      consentGiven: true,
      turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
    };

    const res = await fetch(`${userBase}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicatePayload),
    });

    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.error, 'duplicate_phone');
    assert.match(data.message, /application with this mobile number is already in our system/i);
  });

  it('fetches candidate list, search, and multi-filters via authenticated admin endpoint', async () => {
    const res = await fetch(`${adminBase}/api/candidates?search=Meena&city=Delhi+NCR`, {
      headers: { Cookie: adminCookie },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.candidates));
    const match = data.candidates.find((c) => c.applicationId === testAppId);
    assert.ok(match, 'Candidate should be found via search filter');
    assert.strictEqual(match.city, 'Delhi NCR');
    testCandidateId = match.id;
  });

  it('streams candidate CSV export with correct headers and text/csv mime type', async () => {
    const res = await fetch(`${adminBase}/api/candidates/export`, {
      headers: { Cookie: adminCookie },
    });

    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.match(contentType, /text\/csv/);

    const csvContent = await res.text();
    assert.match(csvContent, /Application ID,Full Name,Phone,Email/);
    assert.match(csvContent, new RegExp(testAppId));
  });

  it('retrieves live dashboard operational metrics (GET /api/dashboard/stats)', async () => {
    const res = await fetch(`${adminBase}/api/dashboard/stats`, {
      headers: { Cookie: adminCookie },
    });

    assert.strictEqual(res.status, 200);
    const stats = await res.json();
    assert.strictEqual(typeof stats.totalCandidates, 'number');
    assert.ok(stats.totalCandidates >= 1);
    assert.strictEqual(typeof stats.todayApplicationsCount, 'number');
    assert.strictEqual(typeof stats.duplicatePairsCount, 'number');
  });

  it('retrieves duplicate candidate list (GET /api/candidates/duplicates)', async () => {
    const res = await fetch(`${adminBase}/api/candidates/duplicates`, {
      headers: { Cookie: adminCookie },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.pairs));
    assert.ok(data.pairs.length >= 1, 'Should include seeded duplicate pair');
  });
});
