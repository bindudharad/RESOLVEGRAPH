import type { Metadata } from "next";
import { MarketingHomePage } from "@/components/landing/marketing-home-page";

export const metadata: Metadata = {
  title: "RESOLVEGRAPH — AI-Powered Cross-Provider Payment Investigation & Evidence Resolution",
  description:
    "ONE PAYMENT. EVERY SOURCE. ONE EXPLAINABLE RESOLUTION. Connect buyer, merchant, PayPal, bank and delivery evidence into one explainable investigation.",
};

export default function RootPage() {
  return <MarketingHomePage />;
}
