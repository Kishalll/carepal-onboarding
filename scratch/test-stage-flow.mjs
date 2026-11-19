// Verify updated stage progression:
// APPLIED -> SCREENING -> VERIFIED -> INTERVIEW -> ONBOARDED

async function run() {
  console.log('--- Testing Stage Flow: APPLIED -> SCREENING -> VERIFIED -> INTERVIEW -> ONBOARDED ---');

  // 1. Authenticate as Admin
  console.log('1. Authenticating as admin...');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thecarepal.test', password: 'test!123' }),
  });
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];
  console.log('   Authenticated successfully.');

  // Helper to transition
  async function transition(appId, toStage, reasonNote) {
    const res = await fetch(`http://localhost:3001/api/candidates/${appId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ toStage, reasonNote }),
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  // 2. Candidate CP-2026-000001 (Aarav Patel, currently in APPLIED after seed)
  console.log('2. Testing transition from APPLIED to SCREENING for CP-2026-000001...');
  const res1 = await transition('CP-2026-000001', 'SCREENING', 'Profile shortlisted.');
  console.log(`   Status: ${res1.status}, OK: ${res1.ok}, Stage: ${res1.data.candidate?.stage}`);
  if (!res1.ok) throw new Error(`Expected APPLIED -> SCREENING to succeed: ${JSON.stringify(res1.data)}`);

  // 3. Test skipping from SCREENING directly to INTERVIEW (MUST FAIL because VERIFIED is next)
  console.log('3. Testing stage skipping: SCREENING -> INTERVIEW (Should be rejected)...');
  const skipRes = await transition('CP-2026-000001', 'INTERVIEW', 'Attempting to skip Verified');
  console.log(`   Status: ${skipRes.status}, Error: "${skipRes.data.error}"`);
  if (skipRes.ok) throw new Error('Expected skipping to INTERVIEW to fail');
  if (!skipRes.data.error?.includes('SCREENING to VERIFIED')) {
    throw new Error(`Expected error to mention SCREENING to VERIFIED, got: ${skipRes.data.error}`);
  }

  // 4. Test advancing from SCREENING to VERIFIED without verified checklist items (MUST FAIL)
  console.log('4. Testing stage gate: SCREENING -> VERIFIED with unverified checklist items (Should be rejected)...');
  const gateRes = await transition('CP-2026-000001', 'VERIFIED');
  console.log(`   Status: ${gateRes.status}, Error: "${gateRes.data.error}"`);
  if (gateRes.ok) throw new Error('Expected moving to VERIFIED without verification to fail');

  // 5. Verify all checklist items for CP-2026-000001
  console.log('5. Verifying all checklist items for CP-2026-000001...');
  const candRes = await fetch('http://localhost:3001/api/candidates/CP-2026-000001', {
    headers: { Cookie: cookie },
  });
  const candData = await candRes.json();
  for (const item of candData.checklistItems) {
    const itemRes = await fetch(`http://localhost:3001/api/candidates/CP-2026-000001/checklist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ status: 'VERIFIED', remark: 'Checklist audit passed.' }),
    });
    if (!itemRes.ok) throw new Error(`Failed to verify checklist item ${item.id}`);
  }
  console.log('   All checklist items verified.');

  // 6. Test advancing from SCREENING to VERIFIED with verified checklist (MUST SUCCEED)
  console.log('6. Testing advance to VERIFIED with verified checklist items...');
  const res2 = await transition('CP-2026-000001', 'VERIFIED');
  console.log(`   Status: ${res2.status}, OK: ${res2.ok}, Stage: ${res2.data.candidate?.stage}`);
  if (!res2.ok) throw new Error(`Expected advance to VERIFIED to succeed: ${JSON.stringify(res2.data)}`);

  // 7. Test advancing from VERIFIED to INTERVIEW (MUST SUCCEED)
  console.log('7. Testing advance from VERIFIED to INTERVIEW...');
  const res3 = await transition('CP-2026-000001', 'INTERVIEW', 'Invited to clinical round.');
  console.log(`   Status: ${res3.status}, OK: ${res3.ok}, Stage: ${res3.data.candidate?.stage}`);
  if (!res3.ok) throw new Error(`Expected advance to INTERVIEW to succeed: ${JSON.stringify(res3.data)}`);

  // 8. Test advancing from INTERVIEW to ONBOARDED (MUST SUCCEED)
  console.log('8. Testing advance from INTERVIEW to ONBOARDED...');
  const res4 = await transition('CP-2026-000001', 'ONBOARDED', 'Cleared interview and background check.');
  console.log(`   Status: ${res4.status}, OK: ${res4.ok}, Stage: ${res4.data.candidate?.stage}`);
  if (!res4.ok) throw new Error(`Expected advance to ONBOARDED to succeed: ${JSON.stringify(res4.data)}`);

  console.log('\n--- ALL STAGE PROGRESSION CHECKS PASSED SUCCESSFULLY ---');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
