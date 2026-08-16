/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveAttachmentDropzone } from "./ComposerAttachmentDropzone";

const { addAttachment, threadCapabilities } = vi.hoisted(() => ({
  addAttachment: vi.fn<(file: File) => Promise<void>>(),
  threadCapabilities: { attachments: true },
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => ({
      composer: {
        addAttachment,
      },
      thread: {
        getState: () => ({ capabilities: threadCapabilities }),
      },
    }),
  };
});

const createDropEvent = (files: File[], types: string[] = ["Files"]) => {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { files, types },
    configurable: true,
  });
  return event;
};

const createDragEvent = (type: string, types: string[]) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { files: [], types },
    configurable: true,
  });
  return event;
};

describe("ComposerPrimitiveAttachmentDropzone", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    addAttachment.mockReset();
    threadCapabilities.attachments = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <ComposerPrimitiveAttachmentDropzone data-testid="dropzone">
          <div>dropzone</div>
        </ComposerPrimitiveAttachmentDropzone>,
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("starts all dropped attachments before awaiting completion", async () => {
    const resolvers: Array<() => void> = [];
    addAttachment.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const dropzone = container.querySelector("[data-testid='dropzone']");
    expect(dropzone).not.toBeNull();

    const files = [
      new File(["a"], "first.txt", { type: "text/plain" }),
      new File(["b"], "second.txt", { type: "text/plain" }),
      new File(["c"], "third.txt", { type: "text/plain" }),
    ];

    await act(async () => {
      dropzone!.dispatchEvent(createDropEvent(files));
      await Promise.resolve();
    });

    expect(addAttachment).toHaveBeenCalledTimes(3);
    expect(addAttachment.mock.calls.map(([file]) => file.name)).toEqual([
      "first.txt",
      "second.txt",
      "third.txt",
    ]);

    for (const resolve of resolvers) resolve();

    await act(async () => {
      await Promise.resolve();
    });
  });

  it("continues processing other files when one attachment fails without console.error", async () => {
    const error = new Error("upload failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    addAttachment
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const dropzone = container.querySelector("[data-testid='dropzone']");
    expect(dropzone).not.toBeNull();

    const files = [
      new File(["a"], "first.txt", { type: "text/plain" }),
      new File(["b"], "second.txt", { type: "text/plain" }),
      new File(["c"], "third.txt", { type: "text/plain" }),
    ];

    await act(async () => {
      dropzone!.dispatchEvent(createDropEvent(files));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(addAttachment).toHaveBeenCalledTimes(3);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("highlights on file drags", async () => {
    const dropzone = container.querySelector("[data-testid='dropzone']");
    expect(dropzone).not.toBeNull();

    const event = createDragEvent("dragenter", ["Files"]);
    await act(async () => {
      dropzone!.dispatchEvent(event);
    });

    expect(dropzone!.getAttribute("data-dragging")).toBe("true");
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores non-file drags", async () => {
    const dropzone = container.querySelector("[data-testid='dropzone']");
    expect(dropzone).not.toBeNull();

    const enter = createDragEvent("dragenter", ["text/plain"]);
    const over = createDragEvent("dragover", ["text/plain"]);
    await act(async () => {
      dropzone!.dispatchEvent(enter);
      dropzone!.dispatchEvent(over);
    });

    expect(dropzone!.hasAttribute("data-dragging")).toBe(false);
    expect(enter.defaultPrevented).toBe(false);
    expect(over.defaultPrevented).toBe(false);
  });

  it("claims file drags without highlighting when the runtime does not support attachments", async () => {
    threadCapabilities.attachments = false;
    const dropzone = container.querySelector("[data-testid='dropzone']");
    expect(dropzone).not.toBeNull();

    const enter = createDragEvent("dragenter", ["Files"]);
    const drop = createDropEvent([
      new File(["a"], "first.txt", { type: "text/plain" }),
    ]);
    await act(async () => {
      dropzone!.dispatchEvent(enter);
      dropzone!.dispatchEvent(drop);
    });

    expect(dropzone!.hasAttribute("data-dragging")).toBe(false);
    expect(enter.defaultPrevented).toBe(true);
    expect((enter as unknown as DragEvent).dataTransfer!.dropEffect).toBe(
      "none",
    );
    expect(drop.defaultPrevented).toBe(true);
    expect(addAttachment).not.toHaveBeenCalled();
  });

  it("clears the highlight and keeps a file drop claimed when it yields no files", async () => {
    const dropzone = container.querySelector("[data-testid='dropzone']");
    expect(dropzone).not.toBeNull();

    await act(async () => {
      dropzone!.dispatchEvent(createDragEvent("dragenter", ["Files"]));
    });
    expect(dropzone!.getAttribute("data-dragging")).toBe("true");

    const drop = createDropEvent([], ["Files"]);
    await act(async () => {
      dropzone!.dispatchEvent(drop);
    });

    expect(dropzone!.hasAttribute("data-dragging")).toBe(false);
    expect(drop.defaultPrevented).toBe(true);
    expect(addAttachment).not.toHaveBeenCalled();
  });

  it("lets non-file drops pass through", async () => {
    const dropzone = container.querySelector("[data-testid='dropzone']");
    expect(dropzone).not.toBeNull();

    const drop = createDropEvent([], []);
    await act(async () => {
      dropzone!.dispatchEvent(drop);
    });

    expect(drop.defaultPrevented).toBe(false);
    expect(addAttachment).not.toHaveBeenCalled();
  });
});
