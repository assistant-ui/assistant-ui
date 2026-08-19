import { CLOUD_URL } from "@/lib/constants";

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

export type Highlight = {
  title: string;
  description: string;
};

export type Faq = {
  question: string;
  answer: string;
};

export const libraryHighlights: Highlight[] = [
  {
    title: "MIT licensed",
    description:
      "Use the library in any product, including commercial ones. The source stays on GitHub.",
  },
  {
    title: "Your own backend",
    description:
      "Pair it with any runtime you already run. Cloud is optional, not a requirement.",
  },
  {
    title: "React, React Native, and Ink",
    description:
      "One chat model across web, native, and terminal. Keep the same runtime adapters.",
  },
  {
    title: "Runtime adapters",
    description:
      "AI SDK, LangGraph, and other backends plug in without rewriting the UI.",
  },
];

export const cloudHighlights: Highlight[] = [
  {
    title: "Thread persistence",
    description:
      "Messages save as the conversation streams. Users can leave and pick up later.",
  },
  {
    title: "Thread list",
    description:
      "Browse, switch, rename, archive, and delete conversations from the UI or hooks.",
  },
  {
    title: "Auto-generated titles",
    description:
      "New threads get a title from the first exchange. No extra request to wire up.",
  },
  {
    title: "User and workspace auth",
    description:
      "Scope history to a user or workspace with Clerk, Auth0, Supabase, Firebase, or your own provider.",
  },
];

export const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Try hosted persistence on a small project.",
    features: [
      "200 MAU included",
      "Thread persistence and history",
      "Thread list and auto-generated titles",
      "User and workspace authorization",
    ],
    cta: "Start free",
    href: CLOUD_URL,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$50",
    period: "/mo",
    description: "For products that are starting to grow.",
    features: [
      "500 MAU included",
      "$0.10 per additional MAU",
      "Everything in Free",
      "Early access to new features",
    ],
    cta: "Get started",
    href: CLOUD_URL,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For teams that need their own backend and an SLA.",
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

export const faqs: Faq[] = [
  {
    question: "Do I need Cloud to use the library?",
    answer:
      "No. assistant-ui is a free TypeScript and React library. You can keep your own backend and never open a Cloud account.",
  },
  {
    question: "What counts as an MAU?",
    answer:
      "A monthly active user is someone who sends at least one message in that month. Viewers who never send a message do not count.",
  },
  {
    question: "What if I have a consumer app?",
    answer:
      "The plans above are sized for B2B products. For B2C pricing, write to b2c-pricing@assistant.dev.",
  },
  {
    question: "Can I bring my own database?",
    answer:
      "The open source library always lets you persist threads yourself. Enterprise Cloud also includes integration with your own backend, plus replication and on-premises deployment.",
  },
];
