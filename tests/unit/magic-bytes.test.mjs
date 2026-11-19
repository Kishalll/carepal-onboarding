import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  detectMagicBytes,
  validateDocumentFile,
  MAX_FILE_SIZE,
} from '@carepal/shared';

describe('Unit: File Magic Bytes and Upload Validation', () => {
  // Sample valid headers
  const validPdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\n');
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const fakePdfWithExeContent = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff'); // Windows PE executable header

  it('correctly detects genuine PDF magic bytes (%PDF)', () => {
    assert.strictEqual(detectMagicBytes(validPdfHeader), 'application/pdf');
  });

  it('correctly detects genuine PNG magic bytes (\\x89PNG)', () => {
    assert.strictEqual(detectMagicBytes(validPngHeader), 'image/png');
  });

  it('correctly detects genuine JPEG magic bytes (\\xFF\\xD8\\xFF)', () => {
    assert.strictEqual(detectMagicBytes(validJpegHeader), 'image/jpeg');
  });

  it('rejects binary files with unknown or forged headers', () => {
    assert.strictEqual(detectMagicBytes(fakePdfWithExeContent), null);
    assert.strictEqual(detectMagicBytes(Buffer.from('<html><body>Hello</body></html>')), null);
    assert.strictEqual(detectMagicBytes(Buffer.from([0x00, 0x01, 0x02, 0x03])), null);
  });

  it('validates genuine document upload successfully', () => {
    const validFile = {
      originalname: 'nursing_certificate.pdf',
      size: validPdfHeader.length,
      mimetype: 'application/pdf',
      buffer: validPdfHeader,
    };

    const result = validateDocumentFile(validFile);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.detectedMime, 'application/pdf');
  });

  it('blocks disguised executable files masquerading as PDFs', () => {
    const forgedFile = {
      originalname: 'salary_slip.pdf', // Renamed extension
      size: fakePdfWithExeContent.length,
      mimetype: 'application/pdf',
      buffer: fakePdfWithExeContent, // Actual content is Windows executable
    };

    const result = validateDocumentFile(forgedFile);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /does not match a valid PDF, JPEG, or PNG format/i);
  });

  it('blocks disallowed file extensions (.exe, .zip, .html)', () => {
    const invalidExtFile = {
      originalname: 'document.zip',
      size: validPdfHeader.length,
      mimetype: 'application/pdf',
      buffer: validPdfHeader,
    };

    const result = validateDocumentFile(invalidExtFile);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /Invalid file extension/i);
  });

  it('blocks files exceeding the 5 MB maximum size limit', () => {
    const oversizedFile = {
      originalname: 'scanned_records.pdf',
      size: MAX_FILE_SIZE + 1024,
      mimetype: 'application/pdf',
      buffer: validPdfHeader,
    };

    const result = validateDocumentFile(oversizedFile);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /exceeds the 5 MB limit/i);
  });

  it('blocks empty 0-byte files', () => {
    const emptyFile = {
      originalname: 'empty.pdf',
      size: 0,
      mimetype: 'application/pdf',
      buffer: Buffer.alloc(0),
    };

    const result = validateDocumentFile(emptyFile);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /file is empty/i);
  });
});
