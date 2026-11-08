"use client";

import { useEffect, useState, useRef } from "react";
import {
  Mic,
  MicOff,
  Languages,
  Sparkles,
  FileText,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MultilingualResult {
  complaint: {
    id: string;
    caseId: string | null;
    rawTranscript: string;
    detectedLanguage: string;
    translatedText: string;
    claimedCategory: string;
    claimedAmount: number | null;
    claimedCurrency: string;
    claimedProvider: string | null;
    claimedReference: string | null;
    missingFields: string[];
    isFormalized: boolean;
    formalComplaintMarkdown: string | null;
  };
  message: string;
}

export default function MultilingualPage() {
  const [language, setLanguage] = useState<"en" | "kn" | "hi">("en");
  const [inputText, setInputText] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<MultilingualResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API availability
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn("Speech recognition not supported in this browser environment", e);
        }
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!consentGiven) {
      alert("Please grant audio recording consent before activating voice intake.");
      return;
    }

    if (!recognitionRef.current) {
      alert("Web Speech API is not supported in this browser. Please type or use sample dialogue.");
      return;
    }

    const recognition = recognitionRef.current;

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      const langCode = language === "kn" ? "kn-IN" : language === "hi" ? "hi-IN" : "en-IN";
      recognition.lang = langCode;

      recognition.onstart = () => setIsRecording(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/complaints/multilingual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawTranscript: inputText,
          detectedLanguage: language,
          audioConsentGiven: consentGiven,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process complaint");

      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Processing failed";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const loadDemoScript = (lang: "en" | "kn" | "hi") => {
    setLanguage(lang);
    setConsentGiven(true);
    if (lang === "en") {
      setInputText(
        "I paid Rs 1499 using PhonePe UPI to TechStore on Friday morning. The money was debited from my HDFC bank account, but TechStore says payment failed and no order was created. Transaction reference is UPI44991122.",
      );
    } else if (lang === "kn") {
      setInputText(
        "ನನ್ನ HDFC ಬ್ಯಾಂಕ್ ಖಾತೆಯಿಂದ ₹2,500 ಕಡಿತವಾಗಿದೆ. ಆದರೆ PhonePe ನಲ್ಲಿ ಪಾವತಿ ಬಾಕಿ ಉಳಿದಿದೆ ಎಂದು ತೋರಿಸುತ್ತಿದೆ ಮತ್ತು ವ್ಯಾಪಾರಿಗೆ ಹಣ ತಲುಪಿಲ್ಲ.",
      );
    } else {
      setInputText(
        "मेरे बैंक खाते से ₹1,800 कट गए हैं लेकिन Google Pay में ट्रांजैक्शन फेल बता रहा है और मर्चेंट का कहना है कि पैसे नहीं मिले। कृपया जांच करें।",
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              Multilingual Voice & Conversational Intake
            </h1>
            <Badge tone="brand">English · ಕನ್ನಡ · हिन्दी</Badge>
          </div>
          <p className="text-sm text-muted">
            Assisted conversational complaint creation supporting native Indian languages with audio consent, semantic entity extraction, and automated formalization.
          </p>
        </div>

        {/* Demo Script Shortcuts */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDemoScript("en")}
            className="text-xs"
          >
            English Sample
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDemoScript("kn")}
            className="text-xs font-serif"
          >
            ಕನ್ನಡ Sample
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDemoScript("hi")}
            className="text-xs font-serif"
          >
            हिन्दी Sample
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-fg flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Voice or Conversational Input
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted">Spoken Language:</span>
              <select
                aria-label="Spoken Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "kn" | "hi")}
                className="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-fg focus:outline-none"
              >
                <option value="en">English (India / Global)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={toggleRecording}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isRecording
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                  : "bg-surface-2 text-muted border border-border hover:bg-surface-2/80"
              }`}
            >
              {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {isRecording ? "Listening..." : "Record Voice"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              aria-label="Complaint Voice or Text Transcript"
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak or describe the payment failure: e.g. 'Debited ₹1200 via UPI on Sunday but order failed...'"
              className="w-full rounded-lg border border-border bg-surface-2 p-3 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                id="audio-consent"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <label htmlFor="audio-consent" className="cursor-pointer">
                I authorize RESOLVEGRAPH to process this audio/transcript under compliance recording policies.
              </label>
            </div>

            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={processing || !inputText.trim()}
              className="w-full flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing Linguistic Semantics...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Process & Extract Structured Entities
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Output Panel: Extracted Entities & Formal Complaint */}
        <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-fg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Standardized Complaint Output
          </h2>

          {result ? (
            <div className="space-y-4">
              {/* Language & Category Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">
                  Language: {result.complaint.detectedLanguage}
                </Badge>
                <Badge tone="brand">
                  Category: {result.complaint.claimedCategory}
                </Badge>
                {result.complaint.claimedAmount && (
                  <Badge tone="success">
                    Amount: ₹{result.complaint.claimedAmount}
                  </Badge>
                )}
              </div>

              {/* Translation Card (if non-English) */}
              {result.complaint.detectedLanguage !== "en" && (
                <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-1 border border-border">
                  <span className="font-semibold text-muted uppercase text-[10px] tracking-wider block">
                    Canonical English Translation
                  </span>
                  <p className="text-fg leading-relaxed">{result.complaint.translatedText}</p>
                </div>
              )}

              {/* Extracted Entities Table */}
              <div className="rounded-lg border border-border p-3 text-xs space-y-2 bg-surface-2/30">
                <span className="font-semibold text-muted uppercase text-[10px] tracking-wider block">
                  Extracted Payment Anchors
                </span>
                <div className="grid grid-cols-2 gap-2 text-muted">
                  <div>Provider: <span className="text-fg font-medium">{result.complaint.claimedProvider || "Not specified"}</span></div>
                  <div>Reference / UTR: <span className="text-fg font-mono">{result.complaint.claimedReference || "Pending verification"}</span></div>
                </div>
              </div>

              {/* Missing Information Clarification */}
              {result.complaint.missingFields && result.complaint.missingFields.length > 0 && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs space-y-1">
                  <span className="font-semibold text-purple-300 flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Additional Details Needed to Finalize Investigation:
                  </span>
                  <ul className="list-disc list-inside text-purple-200/90 text-[11px] pt-1">
                    {result.complaint.missingFields.map((field) => (
                      <li key={field}>{field.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formal Markdown Draft */}
              <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-1 border border-border">
                <span className="font-semibold text-muted uppercase text-[10px] tracking-wider block">
                  Formal Complaint Dossier Preview
                </span>
                <pre className="font-mono text-[11px] whitespace-pre-wrap text-fg/90">
                  {result.complaint.formalComplaintMarkdown}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/30 p-8 text-center">
              <Languages className="h-10 w-10 text-muted mb-2 opacity-40" />
              <p className="text-xs text-muted max-w-xs">
                Speak or enter a complaint in English, Kannada, or Hindi to see real-time translation and entity extraction.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
