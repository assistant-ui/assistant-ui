/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { GenerativeUIRender } from "./GenerativeUI";

const Card = ({ children }: { children?: ReactNode }) => (
  <div data-testid="card">{children}</div>
);

describe("GenerativeUIRender", () => {
  it.each([
    ["a string", "Sunny"],
    ["an array-like object", { length: 1 }],
    ["a number", 42],
  ])("tolerates %s", (_description, children) => {
    const view = render(
      <GenerativeUIRender
        spec={{
          root: { component: "Card", children } as never,
        }}
        components={{ Card }}
      />,
    );

    expect(view.getByTestId("card")).toBeTruthy();
    expect(view.getByTestId("card").textContent).toBe("");
  });

  it("renders string children from an array", () => {
    const view = render(
      <GenerativeUIRender
        spec={{
          root: { component: "Card", children: ["Sunny"] },
        }}
        components={{ Card }}
      />,
    );

    expect(view.getByTestId("card").textContent).toBe("Sunny");
  });
});
