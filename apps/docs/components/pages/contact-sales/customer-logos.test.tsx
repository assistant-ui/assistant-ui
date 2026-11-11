// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CUSTOMER_LOGOS, CustomerLogos } from "./customer-logos";

afterEach(cleanup);

describe("CustomerLogos", () => {
  it("shows exactly three customers", () => {
    expect(CUSTOMER_LOGOS.map((logo) => logo.alt)).toEqual([
      "Google Cloud",
      "AWS",
      "LangChain",
    ]);
    render(<CustomerLogos />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("gives the light and dark variants the same accessible name", () => {
    render(<CustomerLogos />);
    for (const item of screen.getAllByRole("listitem")) {
      const names = new Set(
        [...item.querySelectorAll("img")].map((img) => img.alt),
      );
      expect(names.size).toBe(1);
    }
  });
});
