import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { fire } from "./dispatch";

const INTERACTIVE_DESCENDANT_SELECTOR =
  "button, a, input, select, textarea, label";

export const listVocabulary = {
  ListView: {
    description:
      "A vertical list container. Wrap `ListViewItem` children as rows.",
    properties: z.object({}),
    render: ({ children }) => <ul data-aui="listview">{children}</ul>,
  },
  ListViewItem: {
    description:
      "A row inside a ListView. Carries `$action` to make the whole row clickable and keyboard-activatable.",
    properties: z.object({}),
    render: ({ $action, $dispatch, children }) => {
      if (!$action || !$dispatch) {
        return <li data-aui="listview-item">{children}</li>;
      }
      return (
        <li data-aui="listview-item">
          <div
            role="button"
            tabIndex={0}
            data-aui="listview-item-trigger"
            onClick={(event) => {
              const target = event.target as Element;
              if (target.closest(INTERACTIVE_DESCENDANT_SELECTOR)) return;
              fire($action, $dispatch);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              const target = event.target as Element;
              if (target.closest(INTERACTIVE_DESCENDANT_SELECTOR)) return;
              if (event.key === " ") event.preventDefault();
              fire($action, $dispatch);
            }}
          >
            {children}
          </div>
        </li>
      );
    },
  },
} satisfies GenerativeUILibrary;
