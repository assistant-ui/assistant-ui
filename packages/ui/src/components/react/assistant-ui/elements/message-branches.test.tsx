import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MessageBranches } from "./message-branches";

afterEach(cleanup);

const VARIANTS = ["First answer", "Second answer", "Third answer"];

function Branches({ variants = VARIANTS }: { variants?: readonly string[] }) {
  const [index, setIndex] = useState(0);
  return (
    <MessageBranches
      variants={variants}
      index={index}
      onIndexChange={setIndex}
    />
  );
}

describe("MessageBranches", () => {
  it("disables previous on the first branch and next on the last", () => {
    render(<Branches />);
    const previous = screen.getByRole("button", {
      name: "Show previous response",
    });
    const next = screen.getByRole("button", { name: "Show next response" });

    expect(previous).toHaveProperty("disabled", true);
    expect(next).toHaveProperty("disabled", false);

    fireEvent.click(next);
    fireEvent.click(next);

    expect(screen.getByText("Third answer")).toBeTruthy();
    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(next).toHaveProperty("disabled", true);
    expect(previous).toHaveProperty("disabled", false);
  });

  it("hides the picker with a single branch", () => {
    render(<Branches variants={["Only answer"]} />);

    expect(screen.getByText("Only answer")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing without branches", () => {
    const { container } = render(<Branches variants={[]} />);

    expect(container.innerHTML).toBe("");
  });
});
