import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PromptLibrary } from "./prompt-library";

afterEach(cleanup);

const prompts = [
  { id: "summary", name: "Summarize", body: "Summarize this", variables: [] },
  { id: "rewrite", name: "Rewrite", body: "Rewrite this", variables: [] },
] as const;

describe("PromptLibrary", () => {
  it("makes insertion-only prompts directly actionable", () => {
    const onInsert = vi.fn();
    render(
      <PromptLibrary
        prompts={prompts}
        query=""
        selectedId="summary"
        onInsert={onInsert}
      />,
    );

    const rewrite = screen.getByRole("option", { name: "Rewrite" });
    expect(rewrite.getAttribute("tabindex")).toBe("0");

    fireEvent.click(rewrite);

    expect(onInsert).toHaveBeenCalledOnce();
    expect(onInsert).toHaveBeenCalledWith("rewrite");

    fireEvent.click(rewrite, { detail: 2 });

    expect(onInsert).toHaveBeenCalledOnce();
  });
});

describe("PromptLibrary variable count", () => {
  it("counts one variable in the singular and more in the plural", () => {
    render(
      <PromptLibrary
        prompts={[
          { id: "one", name: "One", body: "{a}", variables: ["a"] },
          { id: "two", name: "Two", body: "{a} {b}", variables: ["a", "b"] },
        ]}
        query=""
        selectedId="one"
      />,
    );

    expect(screen.getByText("1 var")).toBeTruthy();
    expect(screen.getByText("2 vars")).toBeTruthy();
  });
});
