import type { Metadata } from "next";
import PricingSection from "./pricing-section";
import OpenSourceCard from "./open-source-card";

const title = "Pricing";
const description = "Fully managed backend for AI chat applications";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`],
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen py-12">
      <main className="container mx-auto px-4">
        <h1 className="mb-12 text-center font-bold text-4xl">Pricing</h1>

        <div className="mx-auto mb-6 w-full max-w-[1000px]">
          <h2 className="mb-2 font-bold text-2xl">assistant-cloud</h2>
          <p className="text-lg">
            Fully managed backend for AI chat applications
          </p>
        </div>

        <PricingSection />

        <div className="mx-auto mb-6 w-full max-w-[1000px]">
          <h2 className="mt-4 mb-2 font-bold text-2xl">assistant-ui</h2>
          <p className="text-lg">TypeScript/React library for AI chat</p>
        </div>
        <OpenSourceCard />

        <p className="mx-auto mt-4 mb-4 w-full max-w-[1000px] text-muted-foreground text-xs">
          <strong>*MAU:</strong> Monthly Active Users who send at least one
          message via assistant-ui. Are you a B2C app?{" "}
          <a href="mailto:b2c-pricing@assistant.dev" className="underline">
            Contact us
          </a>{" "}
          for a custom pricing plan.
        </p>
      </main>
    </div>
  );
}
