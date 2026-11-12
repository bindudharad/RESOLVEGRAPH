"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Store, Network, ShieldCheck, CheckCircle2 } from "lucide-react";

interface GalleryCard {
  number: string;
  category: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  tag: string;
  tagColor: string;
  linkHref: string;
  linkText: string;
}

const GALLERY_CARDS: GalleryCard[] = [
  {
    number: "01",
    category: "INGESTION ATELIER",
    title: "Multi-Marketplace Evidence Intake",
    description:
      "Customers submit invoices, unboxing photos, and serial numbers across Amazon, Flipkart, Meesho, and direct commerce storefronts. Every document is SHA-256 hashed on arrival.",
    imageSrc: "/images/discovery.png",
    imageAlt: "Digital document intake and evidence extraction workflow",
    tag: "SHA-256 HASHED",
    tagColor: "var(--buyer, #4D92CC)",
    linkHref: "/intake",
    linkText: "Lodge Evidence →",
  },
  {
    number: "02",
    category: "SELLER GATEWAY",
    title: "Bilateral Seller Telemetry",
    description:
      "When a defect or transit discrepancy is alleged, the registered seller receives a structured request for dispatch logs, factory calibration records, and courier handover receipts.",
    imageSrc: "/images/strategy.png",
    imageAlt: "Seller operations, dispatch verification, and telemetry review",
    tag: "REGISTERED SELLER",
    tagColor: "var(--merchant, #278B79)",
    linkHref: "/seller/requests",
    linkText: "Inspect Seller Portal →",
  },
  {
    number: "03",
    category: "REASONING MATRIX",
    title: "BEG Graph & BERR v2 Evaluation",
    description:
      "The Bilateral Evidence Graph links claims to evidence nodes, while BERR v2 evaluates facts into AGREED, VERIFIED, CONTESTED, and MISSING findings grounded in source citations.",
    imageSrc: "/images/design.png",
    imageAlt: "Bilateral Evidence Graph node and edge reconstruction",
    tag: "BERR v2 REASONING",
    tagColor: "var(--ai, #8B72C9)",
    linkHref: "/cases/RG-1465",
    linkText: "Examine BEG & BERR →",
  },
  {
    number: "04",
    category: "GOVERNANCE & REMEDY",
    title: "Dual-Key Human Authorization",
    description:
      "Policy proposes eligible remedies (refund, replacement, or claim denial), but no financial or dispatch action can execute without credentialed dual-key human approval.",
    imageSrc: "/images/build-launch.png",
    imageAlt: "Dual-key authorization and sandbox transaction execution",
    tag: "ZERO-BYPASS CONTROL",
    tagColor: "var(--accent, #4350E5)",
    linkHref: "/cases/RG-1468",
    linkText: "View Refund Proof →",
  },
];

export function EvidenceArchitectureGallery() {
  return (
    <section className="relative border-b border-[var(--line,#D9DED7)] bg-[var(--surface,#FFFEFA)] py-20 sm:py-28">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong,#B5BEB6)] bg-[var(--surface-2,#EBE9E2)] px-3.5 py-1 text-xs font-mono text-[var(--ink-2,#414B52)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent,#4350E5)]" />
            <span>VISUAL STORYTELLING · THE 4-PILLAR JOURNEY</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[var(--ink,#15191C)] leading-[1.1]">
            From fractured claims to an{" "}
            <span className="font-display italic text-[var(--accent,#4350E5)] font-normal">
              immutable resolution.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[var(--ink-2,#414B52)] leading-relaxed">
            Every disputed transaction carries two narratives. Here is how RESOLVEGRAPH bridges the gap between customer documentation, merchant dispatch telemetry, and authorized remedy.
          </p>
        </div>

        {/* 4-Pillar Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {GALLERY_CARDS.map((card) => (
            <div
              key={card.number}
              className="group relative overflow-hidden rounded-2xl border border-[var(--line,#D9DED7)] bg-[var(--surface-2,#EBE9E2)]/40 transition-all duration-300 hover:border-[var(--line-strong,#B5BEB6)] hover:shadow-lg hover:shadow-black/5 flex flex-col justify-between"
            >
              {/* Image Frame with Gradient Overlay & Smooth Hover Zoom */}
              <div className="relative h-60 w-full overflow-hidden bg-[#182223]">
                <Image
                  src={card.imageSrc}
                  alt={card.imageAlt}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-85 group-hover:opacity-95"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#11191A] via-transparent to-transparent opacity-80" />

                {/* Top Corner Pill */}
                <div className="absolute top-4 left-4 z-10">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#182223]/90 px-3 py-1 font-mono text-[10px] font-bold text-white backdrop-blur-md border border-white/10"
                    style={{ borderColor: card.tagColor }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: card.tagColor }}
                    />
                    {card.tag}
                  </span>
                </div>

                {/* Editorial Number */}
                <div className="absolute top-3 right-5 z-10 font-mono text-2xl font-bold text-white/30">
                  {card.number}
                </div>
              </div>

              {/* Text Content */}
              <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                <div>
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-semibold">
                    {card.category}
                  </span>
                  <h3 className="mt-1 font-heading text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink,#15191C)]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2,#414B52)]">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--line,#D9DED7)] flex items-center justify-between">
                  <Link
                    href={card.linkHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent,#4350E5)] hover:underline"
                  >
                    <span>{card.linkText}</span>
                  </Link>

                  <span className="font-mono text-[10px] text-[var(--ink-3,#718078)]">
                    STAGE {card.number} · VERIFIED
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
