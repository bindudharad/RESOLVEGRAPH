# RESOLVEGRAPH — Evidence Storage & File Security Audit Report
**Audit Stage:** Phase 8 — Evidence Upload & File Testing  
**Audit Date:** November 2026  
**Auditor:** Cybersecurity Engineer & Storage Reliability Specialist  
**Location:** `reports/FINAL_TESTING_AUDIT/07_EVIDENCE_STORAGE_TEST_REPORT.md`

---

## 1. Binary Magic-Byte Sniffing & File Validation

ResolveGraph rejects trusting user-supplied file extensions or HTTP `Content-Type` headers. The `LocalEvidenceStorage` service reads the leading binary header bytes to determine genuine MIME signatures:

| File Format | Expected Binary Signature (Hex) | Tested File | Sniffer Result | Upload Verdict |
|---|---|---|---|---|
| **PDF Document** | `25 50 44 46` (`%PDF-`) | `sample_invoice.pdf` | `application/pdf` | ACCEPTED |
| **JPEG Image** | `FF D8 FF` | `drive_photo.jpg` | `image/jpeg` | ACCEPTED |
| **PNG Image** | `89 50 4E 47 0D 0A 1A 0A` | `receipt_scan.png` | `image/png` | ACCEPTED |
| **WEBP Image** | `52 49 46 46 ... 57 45 42 50` | `packaging.webp` | `image/webp` | ACCEPTED |
| **Disguised Executable** | `4D 5A` (`MZ` PE header) renamed `.pdf` | `malware.pdf` | `application/x-dosexec` | REJECTED (Sniff Fail) |
| **SVG Vector Graphic** | `<svg` XML text string | `logo.svg` | `image/svg+xml` | REJECTED (XSS Risk) |
| **Shell Script** | `#!/bin/sh` or text | `exploit.sh` | `text/x-shellscript` | REJECTED (Forbidden) |
| **Oversized Upload** | Valid PDF exceeding 10 MB (10.5 MB) | `large_catalog.pdf` | File size check | REJECTED (> 10 MB) |
| **Zero-Byte File** | 0 bytes empty buffer | `empty.png` | Buffer length check | REJECTED (Empty File) |

---

## 2. Cryptographic Integrity & Tamper Resistance

1. **SHA-256 Digest**:
   - Every uploaded evidence file is passed through `crypto.createHash('sha256')`.
   - The hex digest is saved to `Evidence.sha256Hash`.
   - When serving or processing files, the stored hash is verified against disk to detect bit rot or unauthorized disk modification.
2. **Path Traversal Defense**:
   - `sanitizeFilename()` removes directory traversal sequences (`../`, `..\\`), Windows drive letters (`C:`), control characters, and null bytes (`\0`).
   - Files are stored in tenant-isolated directory trees: `.private/evidence/{organizationId}/{evidenceId}_{safeFilename}`.
3. **Private Access Control**:
   - Evidence files cannot be accessed via direct public static URLs. All downloads must pass through `/api/evidence/[evidenceId]/download`, which asserts caller session and organization permissions.

---

## 3. Storage Reconciliation Results (`npm run storage:reconcile`)

```text
============================================================
RESOLVEGRAPH — Storage Parity & Hash Verification Scan
============================================================
Storage Root:        C:\Projects\resolvegraph\.private\evidence
Total Files on Disk: 60
Total DB Records:    60
Matching Hashes:     60
Missing Files:       0
Orphan Files:        0
Corrupted Hashes:    0
Scan Status:         IN_SYNC (100% Parity Verified)
============================================================
```
