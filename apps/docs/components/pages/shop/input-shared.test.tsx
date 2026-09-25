// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InputHelp, NoteField } from "./input-shared";

afterEach(cleanup);

describe("InputHelp", () => {
  it("renders an HTTPS guide link with its destination host", () => {
    const { container } = render(
      <InputHelp
        help={{
          summary: "Pick the setup that fits your project.",
          href: "https://docs.example.com/guides/setup",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Need help choosing?" }),
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(
      "https://docs.example.com/guides/setup",
    );
    expect(link?.textContent).toBe("Read the full guide");
    expect(container.textContent).toContain("(docs.example.com)");
  });

  it.each([
    "javascript:alert(1)",
    "http://x.test",
    "/guides/setup",
    "https://%",
  ])("does not render an unsafe guide link for %s", (href) => {
    const { container } = render(
      <InputHelp help={{ summary: "Choose carefully.", href }} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Need help choosing?" }),
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("Choose carefully.");
  });
});

describe("NoteField", () => {
  function Form({ onSubmit }: { onSubmit: () => void }) {
    const [note, setNote] = useState("");
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <NoteField value={note} onChange={setNote} />
      </form>
    );
  }

  it("submits on Shift+Enter and keeps plain Enter for new lines", () => {
    const onSubmit = vi.fn();
    render(<Form onSubmit={onSubmit} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Add a note for your agent" }),
    );
    const note = screen.getByLabelText("Note for your agent");
    fireEvent.keyDown(note, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(note, { key: "Enter", shiftKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
