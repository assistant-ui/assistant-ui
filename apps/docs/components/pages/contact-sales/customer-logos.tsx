"use client";

import { LOGOS, LogoMark } from "@/components/pages/home/trusted-by";

const LOGO_NAMES = [
  "Anthropic",
  "Google Cloud",
  "AWS",
  "Salesforce",
  "Neon",
  "Langchain",
  "Builder.io",
  "Mastra",
  "Helicone",
];

export const CUSTOMER_LOGOS = LOGO_NAMES.flatMap((name) => {
  const logo = LOGOS.find((item) => item.alt === name);
  return logo ? [logo] : [];
});

export function CustomerLogos() {
  return (
    <ul className="grid grid-cols-3 gap-x-8 gap-y-6">
      {CUSTOMER_LOGOS.map((logo) => (
        <li key={logo.alt} className="flex h-8 items-center">
          <LogoMark logo={logo} />
        </li>
      ))}
    </ul>
  );
}
