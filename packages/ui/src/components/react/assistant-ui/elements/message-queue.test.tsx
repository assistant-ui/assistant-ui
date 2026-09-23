import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MessageQueue } from "./message-queue";

afterEach(cleanup);

describe("MessageQueue", () => {
  it("renders queued rows and asks to cancel one", () => {
    const onCancel = vi.fn();

    render(
      <MessageQueue
        running="Writing the answer"
        queued={[
          { id: "follow-up", text: "Add an example" },
          { id: "review", text: "Review the result" },
        ]}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Writing the answer")).toBeTruthy();
    expect(screen.getByText("2 queued")).toBeTruthy();
    expect(screen.getByText("sends when this finishes")).toBeTruthy();
    expect(screen.getByText("Add an example")).toBeTruthy();
    expect(screen.getByText("Review the result")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: 'Remove "Add an example" from the queue',
      }),
    );

    expect(onCancel).toHaveBeenCalledWith("follow-up");
  });

  it("omits cancel controls when no cancel callback is supplied", () => {
    render(
      <MessageQueue
        running="Writing the answer"
        queued={[{ id: "follow-up", text: "Add an example" }]}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: 'Remove "Add an example" from the queue',
      }),
    ).toBeNull();
  });
});
