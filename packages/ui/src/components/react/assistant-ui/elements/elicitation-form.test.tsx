import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ElicitationForm, type ElicitationField } from "./elicitation-form";

afterEach(cleanup);

describe("ElicitationForm", () => {
  it("disables Send until required text is filled in an editable request", () => {
    const onAccept = vi.fn();

    function EditableForm() {
      const [fields, setFields] = useState<readonly ElicitationField[]>([
        {
          name: "repo",
          label: "Repository",
          value: "assistant-ui/assistant-ui",
          kind: "text",
          required: true,
        },
        { name: "note", label: "Note", value: "", kind: "text" },
      ]);

      return (
        <ElicitationForm
          server="GitHub"
          message="Choose a repository"
          fields={fields}
          state="request"
          onFieldChange={(name, value) =>
            setFields((current) =>
              current.map((field) =>
                field.name === name ? { ...field, value } : field,
              ),
            )
          }
          onAccept={onAccept}
        />
      );
    }

    render(<EditableForm />);

    const repo = screen.getByRole("textbox", { name: "Repository*" });
    const send = screen.getByRole("button", {
      name: "Send",
    }) as HTMLButtonElement;
    expect(send.disabled).toBe(false);

    fireEvent.change(repo, { target: { value: "new/repo" } });
    expect((repo as HTMLInputElement).value).toBe("new/repo");

    fireEvent.change(repo, { target: { value: "   " } });
    expect(send.disabled).toBe(true);
    fireEvent.click(send);
    expect(onAccept).not.toHaveBeenCalled();

    fireEvent.change(repo, { target: { value: "another/repo" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("keeps Send enabled for read-only requests with blank required text", () => {
    const onAccept = vi.fn();
    render(
      <ElicitationForm
        server="GitHub"
        message="Choose a repository"
        fields={[
          {
            name: "repo",
            label: "Repository",
            value: "",
            kind: "text",
            required: true,
          },
        ]}
        state="request"
        onAccept={onAccept}
      />,
    );

    const send = screen.getByRole("button", {
      name: "Send",
    }) as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    expect(onAccept).toHaveBeenCalledOnce();
  });

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
