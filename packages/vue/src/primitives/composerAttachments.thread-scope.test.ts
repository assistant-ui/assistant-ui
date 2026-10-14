import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { AuiConfig } from "@assistant-ui/store/client";
import { ExternalThread, InMemoryThreadList } from "@assistant-ui/core/store";
import { SimpleTextAttachmentAdapter } from "@assistant-ui/core";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { ComposerPrimitiveAddAttachment } from "./composerAttachments";

describe("ComposerPrimitiveAddAttachment thread ownership", () => {
  it("does not add an old picker's selection to a different thread", async () => {
    const attachmentAdapter = new SimpleTextAttachmentAdapter();
    let aui!: ReturnType<typeof useAui>;
    const Capture = defineComponent({
      setup() {
        aui = useAui();
        return () =>
          h(ComposerPrimitiveAddAttachment, null, {
            default: () => "Add file",
          });
      },
    });
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            {
              config: AuiConfig({
                threads: InMemoryThreadList({
                  thread: () =>
                    ExternalThread({ messages: [], attachmentAdapter }),
                }),
              }),
            },
            { default: () => h(Capture) },
          ),
      }),
    );
    const el = document.createElement("div");
    app.mount(el);
    await nextTick();
    const button = el.querySelector("button")!;
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    button.click();
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input).not.toBeNull();

    const originId = aui.threads.getState().mainThreadId;
    aui.threads.switchToNewThread();
    await vi.waitFor(() =>
      expect(aui.threads.getState().mainThreadId).not.toBe(originId),
    );
    expect(aui.composer.getState().attachments).toHaveLength(0);

    Object.defineProperty(input, "files", {
      configurable: true,
      value: [
        new File(["private draft"], "thread-a.txt", { type: "text/plain" }),
      ],
    });
    input.dispatchEvent(new Event("change"));
    await new Promise((resolve) => setTimeout(resolve));
    expect(aui.composer.getState().attachments).toHaveLength(0);

    await nextTick();
    button.click();
    const nextInput =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(nextInput, "files", {
      configurable: true,
      value: [new File(["new draft"], "thread-b.txt", { type: "text/plain" })],
    });
    nextInput.dispatchEvent(new Event("change"));
    await vi.waitFor(() =>
      expect(
        aui.composer.getState().attachments.map((item) => item.name),
      ).toEqual(["thread-b.txt"]),
    );

    app.unmount();
    vi.restoreAllMocks();
  });
});
