import { describe, expect, it } from "vitest";
import type { TeamsInputTime } from "../teams";
import type { TeamsTemporalField } from "./types";
import { decodeSubmitData } from "./decodeSubmitData";
import { toAdaptiveCard } from "./toAdaptiveCard";
import { encodeTemporalInputId } from "./temporalId";

const picker = (inputType: "date" | "time" | "datetime", value: string) =>
  toAdaptiveCard({
    $type: "DatePicker",
    name: "when",
    label: "When",
    inputType,
    value,
    $action: { type: "pick", selected: { $field: "when" } },
  });

const submit = (
  inputType: "date" | "time" | "datetime",
  value: string,
  overrides: Record<string, string> = {},
) => {
  const { card, warnings } = picker(inputType, value);
  const inputs = card.body.filter(
    (element) => element.type === "Input.Date" || element.type === "Input.Time",
  );
  const actionSet = card.body.find((element) => element.type === "ActionSet");
  if (actionSet?.type !== "ActionSet") throw new Error("Missing submit action");
  const values = Object.fromEntries(
    inputs.map((input) => [
      input.id,
      overrides[
        input.type === "Input.Time" && inputType === "datetime"
          ? "when_time"
          : input.id
      ] ??
        input.value ??
        "",
    ]),
  );
  const decoded = decodeSubmitData({
    ...actionSet.actions[0]!.data,
    ...values,
  });
  return { inputs, action: actionSet.actions[0]!, decoded, warnings };
};

describe("Teams temporal DatePicker", () => {
  it.each(["__proto__", "constructor", "/dates/a:b % 🗓"])(
    "round trips the field name %j as an own property",
    (name) => {
      const previousValue = "2025-12-15T17:00:30.123456-00:00";
      const metadata: TeamsTemporalField = { dateId: name, previousValue };
      const { card } = toAdaptiveCard({
        $type: "DatePicker",
        name,
        inputType: "datetime",
        value: previousValue,
        $action: { type: "pick", selected: { $field: name } },
      });
      const input = card.body[1] as TeamsInputTime;
      const action = card.body[2];
      if (action?.type !== "ActionSet") throw new Error("Missing action");
      expect(input.id).toBe(encodeTemporalInputId(metadata));
      const decoded = decodeSubmitData({
        ...action.actions[0]!.data,
        [name]: "2025-12-16",
        [input.id]: "18:20",
      });
      expect(decoded).toEqual({
        type: "pick",
        selected: "2025-12-16T18:20:30.123456-00:00",
        $input: { [name]: "2025-12-16T18:20:30.123456-00:00" },
      });
      expect(Object.hasOwn(decoded?.["$input"] as object, name)).toBe(true);
      expect(Object.getPrototypeOf(decoded?.["$input"])).toBe(Object.prototype);
    },
  );

  it("keeps each field's precision and offset scoped to its own date", () => {
    const values = [
      "2025-12-15T17:00:30.123456+02:00",
      "2025-12-15T17:00:45-05:30",
      "2025-12-15T17:00",
    ];
    const { card } = toAdaptiveCard(
      values.map((value, index) => ({
        $type: "DatePicker",
        name: `when${index}`,
        value,
        inputType: "datetime",
        $action: { type: "pick" },
      })),
    );
    const inputs = Object.fromEntries(
      card.body.flatMap((element) =>
        element.type === "Input.Date"
          ? [[element.id, "2025-12-16"]]
          : element.type === "Input.Time"
            ? [[element.id, "18:20"]]
            : [],
      ),
    );
    for (const element of card.body) {
      if (element.type !== "ActionSet") continue;
      expect(
        decodeSubmitData({ ...element.actions[0]!.data, ...inputs }),
      ).toEqual({
        type: "pick",
        $input: {
          when0: "2025-12-16T18:20:30.123456+02:00",
          when1: "2025-12-16T18:20:45-05:30",
          when2: "2025-12-16T18:20",
        },
      });
    }
  });

  it("carries metadata once per field and grows linearly with companion actions", () => {
    const sizes = [20, 40, 80].map((count) => {
      const { card } = toAdaptiveCard(
        Array.from({ length: count }, (_, index) => ({
          $type: "DatePicker",
          name: `when${String(index).padStart(3, "0")}`,
          inputType: "datetime",
          value: "2025-12-15T17:00:30.123456+02:00",
          $action: { type: "pick" },
        })),
      );
      const serialized = JSON.stringify(card);
      expect(
        card.body.filter((item) => item.type === "ActionSet"),
      ).toHaveLength(count);
      expect(serialized.match(/aui:datetime:/g)).toHaveLength(count);
      expect(serialized).not.toContain('"temporal"');
      return new TextEncoder().encode(serialized).length;
    });
    expect(sizes[2]! - sizes[1]!).toBe(2 * (sizes[1]! - sizes[0]!));
  });

  it.each(["", "2025-12-15T17:00", "2025-12-15T17:00:00+02:00"])(
    "accepts date-only bounds on datetime %j",
    (value) => {
      const { card } = toAdaptiveCard({
        $type: "DatePicker",
        inputType: "datetime",
        value,
        min: "2025-12-14",
        max: "2025-12-20",
      });
      expect(card.body[0]).toMatchObject({
        type: "Input.Date",
        min: "2025-12-14",
        max: "2025-12-20",
      });
      expect(card.body[1]).not.toHaveProperty("min");
      expect(card.body[1]).not.toHaveProperty("max");
    },
  );

  it.each([
    ["2025-12-15T17:00:30", true],
    ["2025-12-15T17:00:00.000001", true],
    ["2025-12-15T17:00:00.000", false],
    ["2025-12-15T17:00", false],
    ["2025-12-15T17:00:30.123Z", false],
  ])("reports lost wall-clock precision for %s", (value, dropped) => {
    const { warnings } = picker("datetime", value);
    expect(warnings.filter((warning) => warning.code === "dropped")).toEqual(
      dropped
        ? [
            {
              code: "dropped",
              component: "DatePicker",
              detail: "Nonzero seconds were dropped from the datetime value.",
            },
          ]
        : [],
    );
  });

  it("keeps date mode as one Input.Date with its submitted value", () => {
    const result = submit("date", "2025-12-15");
    expect(result.inputs).toEqual([
      { type: "Input.Date", id: "when", label: "When", value: "2025-12-15" },
    ]);
    expect(result.decoded).toEqual({
      type: "pick",
      selected: "2025-12-15",
      $input: { when: "2025-12-15" },
    });
  });

  it.each([
    ["17:00", false],
    ["17:00:30", true],
  ])("round trips time %s as an Input.Time minute", (value, dropped) => {
    const result = submit("time", value);
    expect(result.inputs).toEqual([
      { type: "Input.Time", id: "when", label: "When", value: "17:00" },
    ]);
    expect(result.action.data.aui).not.toHaveProperty("temporal");
    expect(result.decoded).toEqual({
      type: "pick",
      selected: "17:00",
      $input: { when: "17:00" },
    });
    expect(
      result.warnings.some(
        (warning) =>
          warning.code === "dropped" && warning.component === "DatePicker",
      ),
    ).toBe(dropped);
  });

  it("rounds a time minimum up and truncates a time maximum to HH:mm", () => {
    const { card } = toAdaptiveCard({
      $type: "DatePicker",
      inputType: "time",
      value: "17:00:30",
      min: "08:15:30",
      max: "20:45:30",
    });
    expect(card.body).toEqual([
      {
        type: "Input.Time",
        id: "datepicker",
        value: "17:00",
        min: "08:16",
        max: "20:45",
      },
    ]);
  });

  it("drops a time minimum that rounds past 23:59", () => {
    const { card, warnings } = toAdaptiveCard({
      $type: "DatePicker",
      inputType: "time",
      min: "23:59:30",
    });
    expect(card.body).toEqual([{ type: "Input.Time", id: "datepicker" }]);
    expect(warnings).toEqual([
      {
        code: "dropped",
        component: "DatePicker",
        detail: "The time minimum rounds past 23:59 and was dropped.",
      },
    ]);
  });

  it.each([
    ["2025-12-15T17:00:00Z", "When time (UTC)"],
    ["2025-12-15T17:00:00+02:00", "When time (UTC+02:00)"],
    ["2025-12-15T17:00", "When time"],
    ["", "When time"],
  ])(
    "round trips datetime %j through the paired inputs",
    (value, timeLabel) => {
      const result = submit("datetime", value);
      expect(result.inputs).toEqual([
        {
          type: "Input.Date",
          id: "when",
          label: "When",
          ...(value ? { value: "2025-12-15" } : {}),
        },
        {
          type: "Input.Time",
          id:
            value.endsWith("Z") || value.endsWith("+02:00")
              ? encodeTemporalInputId({ dateId: "when", previousValue: value })
              : "aui:datetime:when:",
          label: timeLabel,
          ...(value ? { value: "17:00" } : {}),
        },
      ]);
      expect(result.action.data.aui).not.toHaveProperty("temporal");
      expect(result.decoded).toEqual({
        type: "pick",
        selected: value,
        $input: { when: value },
      });
    },
  );

  it.each([
    ["2025-12-15T17:00", "When time"],
    ["2025-12-15T17:00:00Z", "When time (UTC)"],
    ["2025-12-15T17:00:00+02:00", "When time (UTC+02:00)"],
  ])("labels both datetime inputs for %s", (value, timeLabel) => {
    const { card } = picker("datetime", value);
    expect(card.body.slice(0, 2)).toMatchObject([
      { type: "Input.Date", label: "When" },
      { type: "Input.Time", label: timeLabel },
    ]);
  });

  it("names only the offset of an unlabeled instant", () => {
    const { card } = toAdaptiveCard({
      $type: "DatePicker",
      name: "when",
      inputType: "datetime",
      value: "2025-12-15T17:00:00Z",
    });
    expect(card.body).toEqual([
      { type: "Input.Date", id: "when", value: "2025-12-15" },
      {
        type: "Input.Time",
        id: "aui:datetime:when:2025-12-15T17%3A00%3A00Z",
        label: "Time (UTC)",
        value: "17:00",
      },
    ]);
  });

  it("leaves both datetime inputs unlabeled for an unlabeled local value", () => {
    const { card } = toAdaptiveCard({
      $type: "DatePicker",
      name: "when",
      inputType: "datetime",
      value: "2025-12-15T17:00",
    });
    expect(card.body).toEqual([
      { type: "Input.Date", id: "when", value: "2025-12-15" },
      { type: "Input.Time", id: "aui:datetime:when:", value: "17:00" },
    ]);
  });

  it("submits a newly selected empty datetime as a local wall minute", () => {
    const result = submit("datetime", "", {
      when: "2025-12-15",
      when_time: "17:00",
    });
    expect(result.decoded).toEqual({
      type: "pick",
      selected: "2025-12-15T17:00",
      $input: { when: "2025-12-15T17:00" },
    });
  });

  it.each([{ when: "" }, { when_time: "" }])(
    "clears the field when either datetime half is empty",
    (overrides) => {
      expect(
        submit("datetime", "2025-12-15T17:00:00Z", overrides).decoded,
      ).toEqual({
        type: "pick",
        selected: "",
        $input: { when: "" },
      });
    },
  );

  it("keeps the instant's offset spelling and fractional precision after an edit", () => {
    const result = submit("datetime", "2025-12-15T17:00:30.123456-00:00", {
      when: "2025-12-16",
      when_time: "18:20",
    });
    expect(result.decoded?.["selected"]).toBe(
      "2025-12-16T18:20:30.123456-00:00",
    );
  });

  it("uses the instant's date parts for bounds and leaves its time unbounded", () => {
    const { card } = toAdaptiveCard({
      $type: "DatePicker",
      name: "when",
      label: "When",
      inputType: "datetime",
      value: "2025-12-15T17:00:00+02:00",
      min: "2025-12-14T23:30:00Z",
      max: "2025-12-20T23:30:00Z",
    });
    expect(card.body).toEqual([
      {
        type: "Input.Date",
        id: "when",
        label: "When",
        value: "2025-12-15",
        min: "2025-12-15",
        max: "2025-12-21",
      },
      {
        type: "Input.Time",
        id: "aui:datetime:when:2025-12-15T17%3A00%3A00%2B02%3A00",
        label: "When time (UTC+02:00)",
        value: "17:00",
      },
    ]);
  });

  it("resolves $field references in an action before the paired inputs", () => {
    const { card } = toAdaptiveCard([
      {
        $type: "Button",
        label: "Save",
        $action: { type: "save", selected: { $field: "when" } },
      },
      {
        $type: "DatePicker",
        name: "when",
        inputType: "datetime",
        value: "2025-12-15T17:00:00Z",
      },
    ]);
    const button = card.body[0];
    if (button?.type !== "ActionSet") throw new Error("Missing button");
    expect(
      decodeSubmitData({
        ...button.actions[0]!.data,
        when: "2025-12-16",
        "aui:datetime:when:2025-12-15T17%3A00%3A00Z": "18:20",
      }),
    ).toEqual({
      type: "save",
      selected: "2025-12-16T18:20:00Z",
      $input: { when: "2025-12-16T18:20:00Z" },
    });
  });

  it("reserves both datetime ids when another input already uses the time id", () => {
    const { card } = toAdaptiveCard([
      { $type: "Input", name: "when_time" },
      {
        $type: "DatePicker",
        name: "when",
        inputType: "datetime",
        value: "2025-12-15T17:00",
        $action: { type: "pick", selected: { $field: "when" } },
      },
    ]);
    expect(
      card.body.map((element) => ("id" in element ? element.id : undefined)),
    ).toEqual(["when_time", "when", "aui:datetime:when:", undefined]);
    const actionSet = card.body[3];
    if (actionSet?.type !== "ActionSet") throw new Error("Missing action");
    expect(
      decodeSubmitData({
        ...actionSet.actions[0]!.data,
        when_time: "other",
        when: "2025-12-15",
        "aui:datetime:when:": "17:00",
      }),
    ).toEqual({
      type: "pick",
      selected: "2025-12-15T17:00",
      $input: { when_time: "other", when: "2025-12-15T17:00" },
    });
  });

  it("keeps the reserved aui key for the action envelope", () => {
    const { card } = toAdaptiveCard({
      $type: "DatePicker",
      name: "aui",
      inputType: "datetime",
      value: "2025-12-15T17:00",
      $action: { type: "pick" },
    });
    expect(
      card.body.map((element) => ("id" in element ? element.id : undefined)),
    ).toEqual(["aui_", "aui:datetime:aui_:", undefined]);
    const actionSet = card.body[2];
    if (actionSet?.type !== "ActionSet") throw new Error("Missing action");
    expect(
      decodeSubmitData({
        ...actionSet.actions[0]!.data,
        aui_: "2025-12-15",
        "aui:datetime:aui_:": "17:00",
      }),
    ).toEqual({ type: "pick", $input: { aui_: "2025-12-15T17:00" } });
  });

  it("uses a field fallback when neither datetime input was submitted", () => {
    const { card } = toAdaptiveCard({
      $type: "DatePicker",
      name: "when",
      inputType: "datetime",
      $action: {
        type: "pick",
        selected: { $field: "when", fallback: "missing" },
      },
    });
    const actionSet = card.body[2];
    if (actionSet?.type !== "ActionSet") throw new Error("Missing action");
    expect(decodeSubmitData(actionSet.actions[0]!.data)).toEqual({
      type: "pick",
      selected: "missing",
    });
  });
});
