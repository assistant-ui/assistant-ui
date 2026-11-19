import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(async (): Promise<Response | null> => null),
  send: vi.fn(async () => true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkContactSalesRateLimit: mocks.limit,
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

const post = (body: unknown, contentType = "application/json") =>
  POST(
    new Request("http://localhost/api/contact-sales", {
      method: "POST",
      headers: { "content-type": contentType },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

afterEach(() => {
  mocks.limit.mockClear();
  mocks.send.mockClear();
  mocks.limit.mockResolvedValue(null);
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
    expect(await res.json()).toEqual({ ok: true, sent: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON-typed", async () => {
    const res = await post(valid, "text/plain");
    expect(res.status).toBe(415);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("counts the size cap in bytes", async () => {
    // 6,000 three-byte characters: under 16,000 code units, over 16,000 bytes.
    const res = await post({ ...valid, building: "€".repeat(6_000) });
    expect(res.status).toBe(400);
  });

  it("rejects select values the form does not offer", async () => {
    expect(
      (await post({ ...valid, companySize: "51-200\nEmail: x@evil.test" }))
        .status,
    ).toBe(400);
    expect((await post({ ...valid, role: "CEO" })).status).toBe(400);
    expect((await post({ ...valid, referral: "TV" })).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects malformed, invalid and oversized bodies", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post("")).status).toBe(400);
    expect((await post({ ...valid, company: "" })).status).toBe(400);
    expect((await post("x".repeat(16_001))).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("passes on a 429 with its Retry-After and logs it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.limit.mockResolvedValue(
      new Response("limited", {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
    );
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(warn.mock.calls[0]![0]).toContain("contact_sales_rate_limited");
    expect(mocks.send).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("passes on a 503 from the rate limit", async () => {
    mocks.limit.mockResolvedValue(new Response("down", { status: 503 }));
    const res = await post(valid);
    expect(res.status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
