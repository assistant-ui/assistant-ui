import {
  findXuluxSuggestion,
  XULUX_SUGGESTION_GROUPS,
} from "./xulux-suggestions";

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
});
