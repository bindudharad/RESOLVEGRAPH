# RESOLVEGRAPH — PayPal Disputes API & Evidence Compiler Guide

ResolveGraph bridges buyer complaint investigations with official PayPal Sandbox Disputes API operations, allowing merchants to synchronize claims, inspect seller response due dates, evaluate allowed actions, and compile structured evidence directly from case files.

---

## 1. PayPal Dispute Lifecycle Integration

The platform maps PayPal dispute lifecycles to internal dispute management:

| PayPal Stage | Description | Permitted Merchant Actions |
| :--- | :--- | :--- |
| `INQUIRY` | Preliminary dialogue between buyer and seller before formal payment chargeback. | `PROVIDE_EVIDENCE`, `ACCEPT_CLAIM`, `MAKE_OFFER`, `SEND_MESSAGE` |
| `CHARGEBACK` | Formal cardholder dispute submitted through issuing bank. | `PROVIDE_EVIDENCE`, `ACCEPT_CLAIM`, `SEND_MESSAGE` |
| `PRE_ARBITRATION` | Appeal following initial dispute resolution. | `PROVIDE_EVIDENCE`, `ACCEPT_CLAIM` |
| `ARBITRATION` | Final network adjudication. | View status |

---

## 2. Dynamic Allowed Actions Engine

`DisputeService.getDisputeDetails(disputeId)` dynamically calculates permissible actions based on dispute status:
- If `paypalStatus === 'WAITING_FOR_SELLER_RESPONSE'` or `'OPEN'`:
  - `PROVIDE_EVIDENCE` is enabled.
  - `ACCEPT_CLAIM` is enabled.
  - If in `INQUIRY` stage, `MAKE_OFFER` is permitted.
- If `paypalStatus === 'RESOLVED'` or `'UNDER_REVIEW'`:
  - Mutating actions are disabled to prevent invalid provider API calls.

---

## 3. Evidence Compilation Service

`EvidenceCompilerService.compileCaseEvidence(caseId, evidenceType, note)` aggregates verified evidence documents attached to the case and maps them into PayPal Dispute Evidence schema (`POST /v1/customer/disputes/{dispute_id}/provide-evidence`):

### Evidence Categorization

1. **`PROOF_OF_FULFILLMENT`**:
   - Tracking numbers, carrier receipts, delivery signatures.
   - Automatically extracts carrier and tracking strings from case evidence.
2. **`PROOF_OF_DELIVERY`**:
   - Direct courier confirmation and delivery scan documents.
3. **`PROOF_OF_DAMAGE_OR_SIGNIFICANT_DIFFERENCE`**:
   - High-resolution photographic inspections, condition assessments, and buyer/merchant statements.
4. **`PROOF_OF_REFUND_OUTSIDE_PAYPAL`**:
   - External credit notes, wire confirmations, or prior merchant reimbursements.

### Visibility Guard

The evidence compiler strictly filters for items with `SHARED_WITH_PARTICIPANTS` or `MERCHANT_ONLY` visibility. Sensitive private internal notes or unverified uploads are never compiled into external PayPal evidence submissions.
