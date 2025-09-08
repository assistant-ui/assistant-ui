import PricingSection from "./pricing-section";
import OpenSourceCard from "./open-source-card";

export default function PricingPage() {
  return (
    <div className="min-h-screen py-12">
      <main className="container mx-auto px-4">
        <h1 className="mb-12 text-center text-4xl font-bold">Pricing</h1>

        <div className="mx-auto mb-6 w-full max-w-[1000px]">
          <h2 className="mb-2 text-2xl font-bold">assistant-cloud</h2>
          <p className="text-lg">
            Fully managed backend for AI chat applications
          </p>
        </div>

        <PricingSection />

        <div className="mx-auto mb-6 w-full max-w-[1000px]">
          <h2 className="mb-2 mt-4 text-2xl font-bold">assistant-ui</h2>
          <p className="text-lg">TypeScript/React library for AI chat</p>
        </div>
        <OpenSourceCard />

        <p className="text-muted-foreground mx-auto mb-4 mt-4 w-full max-w-[1000px] text-xs">
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
