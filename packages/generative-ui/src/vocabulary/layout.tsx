import * as React from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import type { GenerativeUILibrary } from "../types";
import { layoutDefinitions } from "./definitions/layout";
import { fire } from "./dispatch";
import { collectFormValuesFromEvent } from "./collectFormValues";
import { toTextContent } from "./toTextContent";
import { boxStyle, footerAction } from "./layoutValues";
import { tabLabels } from "./structureValues";

function TabsRender({
  tabs,
  label,
  children,
}: {
  tabs: string[];
  label?: string;
  children?: ReactNode;
}) {
  const panels = React.Children.toArray(children);
  const labels = tabLabels(tabs, panels.length);
  const [selected, setSelected] = React.useState(0);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const id = React.useId();
  if (labels.length === 0) return null;
  const current = Math.min(selected, labels.length - 1);
  const last = labels.length - 1;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowRight"
        ? current === last
          ? 0
          : current + 1
        : event.key === "ArrowLeft"
          ? current === 0
            ? last
            : current - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setSelected(next);
    tabRefs.current[next]?.focus();
  };
  return (
    <div data-aui="tabs">
      <div
        role="tablist"
        aria-label={typeof label === "string" ? label : undefined}
        data-aui="tabs-list"
        onKeyDown={onKeyDown}
      >
        {labels.map((label, index) => (
          <button
            key={index}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === current}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={index === current ? 0 : -1}
            data-aui="tabs-tab"
            onClick={() => setSelected(index)}
          >
            {label}
          </button>
        ))}
      </div>
      {labels.map((_, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== current}
          tabIndex={0}
          data-aui="tabs-panel"
        >
          {panels[index]}
        </div>
      ))}
    </div>
  );
}

export const layoutVocabulary = {
  Card: {
    ...layoutDefinitions.Card,
    render: ({
      title,
      padding,
      background,
      asForm,
      confirm,
      cancel,
      $action,
      $dispatch,
      children,
    }) => {
      const Root = asForm ? "form" : "section";
      const submitAction = footerAction(confirm) ?? $action;
      const cardTitle = toTextContent(title);
      const footer =
        confirm || cancel ? (
          <footer data-aui="card-footer">
            {confirm ? (
              <button
                type={asForm ? "submit" : "button"}
                data-aui="card-confirm"
                onClick={
                  asForm
                    ? undefined
                    : (e) =>
                        fire(
                          footerAction(confirm),
                          $dispatch,
                          undefined,
                          e.currentTarget,
                        )
                }
              >
                {toTextContent(confirm.label)}
              </button>
            ) : null}
            {cancel ? (
              <button
                type="button"
                data-aui="card-cancel"
                onClick={(e) =>
                  fire(
                    footerAction(cancel),
                    $dispatch,
                    undefined,
                    e.currentTarget,
                  )
                }
              >
                {toTextContent(cancel.label)}
              </button>
            ) : null}
          </footer>
        ) : null;

      return (
        <Root
          data-aui="card"
          data-aui-padding={padding}
          data-aui-background={background}
          data-aui-surface={
            background !== undefined || footer !== null ? "" : undefined
          }
          style={
            background !== undefined
              ? { background, color: "white" }
              : undefined
          }
          data-aui-asform={asForm || undefined}
          onSubmit={
            asForm
              ? (event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  fire(
                    submitAction,
                    $dispatch,
                    collectFormValuesFromEvent(event),
                    event.currentTarget,
                  );
                }
              : undefined
          }
        >
          {cardTitle ? (
            <header data-aui="card-title">{cardTitle}</header>
          ) : null}
          {children}
          {footer}
        </Root>
      );
    },
  },
  Col: {
    ...layoutDefinitions.Col,
    render: ({ gap, align, children }) => (
      <div data-aui="col" data-aui-gap={gap} data-aui-align={align}>
        {children}
      </div>
    ),
  },
  Row: {
    ...layoutDefinitions.Row,
    render: ({ gap, align, justify, children }) => (
      <div
        data-aui="row"
        data-aui-gap={gap}
        data-aui-align={align}
        data-aui-justify={justify}
      >
        {children}
      </div>
    ),
  },
  Spacer: {
    ...layoutDefinitions.Spacer,
    render: () => <div data-aui="spacer" />,
  },
  Badge: {
    ...layoutDefinitions.Badge,
    render: ({ value, variant, children }) => (
      <span data-aui="badge" data-aui-variant={variant}>
        {toTextContent(value)}
        {children}
      </span>
    ),
  },
  Box: {
    ...layoutDefinitions.Box,
    render: ({ width, height, radius, background, children }) => {
      const style = boxStyle(width, height, radius, background);

      return (
        <div
          data-aui="box"
          data-aui-radius={radius === "full" ? "full" : undefined}
          style={style}
        >
          {children}
        </div>
      );
    },
  },
  Tabs: {
    ...layoutDefinitions.Tabs,
    render: ({ tabs, label, children }) => (
      <TabsRender tabs={tabs} {...(label !== undefined ? { label } : {})}>
        {children}
      </TabsRender>
    ),
  },
} satisfies GenerativeUILibrary;
