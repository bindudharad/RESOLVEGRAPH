# RESOLVEGRAPH — Pilot Participant Consent & Disclosures
**Phase:** Step 10 Production Engineering & Operational Excellence  
**Status:** REGULATORY & LEGAL COMPLIANCE INSTRUMENT  
**Applicability:** Pilot Program Participants (Merchants & Consumers)  
**Version:** 1.0.0  
**Last Updated:** November 2026

---

## 1. Transparency & Pilot Disclosure

Welcome to the **ResolveGraph Controlled Pilot Program**. ResolveGraph is an evidence-first commerce dispute resolution platform designed to foster fair, transparent, and expedited outcomes for buyers and merchants.

By participating in this pilot, you acknowledge that:
1. **Pre-GA Evaluation Status**: ResolveGraph is currently operating in a controlled evaluation phase to validate system accuracy, resolution velocity, and bilateral satisfaction.
2. **AI-Assisted Investigation**: ResolveGraph utilizes specialized multimodal artificial intelligence (including optical character recognition, visual damage detection, temporal sequence alignment, and the Bilateral Evidence Reconciliation & Recourse [BERR] engine) to extract facts from uploaded documentation and draft proposed settlement options.
3. **Mandatory Human Oversight**: The AI system acts solely as an investigatory copilot. **No financial chargebacks, refunds, or claim denials are finalized unilaterally by AI.** Every resolution proposal is reviewed and authorized by an authorized human decision-maker.

---

## 2. Scope of Data Collection & Usage

To resolve commercial disputes fairly, ResolveGraph collects and processes the following information:

| Data Category | Purpose | Retention Period |
|---------------|---------|------------------|
| **Order & Transaction Data** | Order ID, amount, currency, purchased items, timestamp, and PayPal transaction references. | 7 Years (Statutory financial ledger requirement) |
| **Multimodal Evidence** | Photos of merchandise, packaging, shipping labels, invoices, receipts, and carrier tracking logs. | Case lifetime + 180 days post-settlement |
| **Communication Logs** | Buyer and merchant case communications, claim descriptions, and dispute notes. | Case lifetime + 180 days post-settlement |
| **Evaluation Telemetry** | Anonymized case resolution velocity, AI agreement rate, and bilateral satisfaction ratings. | Aggregated indefinitely (Zero PII) |

### Strict Privacy Guarantees
- **No Third-Party Model Training**: Your uploaded evidence, case details, and private documents are **never** used to train public foundation models (e.g. public OpenAI or third-party frontier models).
- **Organization Isolation**: Merchant and buyer records are logically isolated through cryptographic multi-tenant separation.
- **Encryption Standards**: All stored files are encrypted at rest using AES-256 and transmitted exclusively over TLS 1.3.

---

## 3. Participant Rights & Choices

In full compliance with international privacy regulations including **India Digital Personal Data Protection Act (DPDPA 2023)**, **GDPR**, and **CCPA**:

### 3.1 Right to Human-Only Review
At any point during the dispute process, either the buyer or the merchant may select **"Request Human-Only Review"**. When activated:
- AI-generated recommendations are suppressed from the final review screen.
- A senior human dispute specialist handles evidence evaluation and claims review manually from scratch.

### 3.2 Right to Access & Data Portability (DSAR)
Participants may download an immutable JSON archive of all personal data, claims, uploaded evidence files, and case timelines via the **Account Settings > Privacy & Data > Export Data** endpoint or by emailing `dpo@resolvegraph.com`.

### 3.3 Right to Erasure & Deletion
Participants may request account and profile deletion at any time. ResolveGraph will pseudonymize all personal identifiers (names, email addresses, phone numbers) within 30 days.
> *Note: Transactional payment ledger entries and tax invoices are retained in anonymized format for 7 years to comply with statutory financial recordkeeping laws.*

### 3.4 Right to Opt-Out
Merchants and buyers may withdraw from the pilot at any time without penalty. Ongoing disputes will be immediately redirected to standard manual dispute channels or the primary PayPal Resolution Center.

---

## 4. Participant Acknowledgment & Consent Form

By clicking **"I Agree to Pilot Terms"** or signing the onboarding agreement, you confirm that:
- [x] You have read and understood the scope of the ResolveGraph Pilot Program.
- [x] You consent to the automated processing and multimodal AI analysis of uploaded case evidence strictly for dispute resolution purposes.
- [x] You understand that AI recommendations are advisory and subject to human authorization.
- [x] You are aware of your rights to request human review, access your data, and withdraw consent at any time.

**Authorized Contact**:  
Data Protection Officer (DPO): `dpo@resolvegraph.com`  
Platform Reliability & Incident Response: `ops@resolvegraph.com`
