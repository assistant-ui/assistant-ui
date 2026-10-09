import type { SpecComponentProps, SpecComponents } from "../src/react";
import { defineCatalog } from "../src/spec";

/** A small dashboard catalog shared by the spec and thread demos. */
export const catalog = defineCatalog({
  components: {
    Stack: {
      description: "Lays children out vertically, or in a row.",
      props: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["column", "row"] },
          gap: { type: "string", enum: ["sm", "md", "lg"] },
        },
      },
      slots: ["default"],
    },
    Grid: {
      description: "Equal-width columns that wrap on narrow screens.",
      props: {
        type: "object",
        properties: { columns: { type: "integer", minimum: 1, maximum: 4 } },
        required: ["columns"],
      },
      slots: ["default"],
    },
    Card: {
      description: "A titled panel.",
      props: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title"],
      },
      slots: ["default", "footer"],
    },
    Metric: {
      description: "A key number with an optional change.",
      props: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: ["string", "number"] },
          delta: { type: "string", description: "e.g. +12%" },
          tone: { type: "string", enum: ["up", "down", "neutral"] },
        },
        required: ["label", "value"],
      },
    },
    BarList: {
      description: "Horizontal bars comparing a few values.",
      props: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "number" },
              },
              required: ["label", "value"],
            },
          },
          unit: { type: "string" },
        },
        required: ["items"],
      },
    },
    Select: {
      description: "A labeled dropdown; bind `value` with $bindState.",
      props: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
              },
              required: ["label", "value"],
            },
          },
        },
        required: ["label", "options"],
      },
      events: ["change"],
    },
    Button: {
      description: "A button.",
      props: {
        type: "object",
        properties: {
          label: { type: "string" },
          variant: { type: "string", enum: ["primary", "secondary"] },
        },
        required: ["label"],
      },
      events: ["press"],
    },
    Text: {
      description: "A paragraph.",
      props: {
        type: "object",
        properties: {
          text: { type: "string" },
          tone: { type: "string", enum: ["default", "muted"] },
        },
        required: ["text"],
      },
    },
  },
  actions: {
    refresh: {
      description: "Reloads the dashboard numbers for a date range.",
      params: {
        type: "object",
        properties: { range: { type: "string", enum: ["7d", "30d", "90d"] } },
        required: ["range"],
      },
    },
    ask: {
      description: "Sends a follow-up question to the assistant.",
      params: {
        type: "object",
        properties: { question: { type: "string" } },
        required: ["question"],
      },
    },
  },
});

const gaps = { sm: 8, md: 12, lg: 20 } as const;

type Item = { label: string; value: number };
type Option = { label: string; value: string };

export const components: SpecComponents = {
  Stack: ({
    props,
    children,
  }: SpecComponentProps<{
    direction?: "row" | "column";
    gap?: "sm" | "md" | "lg";
  }>) => (
    <div
      style={{
        display: "flex",
        flexDirection: props.direction ?? "column",
        flexWrap: "wrap",
        gap: gaps[props.gap ?? "md"],
        alignItems: props.direction === "row" ? "center" : "stretch",
      }}
    >
      {children}
    </div>
  ),
  Grid: ({ props, children }: SpecComponentProps<{ columns: number }>) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(560 / props.columns)}px, 1fr))`,
        gap: 12,
      }}
    >
      {children}
    </div>
  ),
  Card: ({
    props,
    children,
    slots,
  }: SpecComponentProps<{ title: string; description?: string }>) => (
    <section
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 16,
      }}
    >
      <h2 style={{ fontSize: 16, margin: "0 0 2px" }}>{props.title}</h2>
      {props.description ? (
        <p
          style={{
            margin: "0 0 12px",
            color: "var(--muted-foreground)",
            fontSize: 14,
          }}
        >
          {props.description}
        </p>
      ) : null}
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
      {slots["footer"] ? (
        <div
          style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {slots["footer"]}
        </div>
      ) : null}
    </section>
  ),
  Metric: ({
    props,
  }: SpecComponentProps<{
    label: string;
    value: string | number;
    delta?: string;
    tone?: "up" | "down" | "neutral";
  }>) => (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 12,
        background: "var(--card)",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
        {props.label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {props.value}
      </div>
      {props.delta ? (
        <div
          style={{
            fontSize: 13,
            color:
              props.tone === "down"
                ? "var(--destructive)"
                : props.tone === "up"
                  ? "var(--aui-success)"
                  : "var(--muted-foreground)",
          }}
        >
          {props.delta}
        </div>
      ) : null}
    </div>
  ),
  BarList: ({
    props,
  }: SpecComponentProps<{ items: Item[]; unit?: string }>) => {
    const max = Math.max(1, ...props.items.map((item) => item.value));
    return (
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: 8,
        }}
      >
        {props.items.map((item, index) => (
          <li
            key={item.label}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 64px",
              gap: 8,
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <span>{item.label}</span>
            <span
              aria-hidden="true"
              style={{
                height: 10,
                borderRadius: 999,
                width: `${(item.value / max) * 100}%`,
                background: `var(--chart-${(index % 3) + 1})`,
                transition: "width .3s",
              }}
            />
            <span
              style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
            >
              {item.value}
              {props.unit ?? ""}
            </span>
          </li>
        ))}
      </ul>
    );
  },
  Select: ({
    id,
    props,
    setProp,
    emit,
  }: SpecComponentProps<{
    label: string;
    value?: string;
    options: Option[];
  }>) => (
    <label
      style={{
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        fontSize: 14,
      }}
    >
      {props.label}
      <select
        data-spec-id={id}
        value={props.value ?? ""}
        onChange={(event) => {
          setProp("value", event.target.value);
          emit("change", { value: event.target.value });
        }}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid var(--input)",
          background: "var(--card)",
        }}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
  Button: ({
    id,
    props,
    emit,
  }: SpecComponentProps<{
    label: string;
    variant?: "primary" | "secondary";
  }>) => (
    <button
      type="button"
      data-spec-id={id}
      className={props.variant === "primary" ? "primary" : undefined}
      onClick={() => emit("press")}
    >
      {props.label}
    </button>
  ),
  Text: ({
    props,
  }: SpecComponentProps<{ text: string; tone?: "default" | "muted" }>) => (
    <p
      style={{
        margin: 0,
        fontSize: 14,
        color: props.tone === "muted" ? "var(--muted-foreground)" : undefined,
      }}
    >
      {props.text}
    </p>
  ),
};

/** Numbers the `refresh` action loads per range. */
export const DATA: Record<
  string,
  { revenue: string; delta: string; orders: number; regions: Item[] }
> = {
  "7d": {
    revenue: "$182K",
    delta: "+4.1%",
    orders: 1204,
    regions: [
      { label: "EMEA", value: 74 },
      { label: "AMER", value: 69 },
      { label: "APAC", value: 39 },
    ],
  },
  "30d": {
    revenue: "$812K",
    delta: "+9.8%",
    orders: 5310,
    regions: [
      { label: "EMEA", value: 312 },
      { label: "AMER", value: 301 },
      { label: "APAC", value: 199 },
    ],
  },
  "90d": {
    revenue: "$2.41M",
    delta: "+12.6%",
    orders: 15872,
    regions: [
      { label: "EMEA", value: 941 },
      { label: "AMER", value: 878 },
      { label: "APAC", value: 591 },
    ],
  },
};

const patch = (op: string, path: string, value: unknown) =>
  JSON.stringify({ op, path, value });

/** A recorded model reply in inline mode: prose with a ```spec fence of JSONL patches. */
export const DASHBOARD_REPLY = [
  "Here is your sales dashboard. Pick a range to reload it.",
  "```spec",
  patch("add", "/root", "dashboard"),
  patch("add", "/state", {
    range: "7d",
    updated: "never",
    metrics: {
      revenue: DATA["7d"]!.revenue,
      delta: DATA["7d"]!.delta,
      orders: DATA["7d"]!.orders,
    },
    regions: DATA["7d"]!.regions,
  }),
  patch("add", "/elements/dashboard", {
    type: "Card",
    props: {
      title: "Sales overview",
      description: { $template: "Last ${/range} · refreshed ${/updated}" },
    },
    children: ["kpis", "regions"],
    slots: { footer: ["range", "refresh", "ask"] },
    watch: {
      "/range": { action: "refresh", params: { range: { $state: "/range" } } },
    },
  }),
  patch("add", "/elements/kpis", {
    type: "Grid",
    props: { columns: 3 },
    children: ["revenue", "orders", "aov"],
  }),
  patch("add", "/elements/revenue", {
    type: "Metric",
    props: {
      label: "Revenue",
      value: { $state: "/metrics/revenue" },
      delta: { $state: "/metrics/delta" },
      tone: "up",
    },
  }),
  patch("add", "/elements/orders", {
    type: "Metric",
    props: { label: "Orders", value: { $state: "/metrics/orders" } },
  }),
  patch("add", "/elements/aov", {
    type: "Metric",
    props: {
      label: "Avg. order",
      value: "$151",
      delta: "flat",
      tone: "neutral",
    },
  }),
  patch("add", "/elements/regions", {
    type: "BarList",
    props: { items: { $state: "/regions" }, unit: "K" },
  }),
  patch("add", "/elements/range", {
    type: "Select",
    props: {
      label: "Range",
      value: { $bindState: "/range" },
      options: [
        { label: "7 days", value: "7d" },
        { label: "30 days", value: "30d" },
        { label: "90 days", value: "90d" },
      ],
    },
  }),
  patch("add", "/elements/refresh", {
    type: "Button",
    props: { label: "Refresh", variant: "primary" },
    on: {
      press: { action: "refresh", params: { range: { $state: "/range" } } },
    },
  }),
  patch("add", "/elements/ask", {
    type: "Button",
    props: { label: "Why is EMEA ahead?" },
    on: {
      press: {
        action: "ask",
        params: { question: "Why is EMEA ahead this period?" },
      },
    },
  }),
  "```",
  "The numbers come from the orders table.",
].join("\n");
