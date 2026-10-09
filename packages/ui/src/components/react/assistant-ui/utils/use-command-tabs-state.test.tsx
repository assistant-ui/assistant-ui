import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useCommandTabsState } from "./use-command-tabs-state";

beforeEach(() => localStorage.clear());

it("restores selection and syncs only valid commands across instances", () => {
  localStorage.setItem("shared", "yarn");
  const onValueChange = vi.fn();
  const commands = { npm: "npm install", yarn: "yarn add" };
  const first = renderHook(() =>
    useCommandTabsState(commands, "shared", onValueChange),
  );
  const second = renderHook(() => useCommandTabsState(commands, "shared"));

  expect(first.result.current.activeLabel).toBe("yarn");
  expect(second.result.current.activeLabel).toBe("yarn");

  act(() => first.result.current.select("npm"));

  expect(first.result.current.activeLabel).toBe("npm");
  expect(second.result.current.activeLabel).toBe("npm");
  expect(localStorage.getItem("shared")).toBe("npm");
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith("npm");

  act(() =>
    window.dispatchEvent(
      new CustomEvent("command-tabs:shared", { detail: "missing" }),
    ),
  );

  expect(second.result.current.activeLabel).toBe("npm");

  first.unmount();
  second.unmount();
});

it("falls back to the first current command when a selected label disappears", () => {
  const initial: Record<string, string> = {
    npm: "npm install",
    yarn: "yarn add",
  };
  const { result, rerender } = renderHook(
    ({ commands }) => useCommandTabsState(commands),
    { initialProps: { commands: initial } },
  );

  act(() => result.current.select("yarn"));
  rerender({ commands: { npm: "npm install" } });

  expect(result.current.activeLabel).toBe("npm");
});
