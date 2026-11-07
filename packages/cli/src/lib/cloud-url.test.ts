// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateCloudUrl } from "./cloud-url";

describe("validateCloudUrl", () => {
  it("keeps the existing HTTPS / localhost contract", () => {
    expect(validateCloudUrl("https://cloud.example.com/")).toBe(
      "https://cloud.example.com",
    );
    expect(validateCloudUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(() => validateCloudUrl("http://cloud.example.com")).toThrow();
    expect(() => validateCloudUrl("https://a.example.com/?x=1")).toThrow();
    expect(() => validateCloudUrl("https://u:p@a.example.com")).toThrow();
  });

  it("accepts loopback hosts that the rest of the monorepo accepts", () => {
    expect(validateCloudUrl("http://localhost.:3000")).toBe(
      "http://localhost.:3000",
    );
    expect(validateCloudUrl("http://127.1.2.3:3000")).toBe(
      "http://127.1.2.3:3000",
    );
    expect(validateCloudUrl("http://dev.localhost:3000")).toBe(
      "http://dev.localhost:3000",
    );
    expect(validateCloudUrl("http://[::1]:3000")).toBe("http://[::1]:3000");
  });

  it("still rejects a non-loopback 127-looking host", () => {
    expect(() => validateCloudUrl("http://128.1.2.3:3000")).toThrow();
  });
});
