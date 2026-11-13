import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contactSalesEmail,
  parseContactSalesSubmission,
  sendContactSalesEmail,
} from "./contact-sales-email";

const body = {
  firstName: " Ada ",
  lastName: "Lovelace",
  email: "ada@acme.dev",
  company: "Acme\nCorp",
  companySize: "51-200",
  role: "Engineering lead",
  building: "A support agent.",
  referral: "GitHub",
  website: "",
  pageUrl: "https://www.assistant-ui.com/contact-sales?ref=pricing",
};

describe("parseContactSalesSubmission", () => {
  it("reads a valid body", () => {
    const parsed = parseContactSalesSubmission(body);
    expect(parsed?.values.company).toBe("Acme\nCorp");
    expect(parsed?.pageUrl).toBe(body.pageUrl);
    expect(parsed?.website).toBe("");
  });

  it("rejects bodies the form would reject", () => {
    expect(parseContactSalesSubmission(null)).toBeNull();
    expect(parseContactSalesSubmission("x")).toBeNull();
    expect(parseContactSalesSubmission({ ...body, email: "nope" })).toBeNull();
    expect(
      parseContactSalesSubmission({ ...body, companySize: "" }),
    ).toBeNull();
  });

  it("rejects fields past their size limit", () => {
    expect(
      parseContactSalesSubmission({ ...body, company: "a".repeat(201) }),
    ).toBeNull();
    expect(
      parseContactSalesSubmission({ ...body, building: "a".repeat(1001) }),
    ).toBeNull();
  });

  it("only accepts the form's own select options", () => {
    expect(
      parseContactSalesSubmission({ ...body, companySize: "51-200\nEmail: x" }),
    ).toBeNull();
    expect(parseContactSalesSubmission({ ...body, role: "CEO" })).toBeNull();
    expect(parseContactSalesSubmission({ ...body, referral: "TV" })).toBeNull();
    expect(
      parseContactSalesSubmission({ ...body, role: "", referral: "" }),
    ).not.toBeNull();
  });

  it("keeps the page URL on one line", () => {
    expect(
      parseContactSalesSubmission({
        ...body,
        pageUrl: "https://x.test/\nEmail: forged@evil.test",
      })?.pageUrl,
    ).toBe("https://x.test/ Email: forged@evil.test");
  });

  it("ignores fields that are not strings", () => {
    expect(
      parseContactSalesSubmission({ ...body, role: 42 })?.values.role,
    ).toBe("");
  });
});

describe("contactSalesEmail", () => {
  it("lists every answer with the page and time", () => {
    const email = contactSalesEmail(
      parseContactSalesSubmission(body)!,
      new Date("2026-11-12T20:00:00.000Z"),
    );
    expect(email.subject).toBe("Sales inquiry: Acme Corp");
    expect(email.text).toBe(
      [
        "Name: Ada Lovelace",
        "Email: ada@acme.dev",
        "Company: Acme Corp",
        "Company size: 51-200",
        "Role: Engineering lead",
        "Heard about us: GitHub",
        `Page: ${body.pageUrl}`,
        "Submitted: 2026-11-12T20:00:00.000Z",
        "",
        "What are you building?",
        "A support agent.",
      ].join("\n"),
    );
  });

  it("marks skipped optional answers", () => {
    const email = contactSalesEmail(
      parseContactSalesSubmission({
        ...body,
        role: "",
        referral: "",
        building: "",
        pageUrl: "",
      })!,
      new Date(0),
    );
    expect(email.text).toContain("Role: -");
    expect(email.text).toContain("Heard about us: -");
    expect(email.text).toContain("Page: -");
    expect(email.text.endsWith("What are you building?\n-")).toBe(true);
  });
});

describe("sendContactSalesEmail", () => {
  const fetchMock = vi.fn();
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "account-id");
    vi.stubEnv("CLOUDFLARE_EMAIL_API_TOKEN", "token");
    vi.stubEnv("CONTACT_SALES_TO", "sales@example.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    vi.restoreAllMocks();
  });

  const email = { subject: "Sales inquiry: Acme", text: "Name: Ada" };

  it("posts to Cloudflare and reports a delivery", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        success: true,
        errors: [],
        result: {
          delivered: ["sales@example.test"],
          queued: [],
          permanent_bounces: [],
        },
      }),
    );
    await expect(sendContactSalesEmail(email, "ada@acme.dev")).resolves.toBe(
      true,
    );
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-id/email/sending/send",
    );
    expect(init.headers.Authorization).toBe("Bearer token");
    expect(JSON.parse(init.body)).toEqual({
      from: {
        address: "noreply@mail.assistant-ui.com",
        name: "assistant-ui sales",
      },
      to: "sales@example.test",
      reply_to: "ada@acme.dev",
      subject: "Sales inquiry: Acme",
      text: "Name: Ada",
    });
  });

  it("logs and returns false without config", async () => {
    vi.stubEnv("CONTACT_SALES_TO", "");
    await expect(sendContactSalesEmail(email, "ada@acme.dev")).resolves.toBe(
      false,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(error.mock.calls[0]![0]).toContain("missing_configuration");
  });

  it("logs and returns false when Cloudflare refuses", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { success: false, errors: [{ code: 10000 }], result: null },
        { status: 403 },
      ),
    );
    await expect(sendContactSalesEmail(email, "ada@acme.dev")).resolves.toBe(
      false,
    );
    expect(error.mock.calls[0]![0]).toContain("10000");
  });

  it("logs a permanent bounce", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        success: true,
        errors: [],
        result: {
          delivered: [],
          queued: [],
          permanent_bounces: ["sales@example.test"],
        },
      }),
    );
    await expect(sendContactSalesEmail(email, "ada@acme.dev")).resolves.toBe(
      false,
    );
    expect(error.mock.calls[0]![0]).toContain("permanent_bounce");
  });

  it("logs and returns false when the request throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(sendContactSalesEmail(email, "ada@acme.dev")).resolves.toBe(
      false,
    );
    expect(error.mock.calls[0]![0]).toContain("request_failed");
  });
});
