import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createComponent,
  createSignal,
  mergeProps,
  onCleanup,
  type JSX,
} from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
import type {
  AppendMessage,
  ExternalStoreAdapter,
  RealtimeVoiceAdapter,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import {
  SuggestionByIndexProvider,
  SuggestionPrimitiveDescription,
  SuggestionPrimitiveTitle,
  SuggestionPrimitiveTrigger,
  ThreadPrimitiveSuggestions,
} from "./suggestions";

type Suggestion = { title: string; label: string; prompt: string };
const initialSuggestions: Suggestion[] = [
  { title: "Say hello", label: "a friendly opener", prompt: "Hello there!" },
  { title: "Ask the time", label: "small talk", prompt: "What time is it?" },
  { title: "Empty", label: "no prompt", prompt: "" },
];

const createTestRuntime = (
  options: { queue?: boolean; voice?: RealtimeVoiceAdapter.Session } = {},
) => {
  let flags = { isRunning: false, isDisabled: false, isSendDisabled: false };
  const onNew = vi.fn<(message: AppendMessage) => Promise<void>>(
    async () => {},
  );
  const steer = vi.fn<(message: AppendMessage) => void>();
  const makeAdapter = (): ExternalStoreAdapter => ({
    messages: [],
    ...flags,
    onNew,
    ...(options.queue && {
      queue: {
        items: [],
        steerItems: [],
        enqueue: () => {},
        steer,
        move: () => {},
        edit: () => {},
        remove: () => {},
      },
    }),
    ...(options.voice && {
      adapters: { voice: { connect: () => options.voice! } },
    }),
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    onNew,
    steer,
    update: (next: Partial<typeof flags>) => {
      flags = { ...flags, ...next };
      core.setAdapter(makeAdapter());
    },
  };
};

const voiceSession = (
  sendText?: RealtimeVoiceAdapter.Session["sendText"],
): RealtimeVoiceAdapter.Session => ({
  status: { type: "running" },
  isMuted: false,
  disconnect: () => {},
  mute: () => {},
  unmute: () => {},
  ...(sendText && { sendText }),
  onStatusChange: () => () => {},
  onTranscript: () => () => {},
  onModeChange: () => () => {},
  onVolumeChange: () => () => {},
});

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.restoreAllMocks();
});

const mountView = (
  runtime: AssistantRuntimeImpl,
  view: () => JSX.Element,
  suggestions: () => Suggestion[] = () => initialSuggestions,
) => {
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        get config() {
          return AuiConfig({
            threads: RuntimeAdapter(runtime),
            suggestions: Suggestions(suggestions()),
          });
        },
        get children() {
          return createComponent(view, {});
        },
      }),
    el,
  );
  const unmount = () => {
    dispose();
    el.remove();
  };
  disposers.push(unmount);
  return { el, unmount };
};

const chip = (props: Parameters<typeof SuggestionPrimitiveTrigger>[0] = {}) =>
  createComponent(
    SuggestionPrimitiveTrigger,
    mergeProps(
      {
        class: "chip",
        get children() {
          return [
            createComponent(Dynamic, {
              component: "b",
              get children() {
                return createComponent(SuggestionPrimitiveTitle, {});
              },
            }),
            createComponent(Dynamic, {
              component: "i",
              get children() {
                return createComponent(SuggestionPrimitiveDescription, {});
              },
            }),
          ];
        },
      },
      props,
    ),
  );

const mountSuggestions = (
  runtime: AssistantRuntimeImpl,
  props: Parameters<typeof SuggestionPrimitiveTrigger>[0] = {},
  suggestions?: () => Suggestion[],
) =>
  mountView(
    runtime,
    () =>
      createComponent(ThreadPrimitiveSuggestions, {
        get children() {
          return chip(props);
        },
      }),
    suggestions,
  );

const chips = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLButtonElement>("button.chip"),
];

describe("suggestion primitives", () => {
  it("renders one scoped chip per suggestion with title and label", () => {
    const { runtime } = createTestRuntime();
    const { el } = mountSuggestions(runtime);
    expect(
      chips(el).map((button) => button.querySelector("b")!.textContent),
    ).toEqual(["Say hello", "Ask the time", "Empty"]);
    expect(
      chips(el).map((button) => button.querySelector("i")!.textContent),
    ).toEqual(["a friendly opener", "small talk", "no prompt"]);
    expect(chips(el)[0]!.type).toBe("button");
  });

  it("sends the scoped prompt, forwards runConfig, and clears the composer by default", async () => {
    const { runtime, onNew } = createTestRuntime();
    const { el } = mountSuggestions(runtime, { send: true });
    flushTapSync(() => {
      runtime.thread.composer.setText("draft");
      runtime.thread.composer.setRunConfig({ custom: { mode: "echo" } });
    });
    chips(el)[1]!.click();
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "What time is it?" }],
      runConfig: { custom: { mode: "echo" } },
    });
    expect(runtime.thread.composer.getState().text).toBe("");
  });

  it("replaces the composer text without send", () => {
    const { runtime, onNew } = createTestRuntime();
    const { el } = mountSuggestions(runtime);
    flushTapSync(() => runtime.thread.composer.setText("Existing draft"));
    chips(el)[0]!.click();
    expect(runtime.thread.composer.getState().text).toBe("Hello there!");
    expect(onNew).not.toHaveBeenCalled();
  });

  it("appends when clearComposer is false and ignores blank parts", () => {
    const { runtime } = createTestRuntime();
    const { el } = mountSuggestions(runtime, { clearComposer: false });
    flushTapSync(() => runtime.thread.composer.setText("Existing draft"));
    chips(el)[0]!.click();
    expect(runtime.thread.composer.getState().text).toBe(
      "Existing draft Hello there!",
    );
    flushTapSync(() => runtime.thread.composer.setText("Existing draft"));
    chips(el)[2]!.click();
    expect(runtime.thread.composer.getState().text).toBe("Existing draft");
    flushTapSync(() => runtime.thread.composer.setText("  \n "));
    chips(el)[0]!.click();
    expect(runtime.thread.composer.getState().text).toBe("Hello there!");
  });

  it("preserves the draft on an immediate send with clearComposer=false", async () => {
    const { runtime, onNew } = createTestRuntime();
    const { el } = mountSuggestions(runtime, {
      send: true,
      clearComposer: false,
    });
    flushTapSync(() => runtime.thread.composer.setText("keep this draft"));
    chips(el)[0]!.click();
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
    expect(runtime.thread.composer.getState().text).toBe("keep this draft");
  });

  it("queues a send during a run without clearing the draft and forwards runConfig", async () => {
    const { runtime, onNew, steer, update } = createTestRuntime({
      queue: true,
    });
    const { el } = mountSuggestions(runtime, { send: true });
    flushTapSync(() => {
      runtime.thread.composer.setRunConfig({ custom: { mode: "echo" } });
      runtime.thread.composer.setText("half-typed draft");
      update({ isRunning: true });
    });
    expect(chips(el)[0]!.disabled).toBe(false);
    chips(el)[0]!.click();
    await vi.waitFor(() => expect(steer).toHaveBeenCalledOnce());
    expect(steer.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "Hello there!" }],
      runConfig: { custom: { mode: "echo" } },
    });
    expect(onNew).not.toHaveBeenCalled();
    expect(runtime.thread.composer.getState().text).toBe("half-typed draft");
  });

  it("disables sending chips during a run and rejects a forcibly enabled click", () => {
    const { runtime, onNew, update } = createTestRuntime();
    const { el } = mountSuggestions(runtime, { send: true });
    const button = chips(el)[0]!;
    expect(button.disabled).toBe(false);
    flushTapSync(() => update({ isRunning: true }));
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(onNew).not.toHaveBeenCalled();
    flushTapSync(() => update({ isRunning: false }));
    expect(button.disabled).toBe(false);
  });

  it("sends typed text into a voice session during a spoken reply", async () => {
    const sendText = vi.fn<(text: string) => void>();
    const { runtime, onNew, update } = createTestRuntime({
      voice: voiceSession(sendText),
    });
    const { el } = mountSuggestions(runtime, { send: true });
    flushTapSync(() => {
      runtime.thread.connectVoice();
      runtime.thread.composer.setText("half-typed draft");
      update({ isRunning: true });
    });
    expect(chips(el)[0]!.disabled).toBe(false);
    chips(el)[0]!.click();
    await vi.waitFor(() =>
      expect(sendText).toHaveBeenCalledExactlyOnceWith("Hello there!"),
    );
    expect(onNew).not.toHaveBeenCalled();
    expect(runtime.thread.composer.getState().text).toBe("");
    runtime.thread.disconnectVoice();
  });

  it("disables sending chips while a voice session cannot take typed text", () => {
    const { runtime, onNew } = createTestRuntime({ voice: voiceSession() });
    const { el } = mountSuggestions(runtime, { send: true });
    flushTapSync(() => runtime.thread.connectVoice());
    const button = chips(el)[0]!;
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(onNew).not.toHaveBeenCalled();
    flushTapSync(() => runtime.thread.disconnectVoice());
    expect(button.disabled).toBe(false);
  });

  it("reacts to send and clearComposer props without forwarding them to the DOM", async () => {
    const { runtime, onNew, update } = createTestRuntime();
    const [send, setSend] = createSignal(true);
    const [clear, setClear] = createSignal(false);
    const { el } = mountSuggestions(runtime, {
      get send() {
        return send();
      },
      get clearComposer() {
        return clear();
      },
    });
    const button = chips(el)[0]!;
    expect(button.hasAttribute("send")).toBe(false);
    expect(button.hasAttribute("clearComposer")).toBe(false);
    flushTapSync(() => update({ isRunning: true, isSendDisabled: true }));
    expect(button.disabled).toBe(true);
    setSend(false);
    expect(button.disabled).toBe(false);
    flushTapSync(() => runtime.thread.composer.setText("draft"));
    button.click();
    expect(runtime.thread.composer.getState().text).toBe("draft Hello there!");
    setClear(true);
    button.click();
    expect(runtime.thread.composer.getState().text).toBe("Hello there!");
    setSend(true);
    expect(button.disabled).toBe(true);
    flushTapSync(() => update({ isRunning: false, isSendDisabled: false }));
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
    expect(runtime.thread.composer.getState().text).toBe("");
  });

  it.each([false, true])("honors a disabled thread for send=%s", (send) => {
    const { runtime, onNew, update } = createTestRuntime();
    const { el } = mountSuggestions(runtime, { send, disabled: false });
    const button = chips(el)[0]!;
    flushTapSync(() => {
      runtime.thread.composer.setText("draft");
      update({ isDisabled: true });
    });
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(runtime.thread.composer.getState().text).toBe("draft");
    expect(onNew).not.toHaveBeenCalled();
    flushTapSync(() => update({ isDisabled: false }));
    expect(button.disabled).toBe(false);
  });

  it("honors reactive caller disabled state even if the DOM is forcibly enabled", () => {
    const { runtime } = createTestRuntime();
    const [disabled, setDisabled] = createSignal(true);
    const { el } = mountSuggestions(runtime, {
      get disabled() {
        return disabled();
      },
    });
    const button = chips(el)[0]!;
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(runtime.thread.composer.getState().text).toBe("");
    setDisabled(false);
    button.click();
    expect(runtime.thread.composer.getState().text).toBe("Hello there!");
  });

  it.each([false, true])(
    "runs the caller first and honors its click veto (bound=%s)",
    (bound) => {
      const { runtime } = createTestRuntime();
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((event: MouseEvent) => {
        expect(runtime.thread.composer.getState().text).toBe("");
        if (veto()) event.preventDefault();
      });
      const boundHandler = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const { el } = mountSuggestions(runtime, {
        onClick: bound ? [boundHandler, "caller"] : handler,
      });
      chips(el)[0]!.click();
      expect(handler).toHaveBeenCalledOnce();
      expect(runtime.thread.composer.getState().text).toBe("");
      setVeto(false);
      chips(el)[0]!.click();
      expect(runtime.thread.composer.getState().text).toBe("Hello there!");
    },
  );

  it("keeps caller click handling delegated after the child's veto", () => {
    const { runtime } = createTestRuntime();
    const order: string[] = [];
    const { el } = mountSuggestions(runtime, {
      onClick: (event) =>
        order.push(event.defaultPrevented ? "caller:prevented" : "caller"),
      get children() {
        return createComponent(Dynamic, {
          component: "span",
          onClick: (event: MouseEvent) => {
            order.push("child");
            event.preventDefault();
          },
          children: "Choose",
        });
      },
    });
    el.querySelector("span")!.click();
    expect(order).toEqual(["child", "caller:prevented"]);
    expect(runtime.thread.composer.getState().text).toBe("");
  });

  it("forwards refs and reactive children and attributes", () => {
    const { runtime } = createTestRuntime();
    const ref = vi.fn();
    const [label, setLabel] = createSignal("Choose");
    const { el } = mountView(runtime, () =>
      createComponent(SuggestionByIndexProvider, {
        index: 0,
        get children() {
          return chip({
            ref,
            get "aria-label"() {
              return label();
            },
            get children() {
              return label();
            },
          });
        },
      }),
    );
    const button = chips(el)[0]!;
    expect(ref).toHaveBeenCalledOnce();
    expect(ref.mock.calls[0]![0]).toBe(button);
    expect(button.textContent).toBe("Choose");
    setLabel("Use prompt");
    expect(button.textContent).toBe("Use prompt");
    expect(button.getAttribute("aria-label")).toBe("Use prompt");
  });
});

describe("suggestion identity and scopes", () => {
  it("keeps suggestion slot state and live scope with its suggestion when suggestions swap", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal(
      initialSuggestions.slice(0, 2),
    );
    let mounts = 0;
    const Row = () => {
      mounts++;
      const initialTitle = useAuiState((s) => s.suggestion.title)();
      return chip({ title: initialTitle });
    };
    const { el } = mountView(
      runtime,
      () =>
        createComponent(ThreadPrimitiveSuggestions, {
          get children() {
            return createComponent(Row, {});
          },
        }),
      suggestions,
    );
    const [first, second] = chips(el);
    expect(mounts).toBe(2);
    setSuggestions(([a, b]) => [b!, a!]);
    await vi.waitFor(() => expect(chips(el)).toEqual([second, first]));
    expect(chips(el).map((button) => button.title)).toEqual([
      "Ask the time",
      "Say hello",
    ]);
    expect(
      chips(el).map((button) => button.querySelector("b")!.textContent),
    ).toEqual(["Ask the time", "Say hello"]);
    expect(mounts).toBe(2);
    second!.click();
    expect(runtime.thread.composer.getState().text).toBe("What time is it?");
    first!.click();
    expect(runtime.thread.composer.getState().text).toBe("Hello there!");
  });

  it("retains rows for rebuilt content and distinct duplicate occurrences, then remounts changed content", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal([
      initialSuggestions[0]!,
      { ...initialSuggestions[0]! },
    ]);
    let mounts = 0;
    let unmounts = 0;
    const Row = () => {
      mounts++;
      onCleanup(() => {
        unmounts++;
      });
      return chip();
    };
    const { el } = mountView(
      runtime,
      () =>
        createComponent(ThreadPrimitiveSuggestions, {
          get children() {
            return createComponent(Row, {});
          },
        }),
      suggestions,
    );
    const [first, second] = chips(el);
    expect(first).not.toBe(second);
    setSuggestions((items) => items.map((item) => ({ ...item })));
    await vi.waitFor(() => expect(chips(el)).toEqual([first, second]));
    expect(mounts).toBe(2);
    setSuggestions((items) => [
      { ...items[0]!, prompt: "new prompt" },
      items[1]!,
    ]);
    await vi.waitFor(() => expect(chips(el)[0]).not.toBe(first));
    expect(chips(el)).toHaveLength(2);
    expect(mounts).toBe(3);
    expect(unmounts).toBe(1);
    chips(el)[0]!.click();
    expect(runtime.thread.composer.getState().text).toBe("new prompt");
  });

  it("handles an empty list, growth, middle removal and clearing without stale reports", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal<Suggestion[]>([]);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { el } = mountSuggestions(runtime, {}, suggestions);
    expect(chips(el)).toHaveLength(0);
    setSuggestions(initialSuggestions);
    await vi.waitFor(() => expect(chips(el)).toHaveLength(3));
    const [first, , third] = chips(el);
    setSuggestions([initialSuggestions[0]!, initialSuggestions[2]!]);
    await vi.waitFor(() => expect(chips(el)).toEqual([first, third]));
    expect(third!.querySelector("b")!.textContent).toBe("Empty");
    setSuggestions([initialSuggestions[2]!]);
    await vi.waitFor(() => expect(chips(el)).toEqual([third]));
    third!.click();
    expect(runtime.thread.composer.getState().text).toBe("");
    setSuggestions([]);
    await vi.waitFor(() => expect(chips(el)).toHaveLength(0));
    await Promise.resolve();
    expect(error).not.toHaveBeenCalled();
  });

  it("updates a provider's live index, title, description and prompt as plain text", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal(initialSuggestions);
    const [index, setIndex] = createSignal(0);
    const { el } = mountView(
      runtime,
      () =>
        createComponent(SuggestionByIndexProvider, {
          get index() {
            return index();
          },
          get children() {
            return chip();
          },
        }),
      suggestions,
    );
    const button = chips(el)[0]!;
    setIndex(1);
    await vi.waitFor(() =>
      expect(button.querySelector("b")!.textContent).toBe("Ask the time"),
    );
    expect(button.querySelector("i")!.textContent).toBe("small talk");
    setSuggestions([
      initialSuggestions[0]!,
      {
        title: "<b>Updated</b>",
        label: "<i>Description</i>",
        prompt: "new prompt",
      },
    ]);
    await vi.waitFor(() =>
      expect(button.querySelector("b")!.textContent).toBe("<b>Updated</b>"),
    );
    expect(button.querySelector("i")!.textContent).toBe("<i>Description</i>");
    expect(button.querySelector("b b")).toBeNull();
    expect(button.querySelector("i i")).toBeNull();
    expect(chips(el)[0]).toBe(button);
    button.click();
    expect(runtime.thread.composer.getState().text).toBe("new prompt");
  });

  it("reports a mounted out-of-bounds provider after microtask expiry", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal(
      initialSuggestions.slice(0, 1),
    );
    const { el } = mountView(
      runtime,
      () =>
        createComponent(SuggestionByIndexProvider, {
          index: 0,
          get children() {
            return createComponent(SuggestionPrimitiveTitle, {});
          },
        }),
      suggestions,
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setSuggestions([]));
    expect(el.textContent).toBe("Say hello");
    expect(error).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(error).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(
        "SuggestionByIndexProvider: index 0 is still out of bounds",
      ),
    );
    flushTapSync(() => setSuggestions([initialSuggestions[1]!]));
    expect(el.textContent).toBe("Ask the time");
  });

  it("keeps a recovered cache through expiry and guards a later shrink", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal(
      initialSuggestions.slice(0, 1),
    );
    const { el } = mountView(
      runtime,
      () =>
        createComponent(SuggestionByIndexProvider, {
          index: 0,
          get children() {
            return createComponent(SuggestionPrimitiveTitle, {});
          },
        }),
      suggestions,
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setSuggestions([]));
    flushTapSync(() => setSuggestions([initialSuggestions[1]!]));
    await Promise.resolve();
    expect(el.textContent).toBe("Ask the time");
    expect(error).not.toHaveBeenCalled();
    flushTapSync(() => setSuggestions([]));
    expect(error).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("does not report the previous index once the prop moves to a valid suggestion", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal(
      initialSuggestions.slice(0, 2),
    );
    const [index, setIndex] = createSignal(1);
    const { el } = mountView(
      runtime,
      () =>
        createComponent(SuggestionByIndexProvider, {
          get index() {
            return index();
          },
          get children() {
            return createComponent(SuggestionPrimitiveTitle, {});
          },
        }),
      suggestions,
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setSuggestions([initialSuggestions[0]!]));
    setIndex(0);
    await vi.waitFor(() => expect(el.textContent).toBe("Say hello"));
    expect(error).not.toHaveBeenCalled();
  });

  it("does not report a removed provider after disposal", async () => {
    const { runtime } = createTestRuntime();
    const [suggestions, setSuggestions] = createSignal(
      initialSuggestions.slice(0, 1),
    );
    const { unmount } = mountView(
      runtime,
      () =>
        createComponent(SuggestionByIndexProvider, {
          index: 0,
          get children() {
            return createComponent(SuggestionPrimitiveTitle, {});
          },
        }),
      suggestions,
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setSuggestions([]));
    unmount();
    await Promise.resolve();
    expect(error).not.toHaveBeenCalled();
  });

  it("throws when a provider index has never been valid", () => {
    const { runtime } = createTestRuntime();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      mountView(runtime, () =>
        createComponent(SuggestionByIndexProvider, {
          index: 99,
          get children() {
            return createComponent(SuggestionPrimitiveTitle, {});
          },
        }),
      ),
    ).toThrow(/out of bounds/);
  });
});
