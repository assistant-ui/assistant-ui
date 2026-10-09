import { describe, expect, it } from "vitest";
import { decodeSubmitData } from "./decodeSubmitData";
import { toAdaptiveCard } from "./toAdaptiveCard";

describe("decodeSubmitData", () => {
  describe.each(["2025-12-15T17:00:30.123456+02:00", "2025-12-15T17:00", ""])(
    "partial datetime submission for %j",
    (value) => {
      it.each(["Input.Date", "Input.Time"])(
        "clears the field when only %s is submitted",
        (submittedType) => {
          const { card } = toAdaptiveCard({
            $type: "DatePicker",
            name: "when",
            inputType: "datetime",
            value,
            $action: {
              type: "save",
              selected: { $field: "when", fallback: "missing" },
            },
          });
          const input = card.body.find(
            (element) => element.type === submittedType,
          );
          const action = card.body.find(
            (element) => element.type === "ActionSet",
          );
          if (!input || !("id" in input) || action?.type !== "ActionSet")
            throw new Error("Missing picker input or action");
          const submitted = {
            ...action.actions[0]!.data,
            [input.id]: submittedType === "Input.Date" ? "2025-12-16" : "18:20",
          };
          expect(Object.keys(submitted)).toHaveLength(2);
          expect(decodeSubmitData(submitted)).toEqual({
            type: "save",
            selected: "",
            $input: { when: "" },
          });
        },
      );
    },
  );

  it.each([
    "aui:datetime:",
    "aui:datetime:when",
    "aui:datetime:time:when::extra",
    "aui:datetime:time:when:%",
    "aui:datetime:time:%E0%A4%A:",
    "aui:datetime:time:%77hen:",
    "aui:datetime:time:when:not-an-instant",
    "aui:datetime:time:when:2025-02-30T17%3A00%3A00Z",
    "aui:datetime:time:when:2025-12-15T17%3A00",
    "aui:datetime:time:when:%7B%22dateId%22%3A%22other%22%7D",
    "aui:datetime:time::",
    "aui:datetime:time:aui:",
    "aui:datetime:time:aui%3Adatetime%3Awhen%3A:",
    "aui:datetime:missing:",
    "aui:datetime:time:other:",
  ])("rejects forged or malformed time input id %j", (id) => {
    const value = {
      aui: { type: "save", payload: { selected: { $field: "when" } } },
      when: "2025-12-15",
      other: "untouched",
      [id]: "17:00",
    };
    expect(decodeSubmitData(value)).toBeUndefined();
    expect(value.when).toBe("2025-12-15");
    expect(value.other).toBe("untouched");
  });

  it.each([
    "aui:datetime:date:",
    "aui:datetime:date:when:",
    "aui:datetime:date:when:2025-12-15T17%3A00Z",
    "aui:datetime:date:%",
    "aui:datetime:date:%E0%A4%A",
    "aui:datetime:date:%77hen",
    "aui:datetime:date:aui",
    "aui:datetime:date:aui%3Adatetime%3Awhen",
    "aui:datetime:time:when",
    "aui:datetime:time:%77hen:",
    "aui:datetime:time:when:not-an-instant",
    "aui:datetime:time:when:2025-02-30T17%3A00%3A00Z",
    "aui:datetime:time:when:2025-12-15T17%3a00%3a00Z",
    "aui:datetime:other:when",
    "aui:datetime:when:",
  ])("rejects malformed temporal id %j even without another field", (id) => {
    expect(
      decodeSubmitData({ aui: { type: "save" }, [id]: "" }),
    ).toBeUndefined();
  });

  it.each(["date", "time"])(
    "rejects a forged %s id targeting an ordinary field",
    (role) => {
      const id = `aui:datetime:${role}:other${role === "time" ? ":" : ""}`;
      const submitted = role === "date" ? "2025-12-16" : "18:20";
      for (const other of ["2025-12-15", "17:00", "", "untouched"]) {
        for (const entries of [
          [
            ["other", other],
            [id, submitted],
          ],
          [
            [id, submitted],
            ["other", other],
          ],
        ]) {
          const value = Object.freeze({
            aui: { type: "save" },
            ...Object.fromEntries(entries),
          });
          expect(decodeSubmitData(value)).toBeUndefined();
          expect(value["other"]).toBe(other);
        }
      }
    },
  );

  it.each([
    ["date", "2025-02-30"],
    ["date", "18:20"],
    ["date", null],
    ["date", undefined],
    ["date", 20251215],
    ["time", "24:00"],
    ["time", "2025-12-15"],
    ["time", {}],
    ["time", []],
    ["time", false],
  ])("rejects invalid %s half %j", (role, submitted) => {
    const id = `aui:datetime:${role}:when${role === "time" ? ":" : ""}`;
    expect(
      decodeSubmitData({ aui: { type: "save" }, [id]: submitted }),
    ).toBeUndefined();
  });

  it.each([false, true])(
    "rejects conflicting metadata regardless of submission order (%s)",
    (reverse) => {
      const entries = [
        ["aui:datetime:time:when:", "17:00"],
        ["aui:datetime:time:when:2025-12-15T17%3A00%3A00Z", "18:00"],
      ];
      expect(
        decodeSubmitData({
          aui: { type: "save" },
          "aui:datetime:date:when": "2025-12-15",
          ...Object.fromEntries(reverse ? entries.reverse() : entries),
        }),
      ).toBeUndefined();
    },
  );

  it("never reads temporal metadata from the action envelope or its prototype", () => {
    const temporal = {
      get() {
        throw new Error("Unexpected temporal read");
      },
    };
    for (const aui of [
      Object.defineProperty({ type: "save" }, "temporal", temporal),
      Object.assign(
        Object.create(Object.defineProperty({}, "temporal", temporal)),
        { type: "save" },
      ),
    ]) {
      expect(
        decodeSubmitData({
          aui,
          "aui:datetime:date:when": "2025-12-15",
          "aui:datetime:time:when:": "17:00",
        }),
      ).toEqual({
        type: "save",
        $input: { when: "2025-12-15T17:00" },
      });
    }
  });

  it("rejects a legacy time id with an inherited date half", () => {
    const value = Object.assign(Object.create({ when: "2025-12-15" }), {
      aui: { type: "save" },
      "aui:datetime:when:": "17:00",
    });
    expect(decodeSubmitData(value)).toBeUndefined();
  });

  it.each([
    [
      "aui:datetime:date:when",
      "2025-12-15",
      "aui:datetime:time:when:",
      "17:00",
    ],
    [
      "aui:datetime:time:when:",
      "17:00",
      "aui:datetime:date:when",
      "2025-12-15",
    ],
  ])(
    "ignores an inherited half %s",
    (inheritedId, inheritedValue, id, submitted) => {
      const value = Object.assign(
        Object.create({ [inheritedId]: inheritedValue }),
        {
          aui: { type: "save" },
          [id]: submitted,
        },
      );
      expect(decodeSubmitData(value)).toEqual({
        type: "save",
        $input: { when: "" },
      });
    },
  );

  it("decodes the aui envelope, spreading its payload into the result", () => {
    const value = { aui: { type: "approve", payload: { requestId: "r1" } } };
    expect(decodeSubmitData(value)).toEqual({
      type: "approve",
      requestId: "r1",
    });
  });

  it("collects every other top-level key into $input", () => {
    const value = {
      aui: { type: "approve", payload: { requestId: "r1" } },
      email: "a@b.com",
      subscribe: "true",
    };
    expect(decodeSubmitData(value)).toEqual({
      type: "approve",
      requestId: "r1",
      $input: { email: "a@b.com", subscribe: "true" },
    });
  });

  it("keeps a number input as a number", () => {
    const value = {
      aui: { type: "set_quantity" },
      quantity: 3.5,
    };
    expect(decodeSubmitData(value)).toEqual({
      type: "set_quantity",
      $input: { quantity: 3.5 },
    });
  });

  it("resolves $field references in the payload from same-card inputs, else their fallback", () => {
    const value = {
      aui: {
        type: "save",
        payload: {
          note: { $field: "note" },
          form: { plan: [{ $field: "plan" }], missing: { $field: "gone" } },
          renamed: { $field: "aui", fallback: "kept" },
        },
      },
      note: "Ship it",
      plan: "pro",
    };
    expect(decodeSubmitData(value)).toEqual({
      type: "save",
      note: "Ship it",
      form: { plan: ["pro"] },
      renamed: "kept",
      $input: { note: "Ship it", plan: "pro" },
    });
  });

  it("omits $input when there are no other top-level keys", () => {
    expect(decodeSubmitData({ aui: { type: "approve" } })).toEqual({
      type: "approve",
    });
  });

  it("omits payload when the envelope carries none", () => {
    const value = { aui: { type: "approve" }, note: "hi" };
    expect(decodeSubmitData(value)).toEqual({
      type: "approve",
      $input: { note: "hi" },
    });
  });

  it("drops a $input key inside the envelope payload, keeping the slot for collected inputs", () => {
    const value = {
      aui: { type: "approve", payload: { requestId: "r1", $input: "spoofed" } },
      email: "a@b.com",
    };
    expect(decodeSubmitData(value)).toEqual({
      type: "approve",
      requestId: "r1",
      $input: { email: "a@b.com" },
    });
  });

  it("drops a payload $input even when no input values were collected", () => {
    const value = {
      aui: { type: "approve", payload: { $input: "spoofed" } },
    };
    const decoded = decodeSubmitData(value);
    expect(decoded).toEqual({ type: "approve" });
    expect(decoded !== undefined && "$input" in decoded).toBe(false);
  });

  it("keeps the envelope type over a payload key of the same name", () => {
    const value = {
      aui: { type: "approve", payload: { type: "spoofed" } },
    };
    expect(decodeSubmitData(value)).toEqual({ type: "approve" });
  });

  it("returns undefined when aui is missing", () => {
    expect(decodeSubmitData({ email: "a@b.com" })).toBeUndefined();
  });

  it("returns undefined for malformed or null input, never throwing", () => {
    const malformed: unknown[] = [
      null,
      undefined,
      42,
      "just a string",
      true,
      [],
      {},
      { aui: "nope" },
      { aui: {} },
      { aui: { type: 123 } },
    ];
    for (const input of malformed) {
      expect(() => decodeSubmitData(input)).not.toThrow();
      expect(decodeSubmitData(input)).toBeUndefined();
    }
  });

  it("never throws even when reading the input itself throws", () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        },
      },
    );
    expect(() => decodeSubmitData(hostile)).not.toThrow();
    expect(decodeSubmitData(hostile)).toBeUndefined();
  });

  it("returns undefined for a non-empty array activity.value", () => {
    expect(decodeSubmitData([1, 2, 3])).toBeUndefined();
  });

  it("returns undefined when aui is inherited rather than owned", () => {
    const value = Object.create({ aui: { type: "x" } });
    expect(decodeSubmitData(value)).toBeUndefined();
  });

  it("returns undefined when the envelope's type is inherited rather than owned", () => {
    const value = { aui: Object.create({ type: "x" }) };
    expect(decodeSubmitData(value)).toBeUndefined();
  });

  it("keeps __proto__ and constructor keys from the payload as own data properties without polluting Object.prototype", () => {
    const payload = JSON.parse(
      '{"__proto__": {"evil": true}, "constructor": {"evil": true}}',
    );
    const value = { aui: { type: "approve", payload } };
    const result = decodeSubmitData(value) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(
      true,
    );
    expect(result["__proto__"]).toEqual({ evil: true });
    expect(result["constructor"]).toEqual({ evil: true });
    expect(({} as Record<string, unknown>)["evil"]).toBeUndefined();
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  it("keeps __proto__ and constructor keys from $input as own data properties without polluting Object.prototype", () => {
    const value = JSON.parse(
      '{"aui": {"type": "approve"}, "__proto__": "hostile", "constructor": "hostile"}',
    );
    const result = decodeSubmitData(value);
    const input = result?.["$input"] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(input, "__proto__")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(input, "constructor")).toBe(
      true,
    );
    expect(input["__proto__"]).toBe("hostile");
    expect(input["constructor"]).toBe("hostile");
    expect(typeof ({} as object).constructor).toBe("function");
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });
});
