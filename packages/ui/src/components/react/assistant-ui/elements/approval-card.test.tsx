import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalCard } from "./approval-card";

afterEach(cleanup);

const cardProps = {
  state: "request" as const,
  title: "Publish the release",
  subtitle: "Needs your approval",
};

describe("ApprovalCard", () => {
  it("uses custom action labels", () => {
    const onAllowOnce = vi.fn();
    const onAlwaysAllow = vi.fn();
    const onDeny = vi.fn();
    render(
      <ApprovalCard
        {...cardProps}
        allowOnceLabel="Publish now"
        alwaysAllowLabel="Always publish"
        denyLabel="Keep as draft"
        onAllowOnce={onAllowOnce}
        onAlwaysAllow={onAlwaysAllow}
        onDeny={onDeny}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish now" }));
    fireEvent.click(screen.getByRole("button", { name: "Always publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep as draft" }));

    expect(onAllowOnce).toHaveBeenCalledOnce();
    expect(onAlwaysAllow).toHaveBeenCalledOnce();
    expect(onDeny).toHaveBeenCalledOnce();
  });

  it("omits the command field when no command is supplied", () => {
    const { container } = render(<ApprovalCard {...cardProps} />);

    expect(container.querySelector(".font-mono")).toBeNull();
  });

  it("renders details as definition pairs", () => {
    const { container } = render(
      <ApprovalCard
        {...cardProps}
        details={[
          { label: "Records", value: "12 selected" },
          { label: "Scope", value: "Archived conversations" },
        ]}
      />,
    );

    expect(
      [...container.querySelectorAll("dt")].map((node) => node.textContent),
    ).toEqual(["Records", "Scope"]);
    expect(
      [...container.querySelectorAll("dd")].map((node) => node.textContent),
    ).toEqual(["12 selected", "Archived conversations"]);
  });

  it("marks destructive actions with its variant", () => {
    render(<ApprovalCard {...cardProps} variant="destructive" />);

    expect(screen.getByRole("group").getAttribute("data-variant")).toBe(
      "destructive",
    );
  });

  it("never denies on Escape, even with a request open and a denial handler present", () => {
    const onDeny = vi.fn();
    render(<ApprovalCard {...cardProps} onDeny={onDeny} />);

    fireEvent.keyDown(screen.getByRole("group"), { key: "Escape" });

    expect(onDeny).not.toHaveBeenCalled();
  });

  it("announces receipt text and allows it to be overridden", () => {
    const { rerender } = render(<ApprovalCard {...cardProps} state="done" />);

    expect(screen.getByRole("status").textContent).toContain("Finished");

    rerender(
      <ApprovalCard
        {...cardProps}
        state="denied"
        statusLabel="Deletion was declined"
      />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Deletion was declined",
    );
  });

  it("labels the group with its title and describes it with the summary", () => {
    render(
      <ApprovalCard
        {...cardProps}
        description="This publishes the current release to every production region."
      />,
    );

    const group = screen.getByRole("group", { name: "Publish the release" });
    const description = screen.getByText(
      "This publishes the current release to every production region.",
    );
    expect(group.getAttribute("aria-describedby")).toBe(description.id);
  });
});
