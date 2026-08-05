import {
  findXuluxSuggestion,
  XULUX_SUGGESTION_GROUPS,
} from "./xulux-suggestions";
import { NAV_ITEMS } from "@/lib/constants";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";

describe("Xulux Learn suggestions", () => {
  it("does not encode course navigation as a prompt replay", () => {
    expect(findXuluxSuggestion("learn-guided-course")).toBeUndefined();
    expect(
      XULUX_SUGGESTION_GROUPS.flatMap((group) => group.options).some(
        (option) => option.prompt === "Start the course.",
      ),
    ).toBe(false);
  });

  it("keeps existing Learn replay data available for compatibility", () => {
    expect(findXuluxSuggestion("learn-thread-component")).toMatchObject({
      label: "Thread component",
    });
  });

  it("only exposes the interactive course when Learn is enabled", () => {
    const resources = NAV_ITEMS.find(
      (item) => item.type === "mega" && item.label === "Resources",
    );
    expect(resources?.type).toBe("mega");
    if (resources?.type !== "mega") return;

    const learn = resources.groups.find((group) => group.label === "Learn");
    const interactiveCourse = {
      label: "Interactive course",
      href: "/learn",
      description: "Build your first AI app, step by step",
      external: false,
    };
    if (isAiPlaygroundEnabled) {
      expect(learn?.items[0]).toEqual(interactiveCourse);
      return;
    }
    expect(learn?.items).not.toContainEqual(interactiveCourse);
  });
});
