import { afterEach, describe, expect, it } from "vitest";
import { getCspNonce } from "./csp-nonce";

const globals = globalThis as { document?: unknown };

const withMeta = (meta: { nonce?: string; attribute?: string } | null) => {
  globals.document = {
    querySelector: (selector: string) =>
      selector === 'meta[property="csp-nonce"]' && meta
        ? {
            nonce: meta.nonce ?? "",
            getAttribute: (name: string) =>
              name === "nonce" ? (meta.attribute ?? null) : null,
          }
        : null,
  };
};

afterEach(() => {
  delete globals.document;
});

describe("getCspNonce", () => {
  it("returns undefined outside a document", () => {
    expect(getCspNonce()).toBeUndefined();
  });

  it("returns undefined without the meta tag", () => {
    withMeta(null);

    expect(getCspNonce()).toBeUndefined();
  });

  it("reads the nonce property, which browsers keep after hiding the attribute", () => {
    withMeta({ nonce: "abc123", attribute: "" });

    expect(getCspNonce()).toBe("abc123");
  });

  it("falls back to the nonce attribute", () => {
    withMeta({ attribute: "abc123" });

    expect(getCspNonce()).toBe("abc123");
  });
});
