// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SearchDialog } from "./lazy-search-dialog";

const stubSearchDialog = vi.hoisted(() => () => ({
  SearchDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" /> : null,
}));

vi.mock("./search-dialog", stubSearchDialog);

afterEach(cleanup);

it("keeps an open requested before the chunk loads and shows the dialog once it arrives", async () => {
  const { findByRole, queryByRole, rerender } = render(
    <SearchDialog open={false} onOpenChange={() => {}} />,
  );
  expect(queryByRole("dialog")).toBeNull();

  rerender(<SearchDialog open onOpenChange={() => {}} />);
  expect(await findByRole("dialog")).not.toBeNull();

  rerender(<SearchDialog open={false} onOpenChange={() => {}} />);
  expect(queryByRole("dialog")).toBeNull();
});

it("retries the dialog chunk after a failed load", async () => {
  vi.resetModules();
  let fail = true;
  vi.doMock("./search-dialog", () => {
    if (fail) throw new Error("chunk failed");
    return stubSearchDialog();
  });
  const lazyModule = await import("./lazy-search-dialog");
  const { findByRole, rerender } = render(
    <lazyModule.SearchDialog open onOpenChange={() => {}} />,
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  fail = false;
  vi.resetModules();
  rerender(<lazyModule.SearchDialog open={false} onOpenChange={() => {}} />);
  rerender(<lazyModule.SearchDialog open onOpenChange={() => {}} />);
  expect(await findByRole("dialog")).not.toBeNull();
  vi.doMock("./search-dialog", stubSearchDialog);
});
