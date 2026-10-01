import { describe, expect, it } from "vitest";
import { decodeBlockAction } from "./decodeBlockAction";
import { fromSlackBlocks } from "./fromSlackBlocks";
import { toSlackBlocks } from "./toSlackBlocks";
import type { SlackActionElement, SlackActionsBlock } from "./types";

const selection = (element: SlackActionElement): Record<string, unknown> => {
  switch (element.type) {
    case "datepicker":
      return {
        type: element.type,
        selected_date: element.initial_date ?? null,
      };
    case "timepicker":
      return {
        type: element.type,
        selected_time: element.initial_time ?? null,
      };
    case "datetimepicker":
      return {
        type: element.type,
        selected_date_time: element.initial_date_time ?? 1765818000,
      };
    default:
      throw new Error("Expected a picker");
  }
};

const stateFrom = (blocks: readonly SlackActionsBlock[]) =>
  Object.fromEntries(
    blocks.map((block) => [
      block.block_id!,
      Object.fromEntries(
        block.elements.map((element) => [
          element.action_id,
          selection(element),
        ]),
      ),
    ]),
  );

const submit = (state: unknown, name = "when") =>
  decodeBlockAction(
    {
      action_id: "save",
      value: JSON.stringify({ when: { $field: name, fallback: "stale" } }),
    },
    state,
  );

const renderPicker = (inputType: string, value: string, name = "when") => {
  const result = toSlackBlocks({
    $type: "DatePicker",
    inputType,
    value,
    name,
    $action: { type: "pick" },
  });
  return { ...result, blocks: result.blocks as readonly SlackActionsBlock[] };
};

describe("Slack DatePicker temporal modes", () => {
  it.each([
    ["date", "2025-12-15", "2025-12-15", ["datepicker"]],
    ["time", "17:00", "17:00", ["timepicker"]],
    ["time", "17:00:30", "17:00", ["timepicker"]],
    [
      "datetime",
      "2025-12-15T17:00:00Z",
      "2025-12-15T17:00:00Z",
      ["datetimepicker"],
    ],
    [
      "datetime",
      "2025-12-15T17:00:00+02:00",
      "2025-12-15T17:00:00+02:00",
      ["datetimepicker"],
    ],
    [
      "datetime",
      "2025-12-15T17:00",
      "2025-12-15T17:00",
      ["datepicker", "timepicker"],
    ],
    ["datetime", "", "2025-12-15T17:00:00Z", ["datetimepicker"]],
    [
      "datetime",
      "2025-12-15T17:00+02:00",
      "2025-12-15T17:00:00+02:00",
      ["datetimepicker"],
    ],
    [
      "datetime",
      "2025-12-15T17:00:30.123",
      "2025-12-15T17:00",
      ["datepicker", "timepicker"],
    ],
  ] as const)(
    "round trips %s %j through field state and picker actions",
    (mode, value, expected, types) => {
      const { blocks } = renderPicker(mode, value);
      expect(
        blocks.flatMap((block) =>
          block.elements.map((element) => element.type),
        ),
      ).toEqual(types);
      const state = stateFrom(blocks);
      expect(submit(state)).toEqual({ type: "save", when: expected });
      for (const block of blocks) {
        for (const element of block.elements) {
          expect(element).not.toHaveProperty("timezone");
          expect(
            decodeBlockAction(
              {
                ...selection(element),
                action_id: element.action_id,
                block_id: block.block_id,
              },
              state,
            ),
          ).toEqual({ type: "pick", $input: expected });
        }
      }
    },
  );

  it("preserves the date mode block and metadata exactly", () => {
    expect(renderPicker("date", "2025-12-15")).toEqual({
      blocks: [
        {
          type: "actions",
          block_id: 'aui:0:[["pick","when"]]',
          elements: [
            {
              type: "datepicker",
              action_id: "pick",
              initial_date: "2025-12-15",
            },
          ],
        },
      ],
      warnings: [],
    });
  });

  it.each(["17:00", "17:00:00", ""])(
    "renders a minute timepicker without a warning for %j",
    (value) => {
      const { blocks, warnings } = renderPicker("time", value);
      expect(blocks[0]?.elements[0]).toEqual({
        type: "timepicker",
        action_id: "pick",
        ...(value ? { initial_time: "17:00" } : {}),
      });
      expect(warnings).toEqual([]);
    },
  );

  it("warns when Slack drops nonzero time seconds", () => {
    const { warnings } = renderPicker("time", "17:00:30");
    expect(warnings).toEqual([
      {
        code: "dropped",
        component: "DatePicker",
        detail:
          "Seconds were dropped because Slack timepickers only support minute precision.",
      },
    ]);
  });

  it.each([
    ["2025-12-15T17:00:00Z", 1765818000],
    ["2025-12-15T17:00:00+02:00", 1765810800],
    ["2025-12-15T17:00:00.999Z", 1765818000],
  ])("renders %s as unix seconds", (value, expected) => {
    expect(
      renderPicker("datetime", value as string).blocks[0]?.elements[0],
    ).toEqual({
      type: "datetimepicker",
      action_id: "pick",
      initial_date_time: expected,
    });
  });

  it.each(["Z", "+02:00", "-05:30", "+00:00", "-00:00"])(
    "preserves %s offset spelling at seconds precision after an edit",
    (offset) => {
      const { blocks } = renderPicker(
        "datetime",
        `2025-12-15T17:00:45.123456${offset}`,
      );
      const block = blocks[0]!;
      const element = block.elements[0]!;
      if (element.type !== "datetimepicker")
        throw new Error("Expected a datetimepicker");
      const action = {
        type: element.type,
        action_id: element.action_id,
        block_id: block.block_id,
        selected_date_time: element.initial_date_time! + 3600,
      };
      expect(decodeBlockAction(action)).toEqual({
        type: "pick",
        $input: `2025-12-15T18:00:45${offset}`,
      });
      expect(submit({ [block.block_id!]: { pick: action } })).toEqual({
        type: "save",
        when: `2025-12-15T18:00:45${offset}`,
      });
    },
  );

  it("renders an empty datetime without an initial instant", () => {
    expect(renderPicker("datetime", "").blocks[0]?.elements[0]).toEqual({
      type: "datetimepicker",
      action_id: "pick",
    });
  });

  it.each(["time", "datetime"])(
    "preserves a cleared %s in field state and picker input",
    (inputType) => {
      const { blocks } = renderPicker(inputType, "");
      const block = blocks[0]!;
      const action = {
        type: `${inputType}picker`,
        action_id: "pick",
        block_id: block.block_id,
        [inputType === "time" ? "selected_time" : "selected_date_time"]: null,
      };
      expect(decodeBlockAction(action)).toEqual({ type: "pick", $input: "" });
      expect(submit({ [block.block_id!]: { pick: action } })).toEqual({
        type: "save",
        when: "",
      });
    },
  );

  it.each([
    ["time", "24:00"],
    ["time", "2025-12-15T17:00"],
    ["datetime", "2025-02-29T17:00Z"],
    ["datetime", "17:00"],
  ])("drops an invalid %s value %j with a warning", (inputType, value) => {
    const { blocks, warnings } = renderPicker(inputType!, value!);
    expect(blocks[0]?.elements[0]).toEqual({
      type: `${inputType}picker`,
      action_id: "pick",
    });
    expect(warnings).toEqual([
      {
        code: "dropped",
        component: "DatePicker",
        detail: `value did not match the ${inputType} format and was dropped.`,
      },
    ]);
  });

  it.each([
    ["timepicker", { selected_time: "24:00" }],
    ["timepicker", { selected_time: "2025-12-15T17:00" }],
    ["datetimepicker", { selected_date_time: "1765818000" }],
    ["datetimepicker", { selected_date_time: Infinity }],
    ["datetimepicker", { selected_date_time: 1e20 }],
    ["datetimepicker", { selected_date_time: 0.5 }],
  ])("rejects malformed %s selection %j", (type, selected) => {
    expect(
      decodeBlockAction({ type, action_id: "pick", ...selected }),
    ).toBeUndefined();
  });

  it("decodes standalone native pickers and tolerates malformed metadata", () => {
    expect(
      decodeBlockAction({
        type: "timepicker",
        action_id: "pick",
        selected_time: "17:00",
      }),
    ).toEqual({ type: "pick", $input: "17:00" });
    for (const block_id of [
      undefined,
      "aui:0:{",
      'aui:0:[null,42,["pick"]]',
      'aui:0:[["pick","when","DatePicker","datetime",null,"date","invalid"]]',
    ]) {
      expect(
        decodeBlockAction({
          type: "datetimepicker",
          action_id: "pick",
          selected_date_time: 0,
          block_id,
        }),
      ).toEqual({ type: "pick", $input: "1970-01-01T00:00:00Z" });
    }
  });

  it("carries an unnamed instant's offset in its block ID", () => {
    const { blocks } = toSlackBlocks({
      $type: "DatePicker",
      inputType: "datetime",
      value: "2025-12-15T17:00:00+02:00",
      $action: { type: "pick" },
    });
    const block = blocks[0] as SlackActionsBlock;
    expect(
      decodeBlockAction({
        ...selection(block.elements[0]!),
        action_id: "pick",
        block_id: block.block_id,
      }),
    ).toEqual({ type: "pick", $input: "2025-12-15T17:00:00+02:00" });
  });

  it.each(["date", "time"])(
    "clears the field and rejects a split action when the %s half is empty",
    (part) => {
      const { blocks } = renderPicker("datetime", "2025-12-15T17:00");
      const state = stateFrom(blocks);
      const clearedBlock = blocks.find(
        (block) => block.elements[0]?.type === `${part}picker`,
      )!;
      const cleared = { type: `${part}picker`, [`selected_${part}`]: null };
      state[clearedBlock.block_id!] = { pick: cleared };
      expect(submit(state)).toEqual({ type: "save", when: "" });
      for (const block of blocks) {
        const current = state[block.block_id!]!.pick!;
        expect(
          decodeBlockAction(
            { ...current, action_id: "pick", block_id: block.block_id },
            state,
          ),
        ).toBeUndefined();
      }
    },
  );

  it("uses the fired split selection ahead of stale state and requires its companion", () => {
    const { blocks } = renderPicker("datetime", "2025-12-15T17:00");
    const block = blocks.find(
      (entry) => entry.elements[0]?.type === "timepicker",
    )!;
    const action = {
      type: "timepicker",
      action_id: "pick",
      block_id: block.block_id,
      selected_time: "18:30",
    };
    expect(decodeBlockAction(action, stateFrom(blocks))).toEqual({
      type: "pick",
      $input: "2025-12-15T18:30",
    });
    expect(decodeBlockAction(action)).toBeUndefined();
    expect(
      submit({ [block.block_id!]: { pick: selection(block.elements[0]!) } }),
    ).toEqual({ type: "save", when: "" });
  });

  it("keeps unnamed split pairs with repeated action IDs distinct across containers", () => {
    const { blocks } = toSlackBlocks(
      ["2025-12-15T17:00", "2026-01-02T09:30"].map((value) => ({
        $type: "Col",
        children: [
          {
            $type: "DatePicker",
            inputType: "datetime",
            value,
            $action: { type: "pick" },
          },
        ],
      })),
    );
    const actions = blocks as readonly SlackActionsBlock[];
    const state = stateFrom(actions);
    const inputs = actions.map(
      (block) =>
        decodeBlockAction(
          {
            ...selection(block.elements[0]!),
            action_id: "pick",
            block_id: block.block_id,
          },
          state,
        )?.["$input"],
    );
    expect(inputs).toEqual([
      "2025-12-15T17:00",
      "2025-12-15T17:00",
      "2026-01-02T09:30",
      "2026-01-02T09:30",
    ]);
  });

  it("keeps temporal metadata in bounded block IDs and warns when one mapping cannot fit", () => {
    const { blocks, warnings } = toSlackBlocks(
      Array.from({ length: 5 }, (_, i) => ({
        $type: "DatePicker",
        inputType: "datetime",
        value: "2025-12-15T17:00:00+02:00",
        name: `when${i}${"x".repeat(60)}`,
        $action: { type: `pick${i}` },
      })),
    );
    expect(warnings).toEqual([]);
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks as readonly SlackActionsBlock[]) {
      expect(block.block_id!.length).toBeLessThanOrEqual(255);
      expect(block.block_id).toContain("+02:00");
    }
    const oversized = renderPicker(
      "datetime",
      "2025-12-15T17:00:00+02:00",
      "x".repeat(300),
    );
    expect(oversized.blocks[0]).not.toHaveProperty("block_id");
    expect(oversized.warnings).toEqual([
      {
        code: "dropped",
        component: "DatePicker",
        detail:
          "name could not be mapped because its Slack block_id exceeded 255 characters.",
      },
    ]);
  });

  it.each(["message", "modal"] as const)(
    "decodes split pairs alongside other controls on a %s",
    (surface) => {
      const result = toSlackBlocks(
        {
          $type: "Form",
          children: [
            {
              $type: "DatePicker",
              inputType: "datetime",
              value: "2025-12-15T17:00",
              name: "when",
              $action: { type: "pick" },
            },
            {
              $type: "DatePicker",
              inputType: "time",
              value: "09:30",
              name: "start",
              $action: { type: "start" },
            },
            {
              $type: "Select",
              name: "plan",
              options: [{ label: "Pro", value: "pro" }],
              $action: { type: "plan" },
            },
            {
              $type: "Button",
              label: "Save",
              $action: {
                type: "save",
                when: { $field: "when" },
                start: { $field: "start" },
                plan: { $field: "plan" },
              },
            },
          ],
        },
        { surface },
      );
      const state: Record<string, Record<string, unknown>> = {};
      let button: SlackActionElement | undefined;
      for (const block of result.blocks) {
        if (block.type !== "actions") continue;
        const values: Record<string, unknown> = {};
        for (const element of block.elements) {
          if (element.type === "button") {
            if (element.action_id === "save") button = element;
          } else if (element.type === "static_select") {
            values[element.action_id] = {
              type: element.type,
              selected_option: { value: "pro" },
            };
          } else values[element.action_id] = selection(element);
        }
        if (block.block_id) state[block.block_id] = values;
      }
      expect(result.warnings).toEqual([]);
      expect(decodeBlockAction(button, state)).toEqual({
        type: "save",
        when: "2025-12-15T17:00",
        start: "09:30",
        plan: "pro",
      });
    },
  );

  it.each([
    ["timepicker", { initial_time: "17:00" }, "time", "17:00"],
    [
      "datetimepicker",
      { initial_date_time: 1765818000 },
      "datetime",
      "2025-12-15T17:00:00Z",
    ],
    [
      "datetimepicker",
      { initial_date_time: 0 },
      "datetime",
      "1970-01-01T00:00:00Z",
    ],
    ["timepicker", {}, "time", undefined],
    ["datetimepicker", {}, "datetime", undefined],
  ])(
    "converts native %s %j back to the matching DatePicker mode",
    (type, initial, inputType, value) => {
      expect(
        fromSlackBlocks([
          {
            type: "actions",
            elements: [{ type, action_id: "pick", ...initial }],
          },
        ]),
      ).toEqual({
        nodes: [
          {
            $type: "DatePicker",
            inputType,
            ...(value === undefined ? {} : { value }),
            $action: { type: "pick" },
          },
        ],
        warnings: [],
      });
    },
  );

  it("omits invalid native timestamps without losing sibling blocks", () => {
    for (const initial_date_time of [Infinity, NaN, 1e20, 0.5, "1765818000"]) {
      expect(
        fromSlackBlocks([
          {
            type: "actions",
            elements: [
              { type: "datetimepicker", action_id: "pick", initial_date_time },
            ],
          },
          { type: "divider" },
        ]).nodes,
      ).toEqual([
        {
          $type: "DatePicker",
          inputType: "datetime",
          $action: { type: "pick" },
        },
        { $type: "Divider" },
      ]);
    }
  });

  it.each([
    ["timepicker", { initial_time: "17:00" }, "time", "17:00"],
    [
      "datetimepicker",
      { initial_date_time: 1765818000 },
      "datetime",
      "2025-12-15T17:00:00Z",
    ],
  ])(
    "converts %s in an input block with its label",
    (type, initial, inputType, value) => {
      expect(
        fromSlackBlocks([
          {
            type: "input",
            label: { type: "plain_text", text: "When" },
            element: { type, action_id: "pick", ...initial },
          },
        ]),
      ).toEqual({
        nodes: [
          {
            $type: "DatePicker",
            inputType,
            value,
            label: "When",
            $action: { type: "pick" },
          },
        ],
        warnings: [],
      });
    },
  );
});
