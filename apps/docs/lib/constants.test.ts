import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "./constants";

describe("global navigation", () => {
  it("places the Learn course first in the Resources Learn group", () => {
    const resources = NAV_ITEMS.find(
      (item) => item.type === "mega" && item.label === "Resources",
    );
    expect(resources?.type).toBe("mega");
    if (resources?.type !== "mega") return;

    const learn = resources.groups.find((group) => group.label === "Learn");
    expect(learn?.items[0]).toEqual({
      label: "Course",
      href: "/learn",
      description: "Build assistant-ui through a guided course",
      external: false,
    });
  });
});
