"use client";

import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from "@/components/assistant-ui/elements/data-table";
import { defineStates } from "./types";

const REFERENCE_TIME = Date.parse("2026-09-26T12:00:00Z");

const MODEL_COLUMNS = [
  { key: "name", label: "Model", priority: "primary", width: "34%" },
  {
    key: "context",
    label: "Context",
    format: { kind: "number", compact: true },
    width: "18%",
  },
  {
    key: "input",
    label: "Input",
    format: { kind: "currency", currency: "USD", decimals: 2 },
    width: "18%",
  },
  {
    key: "latency",
    label: "Latency",
    format: { kind: "number", unit: "ms" },
    width: "15%",
  },
  {
    key: "weekly",
    label: "Weekly",
    format: { kind: "delta", decimals: 1, unit: "%" },
    width: "15%",
  },
] as const satisfies readonly DataTableColumn[];

const MODELS = [
  { name: "Sonnet 4.5", context: 200_000, input: 3, latency: 820, weekly: 2.4 },
  { name: "GPT-5", context: 400_000, input: 5, latency: 690, weekly: -1.2 },
  {
    name: "Haiku 4.5",
    context: 200_000,
    input: 0.8,
    latency: 420,
    weekly: 4.8,
  },
] as const satisfies readonly DataTableRow[];

const PARTIAL_MODELS = [
  { name: "Sonnet 4.5", context: 200_000, input: 3, latency: 820, weekly: 2.4 },
  {
    name: "Gemini 3 Pro",
    context: 1_000_000,
    input: null,
    latency: null,
    weekly: 0,
  },
  {
    name: "Llama 4 Maverick",
    context: 1_000_000,
    input: 0.27,
    latency: undefined,
    weekly: null,
  },
] as const satisfies readonly DataTableRow[];

const RUN_COLUMNS = [
  {
    key: "pr",
    label: "Pull request",
    priority: "primary",
    format: { kind: "link", hrefKey: "url" },
  },
  {
    key: "status",
    label: "Status",
    format: {
      kind: "badge",
      tones: {
        merged: "success",
        open: "neutral",
        failing: "danger",
        draft: "warning",
      },
    },
  },
  { key: "labels", label: "Labels", format: { kind: "list", max: 2 } },
  {
    key: "ci",
    label: "CI",
    format: { kind: "boolean", trueLabel: "Passing", falseLabel: "Failing" },
  },
  {
    key: "updated",
    label: "Updated",
    format: { kind: "date", style: "relative" },
  },
] as const satisfies readonly DataTableColumn[];

const RUNS = [
  {
    pr: "Persist composer drafts across reloads when the thread list is remote",
    url: "https://github.com/assistant-ui/assistant-ui/pull/2481",
    status: "open",
    labels: ["runtime", "composer", "needs-review", "docs"],
    ci: true,
    updated: "2026-09-26T11:42:00Z",
  },
  {
    pr: "Fix tool call ordering in streamed responses",
    url: "https://github.com/assistant-ui/assistant-ui/pull/2477",
    status: "failing",
    labels: ["streaming"],
    ci: false,
    updated: "2026-09-26T08:15:00Z",
  },
  {
    pr: "Add data table element",
    url: "https://github.com/assistant-ui/assistant-ui/pull/2463",
    status: "merged",
    labels: ["elements", "ui"],
    ci: true,
    updated: "2026-09-24T17:03:00Z",
  },
  {
    pr: "Draft: voice mode barge-in",
    url: "https://github.com/assistant-ui/assistant-ui/pull/2459",
    status: "draft",
    labels: [],
    ci: null,
    updated: "2026-09-19T09:30:00Z",
  },
] as const satisfies readonly DataTableRow[];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty",
    note: "The tool returned columns but no rows.",
    Component: () => (
      <DataTable
        columns={MODEL_COLUMNS}
        rows={[]}
        rowKey="name"
        caption="Model comparison"
        emptyMessage="No models match these filters"
        relativeTo={REFERENCE_TIME}
      />
    ),
  },
  {
    key: "partial",
    label: "Missing values",
    note: "Some cells are null or missing and render as a placeholder.",
    Component: () => (
      <DataTable
        columns={MODEL_COLUMNS}
        rows={PARTIAL_MODELS}
        rowKey="name"
        defaultSort={{ key: "input", direction: "asc" }}
        caption="Model comparison"
        relativeTo={REFERENCE_TIME}
      />
    ),
  },
  {
    key: "long-content",
    label: "Rich cells",
    note: "Links, badges, lists, booleans, and relative dates with a long title in the first column.",
    Component: () => (
      <DataTable
        columns={RUN_COLUMNS}
        rows={RUNS}
        rowKey="url"
        defaultSort={{ key: "updated", direction: "desc" }}
        caption="Open pull requests"
        relativeTo={REFERENCE_TIME}
      />
    ),
  },
  {
    key: "narrow",
    label: "Narrow",
    note: "In a narrow column each row becomes a card.",
    Component: () => (
      <div className="w-full max-w-[280px]">
        <DataTable
          columns={MODEL_COLUMNS}
          rows={MODELS}
          rowKey="name"
          defaultSort={{ key: "context", direction: "desc" }}
          caption="Model comparison"
          relativeTo={REFERENCE_TIME}
        />
      </div>
    ),
  },
]);
