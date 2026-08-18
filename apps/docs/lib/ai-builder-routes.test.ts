import { describe, expect, it } from "vitest";
import { createSignInUrl } from "./ai-builder-routes";

describe("createSignInUrl", () => {
  it("preserves the AI Builder destination", () => {
    const requestUrl =
      "https://www.assistant-ui.com/playground?mode=agent&template=demo";

    const result = createSignInUrl(requestUrl);

    expect(result.pathname).toBe("/sign-in");
    expect(result.searchParams.get("redirect_url")).toBe(requestUrl);
  });
});
