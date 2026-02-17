import { openai } from "@ai-sdk/openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessageStreamWriter,
} from "ai";
import type { UIMessage } from "ai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type FormulaProposal = {
  id: string;
  agent: string;
  formula: string;
  rationale: string;
  confidence: number;
  handling?: string;
  impact?: string;
};

type FormulaCouncil = {
  title: string;
  goal: string;
  metricLabel: string;
  targetRange: string;
  proposals: FormulaProposal[];
};

const APPLY_FORMULA_PREFIX = "APPLY_FORMULA::";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const COMPONENT_STAGE_DELAY_MS = 620;

const getLastUserText = (messages: UIMessage[]) => {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  if (!lastUserMessage?.parts) return "";

  return lastUserMessage.parts
    .filter(
      (
        part,
      ): part is Extract<
        (typeof lastUserMessage.parts)[number],
        { type: "text" }
      > => part.type === "text",
    )
    .map((part) => part.text)
    .join(" ")
    .trim();
};

const getTargetRange = (text: string) =>
  text.match(/\b([A-Z]{1,3}\d+(?::[A-Z]{1,3}\d+)?)\b/i)?.[1]?.toUpperCase() ??
  "F6:F11";

const getFirstRowFromRange = (range: string) => {
  const firstRow = range.match(/\d+/)?.[0];
  return firstRow ? Number.parseInt(firstRow, 10) : 2;
};

const normalizeFormula = (formula: string) => {
  const trimmed = formula.trim();
  return trimmed.startsWith("=") ? trimmed : `=${trimmed}`;
};

const maybeExtractInlineFormula = (text: string) => {
  const inBackticks = text.match(/`(=[^`]+)`/)?.[1];
  if (inBackticks) return normalizeFormula(inBackticks);

  const inline = text.match(/(=[A-Z0-9$()+\-/*,:."'\s]+)(?:\s|$)/i)?.[1];
  if (!inline) return null;
  return normalizeFormula(inline.trim());
};

const shouldRenderFormulaCouncil = (text: string) => {
  if (!text) return false;
  if (text.includes(APPLY_FORMULA_PREFIX)) return false;

  const normalized = text.toLowerCase();
  const intentWords = [
    "formula council",
    "formula options",
    "compare formula",
    "preview formula",
    "which formula",
    "best formula",
    "formula builder",
    "suggest formula",
    "definition panel",
    "metric definition",
    "kpi definition",
  ];

  return (
    intentWords.some((word) => normalized.includes(word)) ||
    (normalized.includes("formula") &&
      (normalized.includes("compare") ||
        normalized.includes("preview") ||
        normalized.includes("option") ||
        normalized.includes("suggest")))
  );
};

const detectMetricSetup = (text: string, startRow: number) => {
  const normalized = text.toLowerCase();
  if (normalized.includes("cac")) {
    return {
      metricLabel: "CAC (Spend / Paid)",
      baseFormula: `=B${startRow}/E${startRow}`,
    };
  }

  if (normalized.includes("roas")) {
    return {
      metricLabel: "ROAS ((Paid × 180) / Spend)",
      baseFormula: `=(E${startRow}*180)/B${startRow}`,
    };
  }

  if (normalized.includes("trial")) {
    return {
      metricLabel: "Trial-to-Paid Rate (Paid / Trials)",
      baseFormula: `=E${startRow}/D${startRow}`,
    };
  }

  return {
    metricLabel: "Paid Conversion Rate (Paid / Visitors)",
    baseFormula: `=E${startRow}/C${startRow}`,
  };
};

const getDenominatorRef = (formula: string, startRow: number) => {
  const denominatorCol = formula
    .match(/\/\s*\(?\s*([A-Z]{1,3})\d+/i)?.[1]
    ?.toUpperCase();
  return `${denominatorCol ?? "C"}${startRow}`;
};

const buildFormulaCouncil = (userText: string): FormulaCouncil => {
  const targetRange = getTargetRange(userText);
  const startRow = getFirstRowFromRange(targetRange);
  const explicitFormula = maybeExtractInlineFormula(userText);
  const metricSetup = detectMetricSetup(userText, startRow);
  const baseFormula = explicitFormula ?? metricSetup.baseFormula;
  const baseFormulaBody = baseFormula.replace(/^=/, "");
  const denominatorRef = getDenominatorRef(baseFormula, startRow);

  return {
    title: "Metric Definition Panel",
    goal: "Pick a metric-definition policy, preview impact, then apply with one click.",
    metricLabel: explicitFormula
      ? "Custom Formula Policy"
      : metricSetup.metricLabel,
    targetRange,
    proposals: [
      {
        id: "finance-safe",
        agent: "Finance Safe",
        formula: `=IFERROR(${baseFormulaBody},"")`,
        rationale:
          "Suppresses invalid rows instead of injecting synthetic values.",
        handling: "Blank on bad data",
        impact: "Clean executive rollups with fewer false movements.",
        confidence: 0.9,
      },
      {
        id: "ops-default",
        agent: "Ops Default",
        formula: `=IFERROR(ROUND(${baseFormulaBody},4),0)`,
        rationale:
          "Keeps dashboards numerically stable and compatible with alerts.",
        handling: "Zero fallback + rounded output",
        impact: "Best for operational dashboards and week-over-week tracking.",
        confidence: 0.86,
      },
      {
        id: "qa-watch",
        agent: "QA Watch",
        formula: `=IF(${denominatorRef}=0,"REVIEW",ROUND(${baseFormulaBody},4))`,
        rationale:
          "Flags problematic rows explicitly so data issues are visible to the team.",
        handling: "REVIEW flag on zero-denominator rows",
        impact: "Best for triage and source-data cleanup workflows.",
        confidence: 0.78,
      },
    ],
  };
};

const writeText = (
  writer: UIMessageStreamWriter<UIMessage>,
  id: string,
  text: string,
) => {
  writer.write({ type: "text-start", id });
  writer.write({ type: "text-delta", id, delta: text });
  writer.write({ type: "text-end", id });
};

const writeStreamingText = async (
  writer: UIMessageStreamWriter<UIMessage>,
  id: string,
  deltas: string[],
  delayMs: number,
) => {
  writer.write({ type: "text-start", id });
  for (const delta of deltas) {
    writer.write({ type: "text-delta", id, delta });
    await wait(delayMs);
  }
  writer.write({ type: "text-end", id });
};

export async function POST(req: Request) {
  const {
    messages,
    tools,
  }: {
    messages: UIMessage[];
    tools: Record<string, any>;
  } = await req.json();
  const lastUserText = getLastUserText(messages);

  if (shouldRenderFormulaCouncil(lastUserText)) {
    const council = buildFormulaCouncil(lastUserText);
    const instanceId = `formula-council-${Date.now()}`;

    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messages,
      execute: async ({ writer }) => {
        writer.write({ type: "start" });

        await writeStreamingText(
          writer,
          "formula-council-intro",
          [
            "Profiling metric intent and row quality...\n",
            "Drafting policy options for KPI definitions...\n",
            "Streaming Metric Definition Panel options as they arrive.",
          ],
          160,
        );

        writer.write({
          type: "data-spec",
          data: {
            name: "formula-council",
            instanceId,
            seq: 1,
            spec: {
              title: council.title,
              goal: council.goal,
              metricLabel: council.metricLabel,
              targetRange: council.targetRange,
              expectedCount: council.proposals.length,
              streaming: true,
              stage: "Panel initialized. Evaluating policy options...",
              proposals: [],
            },
          },
        });

        await wait(COMPONENT_STAGE_DELAY_MS);
        await writeStreamingText(
          writer,
          "formula-council-stage-1",
          ["Finance Safe candidate ready...\n", "Sending proposal 1 of 3."],
          180,
        );
        writer.write({
          type: "data-spec",
          data: {
            instanceId,
            seq: 2,
            patch: [
              {
                op: "replace",
                path: "/stage",
                value: "Finance policy candidate streamed (1/3)",
              },
              {
                op: "add",
                path: "/proposals/0",
                value: council.proposals[0],
              },
            ],
          },
        });

        await wait(COMPONENT_STAGE_DELAY_MS);
        await writeStreamingText(
          writer,
          "formula-council-stage-2",
          ["Ops Default candidate ready...\n", "Sending proposal 2 of 3."],
          180,
        );
        writer.write({
          type: "data-spec",
          data: {
            instanceId,
            seq: 3,
            patch: [
              {
                op: "replace",
                path: "/stage",
                value: "Operations policy candidate streamed (2/3)",
              },
              {
                op: "add",
                path: "/proposals/1",
                value: council.proposals[1],
              },
            ],
          },
        });

        await wait(COMPONENT_STAGE_DELAY_MS);
        await writeStreamingText(
          writer,
          "formula-council-stage-3",
          ["QA Watch candidate ready...\n", "Sending proposal 3 of 3."],
          180,
        );
        writer.write({
          type: "data-spec",
          data: {
            instanceId,
            seq: 4,
            patch: [
              {
                op: "replace",
                path: "/stage",
                value: "QA policy candidate streamed (3/3)",
              },
              {
                op: "add",
                path: "/proposals/2",
                value: council.proposals[2],
              },
            ],
          },
        });

        await wait(220);
        writer.write({
          type: "data-spec",
          data: {
            instanceId,
            seq: 5,
            patch: [
              { op: "replace", path: "/streaming", value: false },
              {
                op: "replace",
                path: "/stage",
                value: "Panel complete. Review and apply a definition.",
              },
            ],
          },
        });

        writeText(
          writer,
          "formula-council-ready",
          "Metric Definition Panel is ready. Select a policy and click Apply Definition.",
        );

        writer.write({
          type: "finish",
          finishReason: "stop",
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  const result = streamText({
    model: openai("gpt-4o"),
    system: `
You are an AI collaborator editing a live spreadsheet with the user.

If the user asks for spreadsheet edits, call update_sheet_range.
Rules for update_sheet_range:
- Use an A1 range.
- values must be rectangular and match the intended range shape.
- Keep each call reasonably small.

When the user asks for formula work:
- Use preview_formula to show a safe preview before mutation.
- Use apply_formula to commit formula changes.
- If the user message starts with APPLY_FORMULA::, parse the JSON payload and call apply_formula immediately with its range/formula.

After calling the tool, summarize exactly what changed.
`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      ...frontendTools(tools),
    },
  });

  return result.toUIMessageStreamResponse();
}
