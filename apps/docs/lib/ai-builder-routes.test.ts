import { describe, expect, it } from "vitest";
import {
  createAiBuilderReturnPath,
  createSignInUrl,
} from "./ai-builder-routes";

describe("createAiBuilderReturnPath", () => {
  it("preserves playground state while selecting AI Builder", () => {
    const searchParams = new URLSearchParams(
      "template=demo&viewport=mobile&mode=builder",
    );

    expect(createAiBuilderReturnPath(searchParams)).toBe(
      "/playground?template=demo&viewport=mobile&mode=agent",
    );
  });
});

describe("createSignInUrl", () => {
  it("preserves the AI Builder destination", () => {
    const requestUrl =
      "https://www.assistant-ui.com/playground?mode=agent&template=demo";

    const result = createSignInUrl(requestUrl);

    expect(result.pathname).toBe("/sign-in");
    expect(result.searchParams.get("redirect_url")).toBe(requestUrl);
  });
});
