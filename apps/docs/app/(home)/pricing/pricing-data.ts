export type PricingPlan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
};

export const pricingPlans = [
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
] satisfies PricingPlan[];
