// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { useAui } from "@assistant-ui/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Toolkit } from "../model-context/toolbox";
import { Tools } from "./Tools";

const mocks = vi.hoisted(() => ({
  runCleanups: vi.fn(),
}));

vi.mock("../../subscribable/subscribable", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../subscribable/subscribable")>();
  return {
    ...original,
    runCleanups: (cleanups: readonly (() => void)[]) => {
      mocks.runCleanups(cleanups);
      return original.runCleanups(cleanups);
    },
  };
});

afterEach(() => {
  cleanup();
});

describe("Tools cleanup", () => {
  it("routes every tool UI registration through the cleanup runner", () => {
    const renderTool = () => null;
    const toolkit = {
      first: { render: renderTool },
      second: { render: renderTool },
    } as unknown as Toolkit;
    const Harness = () => {
      useAui({ tools: Tools({ toolkit }) } as never);
      return null;
    };
    const view = render(<Harness />);

    view.unmount();

    expect(
      mocks.runCleanups.mock.calls.some(
        ([cleanups]) => (cleanups as readonly unknown[]).length === 2,
      ),
    ).toBe(true);
  });
});
