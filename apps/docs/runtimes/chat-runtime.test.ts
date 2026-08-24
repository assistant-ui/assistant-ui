import { afterEach, expect, it, vi } from "vitest";

const useChatRuntime = vi.hoisted(() => vi.fn(() => ({ runtime: true })));

vi.mock("@assistant-ui/ai-sdk", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useChatRuntime,
  AssistantChatTransport: class {
    options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
  },
}));

const options = () =>
  useChatRuntime.mock.calls.at(-1)![0] as Record<string, unknown>;

afterEach(() => {
  useChatRuntime.mockClear();
});

it("omits sendAutomaticallyWhen unless the surface opts in", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");

  useDocsChatRuntime();

  expect("sendAutomaticallyWhen" in options()).toBe(false);
});

it("sets sendAutomaticallyWhen for a surface that opts in", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");

  useDocsChatRuntime({ sendAutomatically: true });

  expect(typeof options().sendAutomaticallyWhen).toBe("function");
});

it("omits api and cloud when the surface supplies neither", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");

  useDocsChatRuntime();

  expect("cloud" in options()).toBe(false);
  expect(
    (options().transport as { options: { api?: string } }).options.api,
  ).toBe(undefined);
});

it("passes through the api, cloud and adapters a surface supplies", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");
  const cloud = {} as never;
  const adapters = { feedback: {} } as never;

  useDocsChatRuntime({ api: "/api/doc/chat", cloud, adapters });

  expect(
    (options().transport as { options: { api?: string } }).options.api,
  ).toBe("/api/doc/chat");
  expect(options().cloud).toBe(cloud);
  expect(options().adapters).toBe(adapters);
});
