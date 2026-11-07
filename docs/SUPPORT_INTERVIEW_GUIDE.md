# RESOLVEGRAPH User Research — Support & Dispute Specialist Interview Guide

## Study Title
Investigating Cognitive Load, Verification Thoroughness, and Copilot Collaboration in Commerce Dispute Triage.

## Participant Profile
- **Target Audience**: Dispute specialists, tier-2 customer support agents, trust & safety reviewers, or marketplace arbitrators who actively review complex multi-party claims.
- **Session Duration**: 45 minutes.
- **Format**: Think-aloud scenario evaluation + semi-structured interview.

---

## 1. Introduction & Objectives (5 minutes)
- Welcoming remarks and research framing.
- Goal: "We are studying how dispute specialists synthesize contradictory evidence from multiple parties and whether multi-agent AI copilots reduce cognitive burden without introducing blind trust."
- Consent to record audio and screen interactions.

---

## 2. Current Adjudication Workflow & Challenges (10 minutes)
1. **Case Volume**: "On an average shift, how many escalated dispute tickets do you review?"
2. **Context Switching**: "How many browser tabs or software tools do you typically keep open when investigating a single dispute (e.g., Zendesk, Stripe/PayPal, shipping carrier portal, warehouse ERP)?"
3. **Evidence Verification**: "How do you verify whether a buyer photo is authentic or taken from the internet? How do you cross-reference tracking scans against buyer claims?"
4. **Policy Ambiguity**: "What do you do when the merchant's written return policy conflicts with promotional banners or standard consumer protection regulations?"
5. **Fatigue & Error**: "Where do human reviewers make mistakes when handling high-volume dispute queues?"

---

## 3. Think-Aloud Evaluation: RESOLVEGRAPH Copilot Workflow (20 minutes)
*Provide participant with access to an escalated dispute scenario involving contradictory communication and partial transit damage.*

### Task A: Reviewing Triage Findings & Temporal Anomalies
- *Prompt*: "Think aloud as you review this incoming dispute ticket. What do you look at first?"
- *Observations to note*:
  - Does the specialist read the AI triage summary first, or jump straight to raw evidence?
  - How do they react to the flagged temporal anomaly (e.g., 'Complaint asserted 42 days post-delivery, exceeding 30-day window')?

### Task B: Interacting with the AI Copilot Chat
- *Prompt*: "Ask the Copilot: 'Did the merchant ever promise a replacement in writing?'"
- *Observations to note*:
  - Does the specialist inspect the cited source badge (`[Source: customer_chat.pdf, Line 34]`)?
  - Does the specialist verify that the citation is grounded before accepting the answer?

### Task C: Reviewing and Editing the Drafted Communication
- *Prompt*: "The CommunicationDrafter agent has generated a formal bilateral resolution proposal. Review, adjust, and approve."
- *Questions*:
  - "Is the drafted tone balanced and neutral, or does it sound biased towards one party?"
  - "Did the QualityReview gate give you confidence that no facts were hallucinated?"
  - "How much time did having the draft pre-populated save compared to writing from scratch?"

---

## 4. Debrief & Cognitive Load Assessment (10 minutes)
Administer NASA-TLX (Task Load Index) simplified questionnaire:
1. **Mental Demand**: How mentally demanding was investigating this dispute with RESOLVEGRAPH? (1 = Very Low, 10 = Very High)
2. **Effort**: How hard did you have to work to accomplish your level of performance? (1 = Low, 10 = High)
3. **Frustration**: How insecure, discouraged, irritated, or stressed did you feel? (1 = Low, 10 = High)
4. **Perceived Accuracy**: How confident are you that the decision reached was 100% correct? (1 = Not Confident, 10 = Completely Confident)

**Closing Question**:
- "If this Copilot was deployed in your daily queue, what would you most worry about, and what would you most look forward to?"
