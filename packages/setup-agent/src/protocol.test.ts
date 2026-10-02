import { describe, expect, it } from "vitest";
import {
  isValidEntryPointAnswer,
  isValidEntryPointInput,
  parseEntryPointOptions,
  type Checkout,
} from "./protocol";

const option: Checkout.EntryPointOption = {
  id: "ticket-sidebar",
  label: "Ticket sidebar",
  description: "Draft replies beside the selected support ticket.",
  entryPoint: {
    formFactor: "sidebar",
    placement: "The right side of the ticket detail page",
    trigger: "Open with the Draft reply button in the ticket toolbar",
    recommended: true,
  },
};

const input: Checkout.Input = {
  id: "q1",
  kind: "entry-point",
  phase: "planning",
  prompt: "Where should agents draft replies?",
  options: [option],
  default: option.id,
  optional: false,
  status: "open",
  createdAt: 1,
};

describe("entry-point options", () => {
  it("keeps contextual metadata and permits different placements of the same form factor", () => {
    const second = {
      ...option,
      id: "inbox-sidebar",
      entryPoint: {
        ...option.entryPoint,
        placement: "The inbox list",
        trigger: "Open with the inbox Assist button",
        recommended: false,
      },
    };
    expect(parseEntryPointOptions([option, second])).toEqual([option, second]);
    expect(isValidEntryPointInput(input)).toBe(true);
    expect(isValidEntryPointAnswer(input, "ticket-sidebar")).toBe(true);
    expect(isValidEntryPointAnswer(input, "sidebar")).toBe(false);
    expect(isValidEntryPointAnswer(input, "ticket-sidebar:variant")).toBe(
      false,
    );
    expect(isValidEntryPointAnswer(input, '["ticket-sidebar"]')).toBe(false);
  });

  it.each(
    [
      null,
      {},
      [],
      [null],
      [option, option],
      [option, { ...option, id: "another" }],
      [
        option,
        { ...option, id: "b" },
        { ...option, id: "c" },
        { ...option, id: "d" },
      ],
      [{ ...option, id: "with:variant" }],
      [{ ...option, id: "x".repeat(65) }],
      [{ ...option, label: " " }],
      [{ ...option, description: "" }],
      [{ ...option, description: "x".repeat(1001) }],
      [{ ...option, entryPoint: null }],
      [
        {
          ...option,
          entryPoint: { ...option.entryPoint, formFactor: "drawer" },
        },
      ],
      [{ ...option, entryPoint: { ...option.entryPoint, placement: "" } }],
      [{ ...option, entryPoint: { ...option.entryPoint, trigger: " " } }],
      [{ ...option, entryPoint: { ...option.entryPoint, recommended: "yes" } }],
      [{ ...option, variants: [] }],
    ].map((value) => ({ value })),
  )("rejects malformed or ambiguous choices %#", ({ value }) => {
    expect(parseEntryPointOptions(value)).toBeUndefined();
  });

  it("strips undeclared payload fields", () => {
    expect(
      parseEntryPointOptions([{ ...option, icon: "untrusted", extra: 1 }]),
    ).toEqual([option]);
  });

  it("requires an exact default and a single selection", () => {
    expect(isValidEntryPointInput({ ...input, multiple: true })).toBe(false);
    expect(isValidEntryPointInput({ ...input, default: "unknown" })).toBe(
      false,
    );
    expect(isValidEntryPointInput({ ...input, prompt: " " })).toBe(false);
    expect(isValidEntryPointInput({ ...input, kind: "choice" })).toBe(false);
  });
});
