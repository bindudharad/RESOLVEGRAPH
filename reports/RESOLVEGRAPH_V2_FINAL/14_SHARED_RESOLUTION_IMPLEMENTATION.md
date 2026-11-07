# 14. Module 16: Shared Resolution Room & 10-Point Financial Safeguards

**Service File:** `src/server/services/shared-resolution.service.ts`  
**UI Route:** `/resolution-room`  
**API Endpoints:** `GET /api/cases/[caseId]/messages`, `POST /api/cases/[caseId]/messages`, `GET /api/cases/[caseId]/financial-safeguards`  
**Test Suite:** `tests/shared-resolution.test.ts`

---

## 1. Bilateral Communication with Manager Shielding

The Shared Resolution Room provides a collaborative dispute workspace for buyers and merchants:
- **Bilateral Messages:** Transparently visible to buyer, merchant, and resolution manager.
- **Internal Manager Shielding:**
  When a Resolution Manager or Admin posts an internal note (`isInternalOnly: true`), it is strictly filtered out of buyer views:
```typescript
if (msg.isInternalOnly && userContext.role !== "RESOLUTION_MANAGER" && !userContext.isPlatformAdmin) {
  // Excluded from query output
}
```
This shields internal risk deliberations, warehouse inventory flags, and merchant credit assessments from counterparty inspection.

---

## 2. 10-Point Financial Safeguard Gate

Before any financial proposal can be executed, `validateFinancialSafeguards` evaluates 10 strict checkpoints:
1. **Dispute Case Active & Valid:** Case exists and is not closed/archived.
2. **Proposal In Agreed Status:** Proposal status is `AGREED` with explicit bilateral consent.
3. **Actor Role Authorization:** Actor is verified merchant owner, resolution manager, or platform admin.
4. **Captured Payment Ledger Match:** Linked `CommerceOrder` possesses a settled `PayPalPayment` capture.
5. **Non-Zero Amount:** Refund amount $> 0$.
6. **Balance Sufficiency:** Requested refund $\le$ remaining balance after prior refunds:
   $$\text{Balance}_{\text{remaining}} = \text{Amount}_{\text{captured}} - \sum \text{Refunds}_{\text{completed}}$$
7. **Currency Matching:** Proposal currency strictly matches original captured payment currency (e.g. INR == INR).
8. **Live Fund Safety Lock:** `PAYPAL_LIVE_ENABLED=false` enforced in all non-production environments.
9. **Zero Autonomous Financial Execution:** AI agent proposals require human sign-off before submission.
10. **Immutable Event Logging:** Approval and execution generate non-repudiable audit events in `CaseEvent`.
