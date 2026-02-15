import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";

export const maxDuration = 30;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Scenario =
  | "component-part"
  | "json-render-patch"
  | "json-render-guards"
  | "mixed";

const isScenario = (value: string | null): value is Scenario => {
  return (
    value === "component-part" ||
    value === "json-render-patch" ||
    value === "json-render-guards" ||
    value === "mixed"
  );
};

const getLastUserText = (messages: UIMessage[]): string => {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUserMessage?.parts) return "";

  return lastUserMessage.parts
    .filter(
      (
        part,
      ): part is Extract<
        (typeof lastUserMessage.parts)[number],
        { type: "text"; text: string }
      > => part.type === "text",
    )
    .map((part) => part.text)
    .join(" ")
    .toLowerCase();
};

const resolveScenario = (
  requestedScenario: string | null,
  messages: UIMessage[],
): Scenario => {
  if (isScenario(requestedScenario)) return requestedScenario;

  const lastUserText = getLastUserText(messages);
  if (lastUserText.includes("guard")) return "json-render-guards";
  if (lastUserText.includes("patch")) return "json-render-patch";
  if (lastUserText.includes("mixed")) return "mixed";

  return "component-part";
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

const writeData = (
  writer: UIMessageStreamWriter<UIMessage>,
  name: string,
  data: unknown,
) => {
  writer.write({
    type: `data-${name}`,
    data,
  });
};

const runComponentPartScenario = async (
  writer: UIMessageStreamWriter<UIMessage>,
) => {
  writeText(
    writer,
    "t-component-1",
    "Rendering native component parts (data-component -> component).",
  );

  await sleep(80);
  writeData(writer, "component", {
    name: "status-card",
    props: {
      title: "Component Part Smoke Test",
      status: "active",
      details:
        "This card is delivered through the additive data-component lane.",
      checkList: ["Renderer mapping", "Props hydration", "Fallback behavior"],
    },
  });

  await sleep(80);
  writeData(writer, "component", {
    name: "unknown-demo",
    props: {
      note: "This intentionally hits the fallback renderer.",
    },
  });
};

const runJsonRenderPatchScenario = async (
  writer: UIMessageStreamWriter<UIMessage>,
) => {
  writeText(
    writer,
    "t-json-patch-1",
    "Streaming data-spec updates with monotonic seq + JSON patch operations.",
  );

  writeData(writer, "spec", {
    instanceId: "spec_demo_1",
    name: "json-render",
    seq: 1,
    spec: {
      type: "status-board",
      props: {
        title: "Deploy Pipeline",
        state: "running",
        items: ["Lint", "Build"],
      },
    },
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "spec_demo_1",
    seq: 2,
    patch: [
      {
        op: "replace",
        path: "/props/title",
        value: "Deploy Pipeline (Updated)",
      },
      { op: "add", path: "/props/items/2", value: "E2E" },
    ],
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "spec_demo_1",
    seq: 3,
    patch: [{ op: "replace", path: "/props/state", value: "complete" }],
  });
};

const runJsonRenderGuardsScenario = async (
  writer: UIMessageStreamWriter<UIMessage>,
) => {
  writeText(
    writer,
    "t-json-guards-1",
    "Injecting stale seq + malformed patch to validate guardrails and telemetry.",
  );

  writeData(writer, "spec", {
    instanceId: "spec_demo_2",
    name: "json-render",
    seq: 2,
    spec: {
      type: "audit-log",
      props: {
        title: "Guardrail Demo",
        status: "baseline",
      },
    },
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "spec_demo_2",
    seq: 1,
    patch: [{ op: "replace", path: "/props/status", value: "stale-update" }],
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "spec_demo_2",
    seq: 3,
    patch: [{ op: "replace", path: "props/status", value: "malformed-path" }],
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "spec_demo_2",
    seq: 4,
    patch: [{ op: "replace", path: "/props/status", value: "recovered" }],
  });
};

const runMixedScenario = async (writer: UIMessageStreamWriter<UIMessage>) => {
  writeText(
    writer,
    "t-mixed-1",
    "Mixed scenario: native component part + json-render spec lane in one response.",
  );

  await sleep(80);
  writeData(writer, "component", {
    name: "status-card",
    props: {
      title: "Native Component",
      status: "ready",
      details: "Rendered through Component.by_name mapping.",
    },
  });

  await sleep(80);
  writeData(writer, "spec", {
    instanceId: "spec_demo_3",
    name: "json-render",
    seq: 1,
    spec: {
      type: "metrics",
      props: {
        title: "Live Metrics",
        values: { p95: 182, errors: 0 },
      },
    },
  });
};

export async function POST(req: Request) {
  const url = new URL(req.url);
  const requestedScenario = url.searchParams.get("scenario");
  const { messages }: { messages: UIMessage[] } = await req.json();
  const scenario = resolveScenario(requestedScenario, messages);

  const stream = createUIMessageStream<UIMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      writer.write({
        type: "start",
        messageMetadata: { scenario },
      });

      if (scenario === "component-part") {
        await runComponentPartScenario(writer);
      } else if (scenario === "json-render-patch") {
        await runJsonRenderPatchScenario(writer);
      } else if (scenario === "json-render-guards") {
        await runJsonRenderGuardsScenario(writer);
      } else {
        await runMixedScenario(writer);
      }

      writer.write({
        type: "finish",
        finishReason: "stop",
        messageMetadata: { scenario },
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
