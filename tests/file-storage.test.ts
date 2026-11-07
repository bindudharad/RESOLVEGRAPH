import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  evidenceStorage,
  detectMagicBytes,
  sanitizeFilename,
  EvidenceStorageError,
} from '../src/server/storage/evidence-storage';

describe('ResolveGraph Secure Evidence Storage Suite', () => {
  const savedKeys: string[] = [];

  after(async () => {
    // Cleanup any test files generated
    for (const key of savedKeys) {
      await evidenceStorage.deleteFile(key);
    }
  });

  test('detectMagicBytes recognizes valid binary signatures', () => {
    // 1. PDF signature (%PDF-)
    const pdfBuf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
    assert.equal(detectMagicBytes(pdfBuf), 'application/pdf');

    // 2. PNG signature (89 50 4E 47 0D 0A 1A 0A)
    const pngBuf = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d420000000049454e44ae426082', 'hex');
    assert.equal(detectMagicBytes(pngBuf), 'image/png');

    // 3. JPEG signature (FF D8 FF)
    const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    assert.equal(detectMagicBytes(jpegBuf), 'image/jpeg');

    // 4. WEBP signature (RIFF....WEBP)
    const webpBuf = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.alloc(4),
      Buffer.from('WEBP', 'ascii'),
    ]);
    assert.equal(detectMagicBytes(webpBuf), 'image/webp');

    // 5. Plain text or HTML must be rejected
    const htmlBuf = Buffer.from('<html><body><script>alert(1)</script></body></html>');
    assert.equal(detectMagicBytes(htmlBuf), null);
  });

  test('sanitizeFilename prevents path traversal and dangerous characters', () => {
    assert.equal(sanitizeFilename('../../../../etc/passwd'), 'passwd');
    assert.equal(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe');
    assert.equal(sanitizeFilename('normal-receipt.pdf'), 'normal-receipt.pdf');
    assert.equal(sanitizeFilename('.hidden-file.pdf'), 'hidden-file.pdf');
    assert.equal(sanitizeFilename('/var/log/syslog'), 'syslog');
  });

  test('Valid PDF upload persists to private storage and computes SHA-256', async () => {
    const validPdf = Buffer.from('%PDF-1.4\n%Test Document\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
    const result = await evidenceStorage.saveFile(validPdf, 'order-receipt-102.pdf', 'application/pdf');

    assert.ok(result.storageKey.startsWith('ev_'));
    assert.ok(result.storageKey.endsWith('.pdf'));
    assert.equal(result.detectedMimeType, 'application/pdf');
    assert.equal(result.sizeBytes, validPdf.length);
    assert.equal(result.sanitizedFilename, 'order-receipt-102.pdf');
    assert.ok(result.sha256.length === 64, 'SHA-256 must be a 64-char hex string');

    savedKeys.push(result.storageKey);

    // Verify stream retrieval
    const { stream, sizeBytes } = evidenceStorage.getFileStream(result.storageKey);
    assert.equal(sizeBytes, validPdf.length);
    assert.ok(stream);
  });

  test('Valid PNG upload succeeds and detects image/png', async () => {
    const pngBuf = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d420000000049454e44ae426082', 'hex');
    const result = await evidenceStorage.saveFile(pngBuf, 'screenshot-damaged-item.png', 'image/png');

    assert.ok(result.storageKey.startsWith('ev_'));
    assert.equal(result.detectedMimeType, 'image/png');
    savedKeys.push(result.storageKey);
  });

  test('Rejection: Executable disguised with .pdf extension is rejected', async () => {
    const fakePdf = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00Windows Executable Header Payload');
    await assert.rejects(
      async () => {
        await evidenceStorage.saveFile(fakePdf, 'malicious.pdf', 'application/pdf');
      },
      (err: EvidenceStorageError) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Invalid or unverified file format/);
        return true;
      }
    );
  });

  test('Rejection: Forbidden extensions (.svg, .sh, .exe) are blocked upfront', async () => {
    const sampleBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await assert.rejects(
      async () => {
        await evidenceStorage.saveFile(sampleBuf, 'vector-exploit.svg', 'image/svg+xml');
      },
      (err: EvidenceStorageError) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /strictly prohibited for security reasons/);
        return true;
      }
    );
  });

  test('Rejection: Oversized file exceeding 10 MB is rejected', async () => {
    // 10 MB + 1 byte
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    await assert.rejects(
      async () => {
        await evidenceStorage.saveFile(largeBuffer, 'huge-scan.pdf');
      },
      (err: EvidenceStorageError) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /exceeds 10 MB limit/);
        return true;
      }
    );
  });
});
