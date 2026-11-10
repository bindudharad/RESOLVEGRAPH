import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Platform Overview — RESOLVEGRAPH",
  description:
    "AI-powered commerce resolution infrastructure connecting buyers, merchants, payment records and evidence in one platform.",
};

export default function OverviewPage() {
  return <LandingPage />;
}
