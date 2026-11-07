# Future Scope & Product Roadmap

ResolveGraph is architected to expand from its initial hackathon release into a comprehensive, multi-platform commerce resolution protocol:

---

## 1. Phase 1: Real-World Merchant Pilot Execution (Months 1–3)
- **Controlled Pilot Rollout**: Onboard 2 to 5 physical e-commerce merchants under the framework specified in `docs/PILOT_PROGRAM.md`.
- **Phase 1 Shadow Mode**: Validate multimodal fact extraction accuracy against live merchant dispute inboxes without customer-facing exposure.
- **Phase 2 Semi-Autonomous Resolution**: Enable human-in-the-loop dispute proposals with maximum settlement threshold capped at \$100.00 USD.

---

## 2. Phase 2: Live PayPal Commercial Production Integration (Months 3–6)
- **Partner Underwriting Review**: Present empirical RECOURSE-BENCH findings, audit logs, and pilot CSAT metrics to PayPal Partner Engineering for commercial underwriting.
- **Production PostgreSQL Migration**: Transition from SQLite to managed high-availability PostgreSQL (AWS RDS / Neon) and AWS S3 object storage with multi-region replication.
- **Automated Chargeback Representment**: Export Bilateral Evidence Graph dossiers directly into card network chargeback formats (Visa VROL / Mastercard MasterCom).

---

## 3. Phase 3: Advanced Multimodal Video & Cross-Border FX (Months 6–12)
- **Continuous Video Tensor Embeddings**: Ingest full continuous unboxing video files (rather than sampled keyframes) using multimodal video foundation models to detect unboxing tampering.
- **Cross-Border FX Hedging**: Real-time currency exchange rate locking between purchase date and refund settlement date to protect merchants against foreign exchange volatility during cross-border dispute lifecycles.
- **Open Resolution Protocol (ORP)**: Publish open REST/GraphQL schemas allowing third-party e-commerce platforms (Shopify, WooCommerce, Magento) to embed ResolveGraph bilateral workspaces natively.
