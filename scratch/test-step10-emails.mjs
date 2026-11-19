// Step 10 automated test script
// Tests stage transition email dispatch (EN, HI, TA), Mailpit delivery, and Resend capability.

async function run() {
  console.log('--- Step 10: Email Dispatch & Mailpit Verification ---');

  // 1. Authenticate as Admin
  console.log('1. Authenticating as admin...');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thecarepal.test', password: 'test!123' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const cookieHeader = loginRes.headers.get('set-cookie');
  if (!cookieHeader) {
    throw new Error('No session cookie returned from login');
  }
  const sessionCookie = cookieHeader.split(';')[0];
  console.log('   Authenticated successfully.');

  // Helper to change stage
  async function transitionCandidate(appId, toStage, reasonNote) {
    const res = await fetch(`http://localhost:3001/api/candidates/${appId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ toStage, reasonNote }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to move ${appId} to ${toStage}: ${JSON.stringify(data)}`);
    }
    console.log(`   Transitioned ${appId} to ${toStage}. Result: success`);
    return data;
  }

  // 2. Clear previous Mailpit messages for clean test run
  console.log('2. Clearing previous Mailpit messages...');
  await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' });

  // 3. Trigger English candidate transition (Rajesh Kumar: CP-2026-000003 from APPLIED to SCREENING)
  console.log('3. Triggering stage transition for English candidate (Rajesh Kumar: CP-2026-000003 to SCREENING)...');
  await transitionCandidate('CP-2026-000003', 'SCREENING', 'Meets qualification criteria.');

  // 4. Trigger Hindi candidate transition (Ananya Deshmukh: CP-2026-000004 from SCREENING to INTERVIEW)
  console.log('4. Triggering stage transition for Hindi candidate (Ananya Deshmukh: CP-2026-000004 to INTERVIEW)...');
  await transitionCandidate('CP-2026-000004', 'INTERVIEW', 'साक्षात्कार के लिए आमंत्रित किया गया।');

  // 5. Trigger Tamil candidate transition (Karthik Raman: CP-2026-000005 from SCREENING to INTERVIEW)
  console.log('5. Triggering stage transition for Tamil candidate (Karthik Raman: CP-2026-000005 to INTERVIEW)...');
  await transitionCandidate('CP-2026-000005', 'INTERVIEW', 'நேர்காணலுக்கு தகுதி பெற்றார்.');

  // Wait 1.5 seconds for background async dispatch to finish
  await new Promise((r) => setTimeout(r, 1500));

  // 6. Inspect Mailpit API for sent messages
  console.log('6. Inspecting Mailpit inbox (http://localhost:8025)...');
  const mailRes = await fetch('http://localhost:8025/api/v1/messages');
  const mailData = await mailRes.json();

  console.log(`   Total messages in Mailpit: ${mailData.total}`);
  if (!mailData.messages || mailData.messages.length < 3) {
    throw new Error(`Expected at least 3 messages, found ${mailData.messages?.length || 0}`);
  }

  for (const msg of mailData.messages) {
    const detailRes = await fetch(`http://localhost:8025/api/v1/message/${msg.ID}`);
    const detail = await detailRes.json();
    console.log(`   - To: ${msg.To?.[0]?.Address} | Subject: "${msg.Subject}"`);
  }

  // 7. Verify Candidate Detail drawer API returns emailLogs
  console.log('7. Verifying candidate detail returns emailLogs...');
  const candRes = await fetch('http://localhost:3001/api/candidates/CP-2026-000003', {
    headers: { Cookie: sessionCookie },
  });
  const candData = await candRes.json();
  const emailLogs = candData.emailLogs;
  console.log(`   Email logs count for CP-2026-000003: ${emailLogs?.length}`);
  if (!emailLogs || emailLogs.length === 0) {
    throw new Error('No emailLogs returned for candidate CP-2026-000003');
  }

  const firstLog = emailLogs[0];
  console.log(`   Latest log ID: ${firstLog.id}, Subject: "${firstLog.subject}", Status: ${firstLog.status}`);

  // 8. Test Resend Email endpoint
  console.log(`8. Testing Resend Email endpoint for log ${firstLog.id}...`);
  const resendRes = await fetch(
    `http://localhost:3001/api/candidates/CP-2026-000003/emails/${firstLog.id}/resend`,
    {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    }
  );
  const resendData = await resendRes.json();
  console.log(`   Resend status: ${resendRes.status}, Success: ${resendData.success}`);

  // Wait 1 second
  await new Promise((r) => setTimeout(r, 1000));

  // Check Mailpit count again
  const mailResAfter = await fetch('http://localhost:8025/api/v1/messages');
  const mailDataAfter = await mailResAfter.json();
  console.log(`   Total messages in Mailpit after resend: ${mailDataAfter.total} (should be 4)`);

  if (mailDataAfter.total !== 4) {
    throw new Error(`Expected 4 messages after resend, found ${mailDataAfter.total}`);
  }

  console.log('\n--- Email Verification: ALL CHECKS PASSED ---');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
