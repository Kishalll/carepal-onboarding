import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export interface StorageAdapter {
  save(storageKey: string, buffer: Buffer): Promise<void>;
  read(storageKey: string): Promise<Buffer | null>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  getAbsolutePath(storageKey: string): string;
  generateSignedUrl(storageKey: string, expiresInMinutes?: number): string;
  verifySignedUrl(storageKey: string, expires: number, signature: string): boolean;
}

const isNode = typeof window === 'undefined' && typeof process !== 'undefined';

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private signingSecret: string;
  private urlPrefix: string;

  constructor(options?: {
    baseDir?: string;
    signingSecret?: string;
    urlPrefix?: string;
  }) {
    const env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
    const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
    this.baseDir =
      options?.baseDir ||
      env.STORAGE_DIR ||
      (path && path.resolve ? path.resolve(cwd, '../../storage/uploads') : 'storage/uploads');
    this.signingSecret =
      options?.signingSecret ||
      env.STORAGE_SIGNING_SECRET ||
      'carepal_secure_storage_secret_2026';
    this.urlPrefix = options?.urlPrefix || '/api/documents/view';
  }

  getAbsolutePath(storageKey: string): string {
    // Prevent directory traversal attacks
    const sanitized = path.normalize(storageKey).replace(/^(\.\.[/\\])+/, '');
    return path.resolve(this.baseDir, sanitized);
  }

  async save(storageKey: string, buffer: Buffer): Promise<void> {
    const fullPath = this.getAbsolutePath(storageKey);
    const dir = path.dirname(fullPath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, buffer);
  }

  async read(storageKey: string): Promise<Buffer | null> {
    const fullPath = this.getAbsolutePath(storageKey);
    try {
      return await fs.promises.readFile(fullPath);
    } catch {
      return null;
    }
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = this.getAbsolutePath(storageKey);
    try {
      await fs.promises.unlink(fullPath);
    } catch {
      // Ignore if file already removed
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const fullPath = this.getAbsolutePath(storageKey);
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  generateSignedUrl(storageKey: string, expiresInMinutes = 15): string {
    const expires = Date.now() + expiresInMinutes * 60 * 1000;
    const payload = `${storageKey}:${expires}`;
    const signature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    return `${this.urlPrefix}/${encodeURIComponent(storageKey)}?expires=${expires}&sig=${signature}`;
  }

  verifySignedUrl(storageKey: string, expires: number, signature: string): boolean {
    if (!expires || !signature || Date.now() > expires) {
      return false;
    }

    const payload = `${storageKey}:${expires}`;
    const expected = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    if (signature.length !== expected.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf-8'),
        Buffer.from(expected, 'utf-8')
      );
    } catch {
      return false;
    }
  }
}

// Singleton storage instance for application use
export const storageAdapter: StorageAdapter = isNode
  ? new LocalStorageAdapter()
  : ({} as StorageAdapter);
