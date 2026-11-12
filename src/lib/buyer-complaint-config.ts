import { Package, Wallet, RefreshCw } from "lucide-react";

export const SHOPPING_PLATFORMS = [
  "Amazon",
  "Flipkart",
  "OLX",
  "Meesho",
  "Myntra",
  "Other",
] as const;

export type ShoppingPlatform = (typeof SHOPPING_PLATFORMS)[number];

export const COMPLAINT_CATEGORIES = [
  {
    id: "wrong_product",
    label: "Wrong product received",
    description: "The product delivered is completely different from what was ordered.",
  },
  {
    id: "damaged_product",
    label: "Damaged product received",
    description: "The item arrived with physical cracks, dents, tears, or defects.",
  },
  {
    id: "missing_item",
    label: "Item missing from package",
    description: "The box arrived empty or essential items/parts were missing.",
  },
  {
    id: "specs_differ",
    label: "Product specifications differ",
    description: "The technical specs (storage, RAM, model, size) don't match the listing.",
  },
  {
    id: "payment_problem",
    label: "Payment problem",
    description: "Money was debited multiple times or payment failed but was deducted.",
  },
  {
    id: "refund_not_received",
    label: "Refund not received",
    description: "Return was accepted or cancelled, but refund has not arrived.",
  },
  {
    id: "other_issue",
    label: "Other issue",
    description: "Any other online shopping issue not listed above.",
  },
] as const;

export type ComplaintCategoryId = (typeof COMPLAINT_CATEGORIES)[number]["id"];

export const RESOLUTION_PREFERENCES = [
  {
    id: "REPLACEMENT",
    title: "Replacement",
    description: "I would like to receive the correct or a replacement product.",
    icon: Package,
  },
  {
    id: "FULL_REFUND",
    title: "Full refund",
    description: "I would like my purchase amount refunded.",
    icon: Wallet,
  },
  {
    id: "EITHER",
    title: "Either is acceptable",
    description: "I am comfortable with either a replacement or a refund.",
    icon: RefreshCw,
  },
] as const;

export interface EvidenceSlotConfig {
  id: string;
  tag: string;
  title: string;
  description: string;
  acceptedMimeTypes: string;
  acceptedLabel: string;
  kind: "photo" | "video" | "document";
  requirementLabel: "Recommended" | "Optional";
  multiple: boolean;
}

const PHOTO_MIMES = "image/jpeg,image/png,image/webp";
const VIDEO_MIMES = "video/mp4,video/webm";
const DOC_MIMES = "application/pdf,image/jpeg,image/png,image/webp";
const ALL_DOC_AND_MEDIA_MIMES = `${DOC_MIMES},${VIDEO_MIMES}`;

export const EVIDENCE_SLOTS_BY_CATEGORY: Record<ComplaintCategoryId, EvidenceSlotConfig[]> = {
  wrong_product: [
    {
      id: "product_photos",
      tag: "product photograph",
      title: "Product photographs",
      description: "Photos of the product received, including its visible model, packaging, and label.",
      acceptedMimeTypes: PHOTO_MIMES,
      acceptedLabel: "JPG, JPEG, PNG, WEBP (Max 10 MB)",
      kind: "photo",
      requirementLabel: "Recommended",
      multiple: true,
    },
    {
      id: "unboxing_video",
      tag: "unboxing video",
      title: "Unboxing video",
      description: "Upload the original unboxing video, when available.",
      acceptedMimeTypes: VIDEO_MIMES,
      acceptedLabel: "MP4, WEBM (Max 10 MB)",
      kind: "video",
      requirementLabel: "Optional",
      multiple: false,
    },
    {
      id: "invoice_doc",
      tag: "invoice / order confirmation",
      title: "Invoice / Order confirmation",
      description: "Upload proof of what you originally purchased.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Recommended",
      multiple: true,
    },
  ],
  damaged_product: [
    {
      id: "damage_photos",
      tag: "damage photograph",
      title: "Damage photographs",
      description: "Clear photos showing visible physical damage to the product and outer packaging.",
      acceptedMimeTypes: PHOTO_MIMES,
      acceptedLabel: "JPG, JPEG, PNG, WEBP (Max 10 MB)",
      kind: "photo",
      requirementLabel: "Recommended",
      multiple: true,
    },
    {
      id: "unboxing_video",
      tag: "unboxing video",
      title: "Unboxing video",
      description: "Upload the original unboxing video showing seal condition, when available.",
      acceptedMimeTypes: VIDEO_MIMES,
      acceptedLabel: "MP4, WEBM (Max 10 MB)",
      kind: "video",
      requirementLabel: "Optional",
      multiple: false,
    },
    {
      id: "invoice_doc",
      tag: "invoice / order confirmation",
      title: "Invoice / Order confirmation",
      description: "Upload your original invoice or order confirmation.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Recommended",
      multiple: true,
    },
  ],
  missing_item: [
    {
      id: "package_photos",
      tag: "package contents photograph",
      title: "Photographs of received package & contents",
      description: "Photos of the box, inner contents, and shipping weight label on the parcel.",
      acceptedMimeTypes: PHOTO_MIMES,
      acceptedLabel: "JPG, JPEG, PNG, WEBP (Max 10 MB)",
      kind: "photo",
      requirementLabel: "Recommended",
      multiple: true,
    },
    {
      id: "unboxing_video",
      tag: "unboxing video",
      title: "Unboxing video",
      description: "Upload the original unboxing video, when available.",
      acceptedMimeTypes: VIDEO_MIMES,
      acceptedLabel: "MP4, WEBM (Max 10 MB)",
      kind: "video",
      requirementLabel: "Optional",
      multiple: false,
    },
    {
      id: "invoice_doc",
      tag: "invoice / order confirmation",
      title: "Invoice / Order confirmation",
      description: "Upload proof showing all items included in your original order.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Recommended",
      multiple: true,
    },
  ],
  specs_differ: [
    {
      id: "spec_photos",
      tag: "specifications photograph",
      title: "Photographs showing model / specifications",
      description: "Photos or screenshots showing model number, capacity, or specifications received.",
      acceptedMimeTypes: PHOTO_MIMES,
      acceptedLabel: "JPG, JPEG, PNG, WEBP (Max 10 MB)",
      kind: "photo",
      requirementLabel: "Recommended",
      multiple: true,
    },
    {
      id: "unboxing_video",
      tag: "unboxing video",
      title: "Unboxing video",
      description: "Upload the original unboxing video, when available.",
      acceptedMimeTypes: VIDEO_MIMES,
      acceptedLabel: "MP4, WEBM (Max 10 MB)",
      kind: "video",
      requirementLabel: "Optional",
      multiple: false,
    },
    {
      id: "invoice_doc",
      tag: "invoice / order confirmation",
      title: "Invoice / Order confirmation",
      description: "Upload proof of the advertised specifications you originally purchased.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Recommended",
      multiple: true,
    },
  ],
  payment_problem: [
    {
      id: "payment_receipt",
      tag: "payment receipt",
      title: "Payment confirmation screenshot or receipt",
      description: "Upload the UPI, card, or wallet transaction screenshot showing transaction ID / UTR.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Recommended",
      multiple: true,
    },
    {
      id: "bank_evidence",
      tag: "bank transaction evidence",
      title: "Relevant bank transaction evidence",
      description: "Bank statement excerpt or SMS debit alert showing deducted amount, when available.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Optional",
      multiple: true,
    },
    {
      id: "order_confirmation",
      tag: "order confirmation",
      title: "Order confirmation",
      description: "Upload the order summary or pending order screen from the shopping platform.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Optional",
      multiple: true,
    },
  ],
  refund_not_received: [
    {
      id: "order_confirmation",
      tag: "order confirmation",
      title: "Original order confirmation",
      description: "Upload your original order confirmation or purchase invoice.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Recommended",
      multiple: true,
    },
    {
      id: "refund_confirmation",
      tag: "refund confirmation",
      title: "Refund initiation or refund confirmation",
      description: "Cancellation/return approval or refund reference notice from the marketplace, if available.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Optional",
      multiple: true,
    },
    {
      id: "payment_evidence",
      tag: "payment transaction evidence",
      title: "Relevant payment transaction evidence",
      description: "Bank statement or payment app screen showing the refund has not been credited.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG (Max 10 MB)",
      kind: "document",
      requirementLabel: "Optional",
      multiple: true,
    },
  ],
  other_issue: [
    {
      id: "general_documents",
      tag: "supporting document",
      title: "Supporting documents or receipts",
      description: "Upload order confirmations, invoices, screenshots, or seller chat records.",
      acceptedMimeTypes: DOC_MIMES,
      acceptedLabel: "PDF, JPG, JPEG, PNG, WEBP (Max 10 MB)",
      kind: "document",
      requirementLabel: "Optional",
      multiple: true,
    },
    {
      id: "general_media",
      tag: "supporting media",
      title: "Relevant photos or short video",
      description: "Upload photos or video showing the issue described in your complaint, when applicable.",
      acceptedMimeTypes: ALL_DOC_AND_MEDIA_MIMES,
      acceptedLabel: "JPG, PNG, WEBP, MP4, WEBM (Max 10 MB)",
      kind: "photo",
      requirementLabel: "Optional",
      multiple: true,
    },
  ],
};

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // Matches server/storage/storage-types.ts

export function validateClientEvidenceFile(file: File, acceptedMimeTypes: string): string | null {
  if (file.size === 0) {
    return `"${file.name}" is empty (0 bytes).`;
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 10 MB file size limit.`;
  }
  const lowerExt = file.name.split(".").pop()?.toLowerCase() || "";
  if (["html", "htm", "svg", "js", "exe", "bat", "cmd", "sh", "zip", "rar"].includes(lowerExt)) {
    return `File type ".${lowerExt}" is not permitted for security reasons.`;
  }
  const allowedList = acceptedMimeTypes.split(",").map((s) => s.trim());
  const normalizedType = file.type.toLowerCase();
  const isImageExt = ["jpg", "jpeg", "png", "webp"].includes(lowerExt);
  const isPdfExt = lowerExt === "pdf";
  const isVideoExt = ["mp4", "webm"].includes(lowerExt);

  const mimeAllowed =
    (normalizedType && allowedList.includes(normalizedType)) ||
    (normalizedType === "image/jpg" && allowedList.includes("image/jpeg")) ||
    (isImageExt && allowedList.some((m) => m.startsWith("image/"))) ||
    (isPdfExt && allowedList.includes("application/pdf")) ||
    (isVideoExt && allowedList.some((m) => m.startsWith("video/")));

  if (!mimeAllowed) {
    return `"${file.name}" format is not supported for this upload section.`;
  }
  return null;
}
