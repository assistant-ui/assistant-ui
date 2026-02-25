"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import {
  MessagePrimitive,
  MessageProvider,
  useAui,
  useAuiState,
  type ThreadAssistantMessage,
} from "@assistant-ui/react";
import { ChainOfThought } from "@/components/assistant-ui/chain-of-thought";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Scenario = {
  id: string;
  label: string;
  description: string;
  message: ThreadAssistantMessage;
};

type WorkbenchMode = "static" | "mock-stream";

type MockStreamFrame = {
  id: string;
  label: string;
  description: string;
  nextDelayMs?: number;
  message: ThreadAssistantMessage;
};

type ToolActivityMap = NonNullable<
  ComponentProps<typeof ChainOfThought>["toolActivity"]
>;
type ToolActivityResolver = NonNullable<ToolActivityMap[string]>;
type ToolActivityContext = Parameters<ToolActivityResolver>[0];
type TriggerContentRenderer = NonNullable<
  ComponentProps<typeof ChainOfThought>["renderTriggerContent"]
>;
type TriggerContentArgs = Parameters<TriggerContentRenderer>[0];
type WorkbenchChainOfThoughtConfig = {
  useToolActivity: boolean;
  useCustomTriggerContent: boolean;
};

const WorkbenchChainOfThoughtConfigContext =
  createContext<WorkbenchChainOfThoughtConfig>({
    useToolActivity: true,
    useCustomTriggerContent: true,
  });

const baseMetadata: ThreadAssistantMessage["metadata"] = {
  unstable_state: null,
  unstable_annotations: [],
  unstable_data: [],
  steps: [],
  custom: {},
};

const makeMessage = (
  id: string,
  content: ThreadAssistantMessage["content"],
  status: ThreadAssistantMessage["status"],
): ThreadAssistantMessage => ({
  id,
  role: "assistant",
  createdAt: new Date("2026-02-24T00:00:00.000Z"),
  content,
  status,
  metadata: baseMetadata,
});

const IMAGE_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="220" viewBox="0 0 480 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#bae6fd"/></linearGradient></defs><rect width="480" height="220" fill="url(#g)"/><text x="24" y="110" font-family="system-ui, sans-serif" font-size="18" fill="#0f172a">Synthetic preview image part</text></svg>`,
  );

const scenarios: readonly Scenario[] = [
  {
    id: "running-reasoning",
    label: "Running reasoning",
    description: "Reasoning is streaming with no tool call yet.",
    message: makeMessage(
      "cot-running-reasoning",
      [
        {
          type: "reasoning",
          text: "Reviewing the request and planning the response strategy.",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "running-tool",
    label: "Running tool call",
    description: "Reasoning followed by an active tool call.",
    message: makeMessage(
      "cot-running-tool",
      [
        {
          type: "reasoning",
          text: "Need to verify key facts before finalizing.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-running-1",
          toolName: "search_web",
          args: { query: "latest quantum computing breakthroughs 2026" },
          argsText: `{"query":"latest quantum computing breakthroughs 2026"}`,
          parentId: "step-1",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "complete-mixed",
    label: "Complete mixed output",
    description:
      "CoT group followed by final assistant text to validate grouping boundaries.",
    message: makeMessage(
      "cot-complete-mixed",
      [
        {
          type: "reasoning",
          text: "Gathering evidence from multiple sources.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-complete-1",
          toolName: "search_web",
          args: { query: "fault tolerant qubits progress" },
          argsText: `{"query":"fault tolerant qubits progress"}`,
          result: {
            sources: ["example.com/a", "example.com/b"],
            summary: "Found three major updates from 2026.",
          },
          parentId: "step-1",
        },
        {
          type: "reasoning",
          text: "Cross-checking claims for consistency.",
          parentId: "step-2",
        },
        {
          type: "text",
          text: "Here are the most important breakthroughs and why they matter.",
        },
      ],
      { type: "complete", reason: "stop" },
    ),
  },
  {
    id: "complete-multi-groups",
    label: "Complete with 2 CoT groups",
    description:
      "Two separated CoT disclosures in one message to validate grouping boundaries.",
    message: makeMessage(
      "cot-complete-multi-groups",
      [
        {
          type: "reasoning",
          text: "First pass: gathering source material.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-group-a",
          toolName: "search_web",
          args: { query: "quantum networking research labs" },
          argsText: `{"query":"quantum networking research labs"}`,
          result: { hits: 12 },
          parentId: "group-a",
        },
        {
          type: "text",
          text: "Interim summary: I have enough signal to narrow focus.",
        },
        {
          type: "reasoning",
          text: "Second pass: validating the strongest claims.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-group-b",
          toolName: "fetch_docs",
          args: { ids: ["paper-21", "paper-48"] },
          argsText: `{"ids":["paper-21","paper-48"]}`,
          result: { verified: ["paper-21"] },
          parentId: "group-b",
        },
        {
          type: "text",
          text: "Final answer draft ready with one disputed claim flagged.",
        },
      ],
      { type: "complete", reason: "stop" },
    ),
  },
  {
    id: "requires-action",
    label: "Requires action",
    description:
      "Tool call requires human input (interrupt) while CoT is still active.",
    message: makeMessage(
      "cot-requires-action",
      [
        {
          type: "reasoning",
          text: "Need confirmation before proceeding with external action.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-interrupt-1",
          toolName: "create_ticket",
          args: { priority: "high", project: "infra" },
          argsText: `{"priority":"high","project":"infra"}`,
          interrupt: {
            type: "human",
            payload: { prompt: "Approve ticket creation?" },
          },
          parentId: "interrupt-step",
          status: { type: "requires-action", reason: "interrupt" },
        },
      ] as any,
      { type: "requires-action", reason: "tool-calls" },
    ),
  },
  {
    id: "incomplete-error",
    label: "Incomplete/error",
    description: "Simulates an interrupted chain-of-thought run.",
    message: makeMessage(
      "cot-incomplete-error",
      [
        {
          type: "reasoning",
          text: "Trying to retrieve supporting documents.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-error-1",
          toolName: "fetch_docs",
          args: { path: "/papers/latest.pdf" },
          argsText: `{"path":"/papers/latest.pdf"}`,
          parentId: "step-error",
        },
      ],
      { type: "incomplete", reason: "error", error: "Request timed out" },
    ),
  },
  {
    id: "long-payloads",
    label: "Long payload stress",
    description:
      "Large args/result payloads and long reasoning text for overflow/scroll checks.",
    message: makeMessage(
      "cot-long-payloads",
      [
        {
          type: "reasoning",
          text: "Synthesizing multiple long-form source documents to extract overlap, contradictions, and confidence intervals.\n\nThis intentionally verbose reasoning block helps validate wrapping, line-height, and scroll behavior in the expanded disclosure.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-long-1",
          toolName: "analyze_dataset",
          args: {
            query: "benchmark latency and throughput trends",
            filters: {
              regions: ["us-east-1", "us-west-2", "eu-central-1"],
              range: { from: "2025-01-01", to: "2026-02-24" },
              dimensions: ["p50", "p95", "p99", "error_rate"],
            },
          },
          argsText:
            '{"query":"benchmark latency and throughput trends","filters":{"regions":["us-east-1","us-west-2","eu-central-1"],"range":{"from":"2025-01-01","to":"2026-02-24"},"dimensions":["p50","p95","p99","error_rate"]}}',
          result: {
            summary:
              "Latency regressed in eu-central-1 during weeks 04-06, recovered after rollout 17.",
            anomalies: Array.from({ length: 8 }, (_, i) => ({
              id: `anomaly-${i + 1}`,
              metric: i % 2 === 0 ? "p99" : "error_rate",
            })),
            recommendation:
              "Roll back feature flag in region clusters with sustained p99 > 850ms.",
          },
          parentId: "long-step",
        },
        {
          type: "text",
          text: "I analyzed the full dataset and highlighted the highest-confidence recommendation.",
        },
      ],
      { type: "complete", reason: "stop" },
    ),
  },
  {
    id: "adjacent-non-cot-parts",
    label: "Adjacent non-CoT parts",
    description:
      "Source/data/image parts before/after CoT to validate transitions in one message.",
    message: makeMessage(
      "cot-adjacent-non-cot",
      [
        {
          type: "source",
          sourceType: "url",
          id: "source-1",
          url: "https://assistant-ui.com/docs/guides/chain-of-thought",
          title: "assistant-ui CoT guide",
        },
        {
          type: "reasoning",
          text: "Cross-referencing docs and telemetry snapshots.",
        },
        {
          type: "tool-call",
          toolCallId: "tool-source-1",
          toolName: "search_docs",
          args: { query: "chainOfThought primitive parts grouped by indices" },
          argsText:
            '{"query":"chainOfThought primitive parts grouped by indices"}',
          result: { matches: 4 },
          parentId: "source-step",
        },
        {
          type: "data",
          name: "telemetry.summary",
          data: {
            runId: "run_2481",
            durationMs: 1840,
            groupedSteps: 3,
          },
        },
        {
          type: "image",
          image: IMAGE_DATA_URI,
          filename: "cot-preview.svg",
        },
        {
          type: "text",
          text: "All relevant artifacts have been collected and attached above.",
        },
      ],
      { type: "complete", reason: "stop" },
    ),
  },
];

const mockStreamFrames: readonly MockStreamFrame[] = [
  {
    id: "frame-1",
    label: "Planning",
    description: "Starts with running reasoning.",
    nextDelayMs: 1000,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-2",
    label: "Search Web (running)",
    description: "First tool call starts.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          parentId: "mock-step-1",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-3",
    label: "Synthesis (running)",
    description: "Search completes and reasoning resumes.",
    nextDelayMs: 1000,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          status: { type: "running" },
          parentId: "mock-step-2",
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-4",
    label: "Fetch docs (running)",
    description: "Second tool starts.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          parentId: "mock-step-3",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-5",
    label: "Analyze table (running)",
    description: "Docs are in; structured analysis starts.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          parentId: "mock-step-4",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-6",
    label: "Code check (running)",
    description: "Structured analysis complete; code validation begins.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          result: { aligned: 9, mismatched: 3 },
          parentId: "mock-step-4",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-4",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify"}',
          parentId: "mock-step-5",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-7",
    label: "Code check (error)",
    description: "A failing tool run introduces an error state.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          result: { aligned: 9, mismatched: 3 },
          parentId: "mock-step-4",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-4",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify"}',
          status: {
            type: "incomplete",
            reason: "error",
            error: "Type mismatch in message part schema",
          },
          parentId: "mock-step-5",
        },
        {
          type: "reasoning",
          text: "The check failed. Preparing a safer retry with narrowed scope.",
          status: { type: "running" },
          parentId: "mock-step-6",
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-8",
    label: "Code retry (running)",
    description: "Retrying the failed code check.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          result: { aligned: 9, mismatched: 3 },
          parentId: "mock-step-4",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-4",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify"}',
          status: {
            type: "incomplete",
            reason: "error",
            error: "Type mismatch in message part schema",
          },
          parentId: "mock-step-5",
        },
        {
          type: "reasoning",
          text: "The check failed. Preparing a safer retry with narrowed scope.",
          parentId: "mock-step-6",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-5",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify-retry" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify-retry"}',
          parentId: "mock-step-7",
          status: { type: "running" },
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-9",
    label: "Needs approval",
    description: "Mock requires-action pause to test waiting state UX.",
    nextDelayMs: 1600,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          result: { aligned: 9, mismatched: 3 },
          parentId: "mock-step-4",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-5",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify-retry" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify-retry"}',
          result: { passed: true, warnings: 1 },
          parentId: "mock-step-7",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-6",
          toolName: "create_ticket",
          args: { project: "ui", priority: "medium" },
          argsText: '{"project":"ui","priority":"medium"}',
          interrupt: {
            type: "human",
            payload: { prompt: "Approve creating a follow-up ticket?" },
          },
          parentId: "mock-step-8",
          status: { type: "requires-action", reason: "interrupt" },
        },
      ] as any,
      { type: "requires-action", reason: "tool-calls" },
    ),
  },
  {
    id: "frame-10",
    label: "Resume after approval",
    description: "Approval received; reasoning continues.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          result: { aligned: 9, mismatched: 3 },
          parentId: "mock-step-4",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-5",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify-retry" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify-retry"}',
          result: { passed: true, warnings: 1 },
          parentId: "mock-step-7",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-6",
          toolName: "create_ticket",
          args: { project: "ui", priority: "medium" },
          argsText: '{"project":"ui","priority":"medium"}',
          result: { ticketId: "UI-214", url: "https://tracker.example/UI-214" },
          parentId: "mock-step-8",
        },
        {
          type: "reasoning",
          text: "Integrating findings and preparing the final concise recommendation.",
          status: { type: "running" },
          parentId: "mock-step-9",
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-11",
    label: "Finalization",
    description: "Last reasoning pass before completion.",
    nextDelayMs: 1200,
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          result: { aligned: 9, mismatched: 3 },
          parentId: "mock-step-4",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-5",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify-retry" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify-retry"}',
          result: { passed: true, warnings: 1 },
          parentId: "mock-step-7",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-6",
          toolName: "create_ticket",
          args: { project: "ui", priority: "medium" },
          argsText: '{"project":"ui","priority":"medium"}',
          result: { ticketId: "UI-214", url: "https://tracker.example/UI-214" },
          parentId: "mock-step-8",
        },
        {
          type: "reasoning",
          text: "Integrating findings and preparing the final concise recommendation.",
          status: { type: "running" },
          parentId: "mock-step-9",
        },
      ] as any,
      { type: "running" },
    ),
  },
  {
    id: "frame-12",
    label: "Complete",
    description: "Mock stream finishes with final output.",
    message: makeMessage(
      "cot-mock-stream",
      [
        {
          type: "reasoning",
          text: "Planning the investigation strategy and identifying first validation sources.",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-1",
          toolName: "search_web",
          args: { query: "assistant-ui chain of thought api details" },
          argsText: '{"query":"assistant-ui chain of thought api details"}',
          result: { hits: 7, summary: "Found docs, PRs, and examples." },
          parentId: "mock-step-1",
        },
        {
          type: "reasoning",
          text: "Reviewing search hits and deciding which docs need deeper verification.",
          parentId: "mock-step-2",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-2",
          toolName: "fetch_docs",
          args: { ids: ["api-reference", "chain-of-thought"] },
          argsText: '{"ids":["api-reference","chain-of-thought"]}',
          result: { fetched: 2, verified: ["chain-of-thought"] },
          parentId: "mock-step-3",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-3",
          toolName: "analyze_table",
          args: { table: "docs-matrix", compare: ["api", "prototype"] },
          argsText: '{"table":"docs-matrix","compare":["api","prototype"]}',
          result: { aligned: 9, mismatched: 3 },
          parentId: "mock-step-4",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-5",
          toolName: "run_code",
          args: { script: "check-cot-render.ts", mode: "verify-retry" },
          argsText: '{"script":"check-cot-render.ts","mode":"verify-retry"}',
          result: { passed: true, warnings: 1 },
          parentId: "mock-step-7",
        },
        {
          type: "tool-call",
          toolCallId: "mock-tool-6",
          toolName: "create_ticket",
          args: { project: "ui", priority: "medium" },
          argsText: '{"project":"ui","priority":"medium"}',
          result: { ticketId: "UI-214", url: "https://tracker.example/UI-214" },
          parentId: "mock-step-8",
        },
        {
          type: "reasoning",
          text: "Integrating findings and preparing the final concise recommendation.",
          parentId: "mock-step-9",
        },
        {
          type: "text",
          text: "Summary: the styled CoT primitive handles step transitions, retries, and interrupts cleanly with stable crossfades and shimmer during active work.",
        },
      ],
      { type: "complete", reason: "stop" },
    ),
  },
];

const toolActivityWithVerbs = (
  present: string,
  past: string,
): ToolActivityResolver => {
  return ({ statusType, fallbackLabel }: ToolActivityContext) => {
    if (statusType === "running") return `${present} ${fallbackLabel}`;
    if (statusType === "requires-action") return `Waiting on ${fallbackLabel}`;
    if (statusType === "incomplete") return `Error in ${fallbackLabel}`;
    return `${past} ${fallbackLabel}`;
  };
};

const WORKBENCH_TOOL_ACTIVITY: ToolActivityMap = {
  search_web: toolActivityWithVerbs("Searching", "Searched"),
  search_docs: toolActivityWithVerbs("Searching", "Searched"),
  fetch_docs: toolActivityWithVerbs("Fetching", "Fetched"),
  analyze_table: toolActivityWithVerbs("Analyzing", "Analyzed"),
  analyze_dataset: toolActivityWithVerbs("Analyzing", "Analyzed"),
  run_code: toolActivityWithVerbs("Running", "Ran"),
  create_ticket: toolActivityWithVerbs("Creating", "Created"),
};

const renderWorkbenchTriggerContent = ({
  label,
  activity,
  active,
  open,
}: TriggerContentArgs) => {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium text-foreground">
        {active ? "Thought Process" : label}
      </span>
      {activity ? (
        <span
          className={cn(
            "truncate text-muted-foreground",
            active && "opacity-90",
          )}
        >
          {activity}
        </span>
      ) : null}
      <span className="shrink-0 text-muted-foreground">
        {open ? "\u25BE" : "\u25B8"}
      </span>
    </span>
  );
};

const DebugChainOfThought = () => {
  const { useToolActivity, useCustomTriggerContent } = useContext(
    WorkbenchChainOfThoughtConfigContext,
  );
  const aui = useAui();
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  const status = useAuiState((s) => s.chainOfThought.status.type);
  const partCount = useAuiState((s) => s.chainOfThought.parts.length);
  const partTypes = useAuiState((s) =>
    s.chainOfThought.parts.map((part) => part.type).join(", "),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/40 p-2 text-xs">
        <span className="font-medium text-foreground">Primitive state</span>
        <span className="rounded bg-background px-2 py-0.5">
          collapsed: {String(collapsed)}
        </span>
        <span className="rounded bg-background px-2 py-0.5">
          status: {status}
        </span>
        <span className="rounded bg-background px-2 py-0.5">
          parts: {partCount}
        </span>
        <span className="rounded bg-background px-2 py-0.5">
          types: {partTypes || "none"}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => aui.chainOfThought().setCollapsed(false)}
        >
          Expand
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => aui.chainOfThought().setCollapsed(true)}
        >
          Collapse
        </Button>
      </div>
      <ChainOfThought
        {...(useToolActivity ? { toolActivity: WORKBENCH_TOOL_ACTIVITY } : {})}
        {...(useCustomTriggerContent
          ? { renderTriggerContent: renderWorkbenchTriggerContent }
          : {})}
      />
    </div>
  );
};

const MessageStatePanel = () => {
  const messageStatus = useAuiState((s) => s.message.status?.type ?? "unknown");
  const partSummary = useAuiState((s) =>
    s.message.parts.map((part, index) => `${index}:${part.type}`).join(" | "),
  );

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-xs">
      <p className="font-medium text-foreground">Message scope</p>
      <p className="mt-1 text-muted-foreground">status: {messageStatus}</p>
      <p className="mt-1 break-words text-muted-foreground">
        parts: {partSummary || "none"}
      </p>
    </div>
  );
};

const SourcePart = ({ title, url }: { title?: string; url: string }) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
    >
      <span className="font-medium">{title ?? "Source"}</span>
      <span className="text-muted-foreground">{url}</span>
    </a>
  );
};

const DataPart = ({ name, data }: { name: string; data: unknown }) => {
  return (
    <div className="rounded border bg-muted/30 p-2 text-xs">
      <p className="font-medium text-foreground">{name}</p>
      <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

const ImagePart = ({
  image,
  filename,
}: {
  image: string;
  filename?: string;
}) => {
  return (
    <div className="space-y-1">
      <img
        src={image}
        alt={filename ?? "Image part"}
        className="max-h-48 rounded border object-cover"
      />
      {filename ? (
        <p className="text-muted-foreground text-xs">{filename}</p>
      ) : null}
    </div>
  );
};

export function ChainOfThoughtPrimitiveWorkbenchSample() {
  const [mode, setMode] = useState<WorkbenchMode>("static");
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    scenarios[0]!.id,
  );
  const [sessionKey, setSessionKey] = useState(0);
  const [streamFrameIndex, setStreamFrameIndex] = useState(0);
  const [streamPlaying, setStreamPlaying] = useState(true);
  const [streamLoop, setStreamLoop] = useState(true);
  const [useToolActivity, setUseToolActivity] = useState(true);
  const [useCustomTriggerContent, setUseCustomTriggerContent] = useState(true);

  const selectedScenario = useMemo(
    () =>
      scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
      scenarios[0]!,
    [selectedScenarioId],
  );

  const currentMockStreamFrame = mockStreamFrames[streamFrameIndex]!;
  const isLastMockStreamFrame =
    streamFrameIndex === mockStreamFrames.length - 1;
  const activeMessage =
    mode === "mock-stream"
      ? currentMockStreamFrame.message
      : selectedScenario.message;
  const messageProviderKey =
    mode === "mock-stream"
      ? `mock-stream-${sessionKey}`
      : `${selectedScenario.id}-${sessionKey}`;
  const chainOfThoughtConfig = useMemo(
    () => ({
      useToolActivity,
      useCustomTriggerContent,
    }),
    [useCustomTriggerContent, useToolActivity],
  );

  useEffect(() => {
    if (mode !== "mock-stream" || !streamPlaying) return;

    if (isLastMockStreamFrame) {
      if (streamLoop) {
        const resetDelay = currentMockStreamFrame.nextDelayMs ?? 1200;
        const timer = window.setTimeout(() => {
          setStreamFrameIndex(0);
        }, resetDelay);
        return () => window.clearTimeout(timer);
      }

      setStreamPlaying(false);
      return;
    }

    const delayMs = currentMockStreamFrame.nextDelayMs ?? 1200;
    const timer = window.setTimeout(() => {
      setStreamFrameIndex((index) =>
        Math.min(index + 1, mockStreamFrames.length - 1),
      );
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    mode,
    streamPlaying,
    streamLoop,
    isLastMockStreamFrame,
    currentMockStreamFrame.nextDelayMs,
  ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl">CoT Primitive Workbench</h1>
        <p className="text-muted-foreground text-sm">
          Debug the styled Chain of Thought component through the official
          primitive contract (`components.ChainOfThought`).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3 rounded-xl border p-4">
          <div className="space-y-1">
            <p className="font-medium text-sm">Mode</p>
            <p className="text-muted-foreground text-xs">
              Static snapshots or timed mock streaming playback.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={mode === "static" ? "default" : "outline"}
              onClick={() => setMode("static")}
            >
              Static
            </Button>
            <Button
              size="sm"
              variant={mode === "mock-stream" ? "default" : "outline"}
              onClick={() => {
                setMode("mock-stream");
                setStreamFrameIndex(0);
                setStreamPlaying(true);
                setSessionKey((key) => key + 1);
              }}
            >
              Mock stream
            </Button>
          </div>

          {mode === "mock-stream" ? (
            <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-3 text-xs">
              <p className="font-medium text-foreground">Mock stream state</p>
              <p className="text-muted-foreground">
                frame: {streamFrameIndex + 1}/{mockStreamFrames.length} (
                {currentMockStreamFrame.label})
              </p>
              <p className="text-muted-foreground">
                {currentMockStreamFrame.description}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => setStreamPlaying((playing) => !playing)}
                >
                  {streamPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => {
                    setStreamPlaying(false);
                    setStreamFrameIndex((index) =>
                      Math.min(index + 1, mockStreamFrames.length - 1),
                    );
                  }}
                  disabled={isLastMockStreamFrame}
                >
                  Step
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => {
                    setStreamPlaying(false);
                    setStreamFrameIndex(0);
                    setSessionKey((key) => key + 1);
                  }}
                >
                  Restart
                </Button>
              </div>
              <label className="mt-1 flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-input"
                  checked={streamLoop}
                  onChange={(event) => setStreamLoop(event.target.checked)}
                />
                Loop playback
              </label>
            </div>
          ) : null}

          {mode === "mock-stream" ? (
            <div className="space-y-1 rounded-md border border-dashed bg-muted/20 p-3">
              <p className="font-medium text-xs">Playback timeline</p>
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1 text-xs">
                {mockStreamFrames.map((frame, index) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "rounded px-2 py-1",
                      index === streamFrameIndex
                        ? "bg-background text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {index + 1}. {frame.label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="font-medium text-sm">Scenarios</p>
                <p className="text-muted-foreground text-xs">
                  Switch between deterministic message shapes.
                </p>
              </div>

              <div className="space-y-2">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left transition-colors",
                      selectedScenarioId === scenario.id
                        ? "border-foreground bg-muted"
                        : "hover:bg-muted/50",
                    )}
                    onClick={() => {
                      setSelectedScenarioId(scenario.id);
                      setSessionKey((key) => key + 1);
                    }}
                  >
                    <p className="font-medium text-sm">{scenario.label}</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {scenario.description}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-3 text-xs">
            <p className="font-medium text-foreground">Trigger Playground</p>
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 rounded border-input"
                checked={useToolActivity}
                onChange={(event) => setUseToolActivity(event.target.checked)}
              />
              Use `toolActivity` callbacks
            </label>
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 rounded border-input"
                checked={useCustomTriggerContent}
                onChange={(event) =>
                  setUseCustomTriggerContent(event.target.checked)
                }
              />
              Use `renderTriggerContent`
            </label>
            <p className="text-muted-foreground">
              Toggle these to compare default trigger behavior vs custom trigger
              composition.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (mode === "mock-stream") {
                setStreamFrameIndex(0);
                setStreamPlaying(true);
              }
              setSessionKey((key) => key + 1);
            }}
          >
            {mode === "mock-stream" ? "Reset Stream Session" : "Reset Session"}
          </Button>
        </aside>

        <section className="space-y-4">
          <WorkbenchChainOfThoughtConfigContext.Provider
            value={chainOfThoughtConfig}
          >
            <MessageProvider
              key={messageProviderKey}
              message={activeMessage}
              index={0}
            >
              <div className="rounded-xl border bg-background p-4">
                <div className="space-y-2 text-sm">
                  <MessagePrimitive.Parts
                    components={{
                      ChainOfThought: DebugChainOfThought,
                      Text: MarkdownText,
                      Source: SourcePart,
                      data: {
                        Fallback: DataPart,
                      },
                      Image: ImagePart,
                    }}
                  />
                </div>
              </div>
              <MessageStatePanel />
            </MessageProvider>
          </WorkbenchChainOfThoughtConfigContext.Provider>
        </section>
      </div>
    </div>
  );
}
