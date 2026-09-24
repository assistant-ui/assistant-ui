import { render, screen, act } from "@testing-library/react";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock as CodeBlockBase } from "./code-block";
import { CodeBlock as CodeBlockRadix } from "../radix/code-block";

const flavors = [
  ["base", CodeBlockBase],
  ["radix", CodeBlockRadix],
] as const;

const clickCopy = async () => {
  await act(async () => {
    screen.getByLabelText("Copy code").click();
    await Promise.resolve();
  });
};

const isCopied = () => {
  const svg = screen.getByLabelText("Copy code").querySelector("svg");
  return (svg?.getAttribute("class") ?? "").includes("check");
};

const stubClipboard = (writeText: () => Promise<void>) => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
};

beforeEach(() => {
  vi.useFakeTimers();
  stubClipboard(() => Promise.resolve());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each(flavors)(
  "CodeBlock copy confirmation (%s)",
  (_flavor, CodeBlock) => {
    it("restarts the confirmation window when copied again inside it", async () => {
      render(<CodeBlock copyText="hello" />);

      await clickCopy();
      expect(isCopied()).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(1200);
      });
      await clickCopy();
      expect(isCopied()).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });
      expect(isCopied()).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(isCopied()).toBe(false);
    });

    it("cancels its pending reset timer on unmount", async () => {
      const view = render(<CodeBlock copyText="hello" />);

      await clickCopy();
      expect(vi.getTimerCount()).toBe(1);

      view.unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    it("reports a write that settles after unmount without arming a timer", async () => {
      let settle!: () => void;
      stubClipboard(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve;
          }),
      );
      const onCopied = vi.fn();
      const view = render(<CodeBlock copyText="hello" onCopied={onCopied} />);

      await act(async () => {
        screen.getByLabelText("Copy code").click();
      });
      view.unmount();

      await act(async () => {
        settle();
        await Promise.resolve();
      });

      expect(onCopied).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("returns to idle when hidden and shown by Activity", async () => {
      const view = render(
        <Activity mode="visible">
          <CodeBlock copyText="hello" />
        </Activity>,
      );

      await clickCopy();
      expect(isCopied()).toBe(true);

      await act(async () => {
        view.rerender(
          <Activity mode="hidden">
            <CodeBlock copyText="hello" />
          </Activity>,
        );
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await act(async () => {
        view.rerender(
          <Activity mode="visible">
            <CodeBlock copyText="hello" />
          </Activity>,
        );
      });

      expect(isCopied()).toBe(false);
    });

    it("reports a write that settles while hidden and comes back idle", async () => {
      let settle!: () => void;
      stubClipboard(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve;
          }),
      );
      const onCopied = vi.fn();
      const tree = (mode: "visible" | "hidden") => (
        <Activity mode={mode}>
          <CodeBlock copyText="hello" onCopied={onCopied} />
        </Activity>
      );
      const view = render(tree("visible"));

      await act(async () => {
        screen.getByLabelText("Copy code").click();
      });
      await act(async () => {
        view.rerender(tree("hidden"));
      });
      await act(async () => {
        settle();
        await Promise.resolve();
      });
      await act(async () => {
        view.rerender(tree("visible"));
      });

      expect(onCopied).toHaveBeenCalledOnce();
      expect(isCopied()).toBe(false);
    });
  },
);
