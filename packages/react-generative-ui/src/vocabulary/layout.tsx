import type { CSSProperties, FormEvent } from "react";
import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { ALIGNS, JUSTIFIES } from "../ir";
import { fire } from "./dispatch";
import { collectFormValuesFromEvent } from "./collectFormValues";

const toCssLength = (value: string | number): string =>
  typeof value === "number" ? `${value}px` : value;

const cardActionSchema = z.looseObject({
  type: z
    .string()
    .describe("The action type, resolved by the host's action registry."),
});

const cardFooterButtonSchema = z.object({
  label: z.string().describe("Footer button label."),
  $action: cardActionSchema
    .optional()
    .describe("Action fired when the button is activated."),
});

export const layoutVocabulary = {
  Card: {
    description:
      "A bordered container grouping related content. Optionally titled. Set `asForm` to collect named child control values on submit, and `confirm`/`cancel` to add a footer with action buttons.",
    properties: z.object({
      title: z.string().optional().describe("Optional card title."),
      padding: z
        .number()
        .optional()
        .describe(
          "Padding in 4px units (e.g. 2 = 8px). 0 to 8 is the supported range.",
        ),
      background: z
        .string()
        .optional()
        .describe(
          "Background color or gradient (any CSS background value). Setting this also switches the card's own text to white, since a custom background makes the card a tinted surface; children can still opt into a different color explicitly.",
        ),
      asForm: z
        .boolean()
        .optional()
        .describe(
          "Render as a form; submitting it fires `confirm.$action` with every named child control's value, keyed by `name`.",
        ),
      confirm: cardFooterButtonSchema
        .optional()
        .describe("Confirm button shown in the footer."),
      cancel: cardFooterButtonSchema
        .optional()
        .describe("Cancel button shown in the footer."),
    }),
    render: ({
      title,
      padding,
      background,
      asForm,
      confirm,
      cancel,
      $dispatch,
      children,
    }) => {
      const Root = asForm ? "form" : "section";
      const footer =
        confirm || cancel ? (
          <footer data-aui="card-footer">
            {confirm ? (
              <button
                type={asForm ? "submit" : "button"}
                data-aui="card-confirm"
                onClick={
                  asForm ? undefined : () => fire(confirm.$action, $dispatch)
                }
              >
                {confirm.label}
              </button>
            ) : null}
            {cancel ? (
              <button
                type="button"
                data-aui="card-cancel"
                onClick={() => fire(cancel.$action, $dispatch)}
              >
                {cancel.label}
              </button>
            ) : null}
          </footer>
        ) : null;

      return (
        <Root
          data-aui="card"
          data-aui-padding={padding}
          data-aui-background={background}
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
                    confirm?.$action,
                    $dispatch,
                    collectFormValuesFromEvent(event),
                  );
                }
              : undefined
          }
        >
          {title ? <header data-aui="card-title">{title}</header> : null}
          {children}
          {footer}
        </Root>
      );
    },
  },
  Col: {
    description: "A vertical stack; children laid out top to bottom.",
    properties: z.object({
      gap: z
        .number()
        .optional()
        .describe(
          "Gap between children in 4px units. 0 to 8 is the supported range.",
        ),
      align: z.enum(ALIGNS).optional().describe("Cross-axis alignment."),
    }),
    render: ({ gap, align, children }) => (
      <div data-aui="col" data-aui-gap={gap} data-aui-align={align}>
        {children}
      </div>
    ),
  },
  Row: {
    description: "A horizontal row; children laid out left to right.",
    properties: z.object({
      gap: z
        .number()
        .optional()
        .describe(
          "Gap between children in 4px units. 0 to 8 is the supported range.",
        ),
      align: z.enum(ALIGNS).optional().describe("Cross-axis alignment."),
      justify: z.enum(JUSTIFIES).optional().describe("Main-axis distribution."),
    }),
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
    description: "Empty space that pushes neighbors apart.",
    properties: z.object({}),
    render: () => <div data-aui="spacer" />,
  },
  Badge: {
    description: "A small labeled tag, e.g. for status or category.",
    properties: z.object({
      value: z.string().describe("Badge text."),
      variant: z.string().optional().describe("Visual variant token."),
    }),
    render: ({ value, variant, children }) => (
      <span data-aui="badge" data-aui-variant={variant}>
        {value}
        {children}
      </span>
    ),
  },
  Box: {
    description:
      "A generic container for composition, e.g. a progress bar built from an outer track Box containing a partial-width fill Box. Size, radius, and background accept arbitrary values, so they render as inline styles rather than data-attribute hooks.",
    properties: z.object({
      width: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Width; a number is pixels."),
      height: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Height; a number is pixels."),
      radius: z
        .union([z.literal("full"), z.number()])
        .optional()
        .describe(
          'Corner radius; "full" is a pill/circle, a number is pixels.',
        ),
      background: z
        .string()
        .optional()
        .describe("Background color or gradient (any CSS background value)."),
    }),
    render: ({ width, height, radius, background, children }) => {
      const style: CSSProperties = {};
      if (width !== undefined) style.width = toCssLength(width);
      if (height !== undefined) style.height = toCssLength(height);
      if (background !== undefined) style.background = background;
      if (radius === "full") style.borderRadius = "9999px";
      else if (typeof radius === "number") style.borderRadius = `${radius}px`;

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
