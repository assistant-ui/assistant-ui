import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ElicitationForm } from "./elicitation-form";

afterEach(cleanup);

describe("ElicitationForm", () => {
  it("reports edits for every field kind", () => {
    const onFieldChange = vi.fn();
    render(
      <ElicitationForm
        server="Calendar"
        message="Choose the event details"
        fields={[
          { name: "title", label: "Title", value: "Standup", kind: "text" },
          {
            name: "room",
            label: "Room",
            value: "A",
            kind: "choice",
            options: ["A", "B"],
          },
          {
            name: "notify",
            label: "Notify",
            value: "false",
            kind: "toggle",
          },
        ]}
        state="request"
        onFieldChange={onFieldChange}
      />,
    );

    const title = screen.getByRole("textbox", { name: "Title" });
    const titleLabel = screen.getByText("Title");
    expect(titleLabel.tagName).toBe("LABEL");
    expect(titleLabel.getAttribute("for")).toBe(title.id);

    fireEvent.change(title, {
      target: { value: "Planning" },
    });
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    fireEvent.click(screen.getByRole("switch", { name: "Notify" }));

    expect(onFieldChange.mock.calls).toEqual([
      ["title", "Planning"],
      ["room", "B"],
      ["notify", "true"],
    ]);
  });

  it("keeps fields display-only without an active editing callback", () => {
    const fields = [
      {
        name: "title",
        label: "Title",
        value: "Standup",
        kind: "text" as const,
      },
      {
        name: "room",
        label: "Room",
        value: "A",
        kind: "choice" as const,
        options: ["A", "B"],
      },
      {
        name: "notify",
        label: "Notify",
        value: "true",
        kind: "toggle" as const,
      },
    ];
    const { rerender } = render(
      <ElicitationForm
        server="Calendar"
        message="Choose the event details"
        fields={fields}
        state="request"
      />,
    );

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "B" })).toBeNull();

    rerender(
      <ElicitationForm
        server="Calendar"
        message="Choose the event details"
        fields={fields}
        state="accepted"
        onFieldChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "B" })).toBeNull();
  });
});
