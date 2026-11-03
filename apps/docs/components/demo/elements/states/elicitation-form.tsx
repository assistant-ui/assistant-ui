"use client";

import {
  ElicitationForm,
  type ElicitationField,
} from "@/components/assistant-ui/elements/elicitation-form";
import { defineStates } from "./types";

const noop = () => {};

const FIELDS: readonly ElicitationField[] = [
  {
    name: "repo",
    label: "Repository",
    value: "assistant-ui/assistant-ui",
    kind: "text",
    required: true,
  },
  {
    name: "visibility",
    label: "Visibility",
    value: "Private",
    kind: "choice",
    options: ["Public", "Private"],
  },
  { name: "notify", label: "Notify watchers", value: "true", kind: "toggle" },
];

const base = {
  server: "github-mcp",
  message:
    "Confirm where the release notes should be published before the tool runs.",
  fields: FIELDS,
  onFieldChange: noop,
  onAccept: noop,
  onDecline: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "missing-required",
    label: "Missing field",
    note: "A required field is empty, so Send stays disabled.",
    Component: () => (
      <ElicitationForm
        {...base}
        state="request"
        fields={FIELDS.map((item) =>
          item.name === "repo" ? { ...item, value: "" } : item,
        )}
      />
    ),
  },
  {
    key: "accepted",
    label: "Sent",
    note: "The user sent the values and the fields are now read only.",
    Component: () => <ElicitationForm {...base} state="accepted" />,
  },
  {
    key: "declined",
    label: "Declined",
    note: "The user declined, so the server gets nothing back.",
    Component: () => <ElicitationForm {...base} state="declined" />,
  },
  {
    key: "long-content",
    label: "Long request",
    note: "A long server name truncates while the message, value, and choices wrap.",
    Component: () => (
      <ElicitationForm
        {...base}
        onFieldChange={undefined}
        state="request"
        server="atlassian-confluence-enterprise-mcp.internal.acme.dev"
        message="The page you asked for lives in a space you have not used before. Pick the space, the parent page, and who should be able to see it. Nothing is published until you send this."
        fields={[
          {
            name: "parent",
            label: "Parent page",
            value:
              "Engineering / Platform / Runbooks / Incident response / 2026",
            kind: "text",
            required: true,
          },
          {
            name: "space",
            label: "Space",
            value: "PLAT",
            kind: "choice",
            options: ["ENG", "PLAT", "SEC", "DOCS", "SUPPORT", "SALES", "HR"],
          },
          {
            name: "restrict",
            label: "Restrict to my team",
            value: "false",
            kind: "toggle",
          },
        ]}
      />
    ),
  },
]);
