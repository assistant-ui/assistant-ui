"use client";

import {
  ComparisonCard,
  type ComparisonOption,
} from "@/components/assistant-ui/elements/comparison-card";
import { defineStates } from "./types";

const TRAITS = ["Streaming", "Multi-thread", "Self-hosted"] as const;

const OPTIONS: readonly ComparisonOption[] = [
  {
    id: "local",
    name: "Local runtime",
    headline: "You own the loop",
    traits: ["Streams", "Multi-thread", "Self-hosted"],
  },
  {
    id: "external",
    name: "External store",
    headline: "Your state is the source",
    traits: ["Streams", "Multi-thread", false],
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "no-pick",
    label: "No pick",
    note: "Neither option is marked as the pick, and the reason explains why.",
    Component: () => (
      <ComparisonCard
        traitLabels={TRAITS}
        options={OPTIONS}
        recommendedId=""
        reason="Both fit. Pick the external store if your messages already live in a database, and the local runtime if they do not."
      />
    ),
  },
  {
    key: "three-options",
    label: "Three options",
    note: "A third option narrows every column.",
    Component: () => (
      <ComparisonCard
        traitLabels={["Hosted", "Streaming", "SSO"]}
        options={[
          {
            id: "cloud",
            name: "Assistant Cloud",
            headline: "Managed threads",
            traits: ["Hosted", "Streams", "SSO"],
          },
          {
            id: "langgraph",
            name: "LangGraph",
            headline: "Graph agents",
            traits: ["Hosted", "Streams", false],
          },
          {
            id: "custom",
            name: "Custom backend",
            headline: "Your own API",
            traits: [false, "Streams", false],
          },
        ]}
        recommendedId="cloud"
        reason="You need SSO this quarter and have no one to run a thread store, so the hosted option wins."
      />
    ),
  },
  {
    key: "missing-traits",
    label: "Mostly missing",
    note: "An option that lacks most traits shows them as absent.",
    Component: () => (
      <ComparisonCard
        traitLabels={["Offline", "Encryption", "Shared links", "Audit log"]}
        options={[
          {
            id: "team",
            name: "Team plan",
            headline: "$30 per seat",
            traits: ["Offline", "Encrypted", "Shared links", "Audit log"],
          },
          {
            id: "free",
            name: "Free plan",
            headline: "$0",
            traits: [false, "Encrypted", false, false],
          },
        ]}
        recommendedId="team"
        reason="Your security review asks for an audit log, and only the team plan keeps one."
      />
    ),
  },
  {
    key: "long-content",
    label: "Long text",
    note: "Long names, headlines, and traits truncate inside their columns.",
    Component: () => (
      <ComparisonCard
        traitLabels={TRAITS}
        options={[
          {
            id: "local",
            name: "LocalRuntime with a custom ChatModelAdapter",
            headline: "You own the loop and every request it sends",
            traits: [
              "Streams tokens and tool calls as they arrive",
              "Multi-thread with a remote thread list",
              "Self-hosted on your own infrastructure",
            ],
          },
          {
            id: "external",
            name: "ExternalStoreRuntime backed by Redux",
            headline: "Your existing store stays the source of truth",
            traits: ["Streams through your own reducer", "Multi-thread", false],
          },
        ]}
        recommendedId="external"
        reason="Your app already keeps every message in Redux and replays them on load. Moving that into the runtime would mean two sources of truth, so wiring the external store adapter is the smaller change."
      />
    ),
  },
]);
