import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const imports = vi.hoisted(() => ({ diagrams: 0 }));

vi.mock("beautiful-mermaid", async (importOriginal) => {
  const original = await importOriginal<typeof import("beautiful-mermaid")>();
  imports.diagrams++;
  return { ...original };
});

import { GenerativeMarkdown } from "./generative-markdown";

afterEach(cleanup);

it("renders Markdown without loading the diagram engine", () => {
  render(<GenerativeMarkdown value="**Ready**" />);

  expect(screen.getByText("Ready").tagName).toBe("STRONG");
  expect(imports.diagrams).toBe(0);
});

it("renders GFM tables, task lists, and links without a message provider", () => {
  render(
    <GenerativeMarkdown
      value={
        "| Package | Status |\n| --- | --- |\n| React | Ready |\n\n- [x] Verified\n\n[Guide](/docs)\n\n~~Old~~"
      }
    />,
  );

  expect(
    screen.getAllByRole("columnheader").map((cell) => cell.textContent),
  ).toEqual(["Package", "Status"]);
  expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
    "React",
    "Ready",
  ]);
  const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
  expect(checkbox.checked).toBe(true);
  expect(checkbox.disabled).toBe(true);
  expect(screen.getByRole("link", { name: "Guide" }).getAttribute("href")).toBe(
    "/docs",
  );
  expect(screen.getByText("Old").tagName).toBe("DEL");
});

it("keeps nested children as a missing streamed value becomes Markdown", () => {
  const { container, rerender } = render(
    <GenerativeMarkdown>
      <button type="button">Details</button>
    </GenerativeMarkdown>,
  );
  const details = screen.getByRole("button", { name: "Details" });
  expect(container.querySelector('[data-aui="markdown"]')?.textContent).toBe(
    "Details",
  );

  rerender(
    <GenerativeMarkdown value="**Hello**">
      <button type="button">Details</button>
    </GenerativeMarkdown>,
  );

  expect(screen.getByText("Hello").tagName).toBe("STRONG");
  expect(screen.getByRole("button", { name: "Details" })).toBe(details);
  expect(details.closest('[data-aui="markdown"]')).not.toBeNull();
});
