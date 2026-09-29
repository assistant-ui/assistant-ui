import { describe, expect, it } from "vitest";
import { convertSurfaceToUISpec } from "../a2ui/convert";
import { decodeBlockAction } from "./decodeBlockAction";
import { toSlackBlocks } from "./toSlackBlocks";

const convertForm = () => {
  const { spec, warnings: a2uiWarnings } = convertSurfaceToUISpec({
    components: new Map([
      ["root", { id: "root", component: "Column", children: ["name", "send"] }],
      [
        "name",
        {
          id: "name",
          component: "TextField",
          label: "Name",
          value: { path: "/form/name" },
        },
      ],
      [
        "send",
        {
          id: "send",
          component: "Button",
          label: "Send",
          action: {
            event: {
              name: "send",
              context: { name: { path: "/form/name" } },
            },
          },
        },
      ],
    ]),
    dataModel: { form: { name: "Ada" } },
  });

  expect(a2uiWarnings).toEqual([]);
  expect(spec).toMatchObject({
    children: [
      { $type: "Input", name: "/form/name", defaultValue: "Ada" },
      {
        $type: "Button",
        $action: {
          context: { name: { $field: "/form/name", fallback: "Ada" } },
        },
      },
    ],
  });
  if (!spec) throw new Error("Expected an A2UI tree");

  const { blocks, warnings: slackWarnings } = toSlackBlocks(spec);
  expect(slackWarnings).toEqual([]);
  const input = blocks.find((block) => block.type === "input");
  const actions = blocks.find((block) => block.type === "actions");
  if (!input || input.type !== "input" || !input.block_id)
    throw new Error("Expected a named Slack input block");
  if (!actions || actions.type !== "actions")
    throw new Error("Expected a Slack actions block");
  const button = actions.elements[0];
  if (!button || button.type !== "button")
    throw new Error("Expected a Slack button");

  return { blockId: input.block_id, actionId: input.element.action_id, button };
};

describe("A2UI actions on Slack", () => {
  it("sends the user's edited TextField value", () => {
    const { blockId, actionId, button } = convertForm();
    const stateValues = {
      [blockId]: {
        [actionId]: {
          type: "plain_text_input",
          value: "Grace",
        },
      },
    };

    expect(decodeBlockAction(button, stateValues)).toEqual({
      type: "a2ui:action",
      name: "send",
      surfaceId: "",
      sourceComponentId: "send",
      context: { name: "Grace" },
    });
  });

  it("uses the agent's fallback when Slack provides no state", () => {
    const { button } = convertForm();

    expect(decodeBlockAction(button)).toEqual({
      type: "a2ui:action",
      name: "send",
      surfaceId: "",
      sourceComponentId: "send",
      context: { name: "Ada" },
    });
  });
});
