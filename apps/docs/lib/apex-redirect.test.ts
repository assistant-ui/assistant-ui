import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { modifyRouteRegex } from "next/dist/lib/redirect-status";
import {
  matchHas,
  prepareDestination,
} from "next/dist/shared/lib/router/utils/prepare-destination";
import { APEX_REDIRECTS } from "./apex-redirect.ts";

// The matcher `next start` builds for a redirect (server/lib/router-utils/filesystem.ts).
const routes = APEX_REDIRECTS.map((route) => ({
  ...route,
  match: getPathMatch(route.source, {
    strict: true,
    removeUnnamedParams: true,
    regexModifier: (regex) => modifyRouteRegex(regex, ["/_next"]),
  }),
}));

function redirectOf(host: string, url: string) {
  const { pathname, searchParams } = new URL(url, "https://x.invalid");
  const query = Object.fromEntries(searchParams);
  for (const route of routes) {
    const params = route.match(pathname);
    if (!params) continue;
    const hostParams = matchHas(
      { headers: { host } } as never,
      query,
      route.has,
    );
    if (!hostParams) continue;
    // What `next start` answers (server/lib/router-utils/resolve-routes.ts).
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: route.destination,
      params: { ...params, ...hostParams },
      query,
    });
    const search = new URLSearchParams(
      parsedDestination.query as Record<string, string>,
    );
    return {
      permanent: route.permanent,
      location: `${parsedDestination.protocol}//${parsedDestination.hostname}${parsedDestination.pathname}${search.size ? `?${search}` : ""}`,
    };
  }
  return undefined;
}

describe("the bare domain's redirect to www", () => {
  it("sends the root, pages and queries to the same path on www", () => {
    expect(redirectOf("assistant-ui.com", "/")).toEqual({
      permanent: true,
      location: "https://www.assistant-ui.com/",
    });
    expect(redirectOf("assistant-ui.com", "/docs")?.location).toBe(
      "https://www.assistant-ui.com/docs",
    );
    expect(
      redirectOf("assistant-ui.com", "/docs/runtimes/ai-sdk/v6")?.location,
    ).toBe("https://www.assistant-ui.com/docs/runtimes/ai-sdk/v6");
    expect(
      redirectOf("assistant-ui.com", "/changelog?pkg=react&page=2")?.location,
    ).toBe("https://www.assistant-ui.com/changelog?pkg=react&page=2");
    expect(redirectOf("assistant-ui.com:443", "/pricing")?.location).toBe(
      "https://www.assistant-ui.com/pricing",
    );
    expect(redirectOf("assistant-ui.com", "/appsx")?.location).toBe(
      "https://www.assistant-ui.com/appsx",
    );
  });

  it("serves /apps/ on the bare domain itself", () => {
    expect(redirectOf("assistant-ui.com", "/apps/board/did.json")).toBe(
      undefined,
    );
    expect(redirectOf("assistant-ui.com", "/apps")).toBe(undefined);
  });

  it("leaves www and other hosts alone", () => {
    for (const host of [
      "www.assistant-ui.com",
      "assistant-uixcom",
      "preview.assistant-ui.com",
      "localhost:3000",
    ]) {
      expect(redirectOf(host, "/docs")).toBe(undefined);
      expect(redirectOf(host, "/")).toBe(undefined);
    }
  });
});
