import { renderGenerativeUI } from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@assistant-ui/ui/components/assistant-ui/elements/generative-ui.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const WEATHER = {
  $type: "Card",
  children: [
    {
      $type: "Row",
      justify: "between",
      align: "center",
      children: [
        { $type: "Text", value: "Zurich", color: "secondary" },
        { $type: "Icon", name: "cloud", size: "lg" },
      ],
    },
    { $type: "Text", value: "18°C", size: "3xl", weight: "bold" },
    { $type: "Text", value: "Cloudy, humidity 71%", color: "secondary" },
  ],
};

const ORDER = {
  $type: "Card",
  title: "Release 0.14",
  children: [
    {
      $type: "Alert",
      tone: "success",
      title: "Build passed",
      description: "Every package compiled; the suite is still running.",
    },
    {
      $type: "ListView",
      children: ["Build", "Test", "Publish"].map((step, index) => ({
        $type: "ListViewItem",
        $key: step,
        children: {
          $type: "Row",
          justify: "between",
          children: [
            { $type: "Text", value: step, weight: "medium" },
            {
              $type: "Badge",
              value: index === 0 ? "Done" : index === 1 ? "Running" : "Queued",
              variant:
                index === 0 ? "success" : index === 1 ? "info" : "secondary",
            },
          ],
        },
      })),
    },
  ],
};

const MARKDOWN = {
  $type: "Markdown",
  value:
    "**styledGenerativeUILibrary** renders `Markdown` nodes with GitHub-flavored markdown:\n\n- a list item\n- a [link](https://www.assistant-ui.com)\n\n| Probe | Phase |\n| --- | --- |\n| gallery-csp | 1 |",
};

const render = (tree: unknown) => (
  <div data-aui-theme="elements">
    {renderGenerativeUI(tree, styledGenerativeUILibrary)}
  </div>
);

export default defineSections([
  {
    id: "generative-ui",
    title: "Generative UI",
    category: "agents",
    notes:
      "renderGenerativeUI with styledGenerativeUILibrary under the elements theme: a card, an alert with a list of badges, and a markdown node. The vocabulary CSS is added as a constructed stylesheet.",
    render: () => (
      <States>
        <State label="card">{render(WEATHER)}</State>
        <State label="alert, list, badges">{render(ORDER)}</State>
        <State label="markdown">{render(MARKDOWN)}</State>
      </States>
    ),
  },
]);
