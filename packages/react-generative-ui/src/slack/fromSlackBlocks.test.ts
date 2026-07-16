import { describe, expect, it } from "vitest";
import type { UIElement } from "../ir";
import { INBOUND_BLOCK_CAP } from "./constants";
import { fromSlackBlocks } from "./fromSlackBlocks";
import { toSlackBlocks } from "./toSlackBlocks";
import type { ToSlackBlocksOptions } from "./types";

describe("fromSlackBlocks", () => {
  describe("malformed input", () => {
    it("returns empty nodes and a dropped warning for non-blocks input", () => {
      const malformed: unknown[] = [
        null,
        undefined,
        42,
        "just text",
        true,
        {},
        { blocks: "nope" },
      ];
      for (const input of malformed) {
        const { nodes, warnings } = fromSlackBlocks(input);
        expect(nodes).toEqual([]);
        expect(warnings).toEqual([
          {
            code: "dropped",
            component: "Root",
            detail: "Input could not be converted.",
          },
        ]);
      }
    });

    it("accepts a bare blocks array", () => {
      const { nodes } = fromSlackBlocks([{ type: "divider" }]);
      expect(nodes).toEqual([{ $type: "Divider" }]);
    });

    it("accepts a { blocks } wrapper", () => {
      const { nodes } = fromSlackBlocks({ blocks: [{ type: "divider" }] });
      expect(nodes).toEqual([{ $type: "Divider" }]);
    });

    it("never throws for degenerate block entries", () => {
      const degenerate: unknown[] = [
        null,
        undefined,
        42,
        "x",
        true,
        [],
        {},
        () => {},
      ];
      expect(() => fromSlackBlocks(degenerate)).not.toThrow();
      const { nodes, warnings } = fromSlackBlocks(degenerate);
      expect(nodes).toEqual([]);
      expect(warnings).toHaveLength(degenerate.length);
    });
  });

  describe("bounded arrays", () => {
    it("clamps a hostile proxied blocks array instead of hanging", () => {
      const hostileArray = new Proxy([], {
        get(target, prop) {
          if (prop === "length") return 2 ** 31;
          if (typeof prop === "string" && /^\d+$/.test(prop)) {
            return { type: "divider" };
          }
          return Reflect.get(target, prop);
        },
        has(target, prop) {
          if (prop === "length") return true;
          if (typeof prop === "string" && /^\d+$/.test(prop)) return true;
          return Reflect.has(target, prop);
        },
      });
      const { nodes, warnings } = fromSlackBlocks(hostileArray);
      expect(nodes).toHaveLength(INBOUND_BLOCK_CAP);
      expect(warnings).toContainEqual({
        code: "clamped",
        component: "Root",
        detail: `blocks were clamped to ${INBOUND_BLOCK_CAP} entries.`,
      });
    });
  });

  describe("unknown block types", () => {
    it("skips an unrecognized block with a dropped warning", () => {
      const { nodes, warnings } = fromSlackBlocks([
        { type: "totally_made_up" },
      ]);
      expect(nodes).toEqual([]);
      expect(warnings).toEqual([
        {
          code: "dropped",
          component: "totally_made_up",
          detail: "Unknown block type was dropped.",
        },
      ]);
    });
  });

  describe("Header", () => {
    it("inverts a header block", () => {
      const { nodes } = fromSlackBlocks([
        { type: "header", text: { type: "plain_text", text: "Title" } },
      ]);
      expect(nodes).toEqual([{ $type: "Header", text: "Title" }]);
    });
  });

  describe("section", () => {
    it("inverts section fields into one Fact per field", () => {
      const { nodes, warnings } = fromSlackBlocks([
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: "*Status*\nActive" },
            { type: "mrkdwn", text: "*Owner*\nAda" },
          ],
        },
      ]);
      expect(nodes).toEqual([
        { $type: "Fact", label: "Status", value: "Active" },
        { $type: "Fact", label: "Owner", value: "Ada" },
      ]);
      expect(warnings).toEqual([]);
    });

    it("falls back to a value-only Fact when a field does not match the label/value format", () => {
      const { nodes, warnings } = fromSlackBlocks([
        {
          type: "section",
          fields: [{ type: "mrkdwn", text: "no format here" }],
        },
      ]);
      expect(nodes).toEqual([
        { $type: "Fact", label: "", value: "no format here" },
      ]);
      expect(warnings).toEqual([
        {
          code: "fallback",
          component: "Fact",
          detail:
            "A section field that did not match the label/value format was kept as a value-only fact.",
        },
      ]);
    });

    it("inverts a section with mrkdwn text and a button accessory into a ListView of one ListViewItem", () => {
      const { nodes } = fromSlackBlocks([
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
      expect(nodes).toEqual([
        {
          $type: "ListView",
          children: [
            {
              $type: "ListViewItem",
              $action: { type: "open_row" },
              children: { $type: "Text", value: "Clickable" },
            },
          ],
        },
      ]);
    });

    it("inverts a plain mrkdwn section into Text", () => {
      const { nodes } = fromSlackBlocks([
        { type: "section", text: { type: "mrkdwn", text: "Hello" } },
      ]);
      expect(nodes).toEqual([{ $type: "Text", value: "Hello" }]);
    });
  });

  describe("context", () => {
    it("inverts a single-element context into a Caption", () => {
      const { nodes } = fromSlackBlocks([
        { type: "context", elements: [{ type: "mrkdwn", text: "Fine print" }] },
      ]);
      expect(nodes).toEqual([{ $type: "Caption", value: "Fine print" }]);
    });

    it("inverts a multi-element context into a Row of Captions, collapsing the Badge/Caption distinction", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: "New" },
            { type: "mrkdwn", text: "since today" },
          ],
        },
      ]);
      expect(nodes).toEqual([
        {
          $type: "Row",
          children: [
            { $type: "Caption", value: "New" },
            { $type: "Caption", value: "since today" },
          ],
        },
      ]);
    });
  });

  describe("Image", () => {
    it("inverts an image block", () => {
      const { nodes } = fromSlackBlocks([
        { type: "image", image_url: "https://x/y.png", alt_text: "A photo" },
      ]);
      expect(nodes).toEqual([
        { $type: "Image", src: "https://x/y.png", alt: "A photo" },
      ]);
    });
  });

  describe("Divider", () => {
    it("inverts a divider block", () => {
      const { nodes } = fromSlackBlocks([{ type: "divider" }]);
      expect(nodes).toEqual([{ $type: "Divider" }]);
    });
  });

  describe("actions", () => {
    it("inverts a button, mapping style to buttonStyle only for primary/danger and deriving $action from the object-only value payload", () => {
      const { nodes: primary } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Buy" },
              action_id: "buy",
              value: JSON.stringify({ sku: "abc" }),
              style: "primary",
            },
          ],
        },
      ]);
      expect(primary).toEqual([
        {
          $type: "Button",
          label: "Buy",
          buttonStyle: "primary",
          $action: { type: "buy", sku: "abc" },
        },
      ]);

      const { nodes: danger } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Delete" },
              action_id: "del",
              style: "danger",
            },
          ],
        },
      ]);
      expect((danger[0] as UIElement)["buttonStyle"]).toBe("danger");

      const { nodes: plain } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Go" },
              action_id: "go",
            },
          ],
        },
      ]);
      expect(plain[0]).not.toHaveProperty("buttonStyle");
      expect(plain[0]).toEqual({
        $type: "Button",
        label: "Go",
        $action: { type: "go" },
      });
    });

    it("inverts a static_select", () => {
      const { nodes } = fromSlackBlocks([
        {
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
        },
      ]);
      expect(nodes).toEqual([
        {
          $type: "Select",
          options: [
            { label: "Alpha", value: "a" },
            { label: "Beta", value: "b" },
          ],
          placeholder: "Pick one",
          $action: { type: "pick" },
        },
      ]);
    });

    it("inverts a datepicker, reading value from initial_date and omitting it when absent", () => {
      const { nodes: withDate } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            {
              type: "datepicker",
              action_id: "pick_date",
              initial_date: "2026-07-15",
            },
          ],
        },
      ]);
      expect(withDate).toEqual([
        {
          $type: "DatePicker",
          value: "2026-07-15",
          $action: { type: "pick_date" },
        },
      ]);

      const { nodes: withoutDate } = fromSlackBlocks([
        {
          type: "actions",
          elements: [{ type: "datepicker", action_id: "pick_date" }],
        },
      ]);
      expect(withoutDate[0]).not.toHaveProperty("value");
    });

    it("inverts checkboxes, reading label/name from the first option and defaultChecked from initial_options", () => {
      const { nodes: checked } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            {
              type: "checkboxes",
              action_id: "toggle",
              options: [
                { text: { type: "plain_text", text: "Agree" }, value: "agree" },
              ],
              initial_options: [
                { text: { type: "plain_text", text: "Agree" }, value: "agree" },
              ],
            },
          ],
        },
      ]);
      expect(checked).toEqual([
        {
          $type: "Checkbox",
          label: "Agree",
          name: "agree",
          defaultChecked: true,
          $action: { type: "toggle" },
        },
      ]);

      const { nodes: unchecked } = fromSlackBlocks([
        {
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
        },
      ]);
      expect(unchecked[0]).not.toHaveProperty("defaultChecked");
    });

    it("inverts radio_buttons, reading defaultValue from initial_option and omitting it when absent", () => {
      const { nodes: withValue } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            {
              type: "radio_buttons",
              action_id: "size",
              options: [
                { text: { type: "plain_text", text: "Small" }, value: "s" },
                { text: { type: "plain_text", text: "Large" }, value: "l" },
              ],
              initial_option: {
                text: { type: "plain_text", text: "Large" },
                value: "l",
              },
            },
          ],
        },
      ]);
      expect(withValue).toEqual([
        {
          $type: "RadioGroup",
          options: [
            { label: "Small", value: "s" },
            { label: "Large", value: "l" },
          ],
          defaultValue: "l",
          $action: { type: "size" },
        },
      ]);

      const { nodes: withoutValue } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            {
              type: "radio_buttons",
              action_id: "size",
              options: [
                { text: { type: "plain_text", text: "Small" }, value: "s" },
              ],
            },
          ],
        },
      ]);
      expect(withoutValue[0]).not.toHaveProperty("defaultValue");
    });

    it("skips an unrecognized action element with a dropped warning, keeping the rest", () => {
      const { nodes, warnings } = fromSlackBlocks([
        {
          type: "actions",
          elements: [
            { type: "mystery_widget" },
            {
              type: "button",
              text: { type: "plain_text", text: "Go" },
              action_id: "go",
            },
          ],
        },
      ]);
      expect(nodes).toEqual([
        { $type: "Button", label: "Go", $action: { type: "go" } },
      ]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "mystery_widget",
        detail: "Unknown action element type was dropped.",
      });
    });
  });

  describe("Input", () => {
    it("inverts an input block, passing multiline and placeholder through", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "input",
          label: { type: "plain_text", text: "Notes" },
          element: {
            type: "plain_text_input",
            action_id: "notes",
            multiline: true,
            placeholder: { type: "plain_text", text: "Type here" },
          },
        },
      ]);
      expect(nodes).toEqual([
        {
          $type: "Input",
          label: "Notes",
          placeholder: "Type here",
          multiline: true,
          $action: { type: "notes" },
        },
      ]);
    });

    it("omits multiline when not set", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "input",
          label: { type: "plain_text", text: "Name" },
          element: { type: "plain_text_input", action_id: "name" },
        },
      ]);
      expect(nodes[0]).not.toHaveProperty("multiline");
    });

    it("drops an input block wrapping an unrecognized element", () => {
      const { nodes, warnings } = fromSlackBlocks([
        {
          type: "input",
          label: { type: "plain_text", text: "Name" },
          element: { type: "mystery" },
        },
      ]);
      expect(nodes).toEqual([]);
      expect(warnings).toContainEqual({
        code: "dropped",
        component: "Input",
        detail: "Unknown input element type was dropped.",
      });
    });
  });

  describe("Markdown", () => {
    it("inverts a markdown block", () => {
      const { nodes } = fromSlackBlocks([
        { type: "markdown", text: "# Title" },
      ]);
      expect(nodes).toEqual([{ $type: "Markdown", value: "# Title" }]);
    });
  });

  describe("Card", () => {
    it("inverts a clean card with hero image, body, subtext, and confirm/cancel actions", () => {
      const { nodes, warnings } = fromSlackBlocks([
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
      expect(nodes).toEqual([
        {
          $type: "Card",
          title: "Order #42",
          children: [
            { $type: "Image", src: "https://x/y.png", alt: "Package" },
            { $type: "Text", value: "Shipped" },
            { $type: "Caption", value: "Updated just now" },
          ],
          confirm: { label: "Ship", $action: { type: "ship" } },
          cancel: { label: "Cancel", $action: { type: "cancel" } },
        },
      ]);
      expect(warnings).toEqual([]);
    });

    it("appends card actions beyond confirm/cancel as Button children with a fallback warning", () => {
      const { nodes, warnings } = fromSlackBlocks([
        {
          type: "card",
          title: { type: "mrkdwn", text: "Order" },
          actions: [
            {
              type: "button",
              text: { type: "plain_text", text: "Yes" },
              action_id: "yes",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "No" },
              action_id: "no",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Maybe" },
              action_id: "maybe",
            },
          ],
        },
      ]);
      const card = nodes[0] as UIElement;
      expect(card["children"]).toEqual([
        { $type: "Button", label: "Maybe", $action: { type: "maybe" } },
      ]);
      expect(warnings).toContainEqual({
        code: "fallback",
        component: "Card",
        detail:
          "Card actions beyond confirm and cancel were appended as Button children.",
      });
    });

    it("reconstructs a single non-primary button as cancel, not confirm", () => {
      const { nodes, warnings } = fromSlackBlocks([
        {
          type: "card",
          title: { type: "mrkdwn", text: "Order" },
          actions: [
            {
              type: "button",
              text: { type: "plain_text", text: "Dismiss" },
              action_id: "dismiss",
            },
          ],
        },
      ]);
      expect(nodes).toEqual([
        {
          $type: "Card",
          title: "Order",
          cancel: { label: "Dismiss", $action: { type: "dismiss" } },
        },
      ]);
      expect(nodes[0]).not.toHaveProperty("confirm");
      expect(warnings).toEqual([]);
    });
  });

  describe("Alert", () => {
    it("maps alert level to tone, mapping error to danger and omitting tone for the default level", () => {
      const cases: readonly [string, string | undefined][] = [
        ["error", "danger"],
        ["success", "success"],
        ["warning", "warning"],
        ["info", "info"],
        ["default", undefined],
      ];
      for (const [level, tone] of cases) {
        const { nodes } = fromSlackBlocks([
          { type: "alert", text: { type: "mrkdwn", text: "x" }, level },
        ]);
        expect(nodes).toEqual([
          {
            $type: "Alert",
            description: "x",
            ...(tone !== undefined ? { tone } : {}),
          },
        ]);
      }
    });

    it("keeps a joined title and description together in description, since the two cannot be separated", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "alert",
          text: { type: "mrkdwn", text: "Heads up\nSomething happened." },
          level: "info",
        },
      ]);
      expect(nodes).toEqual([
        {
          $type: "Alert",
          description: "Heads up\nSomething happened.",
          tone: "info",
        },
      ]);
    });
  });

  describe("Carousel", () => {
    it("inverts a carousel's card elements", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "carousel",
          elements: [
            { type: "card", title: { type: "mrkdwn", text: "One" } },
            { type: "card", title: { type: "mrkdwn", text: "Two" } },
          ],
        },
      ]);
      expect(nodes).toEqual([
        {
          $type: "Carousel",
          children: [
            { $type: "Card", title: "One" },
            { $type: "Card", title: "Two" },
          ],
        },
      ]);
    });
  });

  describe("Table", () => {
    it("inverts columns and typed rows", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "data_table",
          caption: "Table",
          rows: [
            [
              { type: "raw_text", text: "Name" },
              { type: "raw_text", text: "Age" },
            ],
            [
              { type: "raw_text", text: "Ada" },
              { type: "raw_number", text: "36" },
            ],
          ],
        },
      ]);
      expect(nodes).toEqual([
        {
          $type: "Table",
          columns: [{ label: "Name" }, { label: "Age" }],
          rows: [["Ada", 36]],
        },
      ]);
    });

    it("omits columns when every header cell is empty, inverting the rows-only synthesis", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "data_table",
          caption: "Table",
          rows: [
            [
              { type: "raw_text", text: "" },
              { type: "raw_text", text: "" },
            ],
            [
              { type: "raw_text", text: "Ada" },
              { type: "raw_number", text: "36" },
            ],
          ],
        },
      ]);
      expect(nodes).toEqual([{ $type: "Table", rows: [["Ada", 36]] }]);
    });

    it("keeps a raw_number cell as its raw string when the text is not a finite number", () => {
      const { nodes } = fromSlackBlocks([
        {
          type: "data_table",
          caption: "Table",
          rows: [
            [{ type: "raw_text", text: "Name" }],
            [{ type: "raw_number", text: "N/A" }],
          ],
        },
      ]);
      expect(nodes).toEqual([
        { $type: "Table", columns: [{ label: "Name" }], rows: [["N/A"]] },
      ]);
    });
  });

  describe("round trip", () => {
    const fixtures: readonly {
      readonly name: string;
      readonly tree: unknown;
      readonly options?: ToSlackBlocksOptions;
      readonly expected: readonly UIElement[];
    }[] = [
      {
        name: "Header",
        tree: { $type: "Header", text: "Title" },
        expected: [{ $type: "Header", text: "Title" }],
      },
      {
        name: "Text",
        tree: { $type: "Text", value: "Hello" },
        expected: [{ $type: "Text", value: "Hello" }],
      },
      {
        name: "Caption",
        tree: { $type: "Caption", value: "Fine print" },
        expected: [{ $type: "Caption", value: "Fine print" }],
      },
      {
        name: "Image",
        tree: { $type: "Image", src: "https://x/y.png", alt: "A photo" },
        expected: [{ $type: "Image", src: "https://x/y.png", alt: "A photo" }],
      },
      {
        name: "Divider",
        tree: { $type: "Divider" },
        expected: [{ $type: "Divider" }],
      },
      {
        name: "Markdown",
        tree: { $type: "Markdown", value: "# Title" },
        expected: [{ $type: "Markdown", value: "# Title" }],
      },
      {
        name: "Button with payload",
        tree: {
          $type: "Button",
          label: "Buy",
          buttonStyle: "primary",
          $action: { type: "buy", sku: "abc" },
        },
        expected: [
          {
            $type: "Button",
            label: "Buy",
            buttonStyle: "primary",
            $action: { type: "buy", sku: "abc" },
          },
        ],
      },
      {
        name: "Select",
        tree: {
          $type: "Select",
          options: [
            { label: "Alpha", value: "a" },
            { label: "Beta", value: "b" },
          ],
          placeholder: "Pick one",
          $action: { type: "pick" },
        },
        expected: [
          {
            $type: "Select",
            options: [
              { label: "Alpha", value: "a" },
              { label: "Beta", value: "b" },
            ],
            placeholder: "Pick one",
            $action: { type: "pick" },
          },
        ],
      },
      {
        name: "DatePicker with initial date",
        tree: {
          $type: "DatePicker",
          value: "2026-07-15",
          $action: { type: "pick_date" },
        },
        expected: [
          {
            $type: "DatePicker",
            value: "2026-07-15",
            $action: { type: "pick_date" },
          },
        ],
      },
      {
        name: "Checkbox with defaultChecked",
        tree: {
          $type: "Checkbox",
          label: "Agree",
          name: "agree",
          defaultChecked: true,
          $action: { type: "toggle" },
        },
        expected: [
          {
            $type: "Checkbox",
            label: "Agree",
            name: "agree",
            defaultChecked: true,
            $action: { type: "toggle" },
          },
        ],
      },
      {
        name: "RadioGroup with defaultValue",
        tree: {
          $type: "RadioGroup",
          options: [
            { label: "Small", value: "s" },
            { label: "Large", value: "l" },
          ],
          defaultValue: "l",
          $action: { type: "size" },
        },
        expected: [
          {
            $type: "RadioGroup",
            options: [
              { label: "Small", value: "s" },
              { label: "Large", value: "l" },
            ],
            defaultValue: "l",
            $action: { type: "size" },
          },
        ],
      },
      {
        name: "Input",
        tree: {
          $type: "Input",
          label: "Notes",
          placeholder: "Type here",
          multiline: true,
          $action: { type: "notes" },
        },
        expected: [
          {
            $type: "Input",
            label: "Notes",
            placeholder: "Type here",
            multiline: true,
            $action: { type: "notes" },
          },
        ],
      },
      {
        name: "Fact pair",
        tree: [
          { $type: "Fact", label: "Status", value: "Active" },
          { $type: "Fact", label: "Owner", value: "Ada" },
        ],
        expected: [
          { $type: "Fact", label: "Status", value: "Active" },
          { $type: "Fact", label: "Owner", value: "Ada" },
        ],
      },
      {
        name: "simple Card with title and body text",
        tree: {
          $type: "Card",
          title: "Order #42",
          children: [{ $type: "Text", value: "Shipped" }],
        },
        expected: [
          {
            $type: "Card",
            title: "Order #42",
            children: [{ $type: "Text", value: "Shipped" }],
          },
        ],
      },
      {
        name: "Alert (modal surface, where the native alert block round-trips; the message-surface fallback is not invertible into an Alert)",
        tree: {
          $type: "Alert",
          description: "Something happened.",
          tone: "danger",
        },
        options: { surface: "modal" },
        expected: [
          {
            $type: "Alert",
            description: "Something happened.",
            tone: "danger",
          },
        ],
      },
      {
        name: "Carousel of two simple Cards",
        tree: {
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
        },
        expected: [
          {
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
          },
        ],
      },
      {
        name: "ListView of two actionable items",
        tree: {
          $type: "ListView",
          children: [
            {
              $type: "ListViewItem",
              $action: { type: "open_one" },
              children: { $type: "Text", value: "Row one" },
            },
            {
              $type: "ListViewItem",
              $action: { type: "open_two" },
              children: { $type: "Text", value: "Row two" },
            },
          ],
        },
        expected: [
          {
            $type: "ListView",
            children: [
              {
                $type: "ListViewItem",
                $action: { type: "open_one" },
                children: { $type: "Text", value: "Row one" },
              },
              {
                $type: "ListViewItem",
                $action: { type: "open_two" },
                children: { $type: "Text", value: "Row two" },
              },
            ],
          },
        ],
      },
      {
        name: "Table with columns and mixed string/number rows",
        tree: {
          $type: "Table",
          columns: [{ label: "Name" }, { label: "Age" }],
          rows: [
            ["Ada", 36],
            ["Bob", 24],
          ],
        },
        expected: [
          {
            $type: "Table",
            columns: [{ label: "Name" }, { label: "Age" }],
            rows: [
              ["Ada", 36],
              ["Bob", 24],
            ],
          },
        ],
      },
    ];

    for (const fixture of fixtures) {
      it(`round-trips ${fixture.name}`, () => {
        const { blocks } = toSlackBlocks(fixture.tree, fixture.options);
        const { nodes } = fromSlackBlocks(blocks);
        expect(nodes).toEqual(fixture.expected);
      });
    }
  });
});

describe("fromSlackBlocks checkbox and radio caps", () => {
  it("marks defaultChecked only when the first option is initially selected", () => {
    const base = {
      type: "actions",
      elements: [
        {
          type: "checkboxes",
          action_id: "toggle",
          options: [
            { text: { type: "plain_text", text: "First" }, value: "first" },
            { text: { type: "plain_text", text: "Second" }, value: "second" },
          ],
          initial_options: [
            { text: { type: "plain_text", text: "Second" }, value: "second" },
          ],
        },
      ],
    };
    const { nodes } = fromSlackBlocks([base]);
    expect(nodes[0]).not.toHaveProperty("defaultChecked");

    const checkedFirst = structuredClone(base);
    checkedFirst.elements[0]!.initial_options = [
      { text: { type: "plain_text", text: "First" }, value: "first" },
    ];
    const checked = fromSlackBlocks([checkedFirst]);
    expect(checked.nodes[0]).toMatchObject({ defaultChecked: true });
  });

  it("clamps inbound radio options to the radio cap", () => {
    const { nodes, warnings } = fromSlackBlocks([
      {
        type: "actions",
        elements: [
          {
            type: "radio_buttons",
            action_id: "pick",
            options: Array.from({ length: 30 }, (_, i) => ({
              text: { type: "plain_text", text: `O${i}` },
              value: `v${i}`,
            })),
          },
        ],
      },
    ]);
    const radio = nodes[0] as { options: unknown[] };
    expect(radio.options).toHaveLength(10);
    expect(
      warnings.some(
        (warning) =>
          warning.component === "RadioGroup" && warning.code === "clamped",
      ),
    ).toBe(true);
  });
});
