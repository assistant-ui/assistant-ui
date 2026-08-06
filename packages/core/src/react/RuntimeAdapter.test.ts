import { describe, expect, it, vi } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "../store";
import { ExternalStoreRuntimeCore } from "../runtimes/internal";
import { AssistantRuntimeImpl } from "../runtime/internal";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";

type DemoMessage = { role: "user" | "assistant"; text: string };

const createRuntime = (
  overrides?: Partial<ExternalStoreAdapter<DemoMessage>>,
) => {
  const onNew = vi.fn(async () => {});
  const adapter: ExternalStoreAdapter<DemoMessage> = {
    messages: [{ role: "user", text: "hi" }],
    convertMessage: (message) => ({
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    onNew,
    ...overrides,
  };
  const runtime = new AssistantRuntimeImpl(
    new ExternalStoreRuntimeCore(adapter),
  );
  return { runtime, onNew };
};

describe("RuntimeAdapter via the neutral store entry", () => {
  it("mounts a runtime into a standalone client without React", () => {
    const { runtime } = createRuntime();
    const handle = createAssistantClient(
      AuiConfig({ threads: RuntimeAdapter(runtime) }),
    );
    const aui = handle.getClient();

    const messages = aui.thread.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]!.content[0]).toMatchObject({
      type: "text",
      text: "hi",
    });

    expect(aui.threads.getState().mainThreadId).toBeDefined();
    expect(aui.tools.getState()).toBeDefined();
    expect(aui.dataRenderers.getState()).toBeDefined();

    handle.destroy();
  });

  it("routes composer sends to the external store adapter", async () => {
    const { runtime, onNew } = createRuntime();
    const handle = createAssistantClient(
      AuiConfig({ threads: RuntimeAdapter(runtime) }),
    );
    const aui = handle.getClient();

    flushTapSync(() => aui.composer.setText("hello"));
    flushTapSync(() => aui.composer.send());
    await new Promise((resolve) => setTimeout(resolve));

    expect(onNew).toHaveBeenCalledTimes(1);
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
    });

    handle.destroy();
  });

  it("registers the client's model context on the runtime", () => {
    const { runtime } = createRuntime();
    const register = vi.spyOn(runtime, "registerModelContextProvider");

    const handle = createAssistantClient(
      AuiConfig({ threads: RuntimeAdapter(runtime) }),
    );

    // Dev mode double-mounts the root (StrictMode emulation), so assert
    // presence rather than an exact count
    expect(register).toHaveBeenCalled();

    handle.destroy();
  });
});
