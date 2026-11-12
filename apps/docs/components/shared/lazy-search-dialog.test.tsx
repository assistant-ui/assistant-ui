// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SearchDialog } from "./lazy-search-dialog";

vi.mock("./search-dialog", () => ({
  SearchDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" /> : null,
}));

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
