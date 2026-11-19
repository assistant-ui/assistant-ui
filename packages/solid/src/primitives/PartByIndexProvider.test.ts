import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";
import { PartByIndexProvider } from "./PartByIndexProvider";

const createTestRuntime = () => {
  let content: ThreadMessageLike["content"] = [{ type: "text", text: "hello" }];
  const makeAdapter = () => ({
    messages: [{ id: "a", role: "assistant" as const, content }],
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    setContent: (next: ThreadMessageLike["content"]) => {
      content = next;
      core.setAdapter(makeAdapter());
    },
  };
};
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (
  runtime: AssistantRuntimeImpl,
  getIndex: () => number = () => 0,
) => {
  const Probe = () => {
    const part = useAuiState((s) => s.part);
    return createComponent(Dynamic, {
      component: "span",
      get children() {
        const value = part();
        return value.type === "text" ? value.text : value.type;
      },
    });
  };
  const el = document.createElement("div");
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(MessageByIdProvider, {
            id: "a",
            get children() {
              return createComponent(PartByIndexProvider, {
                get index() {
                  return getIndex();
                },
                get children() {
                  return createComponent(Probe, {});
                },
              });
            },
          });
        },
      }),
    el,
  );
  disposers.push(dispose);
  return { el };
};
const text = (text: string) => [{ type: "text" as const, text }];

describe("PartByIndexProvider shrink races", () => {
  it("reports a provider still out of bounds after the update settles", async () => {
    const { runtime, setContent } = createTestRuntime();
    const { el } = mount(runtime);
    expect(el.textContent).toBe("hello");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setContent([]));
    expect(error).not.toHaveBeenCalled();
    expect(el.textContent).toBe("hello");
    await Promise.resolve();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        "PartByIndexProvider: index 0 is still out of bounds",
      ),
    );
  });

  it("a same-tick recovery keeps the refreshed cache and a later shrink still expires", async () => {
    const { runtime, setContent } = createTestRuntime();
    const { el } = mount(runtime);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setContent([]));
    flushTapSync(() => setContent(text("restored")));
    expect(el.textContent).toBe("restored");
    flushTapSync(() => setContent([]));
    expect(error).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        "PartByIndexProvider: index 0 is still out of bounds",
      ),
    );
    flushTapSync(() => setContent(text("again")));
    expect(el.textContent).toBe("again");
    await Promise.resolve();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("a recovered cache survives expiry and still guards a later shrink", async () => {
    const { runtime, setContent } = createTestRuntime();
    const { el } = mount(runtime);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setContent([]));
    flushTapSync(() => setContent(text("restored")));
    await Promise.resolve();
    expect(el.textContent).toBe("restored");
    expect(error).not.toHaveBeenCalled();
    flushTapSync(() => setContent([]));
    expect(error).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        "PartByIndexProvider: index 0 is still out of bounds",
      ),
    );
  });

  it("a never-valid part index still throws when read", () => {
    const { runtime } = createTestRuntime();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => mount(runtime, () => 99)).toThrow(/out of bounds/);
  });

  it("updates its live index and does not report the previous index", async () => {
    const { runtime, setContent } = createTestRuntime();
    flushTapSync(() =>
      setContent([
        { type: "text", text: "first" },
        { type: "reasoning", text: "thinking" },
      ]),
    );
    const [index, setIndex] = createSignal(1);
    const { el } = mount(runtime, index);
    expect(el.textContent).toBe("reasoning");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setContent(text("first")));
    setIndex(0);
    await vi.waitFor(() => expect(el.textContent).toBe("first"));
    expect(error).not.toHaveBeenCalled();
  });
});
