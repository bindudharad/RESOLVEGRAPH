export const SELLER_CORE_MESSAGE =
  "Your business deserves to be heard. RESOLVEGRAPH helps buyers and sellers resolve purchase-related disputes through transparent communication, relevant evidence and a structured investigation process.";

export interface WelcomeGuideStepContent {
  stepNumber: 1 | 2 | 3 | 4;
  tabLabel: string;
  heading: string;
  subheading: string;
  paragraphs: string[];
  bullets?: string[];
  closingNote?: string;
}

export const SELLER_WELCOME_STEPS: WelcomeGuideStepContent[] = [
  {
    stepNumber: 1,
    tabLabel: "Welcome",
    heading: "Welcome to RESOLVEGRAPH.",
    subheading: "A better way to resolve purchase-related disputes.",
    paragraphs: [
      "Welcome to RESOLVEGRAPH, a platform designed to make purchase-related dispute resolution more transparent and structured.",
      "When a customer raises a complaint about an order associated with your business, you receive an opportunity to review the concern, explain your position and provide relevant supporting evidence.",
      "Our goal is to help both sides participate in a structured process and work towards an appropriate resolution.",
    ],
  },
  {
    stepNumber: 2,
    tabLabel: "Your Side",
    heading: "Your Side Matters.",
    subheading: "Every relevant explanation and piece of evidence contributes to the investigation.",
    paragraphs: [
      "When an evidence request reaches your organization, carefully review the complaint information.",
      "You can:",
    ],
    bullets: [
      "Explain whether you agree or disagree with the customer's concern.",
      "Provide relevant product and order information.",
      "Submit packing and dispatch records where applicable.",
      "Upload supporting photographs and documents.",
      "Explain when requested information is unavailable or not applicable.",
    ],
    closingNote: "Your response becomes part of the investigation record.",
  },
  {
    stepNumber: 3,
    tabLabel: "Investigation",
    heading: "Evidence First. Fair Consideration.",
    subheading: "Both buyer and seller information are considered.",
    paragraphs: [
      "RESOLVEGRAPH connects relevant information provided by both parties.",
      "The investigation examines:",
    ],
    bullets: [
      "Information supported by both sides.",
      "Facts meeting the applicable verification requirements.",
      "Conflicting claims or supporting evidence.",
      "Information that is still needed.",
    ],
    closingNote:
      "Depending on the available evidence, additional information or human review may be required. A complaint alone does not establish responsibility.",
  },
  {
    stepNumber: 4,
    tabLabel: "Decisions",
    heading: "Stay Informed at Every Step.",
    subheading: "Follow your requests and responses through your Seller Workspace.",
    paragraphs: [
      "After the investigation, available findings are evaluated against the applicable resolution policies.",
      "Depending on the circumstances, the case may proceed towards:",
    ],
    bullets: [
      "Product replacement.",
      "Refund.",
      "Additional investigation.",
      "Human review.",
    ],
    closingNote:
      "A recommendation does not automatically authorize a refund or replacement. Required approval and execution steps must be completed. You can follow your evidence requests, submitted responses and relevant investigation updates through your Seller Workspace.",
  },
];

export interface SellerCommitmentItem {
  id: string;
  title: string;
  description: string;
}

export const SELLER_COMMITMENTS: SellerCommitmentItem[] = [
  {
    id: "fair-consideration",
    title: "Fair Consideration",
    description:
      "Both buyer complaints and seller explanations or records are included in the investigation record before an assessment is formed. A complaint on its own does not establish responsibility.",
  },
  {
    id: "evidence-based-evaluation",
    title: "Evidence-Based Evaluation",
    description:
      "Submitted files undergo documented usability, extraction, relevance, and consistency checks, separating supported facts, verified records, conflicting evidence, and missing information.",
  },
  {
    id: "transparent-progress",
    title: "Transparent Progress",
    description:
      "You can follow your requests and submissions using clear workspace statuses — from New Request and In Progress to Under Verification, Verified for Investigation, Additional Information Required, and Human Review Required.",
  },
  {
    id: "responsible-handling",
    title: "Responsible Information Handling",
    description:
      "Sensitive buyer contact details are redacted in seller views, uploaded evidence is scoped by workspace access controls, and ambiguous or flagged cases require human investigator review and required approval steps before any remedy executes.",
  },
];

export interface SellerGuidelineItem {
  number: number;
  title: string;
  description: string;
}

export const SELLER_GUIDELINES: SellerGuidelineItem[] = [
  {
    number: 1,
    title: "Respond Honestly and Constructively",
    description:
      "Review the customer's concern carefully and share clear, factual context. Choose Agree, Disagree, or Clarification Only based on your actual order and fulfillment records.",
  },
  {
    number: 2,
    title: "Provide Relevant Evidence",
    description:
      "Upload clear documents, packing records, dispatch details, or product photographs that relate directly to the complaint category and order reference.",
  },
  {
    number: 3,
    title: "Do Not Guess or Fabricate Information",
    description:
      "Never create or alter documents, tracking references, or timestamps. If a requested document or photo does not exist or does not apply to the order, select Not Available or Not Applicable and briefly explain why.",
  },
  {
    number: 4,
    title: "Respect Customer Privacy",
    description:
      "Buyer email addresses, phone numbers, and postal codes are masked in seller views to protect privacy. Do not request personal credentials or contact buyers outside authorized channels.",
  },
  {
    number: 5,
    title: "Follow Statuses and Respond to Follow-Ups Promptly",
    description:
      "Check New Requests, In Progress, and Additional Information Required regularly so investigation teams have complete context within the requested timeframe.",
  },
  {
    number: 6,
    title: "Understand Automated Verification and Human Review",
    description:
      "Uploaded files pass through automated usability, text extraction, relevance, and consistency checks. Submissions flagged with ambiguities or inconclusive checks are routed for human review rather than dismissed silently.",
  },
  {
    number: 7,
    title: "Understand How Resolution Decisions Are Made",
    description:
      "Investigations connect bilateral facts and apply resolution policies to identify possible paths such as replacement, refund, additional investigation, or human review. A recommendation never executes a refund or replacement automatically—required approvals and execution steps must be completed.",
  },
  {
    number: 8,
    title: "Maintain Accurate Business Profile Details",
    description:
      "Keep your registered legal name, GSTIN/tax identifiers, contact details, and marketplace store links up to date in Business Profile so incoming requests route cleanly to your team.",
  },
];

export interface ResponseStatusExplanation {
  label:
    | "Under Verification"
    | "Verified for Investigation"
    | "Additional Information Required"
    | "Human Review Required";
  meaning: string;
}

export const SELLER_RESPONSE_STATUS_EXPLANATIONS: ResponseStatusExplanation[] = [
  {
    label: "Under Verification",
    meaning:
      "Automated usability, document extraction, relevance, and consistency checks or initial investigator review are currently running on your submission.",
  },
  {
    label: "Verified for Investigation",
    meaning:
      "Your explanation and attached records passed verification checks and have been linked into the active bilateral investigation record.",
  },
  {
    label: "Additional Information Required",
    meaning:
      "An investigator requested missing or clarifying details on this request. Your previous response remains intact while you submit a follow-up entry.",
  },
  {
    label: "Human Review Required",
    meaning:
      "Verification checks noted an ambiguity, mismatch, or inconclusive file signal that requires a human investigator to inspect manually.",
  },
];

export function getAcceptableEvidenceGuidanceForCategory(
  category: string | null | undefined
): string[] {
  const norm = (category || "").toLowerCase();
  if (norm.includes("wrong")) {
    return [
      "Picked SKU / EAN / catalog variant details for the item dispatched",
      "Outbound packing slip or pre-seal parcel photograph if captured",
      "Dispatch or carrier weight / invoice confirmation where available",
    ];
  }
  if (norm.includes("damaged") || norm.includes("defective")) {
    return [
      "Pre-dispatch product condition or quality check (QC) notes/photos",
      "Outer packaging photo before carrier handoff, if available",
      "Courier handoff or Fragile-handling manifest / packing details",
    ];
  }
  if (norm.includes("missing") || norm.includes("non_delivery") || norm.includes("not_received")) {
    return [
      "Carrier name, tracking / AWB number, and dispatch confirmation date",
      "Packaged weight / item count sheet or multi-parcel manifest",
      "Courier delivery receipt or status update if available",
    ];
  }
  if (norm.includes("spec") || norm.includes("described")) {
    return [
      "Catalog specification, model/version, or batch identifier fulfilled",
      "Invoice or listing specification screenshot matching what was shipped",
      "Clarification notes explaining packaging updates or compatible revisions",
    ];
  }
  if (norm.includes("refund") || norm.includes("payment") || norm.includes("billing")) {
    return [
      "Credit note, refund initiation reference, or settlement timeline",
      "Return receipt confirmation or RMA inspection date",
      "Order invoice / payment capture reconciliation notes",
    ];
  }
  return [
    "Order invoice, SKU/model summary, or fulfillment notes matching the order ID",
    "Packing or dispatch confirmation records when shipped physically",
    "Clear photographs or PDFs related directly to the customer's question",
  ];
}
