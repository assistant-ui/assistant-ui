import type {
  AssistantRuntime,
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadAssistantMessage,
} from "@assistant-ui/core";
import { afterEach, describe, expect, it, vi } from "vitest";

const adapterRef = vi.hoisted(() => ({
  current: undefined as ChatModelAdapter | undefined,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useLocalRuntime: (adapter: ChatModelAdapter) => {
    adapterRef.current = adapter;
    return {} as AssistantRuntime;
  },
}));

import { useDataStreamRuntime } from "./useDataStreamRuntime";

const CaptureRuntime = () => {
  useDataStreamRuntime({ api: "/api/chat" });
  return null;
};

const createMessage = (
  state: ThreadAssistantMessage["metadata"]["unstable_state"],
): ThreadAssistantMessage => ({
  id: "assistant",
  role: "assistant",
  content: [],
  status: { type: "running" },
  createdAt: new Date(),
  metadata: {
    unstable_state: state,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const runWithState = async (
  state: ThreadAssistantMessage["metadata"]["unstable_state"],
) => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("failed", { status: 500 }));
  CaptureRuntime();

  const message = createMessage(state);
  const result = adapterRef.current!.run({
    messages: [],
    runConfig: {},
    abortSignal: new AbortController().signal,
    context: {},
    unstable_getMessage: () => message,
  } satisfies ChatModelRunOptions) as AsyncGenerator;

  await expect(result.next()).rejects.toThrow("Status 500");

  const request = fetchMock.mock.calls[0]?.[1];
  return JSON.parse(request?.body as string) as Record<string, unknown>;
};

afterEach(() => {
  adapterRef.current = undefined;
  vi.restoreAllMocks();
});

describe("useDataStreamRuntime request state", () => {
  it.each([
    ["false", false],
    ["zero", 0],
    ["an empty string", ""],
  ])("sends %s state", async (_label, state) => {
    await expect(runWithState(state)).resolves.toMatchObject({ state });
  });

  it("omits null state", async () => {
    await expect(runWithState(null)).resolves.not.toHaveProperty("state");
  });
});
