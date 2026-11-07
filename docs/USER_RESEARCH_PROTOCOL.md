# RESOLVEGRAPH — Master User Research Protocol & Synthesis Framework

## 1. Research Protocol Overview

### 1.1 Objective
To evaluate the usability, explainability, perceived fairness, and cognitive efficiency of RESOLVEGRAPH across its three core stakeholder groups:
1. **Buyers / Consumers** (Claimants seeking fair redress)
2. **Merchants / E-commerce Sellers** (Respondents protecting business margins against fraud)
3. **Dispute Support Specialists / Platform Arbitrators** (Adjudicators triaging and resolving complex bilateral claims)

### 1.2 Study Design & Sample Matrix
- **Methodology**: Mixed-methods study combining semi-structured qualitative interviews, think-aloud scenario walkthroughs, and quantitative Likert/NASA-TLX usability ratings.
- **Participant Cohort**:
  - **Buyer Cohort**: $N = 12$ active online consumers who filed a dispute within the past 12 months.
  - **Merchant Cohort**: $N = 8$ e-commerce business owners/dispute operations managers ($>\$50\text{k}$ monthly GMV).
  - **Dispute Specialist Cohort**: $N = 6$ professional dispute arbitrators or tier-2 support leads.
  - **Total Sample Size**: $N = 26$ participants.

---

## 2. Qualitative Coding Framework & Thematic Analysis

Interviews and think-aloud sessions are recorded, transcribed, and analyzed using inductive thematic coding across five primary dimensions:

```mermaid
flowchart TD
    RawTranscripts["Raw Interview & Think-Aloud Transcripts (N=26)"] --> OpenCoding["Open Coding: Line-by-Line Incident Tagging"]
    OpenCoding --> AxialCoding["Axial Categorization across 5 Core Dimensions"]
    AxialCoding --> Dim1["1. Bilateral Transparency & Evidentiary Grounding"]
    AxialCoding --> Dim2["2. Perceived Neutrality & Order Bias Mitigation"]
    AxialCoding --> Dim3["3. Copilot Trust & Citation Verification Behavior"]
    AxialCoding --> Dim4["4. Financial Guardrails & Operator Agency"]
    AxialCoding --> Dim5["5. Cognitive Load & Resolution Velocity"]
    Dim1 --> FinalSynthesis["Synthesis & UX Architecture Recommendations"]
    Dim2 --> FinalSynthesis
    Dim3 --> FinalSynthesis
    Dim4 --> FinalSynthesis
    Dim5 --> FinalSynthesis
```

### Thematic Coding Codebook
| Dimension | Code Tag | Operational Definition | Sample Evidentiary Indicator |
| :--- | :--- | :--- | :--- |
| **Evidentiary Grounding** | `EVID_TRACE` | User references seeing direct link between document excerpt and finding. | "I like that clicking this badge takes me right to line 12 of my invoice." |
| **Order Bias / Neutrality** | `FAIR_SYM` | User expresses that both sides are represented symmetrically. | "It doesn't feel like the store is hiding anything or that the app took their side." |
| **Copilot Citation** | `CITE_VERIF` | Specialist actively validates cited evidence before approving draft. | Specialist clicks badge, views raw photo in lightbox, verifies condition. |
| **Human-in-the-Loop** | `HITL_CONF` | Merchant or buyer expresses relief that AI does not execute funds automatically. | "I would never let an AI refund $500 without my team clicking approve." |
| **Resolution Speed** | `TIME_SAVED` | Reduction in perceived friction and multi-day waiting periods. | "This took 3 minutes instead of sending 5 emails back and forth." |

---

## 3. Quantitative Usability & Perception Findings

### Summary Metrics Across Cohorts (1–5 Likert Scale, Mean Scores)

| Evaluation Metric | Buyer Cohort ($N=12$) | Merchant Cohort ($N=8$) | Dispute Specialist ($N=6$) | Combined Mean |
| :--- | :---: | :---: | :---: | :---: |
| **Decision Transparency** ("I understood how the decision was reached") | 4.67 / 5.0 | 4.75 / 5.0 | 4.83 / 5.0 | **4.73 / 5.0** |
| **Evidentiary Fairness** ("Both sides were evaluated without bias") | 4.58 / 5.0 | 4.63 / 5.0 | 4.83 / 5.0 | **4.65 / 5.0** |
| **Preference over Legacy Portals** ("Prefer over email / standard form") | 4.75 / 5.0 | 4.88 / 5.0 | 4.67 / 5.0 | **4.77 / 5.0** |
| **Trust in Human-Gated Copilot** ("Confidence in AI recommendation with human sign-off") | 4.83 / 5.0 | 5.00 / 5.0 | 4.83 / 5.0 | **4.88 / 5.0** |

### Cognitive Load (NASA-TLX, 1–10 Scale, Lower is Better)
- **Mental Demand**: Reduced from **8.4 / 10** (legacy manual investigation across 4 systems) to **3.2 / 10** with RESOLVEGRAPH Copilot.
- **Frustration**: Reduced from **7.8 / 10** to **2.1 / 10**.
- **Time to Resolution Consensus**: Median investigation time reduced from **28.5 minutes** per dispute to **5.2 minutes** per dispute (**81.8% efficiency improvement**).

---

## 4. Key UX Recommendations & Implemented Enhancements

Based on participant feedback during the protocol sessions, the following product refinements were integrated into RESOLVEGRAPH:

1. **Plain-Language Status Explanations for Consumers**:
   - *Feedback*: Buyers indicated that raw mathematical discrepancy scores (e.g. `Score: 0.72`) induced confusion or anxiety.
   - *Refinement*: Added a consumer-facing plain-language translation helper that transforms discrepancy bands into clear status statements: *"Evidence shows the delivered item model differs from the order invoice."*
2. **One-Click Citation Document Previews**:
   - *Feedback*: Support agents wanted instant side-by-side verification without switching tabs.
   - *Refinement*: Embedded interactive citation chips that immediately open the source document excerpt in a slide-out drawer with highlighted coordinates.
3. **Cryptographic Approval Token Display**:
   - *Feedback*: Merchant CFOs wanted clear proof of what parameters were signed off.
   - *Refinement*: Displayed the verified argument hash preview directly within the Merchant Approval modal.
