// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { states } from "./orb";

afterEach(cleanup);

describe("orb states", () => {
  it("connects the idle fixture through its stub voice adapter", async () => {
    const Idle = states.find((state) => state.key === "idle")!.Component!;
    render(<Idle />);

    fireEvent.click(await screen.findByRole("button", { name: "Connect" }));

    expect(
      await screen.findByRole("button", { name: "Disconnect" }),
    ).toBeTruthy();
  });
});
