import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Button } from "./button";

it("forwards refs to the rendered button", () => {
  const ref = createRef<HTMLButtonElement>();

  render(<Button ref={ref}>Save</Button>);

  expect(ref.current).toBe(screen.getByRole("button", { name: "Save" }));
});
