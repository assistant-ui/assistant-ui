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
    const items = screen.getAllByRole("listitem");
    CUSTOMER_LOGOS.forEach((logo, index) => {
      const images = [...items[index]!.querySelectorAll("img")];
      expect(images).toHaveLength(logo.darkSrc ? 2 : 1);
      for (const image of images) expect(image.alt).toBe(logo.alt);
    });
  });
});
