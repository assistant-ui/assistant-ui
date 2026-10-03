import { describe, expect, it, vi } from "vitest";
import type { Checkout } from "./protocol";
import {
  cloudLoginDetails,
  rememberCloudLogin,
  returnedToCloudLogin,
} from "./cloud-login";

const attempt = "4787798b-d33b-4329-b3d7-ad87ba1687fd";
const input = (): Checkout.Input => ({
  id: "q1",
  kind: "text",
  preset: "assistant-ui-cli-login",
  phase: "planning",
  prompt: "Sign in",
  optional: false,
  status: "open",
  createdAt: 1,
  help: {
    summary: "Sign in",
    href: `https://accounts.assistant-ui.com/device?user_code=ABCD-EFGH&setup_attempt=${attempt}&setup_expires=${Date.now() + 60_000}`,
  },
});
const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};
describe("wizard cloud login", () => {
  it("binds advisory return to the original tab, session, input and expiration", () => {
    const request = input();
    const saved = storage();
    expect(rememberCloudLogin(request, "session", saved)).toBe(true);
    expect(
      returnedToCloudLogin(
        request,
        "session",
        `#setup-login=${attempt}`,
        saved,
      ),
    ).toBe(true);
    expect(
      returnedToCloudLogin(
        request,
        "another",
        `#setup-login=${attempt}`,
        saved,
      ),
    ).toBe(false);
    expect(
      returnedToCloudLogin(
        { ...request, id: "q2" },
        "session",
        `#setup-login=${attempt}`,
        saved,
      ),
    ).toBe(false);
    expect(
      returnedToCloudLogin(
        request,
        "session",
        `#setup-login=${attempt}`,
        storage(),
      ),
    ).toBe(false);
    expect(
      returnedToCloudLogin(
        request,
        "session",
        `#setup-login=${attempt}&setup-login=${attempt}`,
        saved,
      ),
    ).toBe(false);
    expect(
      returnedToCloudLogin(request, "session", "#setup-login=another", saved),
    ).toBe(false);
  });
  it.each([
    "https://accounts.assistant-ui.com.evil.test/device",
    "https://user:password@accounts.assistant-ui.com/device",
    "http://accounts.assistant-ui.com/device",
    "https://accounts.assistant-ui.com/other",
  ])("refuses an unsafe approval destination %s", (target) => {
    const request = input();
    request.help!.href = target + new URL(request.help!.href!).search;
    expect(cloudLoginDetails(request)).toBeUndefined();
  });
  it.each([
    "&access_token=secret",
    "&device_code=secret",
    "&user_code=SECOND",
    "#token",
  ])("refuses extra or duplicate authorization data %s", (suffix) => {
    const request = input();
    request.help!.href += suffix;
    expect(cloudLoginDetails(request)).toBeUndefined();
  });
  it("refuses malformed and excessively distant expiration", () => {
    const request = input();
    const url = new URL(request.help!.href!);
    for (const value of ["nan", "1e15", String(Date.now() + 60 * 60_000)]) {
      url.searchParams.set("setup_expires", value);
      request.help!.href = url.href;
      expect(cloudLoginDetails(request)).toBeUndefined();
    }
  });
  it("rejects an expired return from a previously remembered matching attempt", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    try {
      const request = input();
      const saved = storage();
      const details = cloudLoginDetails(request)!;
      expect(rememberCloudLogin(request, "session", saved)).toBe(true);
      const metadata = saved.getItem(`aui-cloud-login:${attempt}`);
      expect(JSON.parse(metadata!)).toEqual({
        sessionId: "session",
        inputId: request.id,
        expiresAt: details.expiresAt,
      });
      expect(
        returnedToCloudLogin(
          request,
          "session",
          `#setup-login=${attempt}`,
          saved,
        ),
      ).toBe(true);
      clock.mockReturnValue(details.expiresAt + 1);
      expect(
        returnedToCloudLogin(
          request,
          "session",
          `#setup-login=${attempt}`,
          saved,
        ),
      ).toBe(false);
      expect(rememberCloudLogin(request, "session", saved)).toBe(false);
      expect(saved.getItem(`aui-cloud-login:${attempt}`)).toBe(metadata);
    } finally {
      clock.mockRestore();
    }
  });
  it("handles unavailable browser storage without trusting the return", () => {
    const request = input();
    const blocked = {
      setItem: () => {
        throw new Error("blocked");
      },
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(rememberCloudLogin(request, "session", blocked)).toBe(false);
    expect(
      returnedToCloudLogin(
        request,
        "session",
        `#setup-login=${attempt}`,
        blocked,
      ),
    ).toBe(false);
  });
});
