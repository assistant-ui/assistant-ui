/** @vitest-environment jsdom */
import { Activity, act, version } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";

const onReact18 = version.startsWith("18.");

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function CopyProbe() {
  const { isCopied, copy } = useCopyToClipboard({ copiedDuration: 2000 });
  return (
    <button onClick={() => copy("value")}>
      {isCopied ? "Copied" : "Copy"}
    </button>
  );
}

describe("useCopyToClipboard", () => {
  let container: HTMLDivElement;
  let root: Root;
  let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const copyButton = () =>
    container.querySelector("button") as HTMLButtonElement;

  it("keeps the latest confirmation visible when copied again", async () => {
    await act(async () => root.render(<CopyProbe />));
    await act(async () => copyButton().click());
    await act(async () => {
      vi.advanceTimersByTime(1000);
      copyButton().click();
    });

    await act(async () => vi.advanceTimersByTime(1000));
    expect(copyButton().textContent).toBe("Copied");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(copyButton().textContent).toBe("Copy");
  });

  it("clears its confirmation timer on unmount", async () => {
    await act(async () => root.render(<CopyProbe />));
    await act(async () => copyButton().click());
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule a timer when a write settles after unmount", async () => {
    let resolveWrite!: () => void;
    writeText.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveWrite = resolve;
      }),
    );

    await act(async () => root.render(<CopyProbe />));
    await act(async () => copyButton().click());
    await act(async () => root.unmount());
    await act(async () => resolveWrite());

    expect(vi.getTimerCount()).toBe(0);
  });

  // Activity is React 19 only.
  it.skipIf(onReact18)(
    "ends the confirmation after an Activity hides and shows it",
    async () => {
      const render = (mode: "visible" | "hidden") =>
        root.render(
          <Activity mode={mode}>
            <CopyProbe />
          </Activity>,
        );
      await act(async () => render("visible"));
      await act(async () => copyButton().click());
      expect(copyButton().textContent).toBe("Copied");

      await act(async () => render("hidden"));
      await act(async () => render("visible"));
      await act(async () => vi.advanceTimersByTime(2000));
      expect(copyButton().textContent).toBe("Copy");
    },
  );
});
