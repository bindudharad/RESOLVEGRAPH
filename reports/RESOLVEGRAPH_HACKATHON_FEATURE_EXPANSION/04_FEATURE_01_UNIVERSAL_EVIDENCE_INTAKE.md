# REPORT 04 — FEATURE 01: UNIVERSAL PAYMENT EVIDENCE INTAKE

## 1. Overview
The Universal Evidence Intake Engine ingests raw, fragmented payment proof across PDF bank statements, PNG/JPG screenshots, CSV ledgers, and JSON gateway captures.

## 2. Capabilities Implemented
- **Binary Magic-Byte Validation:** Inspects exact file signatures (`%PDF-`, `\x89PNG`, `\xff\xd8\xff`, `RIFF...WEBP`) and blocks malicious executables (.exe, .sh, .bat).
- **Cryptographic Fingerprinting:** Generates SHA-256 hash immediately upon upload.
- **Duplicate Detection:** Prevents replay attacks by checking existing file fingerprints.
- **Calibrated Field Extraction:** Extracts UTR, Amount, Currency, and Status with confidence tiers (HIGH >= 0.9, MEDIUM >= 0.6, LOW < 0.6).
- **Human Correction Interface:** Allows operators to review, edit, and confirm fields with full audit trail.
