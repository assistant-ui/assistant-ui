"use client";

import { GuardrailNotice } from "@/components/elements/guardrail-notice";

const ALTERNATIVES = [
  "Explain how rate limiting defends against this",
  "Review my own service for the same weakness",
];

export function GuardrailNoticeDemo() {
  return (
    <GuardrailNotice
      title="I can't help with that"
      explanation="This asks for a working attack against infrastructure you don't own. I can help with the defensive side of the same problem."
      policy="policy"
      alternatives={ALTERNATIVES}
    />
  );
}
