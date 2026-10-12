import type { FormEvent } from "react";
import type { GenerativeUILibrary } from "../types";
import { layoutDefinitions } from "./definitions/layout";
import { fire } from "./dispatch";
import { collectFormValuesFromEvent } from "./collectFormValues";
import { toTextContent } from "./toTextContent";
import { boxStyle, footerAction } from "./layoutValues";

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
          {cardTitle !== null && cardTitle !== "" ? (
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
} satisfies GenerativeUILibrary;
