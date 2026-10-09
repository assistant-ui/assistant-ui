import { describe, expect, it, vi } from "vitest";
import { RadioGroupScope, useRadioGroupName } from "./RadioGroupScope";

const { useId } = vi.hoisted(() => ({ useId: vi.fn(() => "server-id") }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal()),
  createContext: undefined,
  useContext: undefined,
  useId,
}));

describe("radio scoping without React context APIs", () => {
  it("passes display content through without calling client hooks", () => {
    const children = <p>Hello</p>;
    expect(RadioGroupScope({ children })).toBe(children);
    expect(useId).not.toHaveBeenCalled();
  });

  it("preserves unscoped logical names and generates unnamed ones", () => {
    expect(useRadioGroupName("choice")).toBe("choice");
    expect(useRadioGroupName(undefined)).toBe("server-id");
  });
});
