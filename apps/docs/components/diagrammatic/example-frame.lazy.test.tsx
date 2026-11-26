// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExampleFrame } from "./example-frame.lazy";

// The frame's chunk fails to load.
vi.mock("./example-frame", () => {
  throw new Error("chunk failed to load");
});

afterEach(cleanup);

describe("ExampleFrame (lazy)", () => {
  it("still shows the chart, without the tabs, when the frame's chunk fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      render(<ExampleFrame preview={<p>chart</p>} file="line/basic" />);
    });
    expect(await screen.findByText("chart")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("renders nothing for a chart that throws, instead of breaking the page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => {
      throw new Error("chart failed");
    };
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <div>
          <ExampleFrame preview={<Broken />} file="line/basic" />
          <p>after</p>
        </div>,
      ));
    });
    expect(await screen.findByText("after")).toBeTruthy();
    expect(container.querySelector(".not-prose")?.textContent ?? "").toBe("");
  });
});
