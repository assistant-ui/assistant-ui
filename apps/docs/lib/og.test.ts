import { describe, expect, it } from "vitest";
import { createOgMetadata } from "./og";

describe("createOgMetadata", () => {
  it.each(["Build chat UIs", ""])(
    "passes the description %j to Open Graph and Twitter",
    (description) => {
      const { openGraph, twitter } = createOgMetadata("Title", description);
      expect(openGraph).toHaveProperty("description", description);
      expect(twitter).toHaveProperty("description", description);
    },
  );

  it.each([null, undefined])("omits a %s description", (description) => {
    const { openGraph, twitter } = createOgMetadata("Title", description);
    expect(openGraph).not.toHaveProperty("description");
    expect(twitter).not.toHaveProperty("description");
  });
});
