// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import ContactSalesPage from "./page";

afterEach(cleanup);

it("reads intro, form, talking points, then customers in source order", () => {
  render(<ContactSalesPage />);
  const order = [
    screen.getByRole("heading", { level: 1 }),
    screen.getByRole("form", { name: "Contact sales" }),
    screen.getByText("Ship your AI product sooner"),
    screen.getByText("A chat experience users trust"),
    screen.getByText("Scale with Assistant Cloud"),
    screen.getByText("Enterprise terms"),
    screen.getByRole("region", { name: "Customers" }),
  ];
  for (let i = 1; i < order.length; i++) {
    expect(
      order[i - 1]!.compareDocumentPosition(order[i]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  }
});
