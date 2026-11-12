export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const FORBIDDEN_EXTENSIONS = [
  'html',
  'htm',
  'svg',
  'js',
  'ts',
  'jsx',
  'tsx',
  'exe',
  'bat',
  'cmd',
  'sh',
  'php',
  'py',
  'zip',
  'tar',
  'gz',
  'rar',
  'bin',
  'dll',
  'so',
];

export interface StoredFileResult {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  detectedMimeType: AllowedMimeType;
  sanitizedFilename: string;
}

export interface StorageValidationResult {
  valid: boolean;
  error?: string;
  detectedMimeType?: AllowedMimeType;
}
