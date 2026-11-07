# ResolveGraph Prior-Art & Intellectual Property Matrix

**Scope**: Patent Classifications US CPC `G06Q20/00` (Payment Architectures), `G06Q30/018` (Dispute Handling), and Peer-Reviewed Literature  
**Date**: November 2026  

---

## 1. Prior-Art Analysis Matrix

| Patent / Publication / System | Assignee / Authors | Publication Date | Key Claims & Mechanisms | ResolveGraph Overlap | Defensible ResolveGraph Differentiation |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **US Patent 10,878,416**  <br> *"Automated dispute resolution and chargeback management"* | Chargehound Inc. (PayPal) | Dec 29, 2020 | Automated assembly of merchant chargeback representment documents using pre-configured merchant templates. | Reuses merchant order data extraction and PayPal dispute REST submission. | Chargehound is unilateral merchant representment post-chargeback. ResolveGraph is pre-chargeback bilateral evidence graph reconciliation with consumer participation. |
| **US Patent 11,288,674**  <br> *"System and method for intelligent dispute management"* | Justt Ltd. | Mar 29, 2022 | ML-based feature extraction from merchant transaction logs to dynamically select arguments maximizing card network win rates. | Integrates merchant transaction parsing and reason code mapping. | Justt operates as a black-box merchant advocate. ResolveGraph provides an explainable Bilateral Evidence Graph with bidirectional provenance visible to both parties. |
| **US Patent Application 2023/0342774** <br> *"Automated fraud and chargeback evidence compilation"* | Sift Science | Oct 26, 2023 | Machine learning scoring of user behavioural signals to compile evidence dossiers for fraud analysts. | Uses risk scoring and evidence item indexing. | Sift focuses on fraud prevention and identity risk. ResolveGraph focuses on contract fulfillment discrepancy ($D$) and bilateral policy remedies. |
| **US Patent 9,691,061**  <br> *"Collaborative dispute resolution platform"* | eBay Inc. | Jun 27, 2017 | Online buyer-seller negotiation forum with automated escalation to platform support representatives after timeout. | Provides buyer-seller structured dispute messaging and resolution escalation. | eBay's platform relies on unstructured manual human message exchanges. ResolveGraph introduces multimodal fact extraction, BERR contradiction scoring, and multi-agent copilot drafting. |
| **Google AP2 / Agentic Protocol** | Google / Industry Working Group | 2024–2025 | Cryptographic mandate tokens authorizing autonomous software agents to execute purchase captures within user-defined bounds. | Explores agentic financial governance and parameter constraints. | AP2 addresses forward transaction initiation. ResolveGraph addresses post-transaction dispute reconciliation when delivered goods diverge from digital specifications. |
| **LayoutLMv3 (ACM MM '22)** | Microsoft Research | 2022 | Unified multimodal pre-training for visual document AI combining text, 2D coordinates, and visual patch tokens. | Reuses bounding box normalization and multi-modal invoice tokenization. | LayoutLMv3 is a single-document entity extractor. ResolveGraph constructs cross-document bilateral relation edges and temporal event graphs across multiple sources. |

---

## 2. Freedom-to-Operate & Novelty Summary

1. **Prior-Art Boundaries**:
   - The field of *unilateral chargeback representment* (Chargeflow, Justt, Chargehound) is densely populated with patent filings focused on automating the transmission of merchant documents to Visa/Mastercard network endpoints.
   - The field of *consumer dispute forums* (eBay, Amazon Buyer Protection) represents mature commercial practice dating to the 2000s.

2. **ResolveGraph's Specific Whitespace**:
   - ResolveGraph carves out a distinct whitespace at the intersection of:
     a) **Cross-document Bilateral Evidence Graphs** connecting independent buyer photographs, merchant warehouse logs, and carrier GPS/timestamp metadata into a single reconciled graph.
     b) **BERR Mathematical Discrepancy Formulation** combining exact physical attributes, normalized semantic units, and temporal event orders.
     c) **Cryptographically Guarded Multi-Agent Governance (`argumentsHash`)** ensuring autonomous subagents prepare structured draft proposals while non-negotiably blocking autonomous monetary disbursement.
