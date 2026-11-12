import { describe, expect, it } from "vitest";
import {
  EMPTY_CONTACT_SALES_VALUES,
  SALES_BOOKING_URL,
  buildSalesBookingUrl,
  isPersonalEmail,
  validateContactSales,
  type ContactSalesValues,
} from "./contact-sales";

const filled: ContactSalesValues = {
  firstName: " Ada ",
  lastName: "Lovelace",
  email: "ada@acme.dev ",
  company: "Acme",
  companySize: "51-200",
  role: "Engineering lead",
  building: "A support agent inside our dashboard.",
  referral: "GitHub",
};

describe("validateContactSales", () => {
  it("requires name, work email, company and company size", () => {
    expect(
      Object.keys(validateContactSales(EMPTY_CONTACT_SALES_VALUES)),
    ).toEqual(["firstName", "lastName", "email", "company", "companySize"]);
  });

  it("rejects a malformed email", () => {
    expect(
      validateContactSales({ ...filled, email: "ada@acme" }).email,
    ).toBeDefined();
  });

  it("accepts a filled form and leaves role, project and source optional", () => {
    expect(validateContactSales(filled)).toEqual({});
    expect(
      validateContactSales({ ...filled, role: "", building: "", referral: "" }),
    ).toEqual({});
  });
});

describe("isPersonalEmail", () => {
  it("flags free mail providers only", () => {
    expect(isPersonalEmail("ada@Gmail.com")).toBe(true);
    expect(isPersonalEmail("ada@acme.dev")).toBe(false);
    expect(isPersonalEmail("ada")).toBe(false);
  });
});

describe("buildSalesBookingUrl", () => {
  it("prefills the cal.com event with name, email and the answers as notes", () => {
    const url = new URL(buildSalesBookingUrl(filled));
    expect(`${url.origin}${url.pathname}`).toBe(SALES_BOOKING_URL);
    expect(url.searchParams.get("name")).toBe("Ada Lovelace");
    expect(url.searchParams.get("email")).toBe("ada@acme.dev");
    expect(url.searchParams.get("notes")).toBe(
      [
        "Company: Acme",
        "Company size: 51-200",
        "Role: Engineering lead",
        "Heard about us: GitHub",
        "",
        "What are you building?",
        "A support agent inside our dashboard.",
      ].join("\n"),
    );
  });

  it("leaves unanswered optional questions out of the notes", () => {
    const url = new URL(
      buildSalesBookingUrl({ ...filled, role: "", building: "", referral: "" }),
    );
    expect(url.searchParams.get("notes")).toBe(
      "Company: Acme\nCompany size: 51-200",
    );
  });
});
