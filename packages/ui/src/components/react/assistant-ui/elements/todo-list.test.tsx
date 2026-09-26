import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TodoList } from "./todo-list";

afterEach(cleanup);

describe("TodoList", () => {
  it("renders its title and description", () => {
    render(
      <TodoList
        title="Release checklist"
        description="The tasks that remain before publishing."
        items={[]}
      />,
    );

    expect(screen.getByText("Release checklist")).toBeTruthy();
    expect(
      screen.getByText("The tasks that remain before publishing."),
    ).toBeTruthy();
  });

  it("shows an item description unless a failed item has a reason", () => {
    render(
      <TodoList
        items={[
          {
            id: "pending",
            text: "Review the changes",
            status: "pending",
            description: "Check the public API too.",
          },
          {
            id: "failed",
            text: "Run the suite",
            status: "failed",
            description: "This should not render.",
            reason: "The suite timed out.",
          },
        ]}
      />,
    );

    expect(screen.getByText("Check the public API too.")).toBeTruthy();
    expect(screen.getByText("The suite timed out.")).toBeTruthy();
    expect(screen.queryByText("This should not render.")).toBeNull();
  });

  it("marks cancelled items and leaves them out of the count", () => {
    const { container } = render(
      <TodoList
        items={[
          { id: "done", text: "Published", status: "done" },
          { id: "cancelled", text: "Skip this", status: "cancelled" },
          { id: "pending", text: "Review", status: "pending" },
        ]}
      />,
    );

    const cancelled = container.querySelector('[data-status="cancelled"]');
    expect(cancelled?.textContent).toContain("cancelled");
    expect(cancelled?.querySelector(".line-through")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
  });

  it("keeps later active and failed items visible while a list is folded", () => {
    render(
      <TodoList
        maxVisible={2}
        items={[
          { id: "done", text: "Read the test", status: "done" },
          { id: "pending", text: "Write the fix", status: "pending" },
          { id: "active", text: "Run typecheck", status: "active" },
          {
            id: "failed",
            text: "Run unit tests",
            status: "failed",
            reason: "Timed out",
          },
          { id: "later", text: "Deploy", status: "pending" },
          { id: "cancelled", text: "Announce", status: "cancelled" },
        ]}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Show 2 more" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBeTruthy();
    expect(screen.getByText("Run typecheck")).toBeTruthy();
    expect(screen.getByText("Run unit tests")).toBeTruthy();
    expect(screen.queryByText("Deploy")).toBeNull();
    expect(screen.queryByText("Announce")).toBeNull();

    fireEvent.click(toggle);

    expect(
      screen
        .getByRole("button", { name: "Show less" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("Deploy")).toBeTruthy();
    expect(screen.getByText("Announce")).toBeTruthy();
  });
});
