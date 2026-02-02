import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { Check, Github } from "lucide-react";
import { PricingPlanCard } from "./pricing-plan-card";

const title = "Pricing";
const description = "Fully managed backend for AI chat applications";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with the basics",
    features: ["200 MAU included", "Chat history", "Thread management"],
    cta: "Start free",
    href: "https://cloud.assistant-ui.com/",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$50",
    period: "/mo",
    description: "For growing applications",
    features: [
      "500 MAU included",
      "$0.10 per additional MAU",
      "Chat history",
      "Thread management",
      "Early access to new features",
    ],
    cta: "Get started",
    href: "https://cloud.assistant-ui.com/",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large-scale deployments",
    features: [
      "Custom MAU pricing",
      "Your own backend integration",
      "Data replication",
      "Dedicated support",
      "99.99% uptime SLA",
      "On-premises deployment",
    ],
    cta: "Contact sales",
    href: "https://cal.com/simon-farshid/assistant-ui",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
      <header className="mb-16">
        <p className="mb-3 text-muted-foreground text-sm">Pricing</p>
        <h1 className="font-medium text-2xl tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose the plan that fits your needs.
        </p>
      </header>

      {/* assistant-cloud section */}
      <section className="mb-20">
        <div className="mb-8">
          <h2 className="font-medium text-xl tracking-tight">
            assistant-cloud
          </h2>
          <p className="mt-1 text-muted-foreground">
            Fully managed backend for AI chat applications
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PricingPlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <p className="mt-4 text-muted-foreground text-xs">
          * MAU = Monthly Active Users who send at least one message.{" "}
          <a href="mailto:b2c-pricing@assistant.dev" className="underline">
            Contact us
          </a>{" "}
          for B2C pricing.
        </p>
      </section>

      {/* assistant-ui section */}
      <section>
        <div className="mb-8">
          <h2 className="font-medium text-xl tracking-tight">assistant-ui</h2>
          <p className="mt-1 text-muted-foreground">
            TypeScript/React library for AI chat
          </p>
        </div>

        <div className="rounded-lg border border-border p-6">
          <div className="flex items-start gap-3">
            <Github className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-sm">
                Forever free & open source
              </h3>
              <p className="mt-1 text-muted-foreground text-sm">MIT License</p>
            </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            {[
              "Customizable UI components",
              "Bring your own backend",
              "Community support",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-muted-foreground text-sm"
              >
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-foreground/60" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
