import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import {
  SuggestionPrimitiveDescription,
  SuggestionPrimitiveTitle,
  SuggestionPrimitiveTrigger,
  ThreadPrimitiveSuggestions,
} from "../primitives/suggestions";

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };

const createSuggestingRuntime = () => {
  let isRunning = false;
  const onNew = vi.fn(async () => {});
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages: [],
    isRunning,
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    onNew,
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const sync = () => core.setAdapter(makeAdapter());
  const setRunning = (value: boolean) => {
    isRunning = value;
    sync();
  };
  return { runtime, onNew, setRunning };
};

const mountSuggestions = (
  runtime: AssistantRuntimeImpl,
  triggerProps?: Record<string, unknown>,
) => {
  const View = defineComponent({
    setup: () => () =>
      h(ThreadPrimitiveSuggestions, null, {
        default: () =>
          h(
            SuggestionPrimitiveTrigger,
            { class: "chip", ...triggerProps },
            {
              default: () => [
                h("b", null, [h(SuggestionPrimitiveTitle)]),
                h("i", null, [h(SuggestionPrimitiveDescription)]),
              ],
            },
          ),
      }),
  }) as Component;
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          {
            config: AuiConfig({
              threads: RuntimeAdapter(runtime),
              suggestions: Suggestions([
                {
                  title: "Say hello",
                  label: "a friendly opener",
                  prompt: "Hello there!",
                },
                {
                  title: "Ask the time",
                  label: "small talk",
                  prompt: "What time is it?",
                },
              ]),
            }),
          },
          { default: () => h(View) },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

describe("suggestions primitives", () => {
  it("renders one scoped chip per suggestion with title and label", async () => {
    const { runtime } = createSuggestingRuntime();
    const { el, unmount } = mountSuggestions(runtime);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.chip")).toHaveLength(2);
    });
    const chips = [...el.querySelectorAll("button.chip")];
    expect(chips.map((chip) => chip.querySelector("b")!.textContent)).toEqual([
      "Say hello",
      "Ask the time",
    ]);
    expect(chips.map((chip) => chip.querySelector("i")!.textContent)).toEqual([
      "a friendly opener",
      "small talk",
    ]);

    unmount();
  });

  it("sends the prompt as a message when send is set", async () => {
    const { runtime, onNew } = createSuggestingRuntime();
    const { el, unmount } = mountSuggestions(runtime, { send: true });

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.chip")).toHaveLength(2);
    });
    el.querySelectorAll<HTMLButtonElement>("button.chip")[1]!.click();

    await vi.waitFor(() => {
      expect(onNew).toHaveBeenCalledTimes(1);
    });
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "What time is it?" }],
    });

    unmount();
  });

  it("replaces the composer text without send, and appends when clearComposer is false", async () => {
    const { runtime } = createSuggestingRuntime();
    const { el, unmount } = mountSuggestions(runtime);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.chip")).toHaveLength(2);
    });
    el.querySelectorAll<HTMLButtonElement>("button.chip")[0]!.click();
    await vi.waitFor(() => {
      expect(runtime.thread.composer.getState().text).toBe("Hello there!");
    });

    unmount();

    const appending = createSuggestingRuntime();
    const mounted = mountSuggestions(appending.runtime, {
      clearComposer: false,
    });
    await vi.waitFor(async () => {
      await nextTick();
      expect(mounted.el.querySelectorAll("button.chip")).toHaveLength(2);
    });
    flushTapSync(() =>
      appending.runtime.thread.composer.setText("Existing draft"),
    );
    mounted.el.querySelectorAll<HTMLButtonElement>("button.chip")[0]!.click();
    await vi.waitFor(() => {
      expect(appending.runtime.thread.composer.getState().text).toBe(
        "Existing draft Hello there!",
      );
    });

    mounted.unmount();
  });

  it("queues a send during a run without clearing the draft and forwards runConfig", async () => {
    let isRunning = false;
    const onNew = vi.fn(async () => {});
    const steer = vi.fn();
    const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
      messages: [],
      isRunning,
      convertMessage: (message) => ({
        id: message.id,
        role: message.role,
        content: [{ type: "text", text: message.text }],
      }),
      onNew,
      queue: {
        items: [],
        steerItems: [],
        enqueue: () => {},
        steer,
        move: () => {},
        edit: () => {},
        remove: () => {},
      },
    });
    const core = new ExternalStoreRuntimeCore(makeAdapter());
    const runtime = new AssistantRuntimeImpl(core);
    const setRunning = (value: boolean) => {
      isRunning = value;
      core.setAdapter(makeAdapter());
    };

    const { el, unmount } = mountSuggestions(runtime, { send: true });
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.chip")).toHaveLength(2);
    });

    flushTapSync(() => {
      runtime.thread.composer.setRunConfig({ custom: { mode: "echo" } });
      runtime.thread.composer.setText("half-typed draft");
      setRunning(true);
    });
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el.querySelectorAll<HTMLButtonElement>("button.chip")[0]!.disabled,
      ).toBe(false);
    });

    el.querySelectorAll<HTMLButtonElement>("button.chip")[0]!.click();
    await vi.waitFor(() => {
      expect(steer).toHaveBeenCalledTimes(1);
    });
    expect(steer.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "Hello there!" }],
      runConfig: { custom: { mode: "echo" } },
    });
    expect(onNew).not.toHaveBeenCalled();
    expect(runtime.thread.composer.getState().text).toBe("half-typed draft");

    unmount();
  });

  it("disables sending chips while a run is in flight", async () => {
    const { runtime, setRunning } = createSuggestingRuntime();
    const { el, unmount } = mountSuggestions(runtime, { send: true });

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.chip")).toHaveLength(2);
    });
    expect(
      el.querySelectorAll<HTMLButtonElement>("button.chip")[0]!.disabled,
    ).toBe(false);

    flushTapSync(() => setRunning(true));
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el.querySelectorAll<HTMLButtonElement>("button.chip")[0]!.disabled,
      ).toBe(true);
    });

    unmount();
  });
});
