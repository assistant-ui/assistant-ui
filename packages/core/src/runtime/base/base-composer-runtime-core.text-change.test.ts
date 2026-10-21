import { describe, expect, it, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import type { ComposerRuntimeEventPayload } from "../interfaces/composer-runtime-core";
import { MessageNotSentError } from "../../types/error";
import { DefaultThreadComposerRuntimeCore } from "./default-thread-composer-runtime-core";

type TextChange = ComposerRuntimeEventPayload["textChange"];

const makeComposer = (append = vi.fn()) => {
  const runtime = {
    append,
    cancelRun: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    capabilities: { cancel: false },
    messages: [],
    getModelContext: () => ({ unstable_composerMetadata: undefined }),
  } as unknown as Omit<ThreadRuntimeCore, "composer">;
  const composer = new DefaultThreadComposerRuntimeCore(runtime);
  const changes: TextChange[] = [];
  composer.unstable_on("textChange", (change) => changes.push(change));
  return { composer, changes };
};

describe("BaseComposerRuntimeCore textChange", () => {
  it("tells a user deleting the text apart from a send and a reset", async () => {
    const { composer, changes } = makeComposer();

    composer.setText("one", { origin: "user" });
    composer.setText("", { origin: "user" });
    composer.setText("two", { origin: "user" });
    composer.send();
    composer.setText("three");
    await composer.reset();

    expect(changes).toEqual([
      { text: "one", origin: "user" },
      { text: "", origin: "user" },
      { text: "two", origin: "user" },
      { text: "", origin: "send" },
      { text: "three", origin: "external" },
      { text: "", origin: "reset" },
    ]);
  });

  it("labels a failed send's text coming back to the draft as return", async () => {
    const { composer, changes } = makeComposer(
      vi.fn(async () => {
        throw new MessageNotSentError();
      }),
    );

    composer.setText("hello", { origin: "user" });
    composer.send();
    await vi.waitFor(() => expect(composer.text).toBe("hello"));

    expect(changes.map((change) => change.origin)).toEqual([
      "user",
      "send",
      "return",
    ]);
    expect(changes.at(-1)).toEqual({ text: "hello", origin: "return" });
  });

  it("labels a message moved into the draft as return and moved back as send", () => {
    const { composer, changes } = makeComposer();
    const draft = { text: "hello" };

    composer.restoreDraft(draft);
    composer.retractDraft(draft);

    expect(changes).toEqual([
      { text: "hello", origin: "return" },
      { text: "", origin: "send" },
    ]);
  });

  it("fires nothing for a write that leaves the text unchanged", async () => {
    const { composer, changes } = makeComposer();

    composer.setText("");
    await composer.reset();
    composer.setText("same", { origin: "user" });
    composer.setText("same", { origin: "user" });

    expect(changes).toEqual([{ text: "same", origin: "user" }]);
  });

  it("delivers each write's own text in write order when a listener writes again", () => {
    const { composer } = makeComposer();
    composer.unstable_on("textChange", (change) => {
      if (change.text === "draft") composer.setText("normalized");
    });
    const seen: TextChange[] = [];
    composer.unstable_on("textChange", (change) => seen.push(change));

    composer.setText("draft", { origin: "user" });

    expect(seen).toEqual([
      { text: "draft", origin: "user" },
      { text: "normalized", origin: "external" },
    ]);
  });

  it("delivers after every state subscriber, keeping the text a state subscriber overwrote", () => {
    const { composer } = makeComposer();
    const log: string[] = [];
    composer.subscribe(() => {
      if (composer.text === "a") composer.setText("b");
    });
    composer.subscribe(() => log.push(`state ${composer.text}`));
    composer.unstable_on("textChange", (change) =>
      log.push(`${change.origin} ${change.text}`),
    );

    composer.setText("a", { origin: "user" });

    expect(log).toEqual(["state b", "state b", "user a", "external b"]);
  });

  it("keeps delivering and completes the write when a listener throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { composer, changes } = makeComposer();
    composer.unstable_on("textChange", () => {
      throw new Error("listener failed");
    });

    expect(() => composer.setText("a", { origin: "user" })).not.toThrow();
    composer.setText("b", { origin: "user" });

    expect(composer.text).toBe("b");
    expect(changes.map((change) => change.text)).toEqual(["a", "b"]);
  });
});
