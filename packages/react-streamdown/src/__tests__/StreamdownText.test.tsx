import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { StreamdownTextPrimitive } from "../primitives/StreamdownText";

afterEach(cleanup);

describe("StreamdownTextPrimitive", () => {
  it("renders without a SmoothContextProvider", () => {
    expect(() =>
      render(
        <TextMessagePartProvider text="hello" isRunning>
          <StreamdownTextPrimitive />
        </TextMessagePartProvider>,
      ),
    ).not.toThrow();
  });

  it("updates streamdown controls when the message completes", async () => {
    const table = `| a | b |\n| - | - |\n| 1 | 2 |`;

    const { container, rerender } = render(
      <TextMessagePartProvider text={table} isRunning>
        <StreamdownTextPrimitive />
      </TextMessagePartProvider>,
    );

    expect(
      container.querySelector("[data-status]")?.getAttribute("data-status"),
    ).toBe("running");
    expect(
      ((await screen.findByTitle("Copy table")) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      ((await screen.findByTitle("Download table")) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    rerender(
      <TextMessagePartProvider text={table} isRunning={false}>
        <StreamdownTextPrimitive />
      </TextMessagePartProvider>,
    );

    expect(
      container.querySelector("[data-status]")?.getAttribute("data-status"),
    ).toBe("complete");
    expect(
      ((await screen.findByTitle("Copy table")) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      ((await screen.findByTitle("Download table")) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
