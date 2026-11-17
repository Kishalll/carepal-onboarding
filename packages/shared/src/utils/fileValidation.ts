export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: AllowedMimeType;
}

/**
 * Inspects initial file header bytes to identify genuine file format.
 */
export function detectMagicBytes(buffer: Uint8Array | Buffer): AllowedMimeType | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // PDF check: begins with %PDF- (0x25, 0x50, 0x44, 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // PNG check: begins with 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG check: begins with 0xFF, 0xD8, 0xFF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  return null;
}

/**
 * Validates file size, extension, MIME type, and binary magic bytes.
 */
export function validateDocumentFile(file: {
  originalname: string;
  size: number;
  mimetype: string;
  buffer: Uint8Array | Buffer;
}): FileValidationResult {
  // 1. File size verification
  if (file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the 5 MB limit (received ${sizeMb} MB). Please compress or choose a smaller file.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The uploaded file is empty.',
    };
  }

  // 2. Extension verification
  const lowerName = file.originalname.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Invalid file extension. Only PDF, JPEG, and PNG files are accepted.',
    };
  }

  // 3. Binary magic bytes verification
  const detected = detectMagicBytes(file.buffer);
  if (!detected) {
    return {
      valid: false,
      error:
        'The file content does not match a valid PDF, JPEG, or PNG format. Disguised or corrupted files are not accepted.',
    };
  }

  // 4. Mimetype consistency check
  const normalizedMime = file.mimetype.toLowerCase();
  if (detected === 'image/jpeg' && !['image/jpeg', 'image/jpg', 'image/pjpeg'].includes(normalizedMime)) {
    return {
      valid: false,
      error: 'File MIME type mismatch for JPEG.',
    };
  }
  if (detected === 'image/png' && normalizedMime !== 'image/png') {
    return {
      valid: false,
      error: 'File MIME type mismatch for PNG.',
    };
  }
  if (detected === 'application/pdf' && normalizedMime !== 'application/pdf') {
    return {
      valid: false,
      error: 'File MIME type mismatch for PDF.',
    };
  }

  return {
    valid: true,
    detectedMime: detected,
  };
}
