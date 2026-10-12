import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { defaultGenerativeUILibrary } from "./index";

const render = (node: unknown) =>
  renderToStaticMarkup(
    <>{renderGenerativeUI(node, defaultGenerativeUILibrary)}</>,
  );

describe("numeric zero in text props", () => {
  it.each([
    [
      "Card title",
      { $type: "Card", title: 0 },
      '<header data-aui="card-title">0</header>',
    ],
    [
      "Alert title",
      { $type: "Alert", title: 0 },
      '<header data-aui="alert-title">0</header>',
    ],
    [
      "Alert description",
      { $type: "Alert", description: 0 },
      '<p data-aui="alert-desc">0</p>',
    ],
    [
      "Select placeholder",
      {
        $type: "Select",
        options: [{ label: "A", value: "a" }],
        placeholder: 0,
      },
      '<option value="" disabled="" selected="">0</option>',
    ],
  ])("renders a zero %s", (_name, node, expected) => {
    expect(render(node)).toContain(expected);
  });
});
