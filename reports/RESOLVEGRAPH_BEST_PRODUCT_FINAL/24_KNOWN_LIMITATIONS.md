# REPORT 24 — OBJECTIVE KNOWN LIMITATIONS

1. **PayPal Live Mode:** Intentionally disabled (`PAYPAL_LIVE_ENABLED=false`). Requires merchant production credentials and business entity approval for live transactions.
2. **Indian Banking Aggregator APIs:** In the absence of direct account aggregator OAuth tokens, statement and SMS ingestion uses calibrated OCR/CSV extraction.
3. **Android Hardware Dual-Sight:** Concurrent front+back recording requires hardware camera subsystem support; single-camera fallback is active by default.
