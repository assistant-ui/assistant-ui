import { LearnRegistryError } from "./registry";
import { getNextStep } from "./progression";

describe("getNextStep", () => {
  it("returns the first step when no step is current", () => {
    expect(getNextStep(null)).toMatchObject({
      status: "in_progress",
      step: { id: "meet-the-project", stageId: "S0" },
    });
  });

  it("returns the next step", () => {
    expect(getNextStep("meet-the-project")).toMatchObject({
      status: "in_progress",
      step: { id: "connect-first-assistant", stageId: "S1" },
    });
  });

  it("returns completed after the final step", () => {
    expect(getNextStep("revise-and-branch")).toEqual({ status: "completed" });
  });

  it("is idempotent for the same current step", () => {
    expect(getNextStep("meet-the-project")).toEqual(
      getNextStep("meet-the-project"),
    );
  });

  it("rejects invalid course and step IDs", () => {
    expect(() => getNextStep(null, "missing-course")).toThrow(
      LearnRegistryError,
    );
    expect(() => getNextStep("missing-step")).toThrow(LearnRegistryError);
  });
});
