import {
  findXuluxSuggestion,
  XULUX_SUGGESTION_GROUPS,
} from "./xulux-suggestions";

describe("Xulux Learn suggestions", () => {
  it("leaves course entry to the dedicated spotlight", () => {
    expect(findXuluxSuggestion("learn-guided-course")).toBeUndefined();
    expect(
      XULUX_SUGGESTION_GROUPS.flatMap((group) => group.options).some(
        (option) => option.prompt === "Start the course.",
      ),
    ).toBe(false);
  });

  it("keeps topic-based Learn suggestions", () => {
    expect(findXuluxSuggestion("learn-thread-component")).toMatchObject({
      label: "Thread component",
    });
  });
});
