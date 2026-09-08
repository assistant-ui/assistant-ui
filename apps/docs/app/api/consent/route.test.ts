import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const request = (country?: string) =>
  new NextRequest("https://www.assistant-ui.com/api/consent", {
    headers: country ? { "x-vercel-ip-country": country } : {},
  });

const requiredFor = async (country?: string) => {
  const response = GET(request(country));
  return ((await response.json()) as { required: boolean }).required;
};

describe("consent requirement route", () => {
  it("requires opt-in across the EEA, the UK, and Switzerland", async () => {
    for (const country of ["DE", "FR", "IE", "NO", "IS", "LI", "GB", "CH"]) {
      await expect(requiredFor(country)).resolves.toBe(true);
    }
  });

  it("leaves opt-out regions to the GPC signal", async () => {
    for (const country of ["US", "CA", "JP", "AU", "BR"]) {
      await expect(requiredFor(country)).resolves.toBe(false);
    }
  });

  it("fails closed when the platform sends no country", async () => {
    await expect(requiredFor()).resolves.toBe(true);
  });

  it("keeps a geo-varying answer out of shared caches", () => {
    expect(GET(request("US")).headers.get("cache-control")).toBe(
      "private, no-store",
    );
  });
});
