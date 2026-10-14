// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { InMemoryThreadList } from "@assistant-ui/core/store";
import {
  AssistantRuntimeProvider,
  ExternalThread,
  SimpleTextAttachmentAdapter,
  Tools,
  useLocalRuntime,
  type AssistantRuntime,
  type ChatModelAdapter,
} from "../../index";
import { ComposerPrimitiveAddAttachment } from "./ComposerAddAttachment";

const attachmentAdapter = new SimpleTextAttachmentAdapter();
const model: ChatModelAdapter = { async *run() {} };

afterEach(() => {
  cleanup();
  document
    .querySelectorAll('input[type="file"]')
    .forEach((input) => input.remove());
  vi.restoreAllMocks();
});

const setup = async (mode: "store" | "runtime") => {
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
  let captured!: ReturnType<typeof useAui>;
  let runtime: AssistantRuntime | undefined;
  let changeScope!: () => void;
  const Capture = () => {
    captured = useAui();
    return (
      <ComposerPrimitiveAddAttachment>Add file</ComposerPrimitiveAddAttachment>
    );
  };
  const Scope = () => {
    const aui = useAui();
    const [withTools, setWithTools] = useState(false);
    changeScope = () => setWithTools(true);
    const config = AuiConfig(withTools ? { tools: Tools({}) } : {});
    return (
      <AuiProvider extends={aui} config={config}>
        <Capture />
      </AuiProvider>
    );
  };
  const StoreApp = () => {
    const aui = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [], attachmentAdapter }),
      }),
    });
    return (
      <AuiProvider value={aui}>
        <Scope />
      </AuiProvider>
    );
  };
  const RuntimeApp = () => {
    runtime = useLocalRuntime(model, {
      adapters: { attachments: attachmentAdapter },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Scope />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(createElement(mode === "store" ? StoreApp : RuntimeApp));
  if (runtime)
    await act(async () => {
      await runtime!.threads.mainItem.initialize();
    });
  await act(async () => view.getByRole("button").click());
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  const select = async () => {
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [
        new File(["private draft"], "thread-a.txt", { type: "text/plain" }),
      ],
    });
    const event = new Event("change");
    Object.defineProperty(event, "target", { value: input });
    await act(async () => {
      await input.onchange?.call(input, event);
    });
  };
  return { aui: () => captured, select, changeScope, unmount: view.unmount };
};

describe.each(["store", "runtime"] as const)(
  "ComposerPrimitive.AddAttachment thread ownership in %s",
  (mode) => {
    it("adds a selected file to the thread that opened the picker", async () => {
      const { aui, select } = await setup(mode);
      await select();
      expect(
        aui()
          .composer.getState()
          .attachments.map((item) => item.name),
      ).toEqual(["thread-a.txt"]);
    });

    it("does not add an old picker's selection to a different thread", async () => {
      const { aui, select } = await setup(mode);
      const originId = aui().threads.getState().mainThreadId;
      await act(async () => {
        aui().threads.switchToNewThread();
      });
      await waitFor(() =>
        expect(aui().threads.getState().mainThreadId).not.toBe(originId),
      );
      expect(aui().composer.getState().attachments).toHaveLength(0);
      await select();
      expect(aui().composer.getState().attachments).toHaveLength(0);
    });

    it("keeps the picker usable when the same draft changes", async () => {
      const { aui, select } = await setup(mode);
      await act(async () => {
        aui().composer.setText("same conversation");
      });
      await select();
      expect(aui().composer.getState().text).toBe("same conversation");
      expect(
        aui()
          .composer.getState()
          .attachments.map((item) => item.name),
      ).toEqual(["thread-a.txt"]);
    });

    it("keeps the picker usable when an unrelated scope changes", async () => {
      const { aui, select, changeScope } = await setup(mode);
      const original = aui();
      await act(async () => changeScope());
      expect(Object.is(aui(), original)).toBe(false);
      expect(Object.is(aui().composer, original.composer)).toBe(true);
      await select();
      expect(
        aui()
          .composer.getState()
          .attachments.map((item) => item.name),
      ).toEqual(["thread-a.txt"]);
    });

    it("settles a picker result after its provider unmounts", async () => {
      const { select, unmount } = await setup(mode);
      unmount();
      await expect(select()).resolves.toBeUndefined();
      expect(document.querySelector('input[type="file"]')).toBeNull();
    });
  },
);
