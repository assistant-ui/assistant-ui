/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type * as CoreReact from "@assistant-ui/core/react";
import type * as AssistantStore from "@assistant-ui/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveAddAttachment } from "./ComposerAddAttachment";

const { addAttachment } = vi.hoisted(() => ({
  addAttachment: vi.fn<(file: File) => Promise<void>>(),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreReact>();
  return {
    ...actual,
    useComposerAddAttachment: () => ({
      disabled: false,
      addAttachment,
    }),
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof AssistantStore>();
  return {
    ...actual,
    useAui: () => ({
      composer: {
        getState: () => ({ attachmentAccept: "*" }),
      },
    }),
  };
});

describe("ComposerPrimitiveAddAttachment", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    addAttachment.mockReset();
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.querySelectorAll('input[type="file"]').forEach((input) => {
      input.remove();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("handles rejected file picker attachments and continues processing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    addAttachment
      .mockRejectedValueOnce(new Error("unsupported file"))
      .mockResolvedValueOnce(undefined);

    await act(async () => {
      root.render(
        <ComposerPrimitiveAddAttachment>
          Add attachment
        </ComposerPrimitiveAddAttachment>,
      );
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    await act(async () => {
      button!.click();
    });

    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    const files = [
      new File(["a"], "unsupported.bin"),
      new File(["b"], "supported.txt", { type: "text/plain" }),
    ];
    Object.defineProperty(input, "files", {
      configurable: true,
      value: files,
    });

    const result = input!.onchange?.call(input, {
      target: input,
    } as unknown as Event);

    await expect(Promise.resolve(result)).resolves.toBeUndefined();
    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(input!.isConnected).toBe(false);
  });
});
