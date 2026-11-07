# Temporal Evidence Intelligence & Counterfactual Case Replay

## 1. Overview & Problem Definition

In commerce dispute arbitration, the **when** is as critical as the **what**. Traditional dispute management tools conflate two fundamentally different temporal dimensions:
1. **Real-world Event Time (`occurredAt`)**: When the physical transaction, dispatch, parcel scan, or product failure took place.
2. **System Ingestion Time (`recordedAt`)**: When the user or merchant uploaded the document or recorded the assertion into ResolveGraph.

This distinction is vital for detecting evidence tampering, carrier post-dated scans, out-of-order claims, and late-arriving documentation.

---

## 2. Temporal Data Model

Every `CaseTimelineEvent` captures:

```typescript
interface CaseTimelineEvent {
  id: string;
  caseId: string;
  eventType: string; // PURCHASE, DISPATCH, DELIVERY_COMPLETED, COMPLAINT_FILED, etc.
  title: string;
  description: string;
  occurredAt: Date | null;       // Physical event occurrence
  recordedAt: Date;              // System capture timestamp
  sourceTimestamp: string | null;// Raw excerpt from document (e.g. "Oct 12, 2026 14:22 EST")
  timezoneInformation: string | null;
  timePrecision: "EXACT_TIMESTAMP" | "DATE_ONLY" | "MONTH_YEAR" | "APPROXIMATE" | "UNKNOWN";
  timeBasis: "SOURCE_ASSERTED" | "SYSTEM_OBSERVED" | "USER_REPORTED" | "MERCHANT_REPORTED" | "IMPORTED";
}
```

### Time Precision & Uncertainty Windows
- `EXACT_TIMESTAMP`: Second-level precision with confirmed timezone (Uncertainty $\pm 0$ hours).
- `DATE_ONLY`: Calendar date without time-of-day (Uncertainty $\pm 24$ hours).
- `MONTH_YEAR`: Monthly resolution (Uncertainty $\pm 720$ hours).
- `APPROXIMATE`: Estimated by claimant (Uncertainty $\pm 48$ hours).

---

## 3. Automated Anomaly Detection

The `TemporalEngine` analyzes chronological ordering across commercial dispute stages:

$$\text{PURCHASE} \prec \text{PAYMENT} \prec \text{DISPATCH} \prec \text{DELIVERY\_ATTEMPT} \prec \text{DELIVERY\_COMPLETED} \prec \text{COMPLAINT\_FILED}$$

### Detected Anomaly Classes:
1. **`CONTRADICTORY_DATES` (CRITICAL)**:
   - A subsequent stage claims an `occurredAt` earlier than a prior necessary prerequisite (e.g., carrier confirms delivery on Oct 3, but parcel manifest indicates dispatch occurred on Oct 5).
2. **`LATE_ARRIVING_EVIDENCE` (MEDIUM)**:
   - Fulfillment proof (e.g., delivery photo or POD signature) uploaded $>14$ days after the buyer filed a non-delivery complaint.
3. **`OUT_OF_ORDER_STAGE` (HIGH)**:
   - Return initiated before delivery completion or item inspection report.
4. **`SUPERSEDED_FACT` (LOW)**:
   - Later evidence provides a revised tracking number or updated address that supersedes a prior entry.

---

## 4. Counterfactual Case Replay

The **Counterfactual Replay Engine** (`TemporalEngine.replayCaseState`) allows arbitrators and investigators to travel back in time to any point $T$ in the dispute history:

$$\mathcal{S}(T) = \{ \mathcal{C}_{\le T}, \mathcal{E}_{\le T}, \mathcal{F}_{\le T}, \mathcal{R}_{\le T} \}$$

- Evaluates what claims $\mathcal{C}$ were active at timestamp $T$.
- Restricts evidence $\mathcal{E}$ and facts $\mathcal{F}$ to items known prior to $T$.
- Simulates whether a merchant's response or buyer's claim was justified based strictly on the information available at that exact historical moment.
