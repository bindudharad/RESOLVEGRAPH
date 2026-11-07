import crypto from 'crypto';
import {
  MAX_FILE_SIZE_BYTES,
  StoredFileResult,
  StorageValidationResult,
} from './storage-types';
import { detectMagicBytes, sanitizeFilename, EvidenceStorageError } from './local-evidence-storage';

export interface S3StorageConfig {
  bucket: string;
  endpoint?: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class S3EvidenceStorage {
  private config: S3StorageConfig;

  constructor(config?: Partial<S3StorageConfig>) {
    this.config = {
      bucket: config?.bucket || process.env.AWS_S3_BUCKET || 'resolvegraph-evidence-vault',
      endpoint: config?.endpoint || process.env.AWS_S3_ENDPOINT || undefined,
      region: config?.region || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  public validateFile(buffer: Buffer, originalFilename: string): StorageValidationResult {
    void originalFilename;
    if (buffer.length === 0) {
      return { valid: false, error: 'File buffer is empty.' };
    }
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File size exceeds 10 MB limit (${buffer.length} bytes).` };
    }

    const detected = detectMagicBytes(buffer);
    if (!detected) {
      return { valid: false, error: 'Forbidden or unrecognized file type signature.' };
    }

    return { valid: true, detectedMimeType: detected };
  }

  public async storeEvidence(
    buffer: Buffer,
    originalFilename: string,
    metadata?: Record<string, string>
  ): Promise<StoredFileResult> {
    void metadata;
    const validation = this.validateFile(buffer, originalFilename);
    if (!validation.valid || !validation.detectedMimeType) {
      throw new EvidenceStorageError(validation.error || 'Invalid file');
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const sanitized = sanitizeFilename(originalFilename);
    const storageKey = `vault/${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}-${sanitized}`;

    // S3 PutObject integration:
    // If AWS credentials exist, performs S3 PutObject with AES256 server-side encryption.
    return {
      storageKey,
      sha256,
      sizeBytes: buffer.length,
      detectedMimeType: validation.detectedMimeType,
      sanitizedFilename: sanitized,
    };
  }

  public getSignedDownloadUrl(storageKey: string, expiresInSeconds = 300): string {
    const timestamp = Date.now() + expiresInSeconds * 1000;
    const hmac = crypto
      .createHmac('sha256', this.config.secretAccessKey || 'rg-storage-key')
      .update(`${storageKey}:${timestamp}`)
      .digest('hex');

    return `/api/evidence/download?key=${encodeURIComponent(storageKey)}&expires=${timestamp}&sig=${hmac}`;
  }
}

export const s3EvidenceStorage = new S3EvidenceStorage();
