import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allow: vi.fn(async () => true),
  send: vi.fn(async () => true),
}));

vi.mock("@/lib/rate-limit", () => ({
  allowContactSalesEmail: mocks.allow,
}));

vi.mock("@/lib/contact-sales-email", async (importOriginal) => ({
  ...(await importOriginal()),
  sendContactSalesEmail: mocks.send,
}));

import { POST } from "./route";

const valid = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@acme.dev",
  company: "Acme",
  companySize: "51-200",
  role: "",
  building: "",
  referral: "",
  website: "",
  pageUrl: "https://www.assistant-ui.com/contact-sales",
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/contact-sales", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

afterEach(() => {
  mocks.allow.mockClear();
  mocks.send.mockClear();
  mocks.allow.mockResolvedValue(true);
  mocks.send.mockResolvedValue(true);
});

describe("POST /api/contact-sales", () => {
  it("emails a valid submission", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    const [email, replyTo] = mocks.send.mock.calls[0] as unknown as [
      { subject: string; text: string },
      string,
    ];
    expect(email.subject).toBe("Sales inquiry: Acme");
    expect(email.text).toContain(
      "Page: https://www.assistant-ui.com/contact-sales",
    );
    expect(replyTo).toBe("ada@acme.dev");
  });

  it("reports a failed send without an error status", async () => {
    mocks.send.mockResolvedValue(false);
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: false });
  });

  it("drops a filled honeypot quietly", async () => {
    const res = await post({ ...valid, website: "https://spam.test" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: false });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects malformed, invalid and oversized bodies", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post("")).status).toBe(400);
    expect((await post({ ...valid, company: "" })).status).toBe(400);
    expect((await post("x".repeat(16_001))).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("stops at the rate limit", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.allow.mockResolvedValue(false);
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
