"use client";

import { GuardrailNotice } from "@/components/assistant-ui/elements/guardrail-notice";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "No alternative",
    note: "A refusal with nothing nearby to offer drops the suggestion list.",
    Component: () => (
      <GuardrailNotice
        title="I can't share that"
        explanation="This asks for another person's home address. I don't look up private details about individuals."
        policy="privacy"
        alternatives={[]}
        onPick={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long notice",
    note: "A long title truncates and several suggestions stack under it.",
    Component: () => (
      <GuardrailNotice
        title="I can't write a script that bypasses the login on this router"
        explanation="Breaking into a device without the owner's permission is unauthorized access, even on a network you use every day. If the router is yours, a factory reset gets you back in, and I can walk you through securing it afterwards."
        policy="security"
        alternatives={[
          "Show me how to factory reset a Netgear R7000",
          "Explain how to set a strong admin password",
          "Check my router config for open ports",
          "Explain how default credential attacks work",
        ]}
        onPick={noop}
      />
    ),
  },
]);
