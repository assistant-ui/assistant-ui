import type { GenerativeUILibrary } from "../types";
import { listDefinitions } from "./definitions/list";
import { fire } from "./dispatch";
import { INTERACTIVE_DESCENDANT_SELECTOR } from "./listItemValues";

export const listVocabulary = {
  ListView: {
    ...listDefinitions.ListView,
    render: ({ children }) => <ul data-aui="listview">{children}</ul>,
  },
  ListViewItem: {
    ...listDefinitions.ListViewItem,
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
              const hit = target.closest(INTERACTIVE_DESCENDANT_SELECTOR);
              if (hit !== null && hit !== event.currentTarget) return;
              fire($action, $dispatch, undefined, event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              const target = event.target as Element;
              const hit = target.closest(INTERACTIVE_DESCENDANT_SELECTOR);
              if (hit !== null && hit !== event.currentTarget) return;
              if (event.key === " ") event.preventDefault();
              fire($action, $dispatch, undefined, event.currentTarget);
            }}
          >
            {children}
          </div>
        </li>
      );
    },
  },
} satisfies GenerativeUILibrary;
