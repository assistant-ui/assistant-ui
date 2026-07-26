import { describe, expect, it } from "vitest";
import { toSlackBlocks } from "./toSlackBlocks";
import {
  ACTION_ID_CAP,
  ACTIONS_ELEMENT_CAP,
  ALERT_TEXT_CAP,
  BUTTON_VALUE_CAP,
  CARD_BODY_CAP,
  CARD_SUBTEXT_CAP,
  CARD_TITLE_CAP,
  CAROUSEL_CARD_CAP,
  CHILDREN_CAP,
  CONTEXT_ELEMENT_CAP,
  CONTEXT_TEXT_CAP,
  DATA_TABLE_CHAR_BUDGET,
  DATA_TABLE_COLUMN_CAP,
  DATA_TABLE_ROW_CAP,
  FACT_FIELD_CAP,
  FACT_FIELD_TEXT_CAP,
  HEADER_TEXT_CAP,
  INPUT_LABEL_CAP,
  INTERACTIVE_TEXT_CAP,
  MARKDOWN_TEXT_BUDGET,
  MESSAGE_BLOCK_CAP,
  MODAL_BLOCK_CAP,
  NODE_BUDGET,
  PLACEHOLDER_TEXT_CAP,
  RADIO_OPTION_CAP,
  SECTION_TEXT_CAP,
  SELECT_OPTION_CAP,
  TABLE_CAPTION,
} from "./constants";
import type {
  SlackActionsBlock,
  SlackAlertBlock,
  SlackCardBlock,
  SlackCarouselBlock,
  SlackCheckboxesElement,
  SlackContextBlock,
  SlackDataTableBlock,
  SlackInputBlock,
  SlackRadioButtonsElement,
  SlackSectionBlock,
  SlackStaticSelectElement,
} from "./types";

describe("toSlackBlocks", () => {
  describe("Header", () => {
    it("renders a header block", () => {
      const { blocks } = toSlackBlocks({ $type: "Header", text: "Title" });
      expect(blocks).toEqual([
        { type: "header", text: { type: "plain_text", text: "Title" } },
      ]);
    });

    it(`clamps text to ${HEADER_TEXT_CAP} characters and warns`, () => {
      const text = "h".repeat(200);
      const { blocks, warnings } = toSlackBlocks({ $type: "Header", text });
      expect(blocks).toEqual([
        {
          type: "header",
          text: { type: "plain_text", text: "h".repeat(HEADER_TEXT_CAP) },
        },
      ]);
      expect(warnings).toEqual([
        {
          code: "clamped",
          component: "Header",
          detail: `text was clamped to ${HEADER_TEXT_CAP} characters.`,
        },
      ]);
    });
  });

  describe("Text", () => {
    it("renders a section with mrkdwn text", () => {
      const { blocks } = toSlackBlocks({ $type: "Text", value: "Hello" });
      expect(blocks).toEqual([
        { type: "section", text: { type: "mrkdwn", text: "Hello" } },
      ]);
    });

    it(`clamps value to ${SECTION_TEXT_CAP} characters and warns`, () => {
      const value = "t".repeat(4000);
      const { blocks, warnings } = toSlackBlocks({ $type: "Text", value });
      expect((blocks[0] as SlackSectionBlock).text?.text).toHaveLength(
        SECTION_TEXT_CAP,
      );
      expect(warnings).toEqual([
        {
          code: "clamped",
          component: "Text",
          detail: `value was clamped to ${SECTION_TEXT_CAP} characters.`,
        },
      ]);
    });
  });

  describe("Caption", () => {
    it("renders a context block with one mrkdwn element", () => {
      const { blocks } = toSlackBlocks({
        $type: "Caption",
        value: "Fine print",
      });
      expect(blocks).toEqual([
        { type: "context", elements: [{ type: "mrkdwn", text: "Fine print" }] },
      ]);
    });
  });

  describe("Badge", () => {
    it("renders standalone as a context block", () => {
      const { blocks } = toSlackBlocks({ $type: "Badge", value: "New" });
      expect(blocks).toEqual([
        { type: "context", elements: [{ type: "mrkdwn", text: "New" }] },
      ]);
    });
  });

  describe("Fact", () => {
    it("renders a single fact as one section field", () => {
      const { blocks } = toSlackBlocks({
        $type: "Fact",
        label: "Status",
        value: "Active",
      });
      expect(blocks).toEqual([
        {
          type: "section",
          fields: [{ type: "mrkdwn", text: "*Status*\nActive" }],
        },
      ]);
    });

    it("merges consecutive Fact siblings into one section, starting a new section past the field cap", () => {
      const facts = Array.from({ length: FACT_FIELD_CAP + 2 }, (_, i) => ({
        $type: "Fact",
        label: `L${i}`,
        value: `V${i}`,
      }));
      const { blocks, warnings } = toSlackBlocks(facts);
      expect(blocks).toHaveLength(2);
      expect((blocks[0] as SlackSectionBlock).fields).toHaveLength(
        FACT_FIELD_CAP,
      );
      expect((blocks[1] as SlackSectionBlock).fields).toHaveLength(2);
      expect(warnings).toEqual([]);
    });

    it("breaks Fact merging on a non-Fact sibling", () => {
      const root = [
        { $type: "Fact", label: "A", value: "1" },
        { $type: "Fact", label: "B", value: "2" },
        { $type: "Text", value: "between" },
        { $type: "Fact", label: "C", value: "3" },
      ];
      const { blocks } = toSlackBlocks(root);
      expect(blocks).toHaveLength(3);
      expect((blocks[0] as SlackSectionBlock).fields).toHaveLength(2);
      expect((blocks[1] as SlackSectionBlock).text).toEqual({
        type: "mrkdwn",
        text: "between",
      });
      expect((blocks[2] as SlackSectionBlock).fields).toHaveLength(1);
    });

    it(`clamps a fact field to ${FACT_FIELD_TEXT_CAP} characters and warns`, () => {
      const value = "v".repeat(FACT_FIELD_TEXT_CAP + 100);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Fact",
        label: "L",
        value,
      });
      const field = (blocks[0] as SlackSectionBlock).fields?.[0];
      expect(field?.text).toHaveLength(FACT_FIELD_TEXT_CAP);
      expect(warnings).toEqual([
        {
          code: "clamped",
          component: "Fact",
          detail: `field was clamped to ${FACT_FIELD_TEXT_CAP} characters.`,
        },
      ]);
    });
  });

  describe("Image", () => {
    it("renders image_url and alt_text, dropping other props silently", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Image",
        src: "https://x/y.png",
        alt: "A photo",
        size: "lg",
        round: true,
      });
      expect(blocks).toEqual([
        { type: "image", image_url: "https://x/y.png", alt_text: "A photo" },
      ]);
      expect(warnings).toEqual([]);
    });
  });

  describe("Divider", () => {
    it("renders a divider block", () => {
      const { blocks } = toSlackBlocks({ $type: "Divider" });
      expect(blocks).toEqual([{ type: "divider" }]);
    });
  });

  describe("Button", () => {
    it("maps buttonStyle primary/danger to Slack style, omitting style otherwise", () => {
      const { blocks: primaryBlocks } = toSlackBlocks({
        $type: "Button",
        label: "Go",
        buttonStyle: "primary",
        $action: { type: "go" },
      });
      expect((primaryBlocks[0] as SlackActionsBlock).elements[0]).toMatchObject(
        { style: "primary" },
      );

      const { blocks: dangerBlocks } = toSlackBlocks({
        $type: "Button",
        label: "Delete",
        buttonStyle: "danger",
        $action: { type: "del" },
      });
      expect((dangerBlocks[0] as SlackActionsBlock).elements[0]).toMatchObject({
        style: "danger",
      });

      const { blocks: plainBlocks } = toSlackBlocks({
        $type: "Button",
        label: "Neutral",
        buttonStyle: "secondary",
        $action: { type: "noop" },
      });
      expect(
        (plainBlocks[0] as SlackActionsBlock).elements[0],
      ).not.toHaveProperty("style");
    });

    it('derives action_id from $action.type, falling back to "action", and serializes the remaining payload as value', () => {
      const { blocks } = toSlackBlocks({
        $type: "Button",
        label: "Buy",
        $action: { type: "buy", sku: "abc" },
      });
      expect(blocks[0]).toEqual({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Buy" },
            action_id: "buy",
            value: JSON.stringify({ sku: "abc" }),
          },
        ],
      });

      const { blocks: fallbackBlocks } = toSlackBlocks({
        $type: "Button",
        label: "Go",
      });
      expect(fallbackBlocks[0]).toEqual({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Go" },
            action_id: "action",
          },
        ],
      });
    });

    it(`clamps the label to ${INTERACTIVE_TEXT_CAP} characters and warns`, () => {
      const label = "x".repeat(100);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Button",
        label,
        $action: { type: "go" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).toMatchObject({
        text: { type: "plain_text", text: "x".repeat(INTERACTIVE_TEXT_CAP) },
      });
      expect(warnings).toEqual([
        {
          code: "clamped",
          component: "Button",
          detail: `label was clamped to ${INTERACTIVE_TEXT_CAP} characters.`,
        },
      ]);
    });

    it(`clamps action_id to ${ACTION_ID_CAP} characters and warns`, () => {
      const longType = "a".repeat(ACTION_ID_CAP + 20);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Button",
        label: "Go",
        $action: { type: longType },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).toMatchObject({
        action_id: "a".repeat(ACTION_ID_CAP),
      });
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Button",
        detail: `action_id was clamped to ${ACTION_ID_CAP} characters.`,
      });
    });

    it(`omits value instead of truncating and warns when the serialized action payload exceeds ${BUTTON_VALUE_CAP} characters`, () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Button",
        label: "Go",
        $action: { type: "go", blob: "z".repeat(BUTTON_VALUE_CAP) },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).not.toHaveProperty(
        "value",
      );
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Button",
        detail:
          "value was dropped because the action payload was too large to round-trip.",
      });
    });
  });

  describe("Select", () => {
    it("converts options and placeholder", () => {
      const { blocks } = toSlackBlocks({
        $type: "Select",
        placeholder: "Pick one",
        options: [
          { label: "Alpha", value: "a" },
          { label: "Beta", value: "b" },
        ],
        $action: { type: "pick" },
      });
      expect(blocks[0]).toEqual({
        type: "actions",
        elements: [
          {
            type: "static_select",
            action_id: "pick",
            options: [
              { text: { type: "plain_text", text: "Alpha" }, value: "a" },
              { text: { type: "plain_text", text: "Beta" }, value: "b" },
            ],
            placeholder: { type: "plain_text", text: "Pick one" },
          },
        ],
      });
    });

    it(`clamps options past ${SELECT_OPTION_CAP} entries and warns`, () => {
      const options = Array.from({ length: SELECT_OPTION_CAP + 5 }, (_, i) => ({
        label: `L${i}`,
        value: `v${i}`,
      }));
      const { blocks, warnings } = toSlackBlocks({
        $type: "Select",
        options,
        $action: { type: "pick" },
      });
      const element = (blocks[0] as SlackActionsBlock)
        .elements[0] as SlackStaticSelectElement;
      expect(element.options).toHaveLength(SELECT_OPTION_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Select",
        detail: `options were clamped to ${SELECT_OPTION_CAP} entries.`,
      });
    });

    it(`clamps an option label to ${INTERACTIVE_TEXT_CAP} characters and warns`, () => {
      const longLabel = "y".repeat(90);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Select",
        options: [{ label: longLabel, value: "v" }],
        $action: { type: "pick" },
      });
      const element = (blocks[0] as SlackActionsBlock)
        .elements[0] as SlackStaticSelectElement;
      expect(element.options[0]?.text.text).toBe(
        "y".repeat(INTERACTIVE_TEXT_CAP),
      );
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Select",
        detail: `option label was clamped to ${INTERACTIVE_TEXT_CAP} characters.`,
      });
    });

    it(`clamps the placeholder to ${PLACEHOLDER_TEXT_CAP} characters and warns`, () => {
      const placeholder = "p".repeat(PLACEHOLDER_TEXT_CAP + 20);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Select",
        placeholder,
        options: [{ label: "A", value: "a" }],
        $action: { type: "pick" },
      });
      const element = (blocks[0] as SlackActionsBlock)
        .elements[0] as SlackStaticSelectElement;
      expect(element.placeholder?.text).toHaveLength(PLACEHOLDER_TEXT_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Select",
        detail: `placeholder was clamped to ${PLACEHOLDER_TEXT_CAP} characters.`,
      });
    });
  });

  describe("Input", () => {
    it("wraps a plain_text_input element, passing multiline through", () => {
      const { blocks } = toSlackBlocks({
        $type: "Input",
        label: "Notes",
        placeholder: "Type here",
        multiline: true,
        $action: { type: "notes" },
      });
      expect(blocks[0]).toEqual({
        type: "input",
        label: { type: "plain_text", text: "Notes" },
        element: {
          type: "plain_text_input",
          action_id: "notes",
          multiline: true,
          placeholder: { type: "plain_text", text: "Type here" },
        },
      });
    });

    it("omits multiline when not set", () => {
      const { blocks } = toSlackBlocks({
        $type: "Input",
        label: "Name",
        $action: { type: "name" },
      });
      expect((blocks[0] as SlackInputBlock).element).not.toHaveProperty(
        "multiline",
      );
    });

    it(`clamps label to ${INPUT_LABEL_CAP} and placeholder to ${PLACEHOLDER_TEXT_CAP} characters, warning on each`, () => {
      const label = "l".repeat(INPUT_LABEL_CAP + 10);
      const placeholder = "p".repeat(PLACEHOLDER_TEXT_CAP + 10);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Input",
        label,
        placeholder,
        $action: { type: "notes" },
      });
      const input = blocks[0] as SlackInputBlock;
      expect(input.label.text).toHaveLength(INPUT_LABEL_CAP);
      expect(input.element.placeholder?.text).toHaveLength(
        PLACEHOLDER_TEXT_CAP,
      );
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Input",
        detail: `label was clamped to ${INPUT_LABEL_CAP} characters.`,
      });
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Input",
        detail: `placeholder was clamped to ${PLACEHOLDER_TEXT_CAP} characters.`,
      });
    });
  });

  describe("DatePicker", () => {
    it("sets initial_date from value", () => {
      const { blocks } = toSlackBlocks({
        $type: "DatePicker",
        value: "2026-07-15",
        $action: { type: "pick_date" },
      });
      expect(blocks[0]).toEqual({
        type: "actions",
        elements: [
          {
            type: "datepicker",
            action_id: "pick_date",
            initial_date: "2026-07-15",
          },
        ],
      });
    });

    it("omits initial_date when value is absent", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "DatePicker",
        $action: { type: "pick_date" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).not.toHaveProperty(
        "initial_date",
      );
      expect(warnings).toEqual([]);
    });

    it("drops a value that does not match YYYY-MM-DD and warns", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "DatePicker",
        value: "07/15/2026",
        $action: { type: "pick_date" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).not.toHaveProperty(
        "initial_date",
      );
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "DatePicker",
        detail: "value did not match the YYYY-MM-DD format and was dropped.",
      });
    });
  });

  describe("Checkbox", () => {
    it("emits a single-option checkboxes element", () => {
      const { blocks } = toSlackBlocks({
        $type: "Checkbox",
        label: "Agree",
        name: "agree",
        $action: { type: "toggle" },
      });
      expect(blocks[0]).toEqual({
        type: "actions",
        elements: [
          {
            type: "checkboxes",
            action_id: "toggle",
            options: [
              { text: { type: "plain_text", text: "Agree" }, value: "agree" },
            ],
          },
        ],
      });
    });

    it("falls back to the label as the option value when name is absent", () => {
      const { blocks } = toSlackBlocks({
        $type: "Checkbox",
        label: "Agree",
        $action: { type: "toggle" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).toMatchObject({
        options: [{ value: "Agree" }],
      });
    });

    it("emits initial_options with its single option when defaultChecked is true", () => {
      const { blocks } = toSlackBlocks({
        $type: "Checkbox",
        label: "Agree",
        name: "agree",
        defaultChecked: true,
        $action: { type: "toggle" },
      });
      const element = (blocks[0] as SlackActionsBlock)
        .elements[0] as SlackCheckboxesElement;
      expect(element.initial_options).toEqual([
        { text: { type: "plain_text", text: "Agree" }, value: "agree" },
      ]);
    });

    it("omits initial_options when defaultChecked is absent or false", () => {
      const { blocks } = toSlackBlocks({
        $type: "Checkbox",
        label: "Agree",
        $action: { type: "toggle" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).not.toHaveProperty(
        "initial_options",
      );
    });
  });

  describe("RadioGroup", () => {
    const options = [
      { label: "Small", value: "s" },
      { label: "Large", value: "l" },
    ];

    it("sets initial_option from a matching value prop", () => {
      const { blocks } = toSlackBlocks({
        $type: "RadioGroup",
        options,
        value: "l",
        $action: { type: "size" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).toMatchObject({
        initial_option: { value: "l" },
      });
    });

    it("sets initial_option from a matching defaultValue prop", () => {
      const { blocks } = toSlackBlocks({
        $type: "RadioGroup",
        options,
        defaultValue: "s",
        $action: { type: "size" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).toMatchObject({
        initial_option: { value: "s" },
      });
    });

    it("omits initial_option when nothing matches", () => {
      const { blocks } = toSlackBlocks({
        $type: "RadioGroup",
        options,
        $action: { type: "size" },
      });
      expect((blocks[0] as SlackActionsBlock).elements[0]).not.toHaveProperty(
        "initial_option",
      );
    });

    it(`clamps options past ${RADIO_OPTION_CAP} entries and warns`, () => {
      const manyOptions = Array.from(
        { length: RADIO_OPTION_CAP + 3 },
        (_, i) => ({ label: `L${i}`, value: `v${i}` }),
      );
      const { blocks, warnings } = toSlackBlocks({
        $type: "RadioGroup",
        options: manyOptions,
        $action: { type: "size" },
      });
      const element = (blocks[0] as SlackActionsBlock)
        .elements[0] as SlackRadioButtonsElement;
      expect(element.options).toHaveLength(RADIO_OPTION_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "RadioGroup",
        detail: `options were clamped to ${RADIO_OPTION_CAP} entries.`,
      });
    });
  });

  describe("interactive grouping", () => {
    it("groups consecutive interactive siblings into one actions block, split by a non-interactive sibling", () => {
      const root = [
        { $type: "Button", label: "A", $action: { type: "a" } },
        {
          $type: "Select",
          options: [{ label: "X", value: "x" }],
          $action: { type: "b" },
        },
        { $type: "Text", value: "gap" },
        { $type: "Button", label: "C", $action: { type: "c" } },
      ];
      const { blocks } = toSlackBlocks(root);
      expect(blocks).toHaveLength(3);
      expect(blocks[0]).toMatchObject({
        type: "actions",
        elements: [{ type: "button" }, { type: "static_select" }],
      });
      expect(blocks[1]).toMatchObject({ type: "section" });
      expect(blocks[2]).toMatchObject({
        type: "actions",
        elements: [{ type: "button" }],
      });
    });

    it(`splits an actions block past the ${ACTIONS_ELEMENT_CAP}-element cap`, () => {
      const total = ACTIONS_ELEMENT_CAP + 5;
      const buttons = Array.from({ length: total }, (_, i) => ({
        $type: "Button",
        label: `B${i}`,
        $action: { type: `b${i}` },
      }));
      const { blocks, warnings } = toSlackBlocks(buttons);
      expect(blocks).toHaveLength(2);
      expect((blocks[0] as SlackActionsBlock).elements).toHaveLength(
        ACTIONS_ELEMENT_CAP,
      );
      expect((blocks[1] as SlackActionsBlock).elements).toHaveLength(
        total - ACTIONS_ELEMENT_CAP,
      );
      expect(warnings).toEqual([]);
    });
  });

  describe("Alert", () => {
    it("renders the info tone by default", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Alert",
        title: "Heads up",
        description: "Something happened.",
      });
      expect(blocks).toEqual([
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "ℹ️ *Heads up*" }],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: "Something happened." },
        },
      ]);
      expect(warnings).toEqual([
        {
          code: "fallback",
          component: "Alert",
          detail: "Alert was rendered with message-surface fallback blocks.",
        },
      ]);
    });

    it("renders the success tone emoji", () => {
      const { blocks } = toSlackBlocks({
        $type: "Alert",
        title: "Done",
        tone: "success",
      });
      expect(blocks[0]).toEqual({
        type: "context",
        elements: [{ type: "mrkdwn", text: "✅ *Done*" }],
      });
    });

    it("renders the warning tone emoji", () => {
      const { blocks } = toSlackBlocks({
        $type: "Alert",
        title: "Careful",
        tone: "warning",
      });
      expect(blocks[0]).toEqual({
        type: "context",
        elements: [{ type: "mrkdwn", text: "⚠️ *Careful*" }],
      });
    });

    it("renders the danger tone emoji", () => {
      const { blocks } = toSlackBlocks({
        $type: "Alert",
        title: "Stop",
        tone: "danger",
      });
      expect(blocks[0]).toEqual({
        type: "context",
        elements: [{ type: "mrkdwn", text: "🛑 *Stop*" }],
      });
    });

    it("renders just the emoji when no title is given", () => {
      const { blocks } = toSlackBlocks({
        $type: "Alert",
        description: "No title here.",
      });
      expect(blocks[0]).toEqual({
        type: "context",
        elements: [{ type: "mrkdwn", text: "ℹ️" }],
      });
    });

    it("renders a native alert block on the modal surface, joining title and description", () => {
      const { blocks, warnings } = toSlackBlocks(
        {
          $type: "Alert",
          title: "Heads up",
          description: "Something happened.",
        },
        { surface: "modal" },
      );
      expect(blocks).toEqual([
        {
          type: "alert",
          text: { type: "mrkdwn", text: "Heads up\nSomething happened." },
          level: "info",
        },
      ]);
      expect(warnings).toEqual([]);
    });

    it("maps the danger tone to the error level on the modal surface", () => {
      const { blocks } = toSlackBlocks(
        { $type: "Alert", title: "Stop", tone: "danger" },
        { surface: "modal" },
      );
      expect(blocks).toEqual([
        {
          type: "alert",
          text: { type: "mrkdwn", text: "Stop" },
          level: "error",
        },
      ]);
    });

    it("maps the success and warning tones to like-named levels on the modal surface", () => {
      const { blocks: successBlocks } = toSlackBlocks(
        { $type: "Alert", title: "Done", tone: "success" },
        { surface: "modal" },
      );
      expect((successBlocks[0] as SlackAlertBlock).level).toBe("success");

      const { blocks: warningBlocks } = toSlackBlocks(
        { $type: "Alert", title: "Careful", tone: "warning" },
        { surface: "modal" },
      );
      expect((warningBlocks[0] as SlackAlertBlock).level).toBe("warning");
    });

    it(`clamps modal alert text to ${ALERT_TEXT_CAP} characters and warns`, () => {
      const description = "d".repeat(ALERT_TEXT_CAP + 50);
      const { blocks, warnings } = toSlackBlocks(
        { $type: "Alert", description },
        { surface: "modal" },
      );
      expect((blocks[0] as SlackAlertBlock).text.text).toHaveLength(
        ALERT_TEXT_CAP,
      );
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Alert",
        detail: `text was clamped to ${ALERT_TEXT_CAP} characters.`,
      });
    });

    it("keeps the message-surface fallback unchanged when the surface is explicitly set to message", () => {
      const { blocks, warnings } = toSlackBlocks(
        {
          $type: "Alert",
          title: "Heads up",
          description: "Something happened.",
        },
        { surface: "message" },
      );
      expect(blocks).toEqual([
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "ℹ️ *Heads up*" }],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: "Something happened." },
        },
      ]);
      expect(warnings).toEqual([
        {
          code: "fallback",
          component: "Alert",
          detail: "Alert was rendered with message-surface fallback blocks.",
        },
      ]);
    });
  });

  describe("Card", () => {
    it("maps a clean card into a native card block with title, hero image, body, subtext, and actions", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Card",
        title: "Order #42",
        confirm: { label: "Ship", $action: { type: "ship" } },
        cancel: { label: "Cancel", $action: { type: "cancel" } },
        children: [
          { $type: "Image", src: "https://x/y.png", alt: "Package" },
          { $type: "Text", value: "Shipped" },
          { $type: "Caption", value: "Updated just now" },
        ],
      });
      expect(blocks).toEqual([
        {
          type: "card",
          hero_image: {
            type: "image",
            image_url: "https://x/y.png",
            alt_text: "Package",
          },
          title: { type: "mrkdwn", text: "Order #42" },
          body: { type: "mrkdwn", text: "Shipped" },
          subtext: { type: "mrkdwn", text: "Updated just now" },
          actions: [
            {
              type: "button",
              text: { type: "plain_text", text: "Ship" },
              action_id: "ship",
              style: "primary",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Cancel" },
              action_id: "cancel",
            },
          ],
        },
      ]);
      expect(warnings).toEqual([]);
    });

    it("maps confirm/cancel to the actions array directly, without a title or body", () => {
      const { blocks } = toSlackBlocks({
        $type: "Card",
        confirm: { label: "Yes", $action: { type: "confirm_yes" } },
        cancel: { label: "No", $action: { type: "confirm_no" } },
      });
      expect(blocks).toEqual([
        {
          type: "card",
          actions: [
            {
              type: "button",
              text: { type: "plain_text", text: "Yes" },
              action_id: "confirm_yes",
              style: "primary",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "No" },
              action_id: "confirm_no",
            },
          ],
        },
      ]);
    });

    it("falls back to a header and inline sequence when content does not fit the card shape", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Card",
        title: "Order #42",
        children: [
          { $type: "Text", value: "Shipped" },
          { $type: "Fact", label: "Carrier", value: "UPS" },
        ],
      });
      expect(blocks).toEqual([
        { type: "header", text: { type: "plain_text", text: "Order #42" } },
        { type: "section", text: { type: "mrkdwn", text: "Shipped" } },
        {
          type: "section",
          fields: [{ type: "mrkdwn", text: "*Carrier*\nUPS" }],
        },
      ]);
      expect(warnings).toEqual([
        {
          code: "fallback",
          component: "Card",
          detail:
            "A card with content beyond hero_image, body, subtext, and actions was rendered inline.",
        },
      ]);
    });

    it("falls back when a second Image cannot fit the single hero_image slot", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Card",
        title: "Gallery",
        children: [
          { $type: "Image", src: "https://x/1.png", alt: "One" },
          { $type: "Image", src: "https://x/2.png", alt: "Two" },
        ],
      });
      expect(blocks[0]).toMatchObject({ type: "header" });
      expect(warnings).toContainEqual({
        code: "fallback",
        component: "Card",
        detail:
          "A card with content beyond hero_image, body, subtext, and actions was rendered inline.",
      });
    });

    it("falls back inline when the converted card content overflows the surface block budget", () => {
      const headers = Array.from({ length: MESSAGE_BLOCK_CAP + 1 }, (_, i) => ({
        $type: "Header",
        text: `H${i}`,
      }));
      const { blocks, warnings } = toSlackBlocks({
        $type: "Card",
        title: "Big",
        children: headers,
      });
      expect(blocks[0]).toEqual({
        type: "header",
        text: { type: "plain_text", text: "Big" },
      });
      expect(blocks).toHaveLength(MESSAGE_BLOCK_CAP);
      expect(blocks[blocks.length - 1]).toMatchObject({ type: "context" });
      expect(warnings).toContainEqual({
        code: "fallback",
        component: "Card",
        detail:
          "A card with content beyond hero_image, body, subtext, and actions was rendered inline.",
      });
      expect(
        warnings.some((w) => w.code === "clamped" && w.component === "Root"),
      ).toBe(true);
    });

    it(`clamps the title to ${CARD_TITLE_CAP} characters and warns`, () => {
      const title = "c".repeat(200);
      const { blocks, warnings } = toSlackBlocks({ $type: "Card", title });
      expect(blocks).toEqual([
        {
          type: "card",
          title: { type: "mrkdwn", text: "c".repeat(CARD_TITLE_CAP) },
        },
      ]);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Card",
        detail: `title was clamped to ${CARD_TITLE_CAP} characters.`,
      });
    });

    it(`clamps body to ${CARD_BODY_CAP} characters and warns`, () => {
      const value = "b".repeat(CARD_BODY_CAP + 50);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Card",
        children: [{ $type: "Text", value }],
      });
      const card = blocks[0] as SlackCardBlock;
      expect(card.body?.text).toHaveLength(CARD_BODY_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Card",
        detail: `body was clamped to ${CARD_BODY_CAP} characters.`,
      });
    });

    it(`clamps subtext to ${CARD_SUBTEXT_CAP} characters and warns`, () => {
      const value = "s".repeat(CARD_SUBTEXT_CAP + 50);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Card",
        title: "Order",
        children: [{ $type: "Caption", value }],
      });
      const card = blocks[0] as SlackCardBlock;
      expect(card.subtext?.text).toHaveLength(CARD_SUBTEXT_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Card",
        detail: `subtext was clamped to ${CARD_SUBTEXT_CAP} characters.`,
      });
    });

    it("drops a card with none of hero_image, title, body, or actions instead of emitting an invalid block", () => {
      const { blocks, warnings } = toSlackBlocks({ $type: "Card" });
      expect(blocks).toEqual([]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Card",
        detail:
          "A card with none of hero_image, title, body, or actions was dropped.",
      });
    });
  });

  describe("Carousel", () => {
    it("converts clean Card children into carousel elements", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Carousel",
        children: [
          {
            $type: "Card",
            title: "One",
            children: [{ $type: "Text", value: "First" }],
          },
          {
            $type: "Card",
            title: "Two",
            children: [{ $type: "Text", value: "Second" }],
          },
        ],
      });
      expect(blocks).toEqual([
        {
          type: "carousel",
          elements: [
            {
              type: "card",
              title: { type: "mrkdwn", text: "One" },
              body: { type: "mrkdwn", text: "First" },
            },
            {
              type: "card",
              title: { type: "mrkdwn", text: "Two" },
              body: { type: "mrkdwn", text: "Second" },
            },
          ],
        },
      ]);
      expect(warnings).toEqual([]);
    });

    it(`clamps to ${CAROUSEL_CARD_CAP} elements and warns`, () => {
      const cards = Array.from({ length: CAROUSEL_CARD_CAP + 1 }, (_, i) => ({
        $type: "Card",
        title: `Card ${i}`,
      }));
      const { blocks, warnings } = toSlackBlocks({
        $type: "Carousel",
        children: cards,
      });
      expect((blocks[0] as SlackCarouselBlock).elements).toHaveLength(
        CAROUSEL_CARD_CAP,
      );
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Carousel",
        detail: `cards were clamped to ${CAROUSEL_CARD_CAP} entries.`,
      });
    });

    it("drops non-card children with a warning, keeping valid cards", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Carousel",
        children: [
          { $type: "Card", title: "Kept" },
          { $type: "Text", value: "not a card" },
        ],
      });
      expect((blocks[0] as SlackCarouselBlock).elements).toEqual([
        { type: "card", title: { type: "mrkdwn", text: "Kept" } },
      ]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Carousel",
        detail: "A non-card child was dropped.",
      });
    });

    it("degrades a child card that cannot map cleanly instead of falling back to a block sequence", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Carousel",
        children: [
          {
            $type: "Card",
            title: "Order #1",
            children: [
              { $type: "Text", value: "Shipped" },
              { $type: "Fact", label: "Carrier", value: "UPS" },
            ],
          },
        ],
      });
      expect(blocks).toEqual([
        {
          type: "carousel",
          elements: [
            {
              type: "card",
              title: { type: "mrkdwn", text: "Order #1" },
              body: { type: "mrkdwn", text: "Shipped\nUPS\nCarrier" },
            },
          ],
        },
      ]);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Card",
        detail: "A card inside a carousel was degraded to title and body.",
      });
    });

    it("uses the first text chunk as the title when a degraded card has no title of its own", () => {
      const { blocks } = toSlackBlocks({
        $type: "Carousel",
        children: [
          {
            $type: "Card",
            children: [
              { $type: "Fact", label: "Carrier", value: "UPS" },
              { $type: "Fact", label: "Status", value: "Delivered" },
            ],
          },
        ],
      });
      const carousel = blocks[0] as SlackCarouselBlock;
      expect(carousel.elements[0]).toEqual({
        type: "card",
        title: { type: "mrkdwn", text: "UPS" },
        body: { type: "mrkdwn", text: "Carrier\nDelivered\nStatus" },
      });
    });

    it("is dropped when it has no renderable cards", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Carousel",
        children: [{ $type: "Text", value: "not a card" }],
      });
      expect(blocks).toEqual([]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Carousel",
        detail: "A carousel without renderable cards was dropped.",
      });
    });

    it("drops a child card that degrades to empty, which then trips the zero-renderable-cards carousel drop", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Carousel",
        children: [{ $type: "Card", children: [{ $type: "Divider" }] }],
      });
      expect(blocks).toEqual([]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Card",
        detail:
          "A card with none of hero_image, title, body, or actions was dropped.",
      });
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Carousel",
        detail: "A carousel without renderable cards was dropped.",
      });
    });
  });

  describe("Col and Box", () => {
    it("flatten children in order", () => {
      const { blocks } = toSlackBlocks({
        $type: "Col",
        children: [
          { $type: "Header", text: "Hi" },
          { $type: "Text", value: "There" },
        ],
      });
      expect(blocks).toEqual([
        { type: "header", text: { type: "plain_text", text: "Hi" } },
        { type: "section", text: { type: "mrkdwn", text: "There" } },
      ]);
    });

    it("Box flattens the same way", () => {
      const { blocks } = toSlackBlocks({
        $type: "Box",
        children: { $type: "Divider" },
      });
      expect(blocks).toEqual([{ type: "divider" }]);
    });
  });

  describe("Row", () => {
    it("flattens children in order when they are not all Badge/Caption", () => {
      const { blocks } = toSlackBlocks({
        $type: "Row",
        children: [
          { $type: "Header", text: "Hi" },
          { $type: "Text", value: "There" },
        ],
      });
      expect(blocks).toEqual([
        { type: "header", text: { type: "plain_text", text: "Hi" } },
        { type: "section", text: { type: "mrkdwn", text: "There" } },
      ]);
    });

    it("merges an all-Badge/Caption row into one context block", () => {
      const { blocks } = toSlackBlocks({
        $type: "Row",
        children: [
          { $type: "Badge", value: "New" },
          { $type: "Caption", value: "since today" },
        ],
      });
      expect(blocks).toEqual([
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: "New" },
            { type: "mrkdwn", text: "since today" },
          ],
        },
      ]);
    });

    it("does not merge into context when a non-Badge/Caption child is present", () => {
      const { blocks } = toSlackBlocks({
        $type: "Row",
        children: [{ $type: "Badge", value: "New" }, "plain text"],
      });
      expect(blocks).toEqual([
        { type: "context", elements: [{ type: "mrkdwn", text: "New" }] },
        { type: "section", text: { type: "mrkdwn", text: "plain text" } },
      ]);
    });

    it(`clamps a Badge/Caption row to ${CONTEXT_ELEMENT_CAP} elements and warns`, () => {
      const badges = Array.from(
        { length: CONTEXT_ELEMENT_CAP + 2 },
        (_, i) => ({ $type: "Badge", value: `B${i}` }),
      );
      const { blocks, warnings } = toSlackBlocks({
        $type: "Row",
        children: badges,
      });
      expect((blocks[0] as SlackContextBlock).elements).toHaveLength(
        CONTEXT_ELEMENT_CAP,
      );
      expect(warnings).toEqual([
        {
          code: "clamped",
          component: "Row",
          detail: `context elements were clamped to ${CONTEXT_ELEMENT_CAP} entries.`,
        },
      ]);
    });
  });

  describe("context text cap", () => {
    it(`clamps Caption, standalone Badge, and Row-merged badge/caption text to ${CONTEXT_TEXT_CAP} characters, warning on each`, () => {
      const long = "c".repeat(CONTEXT_TEXT_CAP + 50);

      const caption = toSlackBlocks({ $type: "Caption", value: long });
      expect(
        (caption.blocks[0] as SlackContextBlock).elements[0]?.text,
      ).toHaveLength(CONTEXT_TEXT_CAP);
      expect(caption.warnings).toContainEqual({
        code: "clamped",
        component: "Caption",
        detail: `value was clamped to ${CONTEXT_TEXT_CAP} characters.`,
      });

      const badge = toSlackBlocks({ $type: "Badge", value: long });
      expect(
        (badge.blocks[0] as SlackContextBlock).elements[0]?.text,
      ).toHaveLength(CONTEXT_TEXT_CAP);
      expect(badge.warnings).toContainEqual({
        code: "clamped",
        component: "Badge",
        detail: `value was clamped to ${CONTEXT_TEXT_CAP} characters.`,
      });

      const row = toSlackBlocks({
        $type: "Row",
        children: [
          { $type: "Badge", value: long },
          { $type: "Caption", value: "short" },
        ],
      });
      expect(
        (row.blocks[0] as SlackContextBlock).elements[0]?.text,
      ).toHaveLength(CONTEXT_TEXT_CAP);
      expect(row.warnings).toContainEqual({
        code: "clamped",
        component: "Badge",
        detail: `value was clamped to ${CONTEXT_TEXT_CAP} characters.`,
      });
    });
  });

  describe("Spacer and Icon", () => {
    it("are dropped silently", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Col",
        children: [
          { $type: "Spacer" },
          { $type: "Icon", name: "star" },
          { $type: "Text", value: "kept" },
        ],
      });
      expect(blocks).toEqual([
        { type: "section", text: { type: "mrkdwn", text: "kept" } },
      ]);
      expect(warnings).toEqual([]);
    });
  });

  describe("Table", () => {
    it("converts columns and rows into a header-first rows array with typed cells", () => {
      const { blocks } = toSlackBlocks({
        $type: "Table",
        columns: [{ label: "Name" }, { label: "Age" }],
        rows: [
          ["Ada", 36],
          ["Bob", 24],
        ],
      });
      expect(blocks).toEqual([
        {
          type: "data_table",
          caption: TABLE_CAPTION,
          rows: [
            [
              { type: "raw_text", text: "Name" },
              { type: "raw_text", text: "Age" },
            ],
            [
              { type: "raw_text", text: "Ada" },
              { type: "raw_number", text: "36" },
            ],
            [
              { type: "raw_text", text: "Bob" },
              { type: "raw_number", text: "24" },
            ],
          ],
        },
      ]);
    });

    it("requires a caption on every emitted table", () => {
      const { blocks } = toSlackBlocks({
        $type: "Table",
        columns: [{ label: "Name" }],
        rows: [["Ada"]],
      });
      expect((blocks[0] as SlackDataTableBlock).caption).toBe(TABLE_CAPTION);
    });

    it(`clamps data rows to ${DATA_TABLE_ROW_CAP} (plus the header row) and columns to ${DATA_TABLE_COLUMN_CAP}, warning on each`, () => {
      const columnCount = DATA_TABLE_COLUMN_CAP + 3;
      const columns = Array.from({ length: columnCount }, () => ({
        label: "C",
      }));
      const rows = Array.from({ length: DATA_TABLE_ROW_CAP + 5 }, () =>
        Array.from({ length: columnCount }, () => "x"),
      );
      const { blocks, warnings } = toSlackBlocks({
        $type: "Table",
        columns,
        rows,
      });
      const table = blocks[0] as SlackDataTableBlock;
      expect(table.rows).toHaveLength(DATA_TABLE_ROW_CAP + 1);
      expect(table.rows[0]).toHaveLength(DATA_TABLE_COLUMN_CAP);
      expect(table.rows[1]).toHaveLength(DATA_TABLE_COLUMN_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Table",
        detail: `columns were clamped to ${DATA_TABLE_COLUMN_CAP} entries.`,
      });
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Table",
        detail: `rows were clamped to ${DATA_TABLE_ROW_CAP} entries.`,
      });
      expect(warnings.some((w) => w.detail.includes("table budget"))).toBe(
        false,
      );
    });

    it(`clamps rows to fit the ${DATA_TABLE_CHAR_BUDGET}-character table budget, always keeping the header row`, () => {
      const bigCell = "z".repeat(2000);
      const rows = Array.from({ length: 6 }, (_, r) => [`row${r}`, bigCell]);
      const { blocks, warnings } = toSlackBlocks({
        $type: "Table",
        columns: [{ label: "Id" }, { label: "Blob" }],
        rows,
      });
      const table = blocks[0] as SlackDataTableBlock;
      expect(table.rows.length).toBeLessThan(rows.length + 1);
      expect(table.rows[0]).toEqual([
        { type: "raw_text", text: "Id" },
        { type: "raw_text", text: "Blob" },
      ]);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Table",
        detail: `rows were clamped to fit the ${DATA_TABLE_CHAR_BUDGET}-character table budget.`,
      });
    });

    it("shares the character budget across multiple data-table blocks in one payload", () => {
      const filler = "f".repeat(9994);
      const { blocks, warnings } = toSlackBlocks([
        { $type: "Table", columns: [{ label: "A" }], rows: [[filler]] },
        { $type: "Table", columns: [{ label: "B" }], rows: [["second"]] },
      ]);
      const first = blocks[0] as SlackDataTableBlock;
      const second = blocks[1] as SlackDataTableBlock;
      expect(first.rows).toEqual([
        [{ type: "raw_text", text: "A" }],
        [{ type: "raw_text", text: filler }],
      ]);
      expect(second.rows).toEqual([[{ type: "raw_text", text: "B" }]]);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Table",
        detail: `rows were clamped to fit the ${DATA_TABLE_CHAR_BUDGET}-character table budget.`,
      });
    });

    it("synthesizes an empty-cell header row matching the data width when rows are given without columns", () => {
      const { blocks } = toSlackBlocks({
        $type: "Table",
        rows: [
          ["Ada", 36],
          ["Bob", 24],
        ],
      });
      const table = blocks[0] as SlackDataTableBlock;
      expect(table.rows[0]).toEqual([
        { type: "raw_text", text: "" },
        { type: "raw_text", text: "" },
      ]);
      expect(table.rows).toEqual([
        table.rows[0],
        [
          { type: "raw_text", text: "Ada" },
          { type: "raw_number", text: "36" },
        ],
        [
          { type: "raw_text", text: "Bob" },
          { type: "raw_number", text: "24" },
        ],
      ]);
    });

    it(`counts the header row's own cell text toward the ${DATA_TABLE_CHAR_BUDGET}-character budget`, () => {
      const bigHeader = "H".repeat(DATA_TABLE_CHAR_BUDGET - 1);
      const rows = Array.from({ length: 50 }, () => ["y"]);
      const { blocks } = toSlackBlocks({
        $type: "Table",
        columns: [{ label: bigHeader }],
        rows,
      });
      const table = blocks[0] as SlackDataTableBlock;
      expect(table.rows).toHaveLength(2);
    });
  });

  describe("Markdown", () => {
    it("converts to a markdown block", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Markdown",
        value: "# Title",
      });
      expect(blocks).toEqual([{ type: "markdown", text: "# Title" }]);
      expect(warnings).toEqual([]);
    });

    it(`falls back to a section once the cumulative ${MARKDOWN_TEXT_BUDGET}-character budget is exceeded`, () => {
      const first = "a".repeat(MARKDOWN_TEXT_BUDGET - 1000);
      const second = "b".repeat(2000);
      const third = "c".repeat(10);
      const { blocks, warnings } = toSlackBlocks([
        { $type: "Markdown", value: first },
        { $type: "Markdown", value: second },
        { $type: "Markdown", value: third },
      ]);
      expect(blocks[0]).toEqual({ type: "markdown", text: first });
      expect(blocks[1]).toEqual({
        type: "section",
        text: { type: "mrkdwn", text: second },
      });
      expect(blocks[2]).toEqual({
        type: "section",
        text: { type: "mrkdwn", text: third },
      });
      expect(warnings.filter((w) => w.component === "Markdown")).toHaveLength(
        2,
      );
      expect(warnings).toContainEqual({
        code: "fallback",
        component: "Markdown",
        detail: `The ${MARKDOWN_TEXT_BUDGET}-character markdown budget was exceeded.`,
      });
    });
  });

  describe("Chart", () => {
    it("is dropped and replaced by an omission note", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "Chart",
        variant: "bar",
        data: [{ value: 1 }],
      });
      expect(blocks).toEqual([
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "Chart omitted on Slack." }],
        },
      ]);
      expect(warnings).toEqual([
        {
          code: "dropped",
          component: "Chart",
          detail: "Chart was replaced by a Slack omission note.",
        },
      ]);
    });
  });

  describe("ListView and ListViewItem", () => {
    it("renders each item as a section, separated by dividers", () => {
      const { blocks } = toSlackBlocks({
        $type: "ListView",
        children: [
          {
            $type: "ListViewItem",
            children: { $type: "Text", value: "Row 1" },
          },
          {
            $type: "ListViewItem",
            children: { $type: "Text", value: "Row 2" },
          },
        ],
      });
      expect(blocks).toEqual([
        { type: "section", text: { type: "mrkdwn", text: "Row 1" } },
        { type: "divider" },
        { type: "section", text: { type: "mrkdwn", text: "Row 2" } },
      ]);
    });

    it("turns an item's $action into a button accessory", () => {
      const { blocks } = toSlackBlocks({
        $type: "ListView",
        children: [
          {
            $type: "ListViewItem",
            $action: { type: "open_row" },
            children: { $type: "Text", value: "Clickable" },
          },
        ],
      });
      expect(blocks).toEqual([
        {
          type: "section",
          text: { type: "mrkdwn", text: "Clickable" },
          accessory: {
            type: "button",
            text: { type: "plain_text", text: "Open" },
            action_id: "open_row",
          },
        },
      ]);
    });
  });

  describe("Form", () => {
    it("converts children normally and appends a submit actions block", () => {
      const { blocks } = toSlackBlocks({
        $type: "Form",
        $action: { type: "submit_signup" },
        children: [{ $type: "Input", label: "Name", name: "name" }],
      });
      expect(blocks).toEqual([
        {
          type: "input",
          label: { type: "plain_text", text: "Name" },
          element: { type: "plain_text_input", action_id: "action" },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Submit" },
              action_id: "submit_signup",
              style: "primary",
            },
          ],
        },
      ]);
    });
  });

  describe("Root", () => {
    it("converts a root array of mixed components sequentially", () => {
      const { blocks } = toSlackBlocks([
        { $type: "Header", text: "Title" },
        { $type: "Divider" },
        { $type: "Text", value: "Body" },
      ]);
      expect(blocks).toEqual([
        { type: "header", text: { type: "plain_text", text: "Title" } },
        { type: "divider" },
        { type: "section", text: { type: "mrkdwn", text: "Body" } },
      ]);
    });

    it("clamps to the surface cap and appends an omission note", () => {
      const count = MESSAGE_BLOCK_CAP + 5;
      const nodes = Array.from({ length: count }, (_, i) => ({
        $type: "Header",
        text: `H${i}`,
      }));
      const { blocks, warnings } = toSlackBlocks(nodes);
      expect(blocks).toHaveLength(MESSAGE_BLOCK_CAP);
      const omitted = count - (MESSAGE_BLOCK_CAP - 1);
      expect(blocks[blocks.length - 1]).toEqual({
        type: "context",
        elements: [{ type: "mrkdwn", text: `${omitted} blocks were omitted.` }],
      });
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Root",
        detail: `${omitted} blocks were omitted.`,
      });
    });

    it("uses a 100-block cap for the modal surface", () => {
      const count = MODAL_BLOCK_CAP + 3;
      const nodes = Array.from({ length: count }, (_, i) => ({
        $type: "Header",
        text: `H${i}`,
      }));
      const { blocks } = toSlackBlocks(nodes, { surface: "modal" });
      expect(blocks).toHaveLength(MODAL_BLOCK_CAP);
    });

    it("does not clamp when under budget", () => {
      const { blocks, warnings } = toSlackBlocks([
        { $type: "Header", text: "One" },
      ]);
      expect(blocks).toHaveLength(1);
      expect(warnings).toEqual([]);
    });
  });

  describe("bare children", () => {
    it("strings and numbers inside a flattened container become section mrkdwn blocks", () => {
      const { blocks } = toSlackBlocks({
        $type: "Col",
        children: ["hello", 42],
      });
      expect(blocks).toEqual([
        { type: "section", text: { type: "mrkdwn", text: "hello" } },
        { type: "section", text: { type: "mrkdwn", text: "42" } },
      ]);
    });
  });

  describe("unknown component types", () => {
    it("are skipped with a dropped warning", () => {
      const { blocks, warnings } = toSlackBlocks({
        $type: "TotallyMadeUp",
        foo: "bar",
      });
      expect(blocks).toEqual([]);
      expect(warnings).toEqual([
        {
          code: "dropped",
          component: "TotallyMadeUp",
          detail: "Unknown component type was dropped.",
        },
      ]);
    });
  });

  describe("depth bound", () => {
    it("does not throw on 65 levels of nesting", () => {
      let node: unknown = { $type: "Text", value: "deep" };
      for (let i = 0; i < 65; i++) {
        node = { $type: "Col", children: node };
      }
      expect(() => toSlackBlocks(node)).not.toThrow();
      const { blocks } = toSlackBlocks(node);
      expect(Array.isArray(blocks)).toBe(true);
    });
  });

  describe("never throws", () => {
    it("returns a well-formed result instead of throwing for degenerate input", () => {
      const degenerateInputs: unknown[] = [
        null,
        undefined,
        42,
        "just text",
        true,
        false,
        [],
        {},
        () => {},
        Symbol("x"),
      ];
      for (const input of degenerateInputs) {
        const result = toSlackBlocks(input);
        expect(Array.isArray(result.blocks)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      }
    });

    it("bounds a hostile root-level Proxy array with a fabricated length instead of hanging", () => {
      const hostileRoot = new Proxy([], {
        get(target, prop) {
          if (prop === "length") return 2 ** 31;
          if (typeof prop === "string" && /^\d+$/.test(prop)) {
            return { $type: "Text", value: "x" };
          }
          return Reflect.get(target, prop);
        },
        has(target, prop) {
          if (prop === "length") return true;
          if (typeof prop === "string" && /^\d+$/.test(prop)) return true;
          return Reflect.has(target, prop);
        },
      });
      const { blocks, warnings } = toSlackBlocks(hostileRoot);
      expect(Array.isArray(blocks)).toBe(true);
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Root" }),
      );
    });

    it("omits the button value instead of throwing when the action payload is circular", () => {
      const circular: Record<string, unknown> = { type: "loop" };
      circular["self"] = circular;
      expect(() =>
        toSlackBlocks({ $type: "Button", label: "Go", $action: circular }),
      ).not.toThrow();
      const { blocks } = toSlackBlocks({
        $type: "Button",
        label: "Go",
        $action: circular,
      });
      expect(blocks[0]).toEqual({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Go" },
            action_id: "loop",
          },
        ],
      });
    });
  });

  describe("node budget and cycle guard", () => {
    it("bounds a self-referential children array instead of looping forever", () => {
      const arr: unknown[] = [];
      const el = { $type: "Card", children: arr };
      arr.push(el);
      const { warnings } = toSlackBlocks(el);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Root",
        detail: "a self-referencing node was dropped.",
      });
    });

    it("bounds a shared-reference fan-out across nested levels with a budget warning instead of doing exponential work", () => {
      let shared: unknown = { $type: "Text", value: "leaf" };
      for (let level = 0; level < 3; level++) {
        shared = {
          $type: "Card",
          children: Array.from({ length: 200 }, () => shared),
        };
      }
      const { warnings } = toSlackBlocks(shared);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Root",
        detail: `the tree was truncated after ${NODE_BUDGET} nodes.`,
      });
    });

    it("clamps a benign tree past the node budget with exactly one budget warning", () => {
      const rows = Array.from({ length: 60 }, (_, r) => ({
        $type: "Col",
        children: Array.from({ length: 100 }, (_, c) => ({
          $type: "Caption",
          value: `r${r}c${c}`,
        })),
      }));
      const { blocks, warnings } = toSlackBlocks(rows);
      expect(blocks.length).toBeLessThan(6000);
      const budgetWarnings = warnings.filter(
        (warning) =>
          warning.code === "clamped" &&
          warning.component === "Root" &&
          warning.detail ===
            `the tree was truncated after ${NODE_BUDGET} nodes.`,
      );
      expect(budgetWarnings).toHaveLength(1);
    });

    it("clamps a shared-reference array past the children cap without treating the reuse as a cycle", () => {
      const card = { $type: "Card", title: "shared" };
      let node: unknown = Array.from({ length: 201 }, () => card);
      for (let level = 0; level < 3; level++) {
        node = { $type: "Col", children: node };
      }
      const { warnings } = toSlackBlocks(node);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Root",
        detail: `children were clamped to ${CHILDREN_CAP} entries.`,
      });
      expect(
        warnings.some((warning) => warning.detail.includes("self-referencing")),
      ).toBe(false);
    });

    it("converts a 70-level-deep chain successfully and reports the depth detail", () => {
      let node: unknown = { $type: "Caption", value: "x" };
      for (let i = 0; i < 70; i++) {
        node = { $type: "Card", children: [node] };
      }
      expect(() => toSlackBlocks(node)).not.toThrow();
      const { warnings } = toSlackBlocks(node);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Root",
        detail: "nodes deeper than 64 levels were dropped.",
      });
    });
  });
});

describe("toSlackBlocks data_table integrity", () => {
  it("preserves cell positions when a value is unsupported", () => {
    const { blocks } = toSlackBlocks({
      $type: "Table",
      columns: [{ label: "A" }, { label: "B" }],
      rows: [[{ nested: true }, "kept"]],
    });
    const table = blocks[0] as {
      rows: { type: string; text: string }[][];
    };
    expect(table.rows[1]).toEqual([
      { type: "raw_text", text: "" },
      { type: "raw_text", text: "kept" },
    ]);
  });

  it("pads ragged rows to a uniform width", () => {
    const { blocks } = toSlackBlocks({
      $type: "Table",
      columns: [{ label: "A" }, { label: "B" }, { label: "C" }],
      rows: [["x"], ["x", "y", "z"]],
    });
    const table = blocks[0] as { rows: unknown[][] };
    expect(new Set(table.rows.map((row) => row.length))).toEqual(new Set([3]));
  });

  it("drops a table whose header row alone exceeds the character budget", () => {
    const { blocks, warnings } = toSlackBlocks({
      $type: "Table",
      columns: [{ label: "h".repeat(10001) }],
      rows: [["x"]],
    });
    expect(blocks).toEqual([]);
    expect(
      warnings.some(
        (warning) =>
          warning.component === "Table" && warning.code === "dropped",
      ),
    ).toBe(true);
  });
});
