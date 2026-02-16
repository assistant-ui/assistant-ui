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
  | "mixed"
  | "chaos"
  | "json-patch-semantics"
  | "missing-instance"
  | "parent-graph";

const isScenario = (value: string | null): value is Scenario => {
  return (
    value === "component-part" ||
    value === "json-render-patch" ||
    value === "json-render-guards" ||
    value === "mixed" ||
    value === "chaos" ||
    value === "json-patch-semantics" ||
    value === "missing-instance" ||
    value === "parent-graph"
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
  if (lastUserText.includes("semantics")) return "json-patch-semantics";
  if (lastUserText.includes("patch")) return "json-render-patch";
  if (lastUserText.includes("chaos")) return "chaos";
  if (lastUserText.includes("missing")) return "missing-instance";
  if (lastUserText.includes("parent")) return "parent-graph";
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
    instanceId: "componentDemo1",
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
    "Streaming catalog-targeted data-spec updates with monotonic seq + JSON patches.",
  );

  writeData(writer, "spec", {
    instanceId: "specDemo1",
    name: "json-render",
    seq: 1,
    spec: {
      type: "status-board",
      props: {
        title: "Deploy Pipeline",
        state: "running",
        items: ["Lint", "Build", "Integration"],
      },
    },
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "specDemo1",
    seq: 2,
    patch: [
      {
        op: "replace",
        path: "/props/title",
        value: "Deploy Pipeline (Promotion)",
      },
      { op: "replace", path: "/props/state", value: "verifying" },
      { op: "add", path: "/props/items/3", value: "E2E" },
    ],
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "specDemo1",
    seq: 3,
    patch: [
      { op: "replace", path: "/props/state", value: "complete" },
      { op: "add", path: "/props/items/4", value: "Release" },
    ],
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
    instanceId: "specDemo2",
    name: "json-render",
    seq: 2,
    spec: {
      type: "audit-log",
      props: {
        title: "Guardrail Demo",
        status: "baseline",
        entries: ["seq=2 baseline accepted"],
      },
    },
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "specDemo2",
    seq: 1,
    patch: [
      { op: "replace", path: "/props/status", value: "stale-update" },
      { op: "add", path: "/props/entries/1", value: "seq=1 stale" },
    ],
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "specDemo2",
    seq: 3,
    patch: [{ op: "replace", path: "props/status", value: "malformed-path" }],
  });

  await sleep(120);
  writeData(writer, "spec", {
    instanceId: "specDemo2",
    seq: 4,
    patch: [
      { op: "replace", path: "/props/status", value: "recovered" },
      { op: "add", path: "/props/entries/1", value: "seq=4 recovered" },
    ],
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
    instanceId: "componentDemo2",
    props: {
      title: "Native Component",
      status: "ready",
      details: "Rendered through Component.byName mapping.",
    },
  });

  await sleep(80);
  writeData(writer, "spec", {
    instanceId: "specDemo3",
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

  await sleep(80);
  writeData(writer, "spec", {
    instanceId: "specDemo3",
    seq: 2,
    patch: [
      { op: "replace", path: "/props/values/p95", value: 147 },
      { op: "replace", path: "/props/values/errors", value: 1 },
    ],
  });

  await sleep(80);
  writeData(writer, "spec", {
    instanceId: "specDemoFallback",
    name: "json-render",
    seq: 1,
    spec: {
      type: "unknown-widget",
      props: {
        title: "Unregistered Spec Type",
        detail: "This should route through catalog fallback.",
      },
    },
  });

  await sleep(80);
  writeData(writer, "spec", {
    instanceId: "specDemoFallback",
    seq: 2,
    patch: [
      {
        op: "replace",
        path: "/props/detail",
        value: "Fallback stayed active after patch update.",
      },
    ],
  });
};

const runChaosScenario = async (writer: UIMessageStreamWriter<UIMessage>) => {
  writeText(
    writer,
    "t-chaos-1",
    "Chaos scenario: interleaved multi-instance updates with duplicate/out-of-order seq and malformed patches.",
  );

  writeData(writer, "spec", {
    instanceId: "specChaosA",
    name: "json-render",
    seq: 1,
    spec: {
      type: "metrics",
      props: {
        title: "Chaos Metrics A",
        values: { p95: 220, errors: 0 },
      },
    },
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosB",
    name: "json-render",
    seq: 1,
    spec: {
      type: "status-board",
      props: {
        title: "Chaos Board B",
        state: "queued",
        items: ["Queue"],
      },
    },
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosA",
    seq: 2,
    patch: [{ op: "replace", path: "/props/values/p95", value: 180 }],
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosB",
    seq: 3,
    patch: [
      { op: "replace", path: "/props/state", value: "running" },
      { op: "add", path: "/props/items/1", value: "Build" },
    ],
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosA",
    seq: 2,
    patch: [{ op: "replace", path: "/props/values/p95", value: 170 }],
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosB",
    seq: 2,
    patch: [{ op: "replace", path: "/props/state", value: "stale-running" }],
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosB",
    seq: 4,
    patch: [{ op: "replace", path: "props/state", value: "malformed" }],
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosA",
    seq: 3,
    patch: [{ op: "replace", path: "/props/values/errors", value: 2 }],
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "specChaosB",
    seq: 5,
    patch: [
      { op: "replace", path: "/props/state", value: "complete" },
      { op: "add", path: "/props/items/2", value: "Release" },
    ],
  });
};

const runJsonPatchSemanticsScenario = async (
  writer: UIMessageStreamWriter<UIMessage>,
) => {
  writeText(
    writer,
    "t-json-semantics-1",
    "JSON patch semantics scenario: add/replace/remove, array append, root replacement, escaped tokens.",
  );

  writeData(writer, "spec", {
    instanceId: "specPatchSemantics",
    name: "json-render",
    seq: 1,
    spec: {
      type: "patch-lab",
      props: {
        title: "Patch Semantics",
        status: "phase-1",
        entries: ["alpha"],
        list: ["one"],
        complex: {
          "a/b": "slash-0",
          "a~b": "tilde-0",
        },
      },
    },
  });

  await sleep(100);
  writeData(writer, "spec", {
    instanceId: "specPatchSemantics",
    seq: 2,
    patch: [
      {
        op: "replace",
        path: "",
        value: {
          type: "patch-lab",
          props: {
            title: "Patch Semantics (Root Replaced)",
            status: "phase-2",
            entries: ["root"],
            list: ["one"],
            complex: {
              "a/b": "slash-1",
              "a~b": "tilde-1",
            },
          },
        },
      },
    ],
  });

  await sleep(100);
  writeData(writer, "spec", {
    instanceId: "specPatchSemantics",
    seq: 3,
    patch: [
      { op: "add", path: "/props/list/-", value: "two" },
      { op: "replace", path: "/props/complex/a~1b", value: "slash-2" },
      { op: "replace", path: "/props/complex/a~0b", value: "tilde-2" },
      { op: "add", path: "/props/entries/-", value: "appended" },
      { op: "remove", path: "/props/list/0" },
    ],
  });

  await sleep(100);
  writeData(writer, "spec", {
    instanceId: "specPatchSemantics",
    seq: 4,
    patch: [
      { op: "remove", path: "/props/entries/0" },
      { op: "replace", path: "/props/status", value: "phase-3" },
    ],
  });
};

const runMissingInstanceScenario = async (
  writer: UIMessageStreamWriter<UIMessage>,
) => {
  writeText(
    writer,
    "t-missing-instance-1",
    "Missing-instance scenario: component-part and json-render actions should fail deterministically for invoke.",
  );

  await sleep(80);
  writeData(writer, "component", {
    name: "status-card",
    props: {
      title: "Missing instanceId (component-part)",
      status: "degraded",
      details:
        "invoke should report 'Missing instanceId'; emit should stay disabled.",
    },
  });

  await sleep(80);
  writeData(writer, "component", {
    name: "json-render",
    props: {
      spec: {
        type: "status-board",
        props: {
          title: "Missing instanceId (json-render)",
          state: "degraded",
          items: ["Invoke should reject with explicit error"],
        },
      },
    },
  });

  await sleep(80);
  writeData(writer, "spec", {
    name: "json-render",
    seq: 1,
    spec: {
      type: "metrics",
      props: {
        title: "Malformed data-spec",
      },
    },
  });
};

const runParentGraphScenario = async (
  writer: UIMessageStreamWriter<UIMessage>,
) => {
  writeText(
    writer,
    "t-parent-graph-1",
    "Parent graph scenario: parentId-linked components across native and json-render lanes.",
  );

  await sleep(70);
  writeData(writer, "component", {
    name: "status-card",
    instanceId: "graphParent",
    props: {
      title: "Graph Parent",
      status: "active",
      details: "Top-level component node",
    },
  });

  await sleep(70);
  writeData(writer, "component", {
    name: "status-card",
    instanceId: "graphChild",
    parentId: "graphParent",
    props: {
      title: "Graph Child",
      status: "active",
      details: "Child component referencing graphParent",
    },
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "graphSpec",
    parentId: "graphChild",
    name: "json-render",
    seq: 1,
    spec: {
      type: "metrics",
      props: {
        title: "Graph Metrics",
        values: { p95: 201, errors: 0 },
      },
    },
  });

  await sleep(70);
  writeData(writer, "spec", {
    instanceId: "graphSpecChild",
    parentId: "graphSpec",
    name: "json-render",
    seq: 1,
    spec: {
      type: "status-board",
      props: {
        title: "Graph Nested Status",
        state: "running",
        items: ["Graph Sync"],
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
      } else if (scenario === "mixed") {
        await runMixedScenario(writer);
      } else if (scenario === "chaos") {
        await runChaosScenario(writer);
      } else if (scenario === "json-patch-semantics") {
        await runJsonPatchSemanticsScenario(writer);
      } else if (scenario === "missing-instance") {
        await runMissingInstanceScenario(writer);
      } else {
        await runParentGraphScenario(writer);
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
