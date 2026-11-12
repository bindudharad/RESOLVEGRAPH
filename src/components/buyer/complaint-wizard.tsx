/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback, useEffect, useRef, type DragEvent } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  SHOPPING_PLATFORMS,
  COMPLAINT_CATEGORIES,
  RESOLUTION_PREFERENCES,
  EVIDENCE_SLOTS_BY_CATEGORY,
  validateClientEvidenceFile,
  type ComplaintCategoryId,
  type EvidenceSlotConfig,
} from "@/lib/buyer-complaint-config";

interface UploadedFileItem {
  id: string;
  file: File;
  previewUrl?: string;
  slotId: string;
  tag: string;
}

interface SubmittedCaseResult {
  id: string;
  dbId: string;
  title: string;
  platform: string;
  productName: string;
  orderId: string;
  category: string;
  amount: number;
  currency: string;
  requestedRemedy: string;
  status: string;
  evidenceCount?: number;
  createdAt: string;
}

export function BuyerComplaintWizard() {
  // Wizard Step: 1 = Order, 2 = Problem, 3 = Resolution, 4 = Evidence, 5 = Review, 6 = Success
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const fileSeqRef = useRef<number>(0);

  useEffect(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, []);

  // Step 1 State
  const [platform, setPlatform] = useState<string>("Amazon");
  const [customPlatform, setCustomPlatform] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("INR");
  const [purchaseDate, setPurchaseDate] = useState<string>("");

  // Step 2 State
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategoryId>("wrong_product");
  const [description, setDescription] = useState<string>("");
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState<boolean>(false);
  const [titleSuggestedNote, setTitleSuggestedNote] = useState<string>("");

  // Step 3 State
  const [requestedRemedy, setRequestedRemedy] = useState<string>("EITHER");

  // Step 4 State: Uploaded files & dropzone highlight
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [dragActiveSlot, setDragActiveSlot] = useState<string | null>(null);
  const [uploadValidationError, setUploadValidationError] = useState<string>("");

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitError, setSubmitError] = useState<string>("");
  const [submittedCase, setSubmittedCase] = useState<SubmittedCaseResult | null>(null);

  const effectivePlatform =
    platform === "Other" ? customPlatform.trim() || "Other Marketplace" : platform;
  const effectiveCategoryLabel =
    COMPLAINT_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "Other issue";

  const activeEvidenceSlots: EvidenceSlotConfig[] =
    EVIDENCE_SLOTS_BY_CATEGORY[selectedCategory] || EVIDENCE_SLOTS_BY_CATEGORY.other_issue;

  // Auto-generate title when description changes in "Other issue"
  const handleGenerateTitle = useCallback(
    async (textToAnalyze?: string) => {
      const text = (textToAnalyze ?? description).trim();
      if (text.length < 5) return;

      setIsGeneratingTitle(true);
      setTitleSuggestedNote("");

      try {
        const res = await fetch("/api/complaints/suggest-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: text }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.title) {
            setGeneratedTitle(data.title);
            if (data.isExistingCategory && data.matchedCategory) {
              setTitleSuggestedNote(
                `Matched standard category: "${data.matchedCategory}". You can review or edit this title below.`
              );
            } else {
              setTitleSuggestedNote(
                "Suggested a concise complaint title from your description. You can edit it below."
              );
            }
          }
        }
      } catch (err) {
        console.warn("Failed to suggest title:", err);
      } finally {
        setIsGeneratingTitle(false);
      }
    },
    [description]
  );

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (platform === "Other" && !customPlatform.trim()) {
      newErrors.customPlatform = "Please enter the shopping platform name.";
    }
    if (!orderId.trim()) {
      newErrors.orderId = "Please enter your order ID.";
    }
    if (!productName.trim()) {
      newErrors.productName = "Please enter the product name.";
    }
    const parsedAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = "Please enter a valid purchase amount greater than zero.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedCategory) {
      newErrors.category = "Please select what best describes your problem.";
    }
    if (selectedCategory === "other_issue") {
      if (!description.trim() || description.trim().length < 5) {
        newErrors.description =
          "Please explain what happened with your purchase (at least 5 characters).";
      }
      if (!generatedTitle.trim()) {
        newErrors.generatedTitle = "Please provide or confirm a short title for your complaint.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 4 File Handling with validation & drag-and-drop
  const handleAddFilesToSlot = (fileList: FileList | null, slot: EvidenceSlotConfig) => {
    if (!fileList || fileList.length === 0) return;
    setUploadValidationError("");

    const validItems: UploadedFileItem[] = [];
    const errorMessages: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const errMsg = validateClientEvidenceFile(file, slot.acceptedMimeTypes);
      if (errMsg) {
        errorMessages.push(errMsg);
        continue;
      }

      fileSeqRef.current += 1;
      const id = `evfile-${slot.id}-${fileSeqRef.current}`;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      validItems.push({
        id,
        file,
        previewUrl,
        slotId: slot.id,
        tag: slot.tag,
      });
    }

    if (errorMessages.length > 0) {
      setUploadValidationError(errorMessages.join(" "));
    }

    if (validItems.length > 0) {
      setFiles((prev) => {
        if (!slot.multiple) {
          // Replace existing item in single-file slot (e.g. unboxing video)
          const removed = prev.filter((f) => f.slotId === slot.id);
          removed.forEach((f) => {
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
          });
          return [...prev.filter((f) => f.slotId !== slot.id), validItems[0]];
        }
        return [...prev, ...validItems];
      });
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleDropOnSlot = (e: DragEvent<HTMLDivElement>, slot: EvidenceSlotConfig) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveSlot(null);
    handleAddFilesToSlot(e.dataTransfer.files, slot);
  };

  // Navigation handlers
  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      if (selectedCategory !== "other_issue") {
        setGeneratedTitle(effectiveCategoryLabel);
      }
      setCurrentStep(3);
    }
  };

  const handleNextFromStep3 = () => {
    setCurrentStep(4);
  };

  const handleNextFromStep4 = () => {
    setCurrentStep(5); // Review screen
  };

  // Final Submit Handler with XHR for real upload progress
  const handleSubmitComplaint = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setUploadProgress(5);
    setSubmitError("");

    const formData = new FormData();
    formData.append("platform", effectivePlatform);
    formData.append("orderId", orderId.trim());
    formData.append("productName", productName.trim());
    formData.append("amount", amount.trim());
    formData.append("currency", currency);
    formData.append("category", effectiveCategoryLabel);
    formData.append("title", generatedTitle.trim() || effectiveCategoryLabel);
    formData.append(
      "description",
      description.trim() ||
        `Customer reported issue "${effectiveCategoryLabel}" for ${productName.trim()} purchased on ${effectivePlatform} (Order ${orderId.trim()}).`
    );
    formData.append("requestedRemedy", requestedRemedy);
    if (purchaseDate.trim()) {
      formData.append("purchaseDate", purchaseDate.trim());
    }
    formData.append("idempotencyKey", idempotencyKey);

    files.forEach((f) => {
      formData.append("evidence_files", f.file);
      formData.append("evidence_tags", f.tag);
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/complaints/submit", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(92, Math.round((event.loaded / event.total) * 90) + 5);
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          setUploadProgress(100);
          setSubmittedCase(data.case);
          setCurrentStep(6);
          // Prepare fresh idempotency key in case buyer submits another complaint later
          if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            setIdempotencyKey(crypto.randomUUID());
          }
        } else {
          setSubmitError(
            data.error || "Failed to submit complaint. Please review your details and try again."
          );
        }
      } catch {
        setSubmitError("Unexpected response received from server. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    };

    xhr.onerror = () => {
      setSubmitError("Network error occurred while submitting your complaint. Your form inputs have been preserved.");
      setIsSubmitting(false);
      setUploadProgress(0);
    };

    xhr.send(formData);
  };

  const steps = [
    { number: 1, label: "Order information", shortLabel: "Order" },
    { number: 2, label: "What is your problem?", shortLabel: "Problem" },
    { number: 3, label: "What resolution do you prefer?", shortLabel: "Resolution" },
    { number: 4, label: "Supporting evidence", shortLabel: "Evidence" },
  ];

  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";

  const selectedRemedyLabel =
    RESOLUTION_PREFERENCES.find((p) => p.id === requestedRemedy)?.title || "Either is acceptable";

  const completedSegments = Math.min(Math.max(currentStep - 1, 0), 3);

  return (
    <div className="w-full max-w-4xl mx-auto antialiased">
      {/* ======================================================== */}
      {/* 4-STEP HORIZONTAL PROGRESS INDICATOR                     */}
      {/* ======================================================== */}
      {currentStep <= 5 && (
        <nav
          aria-label="Complaint Submission Progress"
          className="mb-4 rounded-2xl border border-slate-200 bg-white px-3 py-4 sm:px-6 sm:py-5 shadow-sm"
        >
          <div className="relative grid grid-cols-4 items-start">
            {/* Continuous connecting line passing through the exact vertical center of circles */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-4 sm:top-[18px] h-[2.5px] bg-slate-200 rounded-full"
            >
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(completedSegments / 3) * 100}%` }}
              />
            </div>

            {steps.map((s) => {
              const isCurrent = currentStep === s.number;
              const isCompleted = currentStep > s.number;

              return (
                <div
                  key={s.number}
                  className="relative z-10 flex flex-col items-center px-1 text-center"
                >
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full font-semibold text-xs sm:text-sm transition-all duration-200 ${
                      isCurrent
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm font-bold"
                        : isCompleted
                        ? "bg-blue-600 text-white"
                        : "border-2 border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2.5]" />
                    ) : (
                      <span>{s.number}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-[11px] sm:text-xs font-medium leading-snug ${
                      isCurrent
                        ? "text-blue-700 font-semibold"
                        : isCompleted
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    <span className="sm:hidden">{s.shortLabel}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </nav>
      )}

      {/* ======================================================== */}
      {/* STEP 1: ORDER INFORMATION                                */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3.5 mb-4">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Tell us about your purchase
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Provide the details of the online purchase you are experiencing a problem with.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shopping Platform */}
              <div>
                <label htmlFor="platform-select" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1">
                  Shopping platform <span className="text-red-500">*</span>
                </label>
                <select
                  id="platform-select"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="h-10.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-colors"
                >
                  {SHOPPING_PLATFORMS.map((plat) => (
                    <option key={plat} value={plat}>
                      {plat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order ID */}
              <div>
                <label htmlFor="order-id-input" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1">
                  Order ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="order-id-input"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter your order ID"
                  className={`h-10.5 w-full rounded-xl border px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-3 transition-colors ${
                    errors.orderId
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
                      : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100"
                  }`}
                />
                {errors.orderId && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {errors.orderId}
                  </p>
                )}
              </div>
            </div>

            {/* Other Platform Custom Input */}
            {platform === "Other" && (
              <div>
                <label htmlFor="custom-platform-input" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1">
                  Enter shopping platform name <span className="text-red-500">*</span>
                </label>
                <input
                  id="custom-platform-input"
                  type="text"
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="Enter shopping platform name"
                  className={`h-10.5 w-full rounded-xl border px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-3 transition-colors ${
                    errors.customPlatform
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
                      : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100"
                  }`}
                />
                {errors.customPlatform && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {errors.customPlatform}
                  </p>
                )}
              </div>
            )}

            {/* Product Name */}
            <div>
              <label htmlFor="product-name-input" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1">
                Product name <span className="text-red-500">*</span>
              </label>
              <input
                id="product-name-input"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter the name of the purchased product"
                className={`h-10.5 w-full rounded-xl border px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-3 transition-colors ${
                  errors.productName
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
                    : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100"
                }`}
              />
              {errors.productName && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {errors.productName}
                </p>
              )}
            </div>

            {/* Purchase Amount, Currency & Optional Purchase Date */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-5">
                <label htmlFor="purchase-amount-input" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1">
                  Purchase amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                    {currencySymbol}
                  </span>
                  <input
                    id="purchase-amount-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter purchase amount"
                    className={`h-10.5 w-full rounded-xl border pl-8 pr-3.5 text-sm text-slate-900 focus:outline-none focus:ring-3 transition-colors ${
                      errors.amount
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
                        : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100"
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {errors.amount}
                  </p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="currency-select" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1">
                  Currency
                </label>
                <select
                  id="currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10.5 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-colors"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="purchase-date-input" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1">
                  Purchase date <span className="font-normal text-slate-500">(Optional)</span>
                </label>
                <input
                  id="purchase-date-input"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="h-10.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              id="wizard-next-step-1"
              type="button"
              onClick={handleNextFromStep1}
              className="inline-flex h-10 sm:h-11 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 text-xs sm:text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-200 cursor-pointer whitespace-nowrap"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: WHAT IS YOUR PROBLEM?                            */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              What is your problem?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Select the issue that best describes your experience.
            </p>
          </div>

          {/* 7 Exact Predefined Complaint Categories (Single Select) */}
          <div className="space-y-3" role="radiogroup" aria-label="Complaint category">
            {COMPLAINT_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <label
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-100 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="complaint-category"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedCategory(cat.id);
                      if (cat.id !== "other_issue") {
                        setGeneratedTitle(cat.label);
                      }
                    }}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-900 block">
                      {cat.label}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {cat.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Standard categories: optional additional details preserving description without blocking */}
          {selectedCategory !== "other_issue" && (
            <div className="mt-5">
              <label htmlFor="additional-details-textarea" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Additional details <span className="font-normal text-slate-500">(Optional)</span>
              </label>
              <textarea
                id="additional-details-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share any useful context such as what you received instead or timestamps..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-colors"
              />
            </div>
          )}

          {/* Other Issue: Required Description & AI / Deterministic Title Generation */}
          {selectedCategory === "other_issue" && (
            <div className="mt-6 p-5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-4">
              <div>
                <label htmlFor="describe-issue-textarea" className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Describe your issue <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="describe-issue-textarea"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleGenerateTitle()}
                  placeholder="Explain what happened with your purchase..."
                  className={`w-full rounded-xl border p-3 text-sm text-slate-900 focus:outline-none focus:ring-3 transition-colors ${
                    errors.description
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
                      : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100"
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.description}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="generated-title-input" className="block text-sm font-semibold text-slate-900">
                    Complaint title <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateTitle()}
                    disabled={isGeneratingTitle || description.trim().length < 5}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isGeneratingTitle ? "animate-spin text-blue-600" : ""}`} />
                    <span>{isGeneratingTitle ? "Generating..." : "Suggest Title"}</span>
                  </button>
                </div>
                <input
                  id="generated-title-input"
                  type="text"
                  value={generatedTitle}
                  onChange={(e) => setGeneratedTitle(e.target.value)}
                  placeholder="Short title (2–6 words) — automatically suggested or edit manually"
                  className={`h-11 w-full rounded-xl border px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-3 transition-colors ${
                    errors.generatedTitle
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
                      : "border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100"
                  }`}
                />
                {titleSuggestedNote && (
                  <p className="mt-1.5 text-xs text-blue-800 bg-blue-100/70 p-2 rounded-lg flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span>{titleSuggestedNote}</span>
                  </p>
                )}
                {errors.generatedTitle && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.generatedTitle}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex h-10 sm:h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Back</span>
            </button>
            <button
              id="wizard-next-step-2"
              type="button"
              onClick={handleNextFromStep2}
              className="inline-flex h-10 sm:h-11 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 text-xs sm:text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-200 cursor-pointer whitespace-nowrap"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: WHAT RESOLUTION DO YOU PREFER?                   */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              What resolution do you prefer?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose how you would like your issue to be resolved.
            </p>
          </div>

          <div className="space-y-4" role="radiogroup" aria-label="Preferred resolution">
            {RESOLUTION_PREFERENCES.map((pref) => {
              const isSelected = requestedRemedy === pref.id;
              const Icon = pref.icon;
              return (
                <label
                  key={pref.id}
                  id={`remedy-${pref.id.toLowerCase()}`}
                  className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-100 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolution-preference"
                    checked={isSelected}
                    onChange={() => setRequestedRemedy(pref.id)}
                    className="mt-1.5 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-semibold text-slate-900 block">
                      {pref.title}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-600 mt-0.5 block">
                      {pref.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Your preference is recorded. The applicable policy and investigation determine which remedies are available.
            </p>
          </div>

          <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex h-10 sm:h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Back</span>
            </button>
            <button
              id="wizard-next-step-3"
              type="button"
              onClick={handleNextFromStep3}
              className="inline-flex h-10 sm:h-11 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 text-xs sm:text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-200 cursor-pointer whitespace-nowrap"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: SUPPORTING EVIDENCE (CATEGORY-ADAPTIVE)          */}
      {/* ======================================================== */}
      {currentStep === 4 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Supporting evidence
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload available documents, images and videos that help us understand your complaint.
            </p>
          </div>

          {uploadValidationError && (
            <div className="mb-5 p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{uploadValidationError}</span>
            </div>
          )}

          <div className="space-y-4">
            {activeEvidenceSlots.map((slot) => {
              const slotFiles = files.filter((f) => f.slotId === slot.id);
              const isDragging = dragActiveSlot === slot.id;
              const SlotIcon =
                slot.kind === "photo"
                  ? ImageIcon
                  : slot.kind === "video"
                  ? Video
                  : FileText;
              const iconColor =
                slot.kind === "photo"
                  ? "text-blue-600"
                  : slot.kind === "video"
                  ? "text-purple-600"
                  : "text-emerald-600";

              return (
                <div
                  key={slot.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragActiveSlot !== slot.id) setDragActiveSlot(slot.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActiveSlot(null);
                  }}
                  onDrop={(e) => handleDropOnSlot(e, slot)}
                  className={`min-h-[104px] flex flex-col justify-center rounded-xl border-2 border-dashed p-4 sm:p-5 transition-colors ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/70"
                      : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                        <SlotIcon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                        <span>{slot.title}</span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                            slot.requirementLabel === "Recommended"
                              ? "font-semibold text-blue-700 bg-blue-50 border border-blue-200"
                              : "font-medium text-slate-600 bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {slot.requirementLabel}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 break-words">{slot.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Drag and drop here or select file · {slot.acceptedLabel}
                      </p>
                    </div>

                    <label className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 shadow-2xs whitespace-nowrap">
                      <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
                      <span>Select {slot.kind === "video" ? "Video" : "File"}</span>
                      <input
                        id={`file-input-${slot.id}`}
                        type="file"
                        multiple={slot.multiple}
                        accept={slot.acceptedMimeTypes}
                        className="hidden"
                        onChange={(e) => {
                          handleAddFilesToSlot(e.target.files, slot);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {slotFiles.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {slotFiles.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="h-9 w-9 rounded object-cover border border-slate-200 shrink-0"
                              />
                            ) : item.file.type.startsWith("video/") ? (
                              <div className="h-9 w-9 rounded bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                <Video className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="h-9 w-9 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">
                                {item.file.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {(item.file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFile(item.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            aria-label={`Remove ${item.file.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Submission is allowed with partial evidence. If additional records are needed later, RESOLVEGRAPH will request them through your complaint page.
          </p>

          <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex h-10 sm:h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Back</span>
            </button>
            <button
              id="wizard-next-step-4"
              type="button"
              onClick={handleNextFromStep4}
              className="inline-flex h-10 sm:h-11 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 text-xs sm:text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-200 cursor-pointer whitespace-nowrap"
            >
              <span>Review and submit complaint</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 5: REVIEW YOUR COMPLAINT                            */}
      {/* ======================================================== */}
      {currentStep === 5 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Review your complaint
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Verify each section below before submitting your complaint for investigation.
            </p>
          </div>

          <div className="space-y-4">
            {/* Order information */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Order information</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Edit details
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs sm:text-sm">
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[11px] uppercase font-medium">Shopping platform</span>
                  <span className="font-semibold text-slate-900 break-words">{effectivePlatform}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[11px] uppercase font-medium">Order ID</span>
                  <span className="font-mono font-semibold text-slate-900 break-all">{orderId}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[11px] uppercase font-medium">Product name</span>
                  <span className="font-semibold text-slate-900 break-words">{productName}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[11px] uppercase font-medium">Purchase amount</span>
                  <span className="font-semibold text-slate-900">
                    {currencySymbol} {amount} ({currency})
                  </span>
                </div>
              </div>
            </div>

            {/* Complaint information */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Complaint information</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Edit details
                </button>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <span className="text-slate-500 block text-[11px] uppercase font-medium">Selected category</span>
                    <span className="font-semibold text-slate-900 break-words">{effectiveCategoryLabel}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500 block text-[11px] uppercase font-medium">Complaint title</span>
                    <span className="font-semibold text-slate-900 break-words">{generatedTitle || effectiveCategoryLabel}</span>
                  </div>
                </div>
                {description && (
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase font-medium">Description</span>
                    <p className="text-slate-700 whitespace-pre-line break-words bg-white p-3 rounded-lg border border-slate-200 mt-1">
                      {description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Resolution preference */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Resolution preference</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Edit details
                </button>
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-semibold text-slate-900">{selectedRemedyLabel}</span>
                <p className="mt-1 text-xs text-slate-500">
                  Your preference is recorded. Final resolution depends on applicable policy and evidence examination.
                </p>
              </div>
            </div>

            {/* Supporting evidence */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Supporting evidence ({files.length} attached)
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Edit details
                </button>
              </div>
              {files.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No supporting files attached yet. You may submit now or add evidence later if requested.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 text-xs">
                  {files.map((f) => (
                    <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800 truncate">{f.file.name}</span>
                      <span className="text-slate-500 shrink-0">
                        {(f.file.size / 1024).toFixed(1)} KB · {f.tag}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isSubmitting && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
                  <span>Uploading evidence &amp; registering complaint...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {submitError && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
            )}
          </div>

          <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentStep(1)}
              className="inline-flex h-10 sm:h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Edit details</span>
            </button>
            <button
              id="wizard-submit-complaint"
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitComplaint}
              className="inline-flex h-10 sm:h-11 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-7 text-xs sm:text-sm font-semibold shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-blue-200 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Submit complaint</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 6: SUBMISSION SUCCESS SCREEN                        */}
      {/* ======================================================== */}
      {currentStep === 6 && submittedCase && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-10 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <CheckCircle2 className="h-8 w-8 stroke-[2.2]" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Your complaint has been submitted successfully.
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
            RESOLVEGRAPH will now examine the information and available evidence.
          </p>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6 max-w-md mx-auto text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-xs font-semibold text-slate-500 uppercase">Complaint ID</span>
              <span id="submitted-complaint-id" className="font-mono font-bold text-blue-700 text-base">{submittedCase.id}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500">Shopping platform:</span>
              <span className="font-semibold text-slate-900">{submittedCase.platform}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500">Product name:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                {submittedCase.productName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500">Complaint category:</span>
              <span className="font-semibold text-slate-900">{submittedCase.category}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500">Submission date:</span>
              <span className="font-semibold text-slate-900">
                {new Date(submittedCase.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
              <span className="text-slate-500">Initial status:</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                {submittedCase.status}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/cases/${submittedCase.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition-all"
            >
              <span>View Complaint</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Link
              href="/cases"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-6 py-2.5 text-sm font-semibold shadow-xs transition-colors"
            >
              <span>Go to My Complaints</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
