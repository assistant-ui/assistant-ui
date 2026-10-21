// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SearchProvider } from "./search-provider";

const mocks = vi.hoisted(() => ({ opened: vi.fn() }));

vi.mock("@/components/shared/search-dialog", () => ({
  SearchDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" /> : null,
}));
vi.mock("@/lib/analytics", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/analytics")>();
  return {
    ...original,
    analytics: {
      ...original.analytics,
      search: { ...original.analytics.search, opened: mocks.opened },
    },
  };
});

afterEach(cleanup);

const pressShortcut = () =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
  });

it("reports the keyboard shortcut as the source only when it opens search", () => {
  const { queryByRole } = render(<SearchProvider>{null}</SearchProvider>);

  pressShortcut();
  expect(queryByRole("dialog")).not.toBeNull();
  expect(mocks.opened).toHaveBeenCalledExactlyOnceWith("keyboard");

  pressShortcut();
  expect(queryByRole("dialog")).toBeNull();
  expect(mocks.opened).toHaveBeenCalledOnce();
});
