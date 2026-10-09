import { describe, expect, it } from "vitest";
import { pricingPlans } from "./pricing-data";

describe("Cloud pricing entry points", () => {
  it("preserves Pro intent while the user selects an organization and project", () => {
    const pro = pricingPlans.find((plan) => plan.name === "Pro")!;
    const url = new URL(pro.href);
    expect(url.origin).toBe("https://cloud.assistant-ui.com");
    expect(url.pathname).toBe("/org");
    expect(url.searchParams.get("plan")).toBe("pro");
  });

  it("keeps free signup and Enterprise contact destinations", () => {
    expect(pricingPlans.find((plan) => plan.name === "Free")!.href).toBe(
      "https://cloud.assistant-ui.com",
    );
    expect(pricingPlans.find((plan) => plan.name === "Enterprise")!.href).toBe(
      "https://cal.com/simon-farshid/assistant-ui",
    );
  });
});
