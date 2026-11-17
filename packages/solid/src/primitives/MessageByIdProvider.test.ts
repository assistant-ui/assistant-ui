import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";

const createTestRuntime = () => {
  let messages = [
    { id: "a", role: "user" as const, content: "first" },
    { id: "b", role: "user" as const, content: "second" },
  ];
  const makeAdapter = () => ({
    messages,
    convertMessage: (message: (typeof messages)[number]) => message,
    onNew: async () => {},
    onEdit: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    removeFirst: () => {
      messages = messages.slice(1);
      core.setAdapter(makeAdapter());
    },
  };
};
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (runtime: AssistantRuntimeImpl, getId: () => string) => {
  let client!: AssistantClient;
  const Probe = () => {
    client = useAui();
    const id = useAuiState((s) => s.message.id);
    return id as unknown as import("solid-js").JSX.Element;
  };
  const el = document.createElement("div");
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(MessageByIdProvider, {
            get id() {
              return getId();
            },
            get children() {
              return createComponent(Probe, {});
            },
          });
        },
      }),
    el,
  );
  disposers.push(dispose);
  return { el, client: () => client };
};

describe("MessageByIdProvider", () => {
  it("updates its live id and scopes the matching edit composer", async () => {
    const { runtime } = createTestRuntime();
    const [id, setId] = createSignal("a");
    const { el, client } = mount(runtime, id);
    expect(el.textContent).toBe("a");
    flushTapSync(() => client().composer.beginEdit());
    expect(
      runtime.thread.getMessageById("a").composer.getState().isEditing,
    ).toBe(true);
    setId("b");
    await vi.waitFor(() => expect(el.textContent).toBe("b"));
    expect(client().composer.getState().isEditing).toBe(false);
    flushTapSync(() => client().composer.beginEdit());
    expect(
      runtime.thread.getMessageById("b").composer.getState().isEditing,
    ).toBe(true);
  });

  it("reports a mounted missing id after the update settles", async () => {
    const { runtime, removeFirst } = createTestRuntime();
    const { el } = mount(runtime, () => "a");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(removeFirst);
    expect(el.textContent).toBe("a");
    expect(error).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('MessageByIdProvider: id "a"'),
    );
  });

  it("does not report an old id after its prop changes", async () => {
    const { runtime, removeFirst } = createTestRuntime();
    const [id, setId] = createSignal("a");
    const { el } = mount(runtime, id);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(removeFirst);
    setId("b");
    await vi.waitFor(() => expect(el.textContent).toBe("b"));
    expect(error).not.toHaveBeenCalled();
  });

  it("throws when an id has never existed", () => {
    const { runtime } = createTestRuntime();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => mount(runtime, () => "missing")).toThrow();
  });
});
