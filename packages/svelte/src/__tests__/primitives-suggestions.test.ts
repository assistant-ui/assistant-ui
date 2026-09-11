import { describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { provideAui } from "../provideAui";
import { suggestionTrigger } from "../primitives/suggestions";
import Host from "./fixtures/Host.svelte";
import { createEchoRuntime, type AnyClient } from "./clients";

const mountSuggestions = (
  build: () => Record<string, ReturnType<typeof suggestionTrigger>>,
) => {
  const echo = createEchoRuntime();
  let aui!: AnyClient;
  let triggers!: Record<string, ReturnType<typeof suggestionTrigger>>;
  const app = mount(Host, {
    target: document.createElement("div"),
    props: {
      setup: () => {
        aui = provideAui(
          AuiConfig({
            threads: RuntimeAdapter(echo.runtime),
            suggestions: Suggestions([
              { title: "One", label: "first", prompt: "Prompt one" },
              { title: "Two", label: "second", prompt: "Prompt two" },
              { title: "Empty", label: "third", prompt: "" },
            ]),
          }),
        ) as AnyClient;
        triggers = build();
      },
    },
  });
  return { app, echo, aui, triggers };
};

describe("suggestionTrigger", () => {
  it("replaces the composer text by default", () => {
    const { app, aui, triggers } = mountSuggestions(() => ({
      trigger: suggestionTrigger({ index: 0 }),
    }));

    flushTapSync(() => aui.composer.setText("draft"));
    triggers.trigger!.props.onclick();
    expect(aui.composer.getState().text).toBe("Prompt one");

    flushSync(() => void unmount(app));
  });

  it("appends to a non-empty draft when clearComposer is false", () => {
    const { app, aui, triggers } = mountSuggestions(() => ({
      trigger: suggestionTrigger({ index: 1, clearComposer: false }),
    }));

    flushTapSync(() => aui.composer.setText("draft"));
    triggers.trigger!.props.onclick();
    expect(aui.composer.getState().text).toBe("draft Prompt two");

    flushTapSync(() => aui.composer.setText(""));
    triggers.trigger!.props.onclick();
    expect(aui.composer.getState().text).toBe("Prompt two");

    flushSync(() => void unmount(app));
  });

  it("send appends the prompt as a message and clears the draft", async () => {
    const { app, echo, aui, triggers } = mountSuggestions(() => ({
      trigger: suggestionTrigger({ index: 0, send: true }),
    }));

    flushTapSync(() => aui.composer.setText("draft"));
    triggers.trigger!.props.onclick();
    await vi.waitFor(() => expect(echo.onNew).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(aui.thread.getState().messages.at(-1)?.content).toEqual([
        { type: "text", text: "Prompt one" },
      ]),
    );
    expect(aui.composer.getState().text).toBe("");

    flushSync(() => void unmount(app));
  });

  it("send is disabled while running without queue support", () => {
    const { app, echo, triggers } = mountSuggestions(() => ({
      send: suggestionTrigger({ index: 0, send: true }),
      insert: suggestionTrigger({ index: 0 }),
    }));

    flushTapSync(() => echo.setRunning(true));
    expect(triggers.send!.props.disabled).toBe(true);
    expect(triggers.insert!.props.disabled).toBe(false);
    triggers.send!.props.onclick();
    expect(echo.onNew).not.toHaveBeenCalled();

    flushSync(() => void unmount(app));
  });

  it("queues a send during a run without clearing the draft", async () => {
    let isRunning = false;
    const steer = vi.fn();
    const makeAdapter = () => ({
      messages: [],
      isRunning,
      convertMessage: (message: never) => message,
      onNew: async () => {},
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
    const core = new ExternalStoreRuntimeCore(makeAdapter() as never);
    const runtime = new AssistantRuntimeImpl(core as never);
    let aui!: AnyClient;
    let trigger!: ReturnType<typeof suggestionTrigger>;
    const app = mount(Host, {
      target: document.createElement("div"),
      props: {
        setup: () => {
          aui = provideAui(
            AuiConfig({
              threads: RuntimeAdapter(runtime),
              suggestions: Suggestions([
                { title: "One", label: "first", prompt: "Prompt one" },
              ]),
            }),
          ) as AnyClient;
          trigger = suggestionTrigger({ index: 0, send: true });
        },
      },
    });

    flushTapSync(() => {
      aui.composer.setText("half-typed draft");
      isRunning = true;
      core.setAdapter(makeAdapter() as never);
    });
    expect(trigger.props.disabled).toBe(false);
    trigger.props.onclick();
    await vi.waitFor(() => expect(steer).toHaveBeenCalledTimes(1));
    expect(steer.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "Prompt one" }],
    });
    expect(aui.composer.getState().text).toBe("half-typed draft");

    flushSync(() => void unmount(app));
  });

  it("passes an empty prompt through instead of treating it as missing", () => {
    const { app, aui, triggers } = mountSuggestions(() => ({
      empty: suggestionTrigger({ index: 2 }),
      append: suggestionTrigger({ index: 2, clearComposer: false }),
    }));

    flushTapSync(() => aui.composer.setText("draft"));
    triggers.empty!.props.onclick();
    expect(aui.composer.getState().text).toBe("");

    flushTapSync(() => aui.composer.setText("draft"));
    triggers.append!.props.onclick();
    expect(aui.composer.getState().text).toBe("draft");

    flushSync(() => void unmount(app));
  });

  it("honors caller vetoes and out-of-range indexes", () => {
    const { app, aui, triggers } = mountSuggestions(() => ({
      trigger: suggestionTrigger({ index: 0 }),
      missing: suggestionTrigger({ index: 9 }),
    }));

    const vetoed = new MouseEvent("click", { cancelable: true });
    vetoed.preventDefault();
    triggers.trigger!.props.onclick(vetoed);
    expect(aui.composer.getState().text).toBe("");

    triggers.missing!.props.onclick();
    expect(aui.composer.getState().text).toBe("");

    flushSync(() => void unmount(app));
  });
});
