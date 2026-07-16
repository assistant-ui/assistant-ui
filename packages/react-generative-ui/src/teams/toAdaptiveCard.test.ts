import { describe, expect, it } from "vitest";
import { toAdaptiveCard } from "./toAdaptiveCard";
import { toTeamsAttachments } from "./toTeamsAttachments";
import {
  CAROUSEL_ATTACHMENT_CAP,
  CHILDREN_CAP,
  NODE_BUDGET,
  PAYLOAD_SOFT_CAP,
  PRIMARY_ACTION_CAP,
  TABLE_COLUMN_CAP,
  TABLE_ROW_CAP,
} from "./constants";
import type {
  TeamsActionSet,
  TeamsColumnSet,
  TeamsContainer,
  TeamsFactSet,
  TeamsImage,
  TeamsInputChoiceSet,
  TeamsInputDate,
  TeamsInputText,
  TeamsInputToggle,
  TeamsTable,
  TeamsCardElement,
  TeamsTextBlock,
} from "./types";

describe("toAdaptiveCard", () => {
  describe("Header", () => {
    it("renders a heading TextBlock", () => {
      const { card } = toAdaptiveCard({ $type: "Header", text: "Title" });
      expect(card.body).toEqual([
        {
          type: "TextBlock",
          text: "Title",
          wrap: true,
          size: "large",
          weight: "bolder",
          style: "heading",
        },
      ]);
    });
  });

  describe("Text", () => {
    it("renders a wrapped TextBlock with no size/weight/isSubtle by default", () => {
      const { card } = toAdaptiveCard({ $type: "Text", value: "Hello" });
      expect(card.body).toEqual([
        { type: "TextBlock", text: "Hello", wrap: true },
      ]);
    });

    it.each([
      ["sm", "small"],
      ["lg", "medium"],
      ["xl", "large"],
      ["2xl", "extraLarge"],
      ["3xl", "extraLarge"],
    ] as const)("maps size %s to %s", (size, expected) => {
      const { card } = toAdaptiveCard({ $type: "Text", value: "x", size });
      expect((card.body[0] as TeamsTextBlock).size).toBe(expected);
    });

    it("omits size for md", () => {
      const { card } = toAdaptiveCard({
        $type: "Text",
        value: "x",
        size: "md",
      });
      expect((card.body[0] as TeamsTextBlock).size).toBeUndefined();
    });

    it.each(["medium", "semibold", "bold"] as const)(
      "maps weight %s to bolder",
      (weight) => {
        const { card } = toAdaptiveCard({ $type: "Text", value: "x", weight });
        expect((card.body[0] as TeamsTextBlock).weight).toBe("bolder");
      },
    );

    it("omits weight for normal", () => {
      const { card } = toAdaptiveCard({
        $type: "Text",
        value: "x",
        weight: "normal",
      });
      expect((card.body[0] as TeamsTextBlock).weight).toBeUndefined();
    });

    it.each([
      "secondary",
      "alpha-70",
      "white",
      "white-70",
      "white-50",
    ] as const)("marks color %s as isSubtle", (color) => {
      const { card } = toAdaptiveCard({ $type: "Text", value: "x", color });
      expect((card.body[0] as TeamsTextBlock).isSubtle).toBe(true);
    });

    it("does not mark emphasis as isSubtle", () => {
      const { card } = toAdaptiveCard({
        $type: "Text",
        value: "x",
        color: "emphasis",
      });
      expect((card.body[0] as TeamsTextBlock).isSubtle).toBeUndefined();
    });
  });

  describe("Caption", () => {
    it("renders a small subtle TextBlock", () => {
      const { card } = toAdaptiveCard({
        $type: "Caption",
        value: "Fine print",
      });
      expect(card.body).toEqual([
        {
          type: "TextBlock",
          text: "Fine print",
          wrap: true,
          size: "small",
          isSubtle: true,
        },
      ]);
    });
  });

  describe("Badge", () => {
    it("degrades to a small subtle TextBlock", () => {
      const { card } = toAdaptiveCard({ $type: "Badge", value: "New" });
      expect(card.body).toEqual([
        {
          type: "TextBlock",
          text: "New",
          wrap: true,
          size: "small",
          isSubtle: true,
        },
      ]);
    });
  });

  describe("Markdown", () => {
    it("passes text through unwrapped, with no syntax transformation", () => {
      const { card } = toAdaptiveCard({
        $type: "Markdown",
        value: "# Heading\n**bold**",
      });
      expect(card.body).toEqual([
        { type: "TextBlock", text: "# Heading\n**bold**", wrap: true },
      ]);
    });
  });

  describe("Fact", () => {
    it("renders a single fact as a one-entry FactSet", () => {
      const { card } = toAdaptiveCard({
        $type: "Fact",
        label: "Status",
        value: "Active",
      });
      expect(card.body).toEqual([
        { type: "FactSet", facts: [{ title: "Status", value: "Active" }] },
      ]);
    });

    it("merges consecutive Fact siblings into one FactSet", () => {
      const facts = Array.from({ length: 5 }, (_, i) => ({
        $type: "Fact",
        label: `L${i}`,
        value: `V${i}`,
      }));
      const { card } = toAdaptiveCard(facts);
      expect(card.body).toHaveLength(1);
      expect((card.body[0] as TeamsFactSet).facts).toHaveLength(5);
    });

    it("breaks Fact merging on a non-Fact sibling", () => {
      const { card } = toAdaptiveCard([
        { $type: "Fact", label: "A", value: "1" },
        { $type: "Fact", label: "B", value: "2" },
        { $type: "Text", value: "between" },
        { $type: "Fact", label: "C", value: "3" },
      ]);
      expect(card.body).toHaveLength(3);
      expect((card.body[0] as TeamsFactSet).facts).toHaveLength(2);
      expect((card.body[1] as TeamsTextBlock).text).toBe("between");
      expect((card.body[2] as TeamsFactSet).facts).toHaveLength(1);
    });
  });

  describe("Image", () => {
    it.each([
      ["sm", "small"],
      ["md", "medium"],
      ["lg", "large"],
    ] as const)("maps size %s to %s", (size, expected) => {
      const { card } = toAdaptiveCard({
        $type: "Image",
        src: "https://x/y.png",
        alt: "A photo",
        size,
      });
      expect(card.body).toEqual([
        {
          type: "Image",
          url: "https://x/y.png",
          altText: "A photo",
          size: expected,
        },
      ]);
    });

    it("drops a numeric size with a warning", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Image",
        src: "https://x/y.png",
        alt: "A photo",
        size: 48,
      });
      expect((card.body[0] as TeamsImage).size).toBeUndefined();
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Image",
        detail: "A numeric size was dropped.",
      });
    });

    it("drops round silently", () => {
      const { warnings } = toAdaptiveCard({
        $type: "Image",
        src: "https://x/y.png",
        alt: "A photo",
        round: true,
      });
      expect(warnings).toEqual([]);
    });
  });

  describe("Divider", () => {
    it("sets separator on the next sibling instead of emitting its own element", () => {
      const { card } = toAdaptiveCard([
        { $type: "Divider" },
        { $type: "Text", value: "After" },
      ]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "After", wrap: true, separator: true },
      ]);
    });

    it("drops a trailing Divider silently", () => {
      const { card, warnings } = toAdaptiveCard([
        { $type: "Text", value: "Before" },
        { $type: "Divider" },
      ]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "Before", wrap: true },
      ]);
      expect(warnings).toEqual([]);
    });

    it("carries the separator past a dropped child to the next emitted sibling", () => {
      const { card, warnings } = toAdaptiveCard([
        { $type: "Divider" },
        { $type: "Mystery" },
        { $type: "Text", value: "After" },
      ]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "After", wrap: true, separator: true },
      ]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Mystery",
        detail: "Unknown component type was dropped.",
      });
    });
  });

  describe("Spacer", () => {
    it("sets spacing large on the next sibling instead of emitting its own element", () => {
      const { card } = toAdaptiveCard([
        { $type: "Spacer" },
        { $type: "Text", value: "After" },
      ]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "After", wrap: true, spacing: "large" },
      ]);
    });

    it("drops a trailing Spacer silently", () => {
      const { card, warnings } = toAdaptiveCard([
        { $type: "Text", value: "Before" },
        { $type: "Spacer" },
      ]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "Before", wrap: true },
      ]);
      expect(warnings).toEqual([]);
    });
  });

  describe("Button", () => {
    it("renders a single Button as a one-action ActionSet with the aui envelope", () => {
      const { card } = toAdaptiveCard({
        $type: "Button",
        label: "Buy",
        $action: { type: "buy", sku: "abc" },
      });
      expect(card.body).toEqual([
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "Buy",
              data: { aui: { type: "buy", payload: { sku: "abc" } } },
            },
          ],
        },
      ]);
    });

    it('falls back to action type "action" and omits payload when $action is absent', () => {
      const { card } = toAdaptiveCard({ $type: "Button", label: "Go" });
      expect(card.body).toEqual([
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "Go",
              data: { aui: { type: "action" } },
            },
          ],
        },
      ]);
    });

    it("never emits Teams style for buttonStyle (Teams ignores it)", () => {
      const { card } = toAdaptiveCard({
        $type: "Button",
        label: "Delete",
        buttonStyle: "danger",
        $action: { type: "del" },
      });
      const actionSet = card.body[0] as TeamsActionSet;
      expect(actionSet.actions[0]).not.toHaveProperty("style");
    });

    it("merges consecutive Buttons into one ActionSet, capping primary actions and setting secondary mode beyond the cap", () => {
      const buttons = Array.from(
        { length: PRIMARY_ACTION_CAP + 2 },
        (_, i) => ({
          $type: "Button",
          label: `B${i}`,
          $action: { type: `act${i}` },
        }),
      );
      const { card, warnings } = toAdaptiveCard(buttons);
      expect(card.body).toHaveLength(1);
      const actionSet = card.body[0] as TeamsActionSet;
      expect(actionSet.actions).toHaveLength(PRIMARY_ACTION_CAP + 2);
      for (const action of actionSet.actions.slice(0, PRIMARY_ACTION_CAP)) {
        expect(action.mode).toBeUndefined();
      }
      for (const action of actionSet.actions.slice(PRIMARY_ACTION_CAP)) {
        expect(action.mode).toBe("secondary");
      }
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Button" }),
      );
    });
  });

  describe("nested arrays flatten into one sibling sequence", () => {
    it("carries a Divider's separator across a nested array boundary", () => {
      const { card } = toAdaptiveCard([
        [{ $type: "Divider" }],
        { $type: "Text", value: "After" },
      ]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "After", wrap: true, separator: true },
      ]);
    });

    it("carries a Spacer's spacing across a nested array boundary", () => {
      const { card } = toAdaptiveCard([
        [{ $type: "Spacer" }],
        { $type: "Text", value: "After" },
      ]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "After", wrap: true, spacing: "large" },
      ]);
    });

    it("merges Fact siblings split across a nested array into one FactSet", () => {
      const { card } = toAdaptiveCard([
        { $type: "Fact", label: "A", value: "1" },
        [{ $type: "Fact", label: "B", value: "2" }],
      ]);
      expect(card.body).toHaveLength(1);
      expect((card.body[0] as TeamsFactSet).facts).toHaveLength(2);
    });

    it("merges Button siblings split across singleton arrays, still capping primary actions", () => {
      const buttons = Array.from({ length: PRIMARY_ACTION_CAP + 2 }, (_, i) => [
        { $type: "Button", label: `B${i}`, $action: { type: `act${i}` } },
      ]);
      const { card, warnings } = toAdaptiveCard(buttons);
      expect(card.body).toHaveLength(1);
      const actionSet = card.body[0] as TeamsActionSet;
      expect(actionSet.actions).toHaveLength(PRIMARY_ACTION_CAP + 2);
      for (const action of actionSet.actions.slice(0, PRIMARY_ACTION_CAP)) {
        expect(action.mode).toBeUndefined();
      }
      for (const action of actionSet.actions.slice(PRIMARY_ACTION_CAP)) {
        expect(action.mode).toBe("secondary");
      }
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Button" }),
      );
    });
  });

  describe("Select", () => {
    it("renders a compact Input.ChoiceSet", () => {
      const { card } = toAdaptiveCard({
        $type: "Select",
        name: "color",
        label: "Color",
        placeholder: "Pick one",
        options: [
          { label: "Red", value: "red" },
          { label: "Blue", value: "blue" },
        ],
      });
      expect(card.body).toEqual([
        {
          type: "Input.ChoiceSet",
          id: "color",
          style: "compact",
          choices: [
            { title: "Red", value: "red" },
            { title: "Blue", value: "blue" },
          ],
          placeholder: "Pick one",
          label: "Color",
        },
      ]);
    });

    it('falls back to id "select" when name is absent', () => {
      const { card } = toAdaptiveCard({ $type: "Select", options: [] });
      expect((card.body[0] as TeamsInputChoiceSet).id).toBe("select");
    });

    it("appends a companion submit ActionSet with a fallback warning when $action is present", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Select",
        name: "color",
        options: [{ label: "Red", value: "red" }],
        $action: { type: "pick", scope: "color" },
      });
      expect(card.body).toHaveLength(2);
      expect(card.body[0]?.type).toBe("Input.ChoiceSet");
      expect(card.body[1]).toEqual({
        type: "ActionSet",
        actions: [
          {
            type: "Action.Submit",
            title: "Submit",
            data: { aui: { type: "pick", payload: { scope: "color" } } },
          },
        ],
      });
      expect(warnings).toContainEqual({
        code: "fallback",
        component: "Select",
        detail:
          "Teams inputs cannot dispatch on change; a companion submit action was appended.",
      });
    });
  });

  describe("RadioGroup", () => {
    it("renders an expanded Input.ChoiceSet with the default value", () => {
      const { card } = toAdaptiveCard({
        $type: "RadioGroup",
        name: "plan",
        defaultValue: "pro",
        options: [
          { label: "Free", value: "free" },
          { label: "Pro", value: "pro" },
        ],
      });
      expect(card.body).toEqual([
        {
          type: "Input.ChoiceSet",
          id: "plan",
          style: "expanded",
          choices: [
            { title: "Free", value: "free" },
            { title: "Pro", value: "pro" },
          ],
          value: "pro",
        },
      ]);
    });
  });

  describe("Checkbox", () => {
    it("renders an Input.Toggle with true/false values", () => {
      const { card } = toAdaptiveCard({
        $type: "Checkbox",
        label: "Subscribe",
        name: "subscribe",
        defaultChecked: true,
      });
      expect(card.body).toEqual([
        {
          type: "Input.Toggle",
          id: "subscribe",
          title: "Subscribe",
          value: "true",
          valueOn: "true",
          valueOff: "false",
        },
      ]);
    });

    it("derives the id from the label when name is absent", () => {
      const { card } = toAdaptiveCard({ $type: "Checkbox", label: "Agree" });
      expect((card.body[0] as TeamsInputToggle).id).toBe("Agree");
      expect((card.body[0] as TeamsInputToggle).value).toBe("false");
    });
  });

  describe("Input", () => {
    it("renders an Input.Text", () => {
      const { card } = toAdaptiveCard({
        $type: "Input",
        name: "email",
        label: "Email",
        placeholder: "you@example.com",
      });
      expect(card.body).toEqual([
        {
          type: "Input.Text",
          id: "email",
          label: "Email",
          placeholder: "you@example.com",
        },
      ]);
    });

    it("sets isMultiline for a multiline input", () => {
      const { card } = toAdaptiveCard({
        $type: "Input",
        name: "notes",
        multiline: true,
      });
      expect((card.body[0] as TeamsInputText).isMultiline).toBe(true);
    });

    it("emits no ActionSet when $action is absent", () => {
      const { card } = toAdaptiveCard({ $type: "Input", name: "email" });
      expect(card.body).toHaveLength(1);
    });
  });

  describe("DatePicker", () => {
    it("keeps a value matching YYYY-MM-DD", () => {
      const { card } = toAdaptiveCard({
        $type: "DatePicker",
        name: "date",
        value: "2026-07-15",
      });
      expect((card.body[0] as TeamsInputDate).value).toBe("2026-07-15");
    });

    it("drops a value that does not match YYYY-MM-DD", () => {
      const { card } = toAdaptiveCard({
        $type: "DatePicker",
        name: "date",
        value: "not-a-date",
      });
      expect((card.body[0] as TeamsInputDate).value).toBeUndefined();
    });

    it("keeps min and max matching YYYY-MM-DD", () => {
      const { card } = toAdaptiveCard({
        $type: "DatePicker",
        name: "date",
        min: "2026-01-01",
        max: "2026-12-31",
      });
      expect((card.body[0] as TeamsInputDate).min).toBe("2026-01-01");
      expect((card.body[0] as TeamsInputDate).max).toBe("2026-12-31");
    });

    it("drops a min that does not match YYYY-MM-DD", () => {
      const { card } = toAdaptiveCard({
        $type: "DatePicker",
        name: "date",
        min: "tomorrow",
      });
      expect((card.body[0] as TeamsInputDate).min).toBeUndefined();
    });
  });

  describe('reserved "aui" input id', () => {
    it.each([
      ["Input", { $type: "Input", name: "aui" }],
      ["Select", { $type: "Select", name: "aui", options: [] }],
      ["RadioGroup", { $type: "RadioGroup", name: "aui", options: [] }],
      ["Checkbox", { $type: "Checkbox", name: "aui", label: "Agree" }],
      ["DatePicker", { $type: "DatePicker", name: "aui" }],
    ] as const)(
      "renames a %s named aui to aui_ with a warning",
      (type, node) => {
        const { card, warnings } = toAdaptiveCard(node);
        const element = card.body[0] as { id: string };
        expect(element.id).toBe("aui_");
        expect(warnings).toContainEqual(
          expect.objectContaining({ code: "clamped", component: type }),
        );
      },
    );

    it("leaves a non-colliding id untouched", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Input",
        name: "email",
      });
      expect((card.body[0] as TeamsInputText).id).toBe("email");
      expect(warnings).toEqual([]);
    });
  });

  describe("per-card input id uniqueness", () => {
    it('uniquifies duplicate unnamed Input ids with a "_2" suffix and a warning', () => {
      const { card, warnings } = toAdaptiveCard([
        { $type: "Input" },
        { $type: "Input" },
      ]);
      const ids = (card.body as TeamsInputText[]).map((element) => element.id);
      expect(ids).toEqual(["input", "input_2"]);
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Input" }),
      );
    });

    it('keeps ids for "aui", "aui_", and an unnamed input mutually distinct', () => {
      const { card, warnings } = toAdaptiveCard([
        { $type: "Input", name: "aui" },
        { $type: "Input", name: "aui_" },
        { $type: "Input" },
      ]);
      const ids = (card.body as TeamsInputText[]).map((element) => element.id);
      expect(new Set(ids).size).toBe(3);
      expect(warnings.some((warning) => warning.code === "clamped")).toBe(true);
    });

    it("names the actually-emitted id in the reserved-key warning, and fires only that one warning, when the rename target also collides", () => {
      const { card, warnings } = toAdaptiveCard([
        { $type: "Input", name: "aui_" },
        { $type: "Input", name: "aui" },
      ]);
      const ids = (card.body as TeamsInputText[]).map((element) => element.id);
      expect(ids).toEqual(["aui_", "aui__2"]);
      expect(warnings).toEqual([
        {
          code: "clamped",
          component: "Input",
          detail:
            'the input id "aui" collides with the submit envelope\'s reserved key and was renamed to "aui__2".',
        },
      ]);
    });
  });

  describe("Form", () => {
    it("converts children inline and appends a Submit ActionSet with the aui envelope", () => {
      const { card } = toAdaptiveCard({
        $type: "Form",
        $action: { type: "save", scope: "profile" },
        children: [{ $type: "Input", name: "email", label: "Email" }],
      });
      expect(card.body).toEqual([
        { type: "Input.Text", id: "email", label: "Email" },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "Submit",
              data: { aui: { type: "save", payload: { scope: "profile" } } },
            },
          ],
        },
      ]);
    });
  });

  describe("Card", () => {
    it("renders a titled Container followed by a confirm/cancel ActionSet", () => {
      const { card } = toAdaptiveCard({
        $type: "Card",
        title: "Approve request?",
        children: { $type: "Text", value: "Details" },
        confirm: { label: "Approve", $action: { type: "approve" } },
        cancel: { label: "Reject", $action: { type: "reject" } },
      });
      expect(card.body).toEqual([
        {
          type: "Container",
          style: "default",
          items: [
            {
              type: "TextBlock",
              text: "Approve request?",
              wrap: true,
              size: "large",
              weight: "bolder",
              style: "heading",
            },
            { type: "TextBlock", text: "Details", wrap: true },
          ],
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "Approve",
              data: { aui: { type: "approve" } },
            },
            {
              type: "Action.Submit",
              title: "Reject",
              data: { aui: { type: "reject" } },
            },
          ],
        },
      ]);
    });

    it("omits the footer ActionSet when there is no confirm/cancel", () => {
      const { card } = toAdaptiveCard({ $type: "Card", title: "Plain" });
      expect(card.body).toHaveLength(1);
    });
  });

  describe("Col / Box", () => {
    it.each(["Col", "Box"] as const)("renders %s as a Container", ($type) => {
      const { card } = toAdaptiveCard({
        $type,
        children: { $type: "Text", value: "Inside" },
      });
      expect(card.body).toEqual([
        {
          type: "Container",
          items: [{ type: "TextBlock", text: "Inside", wrap: true }],
        },
      ]);
    });
  });

  describe("Row", () => {
    it("renders each child as its own auto-width Column", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Row",
        children: [
          { $type: "Text", value: "A" },
          { $type: "Text", value: "B" },
        ],
      });
      const columnSet = card.body[0] as TeamsColumnSet;
      expect(columnSet.type).toBe("ColumnSet");
      expect(columnSet.columns).toEqual([
        {
          type: "Column",
          width: "auto",
          items: [{ type: "TextBlock", text: "A", wrap: true }],
        },
        {
          type: "Column",
          width: "auto",
          items: [{ type: "TextBlock", text: "B", wrap: true }],
        },
      ]);
      expect(warnings).toEqual([]);
    });

    it("warns but keeps every column when there are more than 3 children", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Row",
        children: [1, 2, 3, 4].map((n) => ({ $type: "Text", value: `${n}` })),
      });
      const columnSet = card.body[0] as TeamsColumnSet;
      expect(columnSet.columns).toHaveLength(4);
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Row" }),
      );
    });
  });

  describe("ListView / ListViewItem", () => {
    it("converts items into Containers with selectAction and separators between items", () => {
      const { card } = toAdaptiveCard({
        $type: "ListView",
        children: [
          {
            $type: "ListViewItem",
            $action: { type: "open", id: "1" },
            children: { $type: "Text", value: "Row 1" },
          },
          {
            $type: "ListViewItem",
            children: { $type: "Text", value: "Row 2" },
          },
        ],
      });
      expect(card.body).toEqual([
        {
          type: "Container",
          items: [{ type: "TextBlock", text: "Row 1", wrap: true }],
          selectAction: {
            type: "Action.Submit",
            title: "Open",
            data: { aui: { type: "open", payload: { id: "1" } } },
          },
        },
        {
          type: "Container",
          items: [{ type: "TextBlock", text: "Row 2", wrap: true }],
          separator: true,
        },
      ]);
    });

    it("routes a non-ListViewItem child through the normal warning path instead of filtering it silently", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "ListView",
        children: [
          { $type: "Mystery" },
          {
            $type: "ListViewItem",
            children: { $type: "Text", value: "Kept" },
          },
        ],
      });
      expect(card.body).toEqual([
        {
          type: "Container",
          items: [{ type: "TextBlock", text: "Kept", wrap: true }],
        },
      ]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Mystery",
        detail: "Unknown component type was dropped.",
      });
    });
  });

  describe("Table", () => {
    it("renders firstRowAsHeaders true and a header row when columns are present", () => {
      const { card } = toAdaptiveCard({
        $type: "Table",
        columns: [{ label: "Name" }, { label: "Age" }],
        rows: [
          ["Alice", 30],
          ["Bob", 25],
        ],
      });
      const table = card.body[0] as TeamsTable;
      expect(table.firstRowAsHeaders).toBe(true);
      expect(table.columns).toEqual([{ width: 1 }, { width: 1 }]);
      expect(table.rows).toEqual([
        {
          type: "TableRow",
          cells: [
            {
              type: "TableCell",
              items: [{ type: "TextBlock", text: "Name", wrap: true }],
            },
            {
              type: "TableCell",
              items: [{ type: "TextBlock", text: "Age", wrap: true }],
            },
          ],
        },
        {
          type: "TableRow",
          cells: [
            {
              type: "TableCell",
              items: [{ type: "TextBlock", text: "Alice", wrap: true }],
            },
            {
              type: "TableCell",
              items: [{ type: "TextBlock", text: "30", wrap: true }],
            },
          ],
        },
        {
          type: "TableRow",
          cells: [
            {
              type: "TableCell",
              items: [{ type: "TextBlock", text: "Bob", wrap: true }],
            },
            {
              type: "TableCell",
              items: [{ type: "TextBlock", text: "25", wrap: true }],
            },
          ],
        },
      ]);
    });

    it("sets firstRowAsHeaders false and emits no header row when there are no columns", () => {
      const { card } = toAdaptiveCard({
        $type: "Table",
        rows: [["Alice", 30]],
      });
      const table = card.body[0] as TeamsTable;
      expect(table.firstRowAsHeaders).toBe(false);
      expect(table.columns).toEqual([]);
      expect(table.rows).toHaveLength(1);
    });

    it(`clamps columns to ${TABLE_COLUMN_CAP} and rows to ${TABLE_ROW_CAP}, warning for each`, () => {
      const columns = Array.from({ length: TABLE_COLUMN_CAP + 5 }, (_, i) => ({
        label: `C${i}`,
      }));
      const rows = Array.from({ length: TABLE_ROW_CAP + 5 }, (_, i) => [
        `R${i}`,
      ]);
      const { card, warnings } = toAdaptiveCard({
        $type: "Table",
        columns,
        rows,
      });
      const table = card.body[0] as TeamsTable;
      expect(table.columns).toHaveLength(TABLE_COLUMN_CAP);
      expect(table.rows).toHaveLength(TABLE_ROW_CAP + 1);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Table",
        detail: `columns were clamped to ${TABLE_COLUMN_CAP} entries.`,
      });
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Table",
        detail: `rows were clamped to ${TABLE_ROW_CAP} entries.`,
      });
    });

    it("bounds a hostile Proxy array with a fabricated length instead of hanging", () => {
      const hostileRows = new Proxy([], {
        get(target, prop) {
          if (prop === "length") return 2 ** 31;
          if (typeof prop === "string" && /^\d+$/.test(prop)) return ["x"];
          return Reflect.get(target, prop);
        },
        has(target, prop) {
          if (prop === "length") return true;
          if (typeof prop === "string" && /^\d+$/.test(prop)) return true;
          return Reflect.has(target, prop);
        },
      });
      const { card, warnings } = toAdaptiveCard({
        $type: "Table",
        rows: hostileRows,
      });
      const table = card.body[0] as TeamsTable;
      expect(table.rows).toHaveLength(TABLE_ROW_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Table",
        detail: `rows were clamped to ${TABLE_ROW_CAP} entries.`,
      });
    });
  });

  describe("Alert", () => {
    it.each([
      ["info", "accent"],
      ["success", "good"],
      ["warning", "warning"],
      ["danger", "attention"],
      [undefined, "default"],
    ] as const)("maps tone %s to style %s", (tone, style) => {
      const { card } = toAdaptiveCard({
        $type: "Alert",
        title: "Heads up",
        description: "Details",
        ...(tone !== undefined ? { tone } : {}),
      });
      const container = card.body[0] as TeamsContainer;
      expect(container.style).toBe(style);
      expect(container.items).toEqual([
        { type: "TextBlock", text: "Heads up", wrap: true, weight: "bolder" },
        { type: "TextBlock", text: "Details", wrap: true },
      ]);
    });
  });

  describe("Carousel (in body)", () => {
    it("falls back to sequential Card containers with a fallback warning", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Col",
        children: {
          $type: "Carousel",
          children: [
            { $type: "Card", title: "A" },
            { $type: "Card", title: "B" },
          ],
        },
      });
      const outer = card.body[0] as TeamsContainer;
      expect(outer.items).toHaveLength(2);
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "fallback", component: "Carousel" }),
      );
    });

    it("bounds a hostile Proxy Carousel children array with a fabricated length instead of hanging", () => {
      const hostileChildren = new Proxy([], {
        get(target, prop) {
          if (prop === "length") return 2 ** 31;
          if (typeof prop === "string" && /^\d+$/.test(prop)) {
            return { $type: "Card", title: "x" };
          }
          return Reflect.get(target, prop);
        },
        has(target, prop) {
          if (prop === "length") return true;
          if (typeof prop === "string" && /^\d+$/.test(prop)) return true;
          return Reflect.has(target, prop);
        },
      });
      const { card, warnings } = toAdaptiveCard({
        $type: "Col",
        children: { $type: "Carousel", children: hostileChildren },
      });
      const outer = card.body[0] as TeamsContainer;
      expect(outer.items.length).toBeLessThanOrEqual(200);
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Root" }),
      );
    });
  });

  describe("Chart", () => {
    it("drops the chart and emits an omission note with a warning", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Chart",
        variant: "bar",
        data: [{ value: 1 }],
      });
      expect(card.body).toEqual([
        {
          type: "TextBlock",
          text: "Chart omitted on Teams.",
          wrap: true,
          isSubtle: true,
          size: "small",
        },
      ]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Chart",
        detail: "Chart was replaced by a Teams omission note.",
      });
    });
  });

  describe("Icon", () => {
    it("drops silently", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Icon",
        name: "star",
      });
      expect(card.body).toEqual([]);
      expect(warnings).toEqual([]);
    });
  });

  describe("bare strings and numbers", () => {
    it("flattens into wrapped TextBlocks", () => {
      const { card } = toAdaptiveCard(["Hello", 42]);
      expect(card.body).toEqual([
        { type: "TextBlock", text: "Hello", wrap: true },
        { type: "TextBlock", text: "42", wrap: true },
      ]);
    });
  });

  describe("root handling", () => {
    it("drops an unknown $type with a warning", () => {
      const { card, warnings } = toAdaptiveCard({
        $type: "Mystery",
        foo: "bar",
      });
      expect(card.body).toEqual([]);
      expect(warnings).toEqual([
        {
          code: "dropped",
          component: "Mystery",
          detail: "Unknown component type was dropped.",
        },
      ]);
    });

    it("does not throw on 65 levels of nesting", () => {
      let node: unknown = { $type: "Text", value: "leaf" };
      for (let i = 0; i < 65; i++) {
        node = { $type: "Col", children: node };
      }
      expect(() => toAdaptiveCard(node)).not.toThrow();
    });

    it("keeps the leaf at exactly 64 nested Cols", () => {
      let node: unknown = { $type: "Text", value: "leaf" };
      for (let i = 0; i < 64; i++) {
        node = { $type: "Col", children: node };
      }
      const { card } = toAdaptiveCard(node);
      let current: TeamsCardElement | undefined = card.body[0];
      for (let i = 0; i < 63; i++) {
        current = (current as TeamsContainer).items[0];
      }
      expect((current as TeamsContainer).items[0]).toEqual({
        type: "TextBlock",
        text: "leaf",
        wrap: true,
      });
    });

    it("drops the leaf past 64 nested Cols", () => {
      let node: unknown = { $type: "Text", value: "leaf" };
      for (let i = 0; i < 65; i++) {
        node = { $type: "Col", children: node };
      }
      const { card } = toAdaptiveCard(node);
      let current: TeamsCardElement | undefined = card.body[0];
      for (let i = 0; i < 64; i++) {
        current = (current as TeamsContainer).items[0];
      }
      expect((current as TeamsContainer).items).toEqual([]);
    });

    it(`warns when the serialized card exceeds the ${PAYLOAD_SOFT_CAP}-byte soft cap`, () => {
      const value = "x".repeat(PAYLOAD_SOFT_CAP + 1000);
      const { warnings } = toAdaptiveCard({ $type: "Text", value });
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Root" }),
      );
    });

    it("measures the soft cap in UTF-8 bytes rather than UTF-16 code units", () => {
      const value = "汉".repeat(30000);
      const { warnings } = toAdaptiveCard({ $type: "Markdown", value });
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Root" }),
      );
    });

    it("always includes the fixed card envelope", () => {
      const { card } = toAdaptiveCard({ $type: "Text", value: "x" });
      expect(card.$schema).toBe(
        "http://adaptivecards.io/schemas/adaptive-card.json",
      );
      expect(card.type).toBe("AdaptiveCard");
      expect(card.version).toBe("1.5");
      expect(card.actions).toEqual([]);
    });

    it("never throws, even on hostile input", () => {
      const hostile = new Proxy(
        {},
        {
          get() {
            throw new Error("boom");
          },
        },
      );
      expect(() => toAdaptiveCard(hostile)).not.toThrow();
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
      const { card, warnings } = toAdaptiveCard(hostileRoot);
      expect(card.body.length).toBeLessThanOrEqual(200);
      expect(warnings).toContainEqual(
        expect.objectContaining({ code: "clamped", component: "Root" }),
      );
    });
  });

  describe("node budget and cycle guard", () => {
    it("bounds a self-referential children array instead of looping forever", () => {
      const arr: unknown[] = [];
      const el = { $type: "Card", children: arr };
      arr.push(el);
      const { warnings } = toAdaptiveCard(el);
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
      const { warnings } = toAdaptiveCard(shared);
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
      const { card, warnings } = toAdaptiveCard(rows);
      const totalCaptions = card.body.reduce(
        (sum, element) => sum + (element as TeamsContainer).items.length,
        0,
      );
      expect(totalCaptions).toBeLessThan(6000);
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
      const { warnings } = toAdaptiveCard(node);
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
      expect(() => toAdaptiveCard(node)).not.toThrow();
      const { warnings } = toAdaptiveCard(node);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Root",
        detail: "nodes deeper than 64 levels were dropped.",
      });
    });
  });
});

describe("toTeamsAttachments", () => {
  it("converts a root Carousel into up to the cap of attachments with a carousel layout", () => {
    const cards = Array.from(
      { length: CAROUSEL_ATTACHMENT_CAP + 2 },
      (_, i) => ({
        $type: "Card",
        title: `Card ${i}`,
      }),
    );
    const { attachments, attachmentLayout, warnings } = toTeamsAttachments({
      $type: "Carousel",
      children: cards,
    });
    expect(attachments).toHaveLength(CAROUSEL_ATTACHMENT_CAP);
    expect(attachmentLayout).toBe("carousel");
    expect(warnings).toContainEqual({
      code: "clamped",
      component: "Carousel",
      detail: `cards were clamped to ${CAROUSEL_ATTACHMENT_CAP} entries.`,
    });
    for (const attachment of attachments) {
      expect(attachment.contentType).toBe(
        "application/vnd.microsoft.card.adaptive",
      );
      expect(attachment.content.type).toBe("AdaptiveCard");
    }
  });

  it("routes an unknown child through the normal warning path instead of filtering it silently", () => {
    const { attachments, warnings } = toTeamsAttachments({
      $type: "Carousel",
      children: [{ $type: "Card", title: "Kept" }, { $type: "Mystery" }],
    });
    expect(attachments).toHaveLength(1);
    expect(warnings).toContainEqual({
      code: "dropped",
      component: "Mystery",
      detail: "Unknown component type was dropped.",
    });
  });

  it("wraps anything else as a single attachment with no attachmentLayout", () => {
    const { attachments, attachmentLayout, warnings } = toTeamsAttachments({
      $type: "Text",
      value: "Hi",
    });
    expect(attachments).toHaveLength(1);
    expect(attachmentLayout).toBeUndefined();
    expect(attachments[0]?.content.body).toEqual([
      { type: "TextBlock", text: "Hi", wrap: true },
    ]);
    expect(warnings).toEqual([]);
  });

  it("never throws, even on hostile input", () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        },
      },
    );
    expect(() => toTeamsAttachments(hostile)).not.toThrow();
  });

  it("keeps the same unnamed input id across separate carousel cards", () => {
    const { attachments, warnings } = toTeamsAttachments({
      $type: "Carousel",
      children: [
        { $type: "Card", title: "A", children: { $type: "Input" } },
        { $type: "Card", title: "B", children: { $type: "Input" } },
      ],
    });
    const ids = attachments.map((attachment) => {
      const container = attachment.content.body.find(
        (element) => element.type === "Container",
      ) as TeamsContainer;
      const input = container.items.find(
        (item) => item.type === "Input.Text",
      ) as TeamsInputText;
      return input.id;
    });
    expect(ids).toEqual(["input", "input"]);
    expect(
      warnings.some(
        (warning) =>
          warning.code === "clamped" && warning.detail.includes("already used"),
      ),
    ).toBe(false);
  });
});

it("stringifies boolean table cells", () => {
  const { card } = toAdaptiveCard({
    $type: "Table",
    columns: [{ label: "Flag" }],
    rows: [[true], [false]],
  });
  const table = card.body.find(
    (element) => element.type === "Table",
  ) as Extract<TeamsCardElement, { type: "Table" }>;
  const texts = table.rows
    .slice(1)
    .map((row) => (row.cells[0]!.items[0] as { text: string }).text);
  expect(texts).toEqual(["true", "false"]);
});
