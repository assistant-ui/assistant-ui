import { useId, type ReactNode } from "react";
import type { Action } from "../ir";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "../types";
import { listDefinitions } from "./definitions/list";
import { fire } from "./dispatch";
import { INTERACTIVE_DESCENDANT_SELECTOR } from "./listItemValues";
import { sequenceItems } from "./structureValues";

function ListViewItemRender({
  $action,
  $dispatch,
  children,
}: {
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
  children?: ReactNode;
}) {
  const contentId = useId();
  if (!$action || !$dispatch) {
    return <li data-aui="listview-item">{children}</li>;
  }
  return (
    <li data-aui="listview-item">
      <div
        data-aui="listview-item-trigger"
        style={{ position: "relative" }}
        onClick={(event) => {
          const target = event.target as Element;
          const hit = target.closest(INTERACTIVE_DESCENDANT_SELECTOR);
          if (hit !== null && hit !== event.currentTarget) return;
          fire($action, $dispatch, undefined, event.currentTarget);
        }}
      >
        <button
          type="button"
          aria-labelledby={contentId}
          style={{
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            padding: "0",
            border: "0",
            background: "transparent",
            cursor: "pointer",
          }}
          onClick={(event) =>
            fire($action, $dispatch, undefined, event.currentTarget)
          }
        />
        <div
          data-aui="listview-item-content"
          id={contentId}
          style={{ position: "relative" }}
        >
          {children}
        </div>
      </div>
    </li>
  );
}

export const listVocabulary = {
  ListView: {
    ...listDefinitions.ListView,
    render: ({ children }) => <ul data-aui="listview">{children}</ul>,
  },
  ListViewItem: {
    ...listDefinitions.ListViewItem,
    render: (props) => <ListViewItemRender {...props} />,
  },
  Steps: {
    ...listDefinitions.Steps,
    render: ({ steps }) => (
      <ol data-aui="steps">
        {sequenceItems(steps).map((step, index) => (
          <li key={index} data-aui="steps-item">
            <div data-aui="steps-title">{step.title}</div>
            {step.detail !== undefined ? (
              <div data-aui="steps-detail">{step.detail}</div>
            ) : null}
          </li>
        ))}
      </ol>
    ),
  },
  Timeline: {
    ...listDefinitions.Timeline,
    render: ({ items }) => (
      <ol data-aui="timeline">
        {sequenceItems(items).map((item, index) => (
          <li key={index} data-aui="timeline-item">
            {item.time !== undefined ? (
              <div data-aui="timeline-time">{item.time}</div>
            ) : null}
            <div data-aui="timeline-title">{item.title}</div>
            {item.detail !== undefined ? (
              <div data-aui="timeline-detail">{item.detail}</div>
            ) : null}
          </li>
        ))}
      </ol>
    ),
  },
} satisfies GenerativeUILibrary;
