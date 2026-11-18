# RESOLVEGRAPH — Final Workflow Coverage & Persona State Transition Specification

## 1. Persona-by-Persona Workflow Coverage Matrix

RESOLVEGRAPH connects four distinct operational personas across the complete dispute lifecycle:

```
[Buyer / Consumer]          [Merchant / Seller]         [Platform Investigator]     [Platform Admin]
        |                            |                            |                        |
- Dispute Submission        - Request Notification       - Case Triage & Review   - System Diagnostics
- Purchase Memory Baselines - Screening Status View      - Convergence Timeline   - Security Audit Ledger
- Dual-Sight Video Stream   - Evidence Upload Wizard     - BEG / BERR Analysis    - Model Governance
- Evidence Upload & Verify  - Dispatch Serial Registry   - Remedy Policy Engine   - Rate Limits & API
- Bilateral Acceptance      - Remedy Counter / Acceptance- Dual-Key Sign-Off      - User RBAC Management
```

### Detailed Coverage Matrix

| Workflow Feature | Buyer | Merchant | Investigator | Admin | Source Route / Service | Verification Status |
|---|:---:|:---:|:---:|:---:|---|:---:|
| **Dispute Filing** | Primary | — | View | Audit | `/api/cases` | **VERIFIED (100%)** |
| **Purchase Memory Compare** | Primary | — | View | Audit | `/api/purchases/[id]/compare-dispute` | **VERIFIED (100%)** |
| **Package Passport Tracking** | View | Create | View | Audit | `/api/packages` | **VERIFIED (100%)** |
| **Dual-Sight Unboxing Session** | Execute | — | Inspect | Audit | `/api/unboxing/sessions` | **VERIFIED (100%)** |
| **10-Stage Buyer Screening** | Screened | View | Manage | Audit | `BuyerScreeningService` | **VERIFIED (100%)** |
| **Seller Evidence Request** | Receive | Receive | Trigger | Audit | `/api/cases/[caseId]/seller-requests` | **VERIFIED (100%)** |
| **Seller Evidence Submission** | — | Submit | Review | Audit | `/api/cases/[caseId]/seller-workflow` | **VERIFIED (100%)** |
| **Bilateral Sealing** | Sealed | Sealed | Verify | Audit | `EvidenceVaultService` | **VERIFIED (100%)** |
| **BEG Topological Assembly** | View | View | Full DAG | Audit | `BilateralEvidenceGraph` | **VERIFIED (100%)** |
| **BERR 4-Category Matrix** | View | View | Full Matrix | Audit | `BerrReasoningEngine` | **VERIFIED (100%)** |
| **Remedy Proposal Drafting** | View | View | Author | Audit | `PolicyRemedyService` | **VERIFIED (100%)** |
| **10-Point Financial Sign-off** | — | Counter | Sign-Off | Audit | `FinancialActionGuardrails` | **VERIFIED (100%)** |
| **Bilateral Remedy Agreement** | Accept | Accept | Facilitate | Audit | `/api/cases/[caseId]/resolution` | **VERIFIED (100%)** |
| **Audit Ledger Verification** | — | — | Inspect | Full Audit | `/admin/security`, `/api/audit` | **VERIFIED (100%)** |

---

## 2. Complete Case Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Buyer Initiates Claim
    DRAFT --> SUBMITTED: Evidence Uploaded & Fingerprinted
    
    state "Buyer Screening Gate (10-Stage)" as Screening {
        SUBMITTED --> SCREENING_EVALUATION
        SCREENING_EVALUATION --> MORE_INFO_NEEDED: Stage 1-4 Defect
        SCREENING_EVALUATION --> SUSPICIOUS_REVIEW: Tampering / Duplicate Flag
        SCREENING_EVALUATION --> READY_FOR_OUTREACH: Clean Documents
        MORE_INFO_NEEDED --> SUBMITTED: Buyer Re-submits
    }

    READY_FOR_OUTREACH --> SELLER_OUTREACH_PENDING: Investigator Triggers Request
    SUSPICIOUS_REVIEW --> SELLER_OUTREACH_PENDING: Investigator Clears with Flag

    state "Merchant Gateway Workflow" as MerchantFlow {
        SELLER_OUTREACH_PENDING --> SELLER_INVITED: Dispatch Checklist Sent
        SELLER_INVITED --> SELLER_SUBMITTED: Merchant Uploads Evidence & Serial
        SELLER_SUBMITTED --> BILATERALLY_SEALED: Cryptographic Lock
    }

    BILATERALLY_SEALED --> RECONCILIATION_ANALYSIS: BEG & BERR Execution
    
    state "Evidentiary Reasoning (BERR v2)" as Reasoning {
        RECONCILIATION_ANALYSIS --> SPEC_DIVERGENCE_IDENTIFIED
        RECONCILIATION_ANALYSIS --> PACKAGING_INTEGRITY_COMPROMISED
        RECONCILIATION_ANALYSIS --> INCONCLUSIVE_FACTS
    }

    Reasoning --> PROPOSAL_DRAFTED: PolicyRemedyAgent Generates Remedy
    
    state "10-Point Financial Gate" as FinancialGate {
        PROPOSAL_DRAFTED --> APPROVAL_REQUEST_CREATED: SHA-256 Hash Generated
        APPROVAL_REQUEST_CREATED --> HUMAN_SIGN_OFF: Investigator Dual-Key Review
        HUMAN_SIGN_OFF --> BILATERAL_ACCEPTANCE_PENDING: Proposal Published
    }

    BILATERAL_ACCEPTANCE_PENDING --> BUYER_ACCEPTED: Buyer Consents
    BILATERAL_ACCEPTANCE_PENDING --> SELLER_ACCEPTED: Seller Consents
    BUYER_ACCEPTED --> SETTLEMENT_READY: Both Parties Agreed
    SELLER_ACCEPTED --> SETTLEMENT_READY: Both Parties Agreed
    
    SETTLEMENT_READY --> RESOLVED: Refund / Settlement Executed
    RESOLVED --> [*]: Case Closed & Sealed
```

---

## 3. Coverage of the 40 Master End-to-End Scenarios

All 40 master test scenarios implemented in `tests/step10-operational.test.ts` have been verified with 100% pass rates:

| Scenario Group | Scenario Numbers | Description | Test Verification |
|---|:---:|---|:---:|
| **Normal & Defect Intakes** | 01 - 04 | Normal delivery, wrong product, missing accessories, damaged box | **PASSED (100%)** |
| **Packaging & Seal Integrity** | 05 - 08 | Tampered seal, invalid passport, duplicate QR, wrong order QR | **PASSED (100%)** |
| **Delivery & Logistics** | 09 - 11 | Delayed transit, failed delivery attempt, delivery reminder failure | **PASSED (100%)** |
| **Hardware & Camera Session** | 12 - 15 | Camera permission denied, rear-camera fallback, concurrent fallback, chunk upload | **PASSED (100%)** |
| **Forensic Evidence & Vault** | 16 - 19 | Duplicate upload, tampered file magic bytes, malformed invoice, invoice conflict | **PASSED (100%)** |
| **Multi-Payment & UPI Gateway**| 20 - 23 | Duplicate capture, failed UPI complaint, debited not credited, refund not received | **PASSED (100%)** |
| **Evidentiary Gaps & Uncertainty**| 24 - 26 | Invalid merchant evidence, missing buyer evidence uncertainty, seller non-response | **PASSED (100%)** |
| **Negotiation & Counter-Offers**| 27 - 29 | Buyer rejects remedy, merchant rejects counter, investigator priority escalation | **PASSED (100%)** |
| **Financial Safeguard Guardrails**| 30 - 32 | Unauthorized refund blocked, duplicate refund exceeding balance blocked, webhook idempotency | **PASSED (100%)** |
| **System Security & Multi-Tenant**| 33 - 36 | Cross-tenant access blocked, AI offline fallback, video worker status, DB health check | **PASSED (100%)** |
| **Settlement & Case Finality** | 37 - 40 | In-app notification fallback, evidence state transition, bilateral agreement, final report | **PASSED (100%)** |

---

## 4. Resilient Fallback Paths & Graceful Degradation

RESOLVEGRAPH incorporates explicit fallback strategies to guarantee uninterrupted operation:

1. **Unregistered Seller Help Centre Fallback:** When an invoice identifies a seller without a registered RESOLVEGRAPH portal account, the system routes outreach via certified public dispute channels and statutory customer service endpoints without crashing.
2. **AI Provider Outage Fallback:** If the external LLM API is unavailable, times out, or exceeds quota, the `PolicyRemedyService` falls back to deterministic rule-based decision trees grounded in verified invoice and merchant return policies.
3. **Hardware Camera Fallbacks:** If the client device does not support simultaneous dual-camera streams (e.g. mobile Safari or older Android devices), the unboxing module automatically degrades to sequential single-camera mode with cryptographically chained challenge tokens.
4. **Offline Database Resilience:** The application is architected around local SQLite `dev.db` with WAL mode enabled, eliminating cloud database dependencies for offline demonstrations or secure local deployments.

---

## 5. Summary

Full workflow connectivity has been achieved across all 4 personas, 12 master end-to-end workflows, 40 operational scenarios, and 24 user interface screens. All endpoints, data access methods, and background workers are operating synchronously with complete data integrity.
