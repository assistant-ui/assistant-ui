"use client";

import { defineComponent, createLibrary } from "@openuidev/react-lang";
import type { ReactNode } from "react";
import { z } from "zod/v4";

export const UnknownComponentFallback = ({
  component,
}: {
  component: string;
}) => (
  <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
    unknown component: {component}
  </span>
);

const renderItems = (
  items: unknown,
  renderNode: (value: unknown) => ReactNode,
) => {
  if (items == null) return null;
  const list = Array.isArray(items) ? items : [items];
  return list.map((item, i) => <span key={i}>{renderNode(item)}</span>);
};

const Card = defineComponent({
  name: "Card",
  description: "Display card with optional title and description",
  props: z.object({
    content: z.unknown().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  component: ({ props, renderNode }) => (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      {props.title ? (
        <div className="text-base font-semibold">{props.title}</div>
      ) : null}
      {props.description ? (
        <div className="text-muted-foreground mt-1 text-sm">
          {props.description}
        </div>
      ) : null}
      {props.content != null ? (
        <div className="mt-3">{renderItems(props.content, renderNode)}</div>
      ) : null}
    </div>
  ),
});

const Button = defineComponent({
  name: "Button",
  description: "Clickable button with optional label and variant",
  props: z.object({
    label: z.string().optional(),
    variant: z.enum(["primary", "secondary"]).optional(),
    onClickPrompt: z.string().optional(),
  }),
  component: ({ props }) => {
    const cls =
      props.variant === "primary" || !props.variant
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    return (
      <button
        type="button"
        className={`mt-2 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium ${cls}`}
        onClick={() => {
          if (props.onClickPrompt) {
            alert(`button -> ${props.onClickPrompt}`);
          }
        }}
      >
        {props.label ?? "Click"}
      </button>
    );
  },
});

const Stack = defineComponent({
  name: "Stack",
  description: "Flex stack layout",
  props: z.object({
    items: z.unknown().optional(),
    direction: z.enum(["row", "column"]).optional(),
    gap: z.enum(["sm", "md", "lg"]).optional(),
  }),
  component: ({ props, renderNode }) => {
    const gapClass =
      props.gap === "sm" ? "gap-2" : props.gap === "lg" ? "gap-6" : "gap-4";
    const dirClass = props.direction === "row" ? "flex-row" : "flex-col";
    return (
      <div className={`flex ${dirClass} ${gapClass}`}>
        {renderItems(props.items, renderNode)}
      </div>
    );
  },
});

const Text = defineComponent({
  name: "Text",
  description: "Body text paragraph",
  props: z.object({
    text: z.string(),
  }),
  component: ({ props }) => (
    <p className="text-foreground text-sm leading-6">{props.text}</p>
  ),
});

const Stat = defineComponent({
  name: "Stat",
  description: "Stat display with label and value",
  props: z.object({
    label: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
  component: ({ props }) => (
    <div className="bg-muted/40 flex flex-col rounded-lg border p-3">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <span className="text-xl font-semibold">{props.value}</span>
    </div>
  ),
});

const Heading = defineComponent({
  name: "Heading",
  description: "Heading text",
  props: z.object({
    text: z.string(),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }),
  component: ({ props }) => {
    const level = props.level ?? 2;
    let cls: string;
    if (level === 1) cls = "text-2xl font-bold";
    else if (level === 2) cls = "text-lg font-semibold";
    else cls = "text-base font-semibold";
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
    return <Tag className={cls}>{props.text}</Tag>;
  },
});

/** OpenUI Lang library for the with-generative-ui example. */
export const guiLibrary = createLibrary({
  root: "Card",
  components: [Card, Button, Stack, Text, Stat, Heading],
});

/** Static OpenUI Lang demo matching the former JSON primitive page. */
export const primitiveExampleSource = `root = Card([stack1], "Welcome", "An agent-described card with a primary CTA.")
stack1 = Stack([text1, btn1], "column", "sm")
text1 = Text("This card was rendered from OpenUI Lang emitted by the agent.")
btn1 = Button("Get started", "primary", "open onboarding")`;
