import { act, render, screen } from "@testing-library/react";
import { Activity, version } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandTabs as BaseCommandTabs } from "./command-tabs";
import { CommandTabs as RadixCommandTabs } from "../radix/command-tabs";

const onReact18 = version.startsWith("18.");

const mocks = vi.hoisted(() => ({
  useShikiHighlighter: vi.fn(() => null),
}));

vi.mock("react-shiki", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-shiki")>();
  return {
    ...original,
    useShikiHighlighter: mocks.useShikiHighlighter,
  };
});

const flavors = [
  ["base", BaseCommandTabs],
  ["radix", RadixCommandTabs],
] as const;

const stubClipboard = (writeText: () => Promise<void>) => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
};

const clickCopy = async () => {
  await act(async () => {
    screen.getByLabelText("Copy command").click();
    await Promise.resolve();
  });
};

const isCopied = () => {
  const svg = screen.getByLabelText("Copy command").querySelector("svg");
  return (svg?.getAttribute("class") ?? "").includes("check");
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
  "CommandTabs copy confirmation (%s)",
  (_flavor, CommandTabs) => {
    const renderTabs = () =>
      render(<CommandTabs commands={{ npm: "npm install" }} />);

    it("restarts the confirmation window when copied again inside it", async () => {
      renderTabs();

      await clickCopy();
      await act(async () => vi.advanceTimersByTimeAsync(1000));
      await clickCopy();
      await act(async () => vi.advanceTimersByTimeAsync(500));

      expect(isCopied()).toBe(true);

      await act(async () => vi.advanceTimersByTimeAsync(1000));
      expect(isCopied()).toBe(false);
    });

    it("keeps the newer successful write timer when an older write settles later", async () => {
      let resolveOlder!: () => void;
      let resolveNewer!: () => void;
      const older = new Promise<void>((resolve) => {
        resolveOlder = resolve;
      });
      const newer = new Promise<void>((resolve) => {
        resolveNewer = resolve;
      });
      const writeText = vi
        .fn()
        .mockImplementationOnce(() => older)
        .mockImplementationOnce(() => newer);
      stubClipboard(writeText);
      renderTabs();

      await clickCopy();
      await clickCopy();
      await act(async () => resolveNewer());
      await act(async () => vi.advanceTimersByTimeAsync(1000));
      await act(async () => resolveOlder());
      await act(async () => vi.advanceTimersByTimeAsync(500));

      expect(isCopied()).toBe(false);
    });

    it("accepts an older success after a newer write rejects", async () => {
      let resolveOlder!: () => void;
      const older = new Promise<void>((resolve) => {
        resolveOlder = resolve;
      });
      const writeText = vi
        .fn()
        .mockImplementationOnce(() => older)
        .mockRejectedValueOnce(new Error("copy failed"));
      stubClipboard(writeText);
      renderTabs();

      await clickCopy();
      await clickCopy();
      await act(async () => resolveOlder());

      expect(isCopied()).toBe(true);
      expect(vi.getTimerCount()).toBe(1);
    });

    it("cancels its pending reset timer on unmount", async () => {
      const view = renderTabs();

      await clickCopy();
      expect(vi.getTimerCount()).toBe(1);

      view.unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("ignores a write that settles after unmount", async () => {
      let resolveWrite!: () => void;
      stubClipboard(
        () =>
          new Promise<void>((resolve) => {
            resolveWrite = resolve;
          }),
      );
      const view = renderTabs();

      await clickCopy();
      view.unmount();
      await act(async () => resolveWrite());

      expect(vi.getTimerCount()).toBe(0);
    });

    it.skipIf(onReact18)(
      "returns to idle when hidden and shown by Activity",
      async () => {
        const tree = (mode: "visible" | "hidden") => (
          <Activity mode={mode}>
            <CommandTabs commands={{ npm: "npm install" }} />
          </Activity>
        );
        const view = render(tree("visible"));

        await clickCopy();
        expect(isCopied()).toBe(true);

        await act(async () => view.rerender(tree("hidden")));
        await act(async () => view.rerender(tree("visible")));

        expect(isCopied()).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
      },
    );

    it.skipIf(onReact18)(
      "ignores a pending write from before an Activity restart",
      async () => {
        let resolveWrite!: () => void;
        stubClipboard(
          () =>
            new Promise<void>((resolve) => {
              resolveWrite = resolve;
            }),
        );
        const tree = (mode: "visible" | "hidden") => (
          <Activity mode={mode}>
            <CommandTabs commands={{ npm: "npm install" }} />
          </Activity>
        );
        const view = render(tree("visible"));

        await clickCopy();
        await act(async () => view.rerender(tree("hidden")));
        await act(async () => view.rerender(tree("visible")));
        await act(async () => resolveWrite());

        expect(isCopied()).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
      },
    );
  },
);
