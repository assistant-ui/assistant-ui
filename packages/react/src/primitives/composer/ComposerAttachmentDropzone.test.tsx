/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveAttachmentDropzone } from "./ComposerAttachmentDropzone";

const addAttachment = vi.fn<(file: File) => Promise<void>>();

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => ({
      composer: () => ({
        addAttachment,
      }),
    }),
  };
});

const createDropEvent = (files: File[]) => {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { files },
    configurable: true,
  });
  return event;
};

describe("ComposerPrimitiveAttachmentDropzone", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    addAttachment.mockReset();
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

  it("continues processing other files when one attachment fails", async () => {
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
    expect(errorSpy).toHaveBeenCalledWith("Failed to add attachment:", error);
  });
});
