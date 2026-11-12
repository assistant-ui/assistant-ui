"use client";

import { AgentHandoff } from "@/components/assistant-ui/elements/agent-handoff";
import { defineStates } from "./types";

const CARRIED = [
  "The failing test and its output",
  "The two files the reader already narrowed to",
];

const base = {
  from: "Triage",
  to: "Maintainer",
  reason:
    "Triage reproduced the report and narrowed it to the converter, so the fix goes to the agent that can write and verify a patch.",
  carried: CARRIED,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "in-progress",
    label: "Handing off",
    note: "Control is passing and the receiving agent is highlighted.",
    Component: () => <AgentHandoff {...base} settled={false} />,
  },
  {
    key: "success",
    label: "Settled",
    note: "The handoff is complete and the receiving agent now has control.",
    Component: () => <AgentHandoff {...base} settled />,
  },
  {
    key: "empty",
    label: "Nothing carried",
    note: "A handoff that passes control without any context.",
    Component: () => (
      <AgentHandoff
        from="Router"
        to="Billing"
        reason="The question is about an invoice, which only the billing agent can see."
        carried={[]}
        settled
      />
    ),
  },
  {
    key: "long-content",
    label: "Long context",
    note: "Long agent names, a long reason, and many carried items wrap in the column.",
    Component: () => (
      <AgentHandoff
        from="First-line support"
        to="Refund escalation"
        reason="The customer was charged twice for order 48213 and the first-line agent cannot issue refunds over $200, so the ticket moves to the agent with refund access and the order history it already pulled."
        carried={[
          "Order 48213, two charges of $249.00 on Oct 28",
          "The customer's last three support tickets",
          "The refund policy section on duplicate charges",
          "A draft reply the customer has not seen yet",
        ]}
        settled={false}
      />
    ),
  },
]);
