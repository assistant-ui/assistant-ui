// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SearchDialog } from "./search-dialog";

const { revealPageMatch, onOpenChange } = vi.hoisted(() => ({
  revealPageMatch: vi.fn(),
  onOpenChange: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/docs/example",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/search/load-index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/search/load-index")>()),
  loadSearchIndex: async () => [],
}));

vi.mock("@/lib/search/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/search/reveal")>()),
  revealPageMatch,
}));

vi.mock(
  "@/components/pages/docs/assistant/context",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/pages/docs/assistant/context")
    >()),
    useGlobalAskAI: () => null,
  }),
);

const scrollDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView",
);

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  document.querySelector("article")?.remove();
  if (scrollDescriptor)
    Object.defineProperty(
      Element.prototype,
      "scrollIntoView",
      scrollDescriptor,
    );
  else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

it("lets a reader navigate the current page outline without typing a query", async () => {
  const article = document.createElement("article");
  article.innerHTML =
    '<h2 id="install">Install</h2><h2 id="configure">Configure</h2>';
  document.body.append(article);

  render(<SearchDialog open onOpenChange={onOpenChange} />);
  const input = screen.getByRole("combobox", {
    name: "Search this page and the docs",
  });
  const options = await screen.findAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual([
    "Install",
    "Configure",
  ]);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  await waitFor(() =>
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1]?.id),
  );
  fireEvent.keyDown(input, { key: "Enter" });
  expect(revealPageMatch).toHaveBeenCalledWith(
    article.querySelector("#configure"),
    "start",
  );
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
