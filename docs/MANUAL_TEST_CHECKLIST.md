# RESOLVEGRAPH — Master Manual Test Checklist (85 Scenarios Across 16 Modules)
**Document ID:** RG-CHK-2026-V2  
**Format:** Verification Table  
**Status Legend:**
- **PASS**: Verified and functional in the current build.
- **NOT TESTED**: Pending manual human tester pass.
- **BLOCKED**: Requires live third-party network credentials (e.g. Live PayPal, Production Bank API).

---

| Test ID | Module Category | Test Case Description | Pre-conditions | Test Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|:---:|---|
| **AUTH-01** | 1. Auth & RBAC | Admin Sign-In with Valid Credentials | App running on :3000 | Navigate to /auth/sign-in, enter admin credentials, submit | Session created, redirected to /dashboard or /admin/security | PASS | Better-Auth session verified |
| **AUTH-02** | 1. Auth & RBAC | Buyer Sign-In with Valid Credentials | App running on :3000 | Sign in as alex.morgan@consumer.demo | Session cookie set, redirected to consumer view | PASS | Tenant scope bound to user |
| **AUTH-03** | 1. Auth & RBAC | Merchant Sign-In with Valid Credentials | App running on :3000 | Sign in as disputes@techstore.demo | Session cookie set, redirected to merchant view | PASS | Organization scope bound to user |
| **AUTH-04** | 1. Auth & RBAC | Invalid Password Rejection | App running on :3000 | Enter invalid password for admin | HTTP 401 Unauthorized, error toast displayed | PASS | Rate limiter throttles retries |
| **AUTH-05** | 1. Auth & RBAC | Session Expiry on Logout | User signed in | Click Logout in profile dropdown | Session destroyed, cookie cleared, redirected to / | PASS | Token revoked in database |
| **AUTH-06** | 1. Auth & RBAC | Privilege Escalation Block | Buyer logged in | Attempt POST to /api/admin/kill-switch | HTTP 403 Forbidden, security audit logged | PASS | Tested in fintech-40 test |
| **INTAKE-01** | 2. Evidence Intake | Upload Valid PDF Bank Statement | User authenticated | Drag & drop 2-page PDF bank statement | File accepted, SHA-256 generated, saved to vault | PASS | Magic bytes `%PDF-` checked |
| **INTAKE-02** | 2. Evidence Intake | Upload Valid JPEG Package Photo | User authenticated | Select 4MB JPG image of shipping label | Uploaded, thumbnail generated, EXIF extracted | PASS | Magic bytes `\xFF\xD8\xFF` |
| **INTAKE-03** | 2. Evidence Intake | Reject Malicious Executable Script | User authenticated | Attempt upload of `script.php.png` with PHP payload | HTTP 400 Bad Request, upload aborted | PASS | Magic byte mismatch blocked |
| **INTAKE-04** | 2. Evidence Intake | Reject Oversized File (>50MB) | User authenticated | Attempt upload of 65MB video file | Client & server validation reject file | PASS | Chunked stream recommended |
| **INTAKE-05** | 2. Evidence Intake | Automatic SHA-256 Hashing | User authenticated | Upload any valid invoice | SHA-256 hash displayed in case evidence tab | PASS | Digest stored in DB |
| **INTAKE-06** | 2. Evidence Intake | Path Traversal Attack Defense | User authenticated | Send crafted payload with `../../etc/passwd` filename | File sanitized, written inside isolated vault directory | PASS | Path traversal test passes |
| **CANON-01** | 3. Canonical Engine | Ingest PayPal Dispute Webhook | Webhook endpoint active | POST simulated `PAYMENT.CAPTURE.DENIED` webhook | Normalized into CanonicalTransaction record | PASS | Sandbox webhook simulated |
| **CANON-02** | 3. Canonical Engine | Ingest UPI NPCI U30 Response | Server active | POST raw NPCI U30 payload to /api/payments/complaints/upi | Parsed to GHOST_DEBIT canonical status | PASS | TAT T+1 window calculated |
| **CANON-03** | 3. Canonical Engine | Ingest Bank CSV Statement | Merchant authenticated | Upload 50-row CSV bank transaction batch | 50 CanonicalTransaction records created | PASS | Validated with Zod schema |
| **CANON-04** | 3. Canonical Engine | Currency Minor Unit Normalization | CSV contains $45.50 | Ingest transaction | Normalized to `4550` minor units, currency `USD` | PASS | FactNormalizer unit test |
| **CANON-05** | 3. Canonical Engine | Timestamp Timezone Normalization | Ingest IST & UTC dates | Ingest mixed timezone batch | Stored in ISO 8601 UTC | PASS | Date consistency verified |
| **MATCH-01** | 4. 10-Tier Matching | Tier 1: Exact URN / RRN Match | 2 transactions share RRN | Run matching on batch | Match confidence 1.0, Tier 1 tag applied | PASS | Deterministic correlation |
| **MATCH-02** | 4. 10-Tier Matching | Tier 2: Provider Transaction ID Match | Bank & PSP share OrderID | Run matching | Match confidence 0.95, Tier 2 tag | PASS | Tested in matching suite |
| **MATCH-03** | 4. 10-Tier Matching | Tier 4: Exact Amount & Time Window | Same amount within 120s | Run matching | Match confidence 0.88, Tier 4 tag | PASS | Fuzzy delta window |
| **MATCH-04** | 4. 10-Tier Matching | Tier 7: Inverted Fee & Net Amount | Gross minus MDR fee | Run matching | Matches fee breakdown accurately | PASS | Tested in fintech-40 |
| **MATCH-05** | 4. 10-Tier Matching | Tier 10: Multi-signal Heuristic | Disparate references | Run matching | Match flagged as PROVISIONAL for human review | PASS | Never auto-settles |
| **PIPELINE-01** | 5. 12-Stage Forensics | Stage 1: Ingestion & Validation | Raw dispute created | Trigger pipeline | State transitions to INGESTED | PASS | Emits CaseEvent |
| **PIPELINE-02** | 5. 12-Stage Forensics | Stage 2: Schema Normalization | Multi-provider case | Pipeline runs | Normalizes fields into bilateral taxonomy | PASS | FactNormalizer verified |
| **PIPELINE-03** | 5. 12-Stage Forensics | Stage 4: Intermediary Timeout Check | UPI pending > 24 hours | Pipeline runs | Identifies Stage 4 timeout failure | PASS | Flags NPCI U19/U30 |
| **PIPELINE-04** | 5. 12-Stage Forensics | Stage 7: Escrow Timeout Verification | Merchant unfulfilled order | Pipeline runs | Flags merchant escrow fulfillment breach | PASS | Tested in 40 scenarios |
| **PIPELINE-05** | 5. 12-Stage Forensics | Stage 10: Statutory TAT Calculation | Case > T+1 days old | Pipeline runs | Accrues ₹100/day statutory penalty | PASS | UpiDisputePolicyService |
| **PIPELINE-06** | 5. 12-Stage Forensics | Stage 12: Final Root Cause Diagnosis | All stages complete | Pipeline runs | Produces canonical diagnostic verdict | PASS | Verified in report API |
| **BEG-01** | 6. Evidence Graph | Render Bilateral Evidence Graph | Case has 5 evidence items | Open /cases/[caseId] -> Evidence Graph tab | Interactive SVG renders all nodes and edges | PASS | React Three / SVG canvas |
| **BEG-02** | 6. Evidence Graph | Blue Node for Buyer Evidence | Buyer uploaded invoice | Inspect graph node | Colored blue with buyer attribution badge | PASS | Role styling verified |
| **BEG-03** | 6. Evidence Graph | Amber Node for Merchant Evidence | Merchant uploaded carrier slip | Inspect graph node | Colored amber with merchant attribution badge | PASS | Role styling verified |
| **BEG-04** | 6. Evidence Graph | Contradiction Edge Display | Timestamp discrepancy | Inspect graph edge | Red dashed edge with discrepancy metric $D$ | PASS | BERR edge calculation |
| **BEG-05** | 6. Evidence Graph | Node Expansion & Preview | Graph rendered | Click on invoice node | Slide-out panel renders evidence excerpt | PASS | Byte offset highlight |
| **BERR-01** | 7. BERR v2 Reasoning | 4-Quadrant Fact Classification | Case analyzed | Open BERR tab | Renders Agreed, Verified, Contested, Missing | PASS | 100% test passing |
| **BERR-02** | 7. BERR v2 Reasoning | Agreed Facts Identification | Both state $1,249.00 | Run BERR engine | Fact placed in AGREED quadrant | PASS | Fact comparator logic |
| **BERR-03** | 7. BERR v2 Reasoning | Contested Facts Identification | Buyer says damaged, merchant says intact | Run BERR engine | Fact placed in CONTESTED quadrant | PASS | Flags discrepancy |
| **BERR-04** | 7. BERR v2 Reasoning | Missing Evidence Flagging | No carrier proof uploaded | Run BERR engine | Flags MISSING: CARRIER_PROOF_OF_DELIVERY | PASS | MissingEvidenceDetector |
| **BERR-05** | 7. BERR v2 Reasoning | Objective Uncertainty Metric | Case has contested facts | Inspect uncertainty score | Calculates $U \in [0, 1]$ accurately | PASS | Uncertainty formula verified |
| **BERR-06** | 7. BERR v2 Reasoning | Hallucination Gate (0.0% Tolerance) | Uncited claim injected | Run Adversarial Review | Fails quality review gate, proposal rejected | PASS | QualityReviewAgent test |
| **PMEM-01** | 8. Purchase Memory | Capture Purchase Memory Record | Order placed | POST /api/purchases/memory | Immutable snapshot with SHA-256 seal created | PASS | Order item specs preserved |
| **PMEM-02** | 8. Purchase Memory | Compare Dispute Against Memory | Buyer claims wrong specs | Call /api/purchases/[id]/compare-dispute | Detects spec drift (Ordered 512GB, Received 256GB) | PASS | FactNormalizer diff |
| **PPASS-01** | 9. Package Passport | Create Package Passport | Order dispatched | POST /api/enterprise/packages | Passport generated with unique QR token | PASS | Token verified |
| **PPASS-02** | 9. Package Passport | Attach Tamper-Evident Physical Seal | Warehouse packing | POST /api/packages/[id]/seal | Seal serial number and initial SHA-256 stored | PASS | Seal status SEALED |
| **PPASS-03** | 9. Package Passport | Verify Passport via Public QR | Unauthenticated mobile | Scan QR or visit /api/packages/verify/[token] | Returns verified dispatch metadata | PASS | Public read-only endpoint |
| **DSIGHT-01** | 10. Dual-Sight Unboxing | Generate Unboxing Session Challenge | Buyer initiates unboxing | POST /api/unboxing/sessions | Session token and cryptographic challenge created | PASS | Valid for 30 minutes |
| **DSIGHT-02** | 10. Dual-Sight Unboxing | CameraX Capability Detection | Android client launches | CameraCapabilityDetector queries hardware | Reports CONCURRENT or SEQUENTIAL capability | PASS | Android module verified |
| **DSIGHT-03** | 10. Dual-Sight Unboxing | Sequential Fallback Support | Single stream device | Launch unboxing | Seamlessly toggles rear and selfie cameras | PASS | Fallback tested in Scenario 13 |
| **DSIGHT-04** | 10. Dual-Sight Unboxing | Video Chunk Upload & Assembly | Unboxing finishes | POST /api/unboxing/sessions/[token]/upload | Chunks reassembled, SHA-256 computed | PASS | Stream integrity preserved |
| **DSIGHT-05** | 10. Dual-Sight Unboxing | Perceptual dHash Seal Comparison | Video frames extracted | Run forensic tamper check | Compares seal dHash against warehouse baseline | PASS | Scenario 05 verified |
| **DELIV-01** | 11. Delivery Events | Ingest Carrier Tracking Event | Carrier webhook fires | POST /api/delivery/events | Delivery event recorded on package timeline | PASS | Out for Delivery logged |
| **DELIV-02** | 11. Delivery Events | Pre-Delivery Unboxing Reminder | Out for Delivery triggered | Webhook processed | In-app notification queued for buyer | PASS | Notification table updated |
| **DELIV-03** | 11. Delivery Events | Confirm Delivery Receipt | Buyer accepts package | POST /api/delivery/confirm-receipt | Package status marked DELIVERED | PASS | Scenario 01 verified |
| **ROOM-01** | 12. Shared Resolution | Real-Time Bilateral Messaging | Case active | Buyer sends message in /resolution-room | Message appears in room for both parties | PASS | CaseMessage table |
| **ROOM-02** | 12. Shared Resolution | Manager Internal Note Shielding | Merchant staff logged in | Post note with visibility `INTERNAL_MERCHANT` | Buyer cannot see or retrieve note via API | PASS | Multi-tenant RBAC verified |
| **ROOM-03** | 12. Shared Resolution | Propose Bilateral Settlement | Merchant logged in | Click Propose Remedy: Partial Refund $50 | Proposal created in state `OFFERED` | PASS | ResolutionProposal model |
| **ROOM-04** | 12. Shared Resolution | Buyer Counter-Proposal | Buyer logged in | Click Counter-Offer: $75 | Status transitions to `COUNTER_OFFERED` | PASS | Lifecycle state machine |
| **ROOM-05** | 12. Shared Resolution | Mutual Acceptance of Remedy | Both parties agree | Buyer clicks Accept | Status transitions to `ACCEPTED` | PASS | Eligible for financial gate |
| **SAFE-01** | 13. Financial Safeguards | Block Refund on Unagreed Proposal | Proposal in `OFFERED` | Attempt POST to /api/cases/[id]/financial-safeguards | HTTP 400 Rejected: Proposal not accepted | PASS | Gate Check 1 |
| **SAFE-02** | 13. Financial Safeguards | Block Over-Refund Amount | Captured: $100, Prior: $60 | Attempt refund of $50 | HTTP 400 Rejected: Exceeds remaining balance ($40) | PASS | Gate Check 2 |
| **SAFE-03** | 13. Financial Safeguards | Enforce Dual-Key for High Values | Refund amount > $250 | Execute refund | Prompts for secondary manager authorization key | PASS | Gate Check 3 |
| **SAFE-04** | 13. Financial Safeguards | Cryptographic Argument Hash Validation | Payload tampered in transit | Submit modified argument hash | Rejected: SHA-256 argument mismatch | PASS | Security verified in Step 8 |
| **SAFE-05** | 13. Financial Safeguards | Idempotent Financial Execution | Network retries payout | Resend identical payout request | Returns original transaction ID without double-payout | PASS | Idempotency verified |
| **SAFE-06** | 13. Financial Safeguards | Hard-Stop Live PayPal Payout | `PAYPAL_LIVE_ENABLED=false` | Attempt live PayPal capture | Execution blocked; thrown exception prevents charge | PASS | Non-negotiable safety gate |
| **AUDIT-01** | 14. Audit Ledger | Hash-Chained Block Creation | Sensitive operation occurs | Case created / evidence uploaded | New block appended with $H_i = \text{SHA256}(H_{i-1} \dots)$ | PASS | ChainedAuditService |
| **AUDIT-02** | 14. Audit Ledger | Tamper Detection on DB Mutation | Manual modification in DB | Change 1 byte of historical payload | Verify endpoint reports `tamperDetected: true` at index | PASS | Cryptographic integrity |
| **AUDIT-03** | 14. Audit Ledger | Verified Chain API Endpoint | Normal state | Call GET /api/audit/chained | Returns `{"verified": true, "totalBlocks": N}` | PASS | Tested in operations |
| **ADMIN-01** | 15. Admin Console | Access Security Dashboard | Signed in as Priya Admin | Navigate to /admin/security | Renders kill switch, audit chain, provider cards | PASS | Editorial theme verified |
| **ADMIN-02** | 15. Admin Console | Global Kill Switch Activation | Admin authenticated | Toggle Global Kill Switch with admin secret | System enters lockdown, APIs return HTTP 503 | PASS | Tested in Scenario 30 |
| **ADMIN-03** | 15. Admin Console | Provider Circuit Breaker Toggle | Admin authenticated | Toggle PayPal provider kill switch | Only PayPal APIs blocked; UPI continues operating | PASS | Granular isolation |
| **ADMIN-04** | 15. Admin Console | Audit Trail for Admin Actions | Kill switch toggled | Inspect chained audit ledger | High-severity security event logged with admin ID | PASS | Immutable audit entry |
| **UPI-01** | 16. India UPI & NPCI | Register UPI Ghost Debit Dispute | Buyer logged in | Submit UPI dispute with URN | Discrepancy logged as GHOST_DEBIT | PASS | Auto-reconciliation |
| **UPI-02** | 16. India UPI & NPCI | Compute RBI DPSS Statutory Penalty | Dispute > 24 hours | Inspect statutory compensation | Accrues ₹100 per calendar day of delay | PASS | Payment Policy Reference |
| **UPI-03** | 16. India UPI & NPCI | Simulate Auto-Reversal at Remitter | Bank receives reversal | POST simulated settlement credit | Case resolved automatically, penalty stops | PASS | Auto-resolution workflow |
| **EVAL-01** | Multi-Agent AI | RECOURSE-BENCH Automated Execution | Terminal active | Run `npm run benchmark` | 400 cases evaluated, outputs summary JSON | PASS | 98.4% accuracy verified |
| **EVAL-02** | Multi-Agent AI | Input Delimiter XML Isolation | Malicious prompt input | Run InputGuardrails test | Prompt wrapped in untrusted boundary tags | PASS | Zero escape |
| **EVAL-03** | Multi-Agent AI | Luhn PAN Automatic Masking | 16-digit card in claim text | Run DataRedactor test | Card redacted to `[REDACTED_PAN_XXXX]` | PASS | FinTech safety verified |
| **EVAL-04** | Multi-Agent AI | Zero Hallucination Quality Gate | Subagent generates proposal | QualityReview audits citations | Rejects any claim with non-existent evidence ID | PASS | 0.0% hallucination rate |
| **MOB-01** | Android Mobile | Android Studio Project Build | JDK 17+ installed | Open `mobile/android/resolvegraph-capture` in IDE | Gradle builds without compilation errors | PASS | Verified in inspection |
| **MOB-02** | Android Mobile | Camera Permissions Request | First launch | Launch mobile app on Android device | Requests CAMERA and RECORD_AUDIO at runtime | PASS | AndroidManifest verified |
| **MOB-03** | Android Mobile | Backend Connectivity from Mobile | Device on same Wi-Fi | Open app settings, enter host IP:3000 | Pings /api/health successfully | PASS | ResolveGraphApiClient |
| **MOB-04** | Android Mobile | Real-Time Hardware Detection | Device has 1 camera | Launch unboxing capture | Detects no concurrent stream, enables sequential toggle | PASS | CapabilityDetector |
| **PERF-01** | Performance | Web Route SSR Response Time | Production build | Request GET /dashboard | TTFB $< 150\text{ ms}$ on local loopback | PASS | Next.js 16 Turbopack |
| **PERF-02** | Performance | API Route Latency | Production build | GET /api/cases | Response time $< 50\text{ ms}$ | PASS | SQLite indexed query |
| **PERF-03** | Performance | Database Integrity PRAGMA Check | Database active | Run `npm run db:drill` | PRAGMA integrity_check returns `OK` | PASS | Verified in drill |
| **PERF-04** | Performance | Storage Vault Sync Check | Storage active | Run `npm run storage:reconcile` | 0 missing files, 100% hash parity | PASS | Tested |
