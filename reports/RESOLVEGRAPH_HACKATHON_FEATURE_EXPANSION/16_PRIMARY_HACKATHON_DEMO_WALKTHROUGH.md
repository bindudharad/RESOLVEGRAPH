# REPORT 16 — PRIMARY HACKATHON DEMO: "ONE PAYMENT. FOUR SOURCES. ONE INVESTIGATION."

## Demonstration Scenario
A customer makes a $49.99 purchase on TechStore.
1. **Source 1 (Payment Gateway):** PayPal Sandbox captures $49.99 (Status: `COMPLETED`, Capture ID: `CAPTURE-9988112233`).
2. **Source 2 (Merchant Portal):** TechStore order reflects `PENDING_CAPTURE` due to a webhook timeout.
3. **Source 3 (Customer Proof):** Ingested email confirmation showing $49.99 paid.
4. **Source 4 (Bank Statement):** Bank card statement shows settled debit of $49.99.

## Demonstration Steps
1. Navigate to `/reconciliation` and click **"Seed 4-Source Sandbox Dispute"**.
2. Click **"Run 10-Tier Reconciliation"** to witness deterministic status discrepancy detection.
3. Navigate to `/incidents` and click **"Run 12-Stage Investigation"** to observe root-cause hypothesis generation.
4. Export the forensic dossier in Markdown/PDF, JSON, or CSV.
