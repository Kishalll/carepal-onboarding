import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { LocalStorageAdapter } from '@carepal/shared';

describe('Unit: Private Document Storage and HMAC-Signed URLs', () => {
  const adapter = new LocalStorageAdapter({
    baseDir: '/tmp/carepal-test-storage',
    signingSecret: 'unit_test_secret_key_123',
    urlPrefix: '/api/documents/view',
  });

  it('generates a valid signed URL with timestamp and HMAC signature', () => {
    const storageKey = 'candidates/CP-001/aadhaar.pdf';
    const signedUrl = adapter.generateSignedUrl(storageKey, 15);

    assert.match(signedUrl, /^\/api\/documents\/view\/candidates%2FCP-001%2Faadhaar\.pdf\?expires=\d+&sig=[a-f0-9]{64}$/);
  });

  it('verifies a genuine signed URL successfully', () => {
    const storageKey = 'candidates/CP-001/certificate.pdf';
    const signedUrl = adapter.generateSignedUrl(storageKey, 10);

    const url = new URL(`http://localhost${signedUrl}`);
    const expiresParam = parseInt(url.searchParams.get('expires'), 10);
    const sigParam = url.searchParams.get('sig');

    const isValid = adapter.verifySignedUrl(storageKey, expiresParam, sigParam);
    assert.strictEqual(isValid, true);
  });

  it('rejects tampered signatures', () => {
    const storageKey = 'candidates/CP-001/photo.png';
    const signedUrl = adapter.generateSignedUrl(storageKey, 15);

    const url = new URL(`http://localhost${signedUrl}`);
    const expiresParam = parseInt(url.searchParams.get('expires'), 10);
    const forgedSig = 'a'.repeat(64); // Forged signature

    const isValid = adapter.verifySignedUrl(storageKey, expiresParam, forgedSig);
    assert.strictEqual(isValid, false);
  });

  it('rejects expired signed URLs', () => {
    const storageKey = 'candidates/CP-001/photo.png';
    const expiredTimestamp = Date.now() - 5000; // 5 seconds in the past

    const payload = `${storageKey}:${expiredTimestamp}`;
    const sig = crypto.createHmac('sha256', 'unit_test_secret_key_123').update(payload).digest('hex');

    const isValid = adapter.verifySignedUrl(storageKey, expiredTimestamp, sig);
    assert.strictEqual(isValid, false);
  });

  it('protects against path traversal attacks in storage keys', () => {
    const maliciousKey = '../../../../etc/passwd';
    const resolvedPath = adapter.getAbsolutePath(maliciousKey);

    // Ensure it cannot break out of baseDir
    assert.strictEqual(resolvedPath.startsWith('/tmp/carepal-test-storage'), true);
    assert.strictEqual(resolvedPath.includes('..'), false);
  });
});
