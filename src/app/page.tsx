import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "RESOLVEGRAPH — AI-Powered Commerce Resolution Infrastructure",
  description:
    "From the first complaint to a fair resolution. AI-powered commerce resolution infrastructure connecting buyers, merchants, payment records and evidence in one platform.",
};

export default function HomePage() {
  return <LandingPage />;
}
