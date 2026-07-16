import { describe, expect, it } from "vitest";
import { decodeBlockAction } from "./decodeBlockAction";

describe("decodeBlockAction", () => {
  it("decodes a button action, spreading its JSON value into the payload", () => {
    const action = {
      action_id: "buy_item",
      value: JSON.stringify({ sku: "abc123", qty: 2 }),
    };
    expect(decodeBlockAction(action)).toEqual({
      type: "buy_item",
      sku: "abc123",
      qty: 2,
    });
  });

  it("decodes a static_select action, reading $input from selected_option.value", () => {
    const action = {
      action_id: "choose_color",
      selected_option: {
        value: "red",
        text: { type: "plain_text", text: "Red" },
      },
    };
    expect(decodeBlockAction(action)).toEqual({
      type: "choose_color",
      $input: "red",
    });
  });

  it("decodes a datepicker action, reading $input from selected_date", () => {
    const action = { action_id: "pick_date", selected_date: "2026-07-15" };
    expect(decodeBlockAction(action)).toEqual({
      type: "pick_date",
      $input: "2026-07-15",
    });
  });

  it("decodes a checkboxes action, reading $input from selected_options[].value", () => {
    const action = {
      action_id: "toggle_opts",
      selected_options: [{ value: "a" }, { value: "b" }],
    };
    expect(decodeBlockAction(action)).toEqual({
      type: "toggle_opts",
      $input: ["a", "b"],
    });
  });

  it("decodes a radio_buttons action, reading $input from selected_option.value", () => {
    const action = {
      action_id: "select_plan",
      selected_option: { value: "pro" },
    };
    expect(decodeBlockAction(action)).toEqual({
      type: "select_plan",
      $input: "pro",
    });
  });

  it("treats a value that parses to a non-object JSON literal as the raw-string $input instead of swallowing it", () => {
    for (const value of ["42", "true", "null", "[1]"]) {
      expect(decodeBlockAction({ action_id: "note", value })).toEqual({
        type: "note",
        $input: value,
      });
    }
  });

  it("uses the raw value as $input when it is not JSON", () => {
    const action = { action_id: "leave_note", value: "hello world" };
    expect(decodeBlockAction(action)).toEqual({
      type: "leave_note",
      $input: "hello world",
    });
  });

  it("spreads a JSON value into the payload and separately captures the runtime selection as $input", () => {
    const action = {
      action_id: "combo_case",
      value: JSON.stringify({ context: "c1" }),
      selected_option: { value: "x" },
    };
    expect(decodeBlockAction(action)).toEqual({
      type: "combo_case",
      context: "c1",
      $input: "x",
    });
  });

  it("drops a $input key inside the JSON value payload when nothing was selected", () => {
    const action = {
      action_id: "spoof_case",
      value: JSON.stringify({ context: "c1", $input: "spoofed" }),
    };
    const decoded = decodeBlockAction(action);
    expect(decoded).toEqual({ type: "spoof_case", context: "c1" });
    expect(decoded !== undefined && "$input" in decoded).toBe(false);
  });

  it("drops a payload $input in favor of the runtime selection", () => {
    const action = {
      action_id: "spoof_case",
      value: JSON.stringify({ $input: "spoofed" }),
      selected_option: { value: "x" },
    };
    expect(decodeBlockAction(action)).toEqual({
      type: "spoof_case",
      $input: "x",
    });
  });

  it("ignores a non-string value without throwing", () => {
    expect(decodeBlockAction({ action_id: "weird", value: 42 })).toEqual({
      type: "weird",
    });
  });

  it("returns undefined for malformed or non-actionable input", () => {
    const malformed: unknown[] = [
      null,
      undefined,
      42,
      "just a string",
      true,
      [],
      {},
      { action_id: 123 },
      { action_id: "" },
    ];
    for (const input of malformed) {
      expect(decodeBlockAction(input)).toBeUndefined();
    }
  });
});
