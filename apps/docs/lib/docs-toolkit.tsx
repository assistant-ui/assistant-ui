"use generative";

import {
  DEFAULT_REGISTRY,
  JsonUI,
  type UINode,
} from "@/components/generative-ui";
import { cn } from "@/lib/utils";
import { WeatherWidget } from "@/components/generative-ui/weather-widget/runtime";
import {
  fetchWeatherWidgetFromOpenMeteo,
  geocodeLocationWithOpenMeteo,
} from "@/lib/open-meteo-weather-adapter";
import { MapPin, CloudSun, AlertCircle, ChevronRight } from "lucide-react";
import type { JSONSchema7 } from "json-schema";
import { z } from "zod";
import {
  defineToolkit,
  type ToolCallMessagePartProps,
  useAuiState,
} from "@assistant-ui/react";

const RENDER_GENERATIVE_UI_TOOL_NAME = "render_generative_ui" as const;

const PRIMITIVE_TYPES = [
  "Card",
  "Box",
  "Col",
  "Row",
  "Spacer",
  "Divider",
  "Text",
  "Title",
  "Caption",
  "Image",
  "Icon",
  "Chart",
  "Badge",
  "Button",
] as const;

const PRIMITIVE_TYPES_LABEL = PRIMITIVE_TYPES.join(", ");

type RenderGenerativeUIResult = {
  rendered: true;
};

type RenderGenerativeUIArgs = Record<string, unknown> & {
  spec: UINode | readonly UINode[];
};

const uiNodeObjectSchema: JSONSchema7 = {
  type: "object",
  required: ["type"],
  additionalProperties: true,
  not: {
    anyOf: [
      { required: ["root"] },
      { required: ["component"] },
      { required: ["props"] },
    ],
  },
  properties: {
    type: {
      type: "string",
      enum: [...PRIMITIVE_TYPES],
      description:
        "Registry component type. Props are flat fields on the same object.",
    },
    children: {
      type: "array",
      items: {
        anyOf: [{ type: "string" }, { $ref: "#/definitions/uiNode" }],
      },
    },
  },
};

const renderGenerativeUIArgsSchema = {
  type: "object",
  required: ["spec"],
  additionalProperties: false,
  properties: {
    spec: {
      description:
        "JSON UI node or array of nodes. Shape: { type, ...props, children }. Do not wrap props in a props object and do not wrap the tree in root. Use Chart for quantitative comparisons.",
      anyOf: [
        { type: "string" },
        { $ref: "#/definitions/uiNode" },
        {
          type: "array",
          minItems: 1,
          items: {
            anyOf: [{ type: "string" }, { $ref: "#/definitions/uiNode" }],
          },
        },
      ],
    },
  },
  definitions: {
    uiNode: uiNodeObjectSchema,
  },
} satisfies JSONSchema7;

const RenderGenerativeUIToolCall = ({
  args,
}: ToolCallMessagePartProps<
  RenderGenerativeUIArgs,
  RenderGenerativeUIResult
>) => {
  const spec = args.spec;

  if (!spec) return null;

  return (
    <div className="my-2 w-full max-w-full overflow-hidden">
      <JsonUI node={spec} registry={DEFAULT_REGISTRY} />
    </div>
  );
};

export default defineToolkit({
  [RENDER_GENERATIVE_UI_TOOL_NAME]: {
    display: "standalone",
    description:
      "Render generative UI directly in the conversation using the assistant-ui gallery JSON UI primitives. " +
      "Use this whenever the user asks for a visual comparison, dashboard, card, chart, or generated UI. " +
      "The spec is a JSON UI node or array of nodes with the flat shape { type, ...props, children }. " +
      "Do not use { root }, { component }, or a nested props object. " +
      `Available types: ${PRIMITIVE_TYPES_LABEL}. ` +
      "For comparison charts, build a Card containing Title/Caption/Text and a Chart primitive. " +
      "The Chart primitive props are: variant ('bar', 'line', or 'sparkline'), data (array of objects), xKey, dataKey, color, and height. " +
      "Example spec: { type: 'Card', children: [{ type: 'Col', gap: 2, children: [{ type: 'Title', value: 'Economic strength comparison' }, { type: 'Caption', value: 'GDP in USD trillions' }, { type: 'Chart', variant: 'bar', data: [{ label: 'United States', value: 29 }, { label: 'China', value: 18.7 }], xKey: 'label', dataKey: 'value', height: 220 }] }] }.",
    parameters: renderGenerativeUIArgsSchema,
    execute: async () => {
      "use client";

      return { rendered: true as const };
    },
    render: RenderGenerativeUIToolCall,
  },
  // Weather data powered by Open-Meteo (https://open-meteo.com/)
  geocode_location: {
    description:
      "Geocode a location name into latitude/longitude (Open-Meteo). Pass the " +
      "coordinates to `get_weather`.",
    parameters: z.object({
      query: z.string(),
    }),
    execute: async ({ query }: { query: string }) =>
      geocodeLocationWithOpenMeteo(query),
    render: ({ toolName, args, result }: any) => {
      const signature = formatToolCall(toolName, args);
      const icon = <MapPin className="size-4" />;

      if (result?.success === false) {
        return <ToolErrorCard signature={signature} error={result.error} />;
      }
      if (!result) {
        return (
          <ToolStatusCard
            signature={signature}
            icon={icon}
            message="Finding location..."
            loading
          />
        );
      }

      const { name, latitude, longitude } = result.result;
      return (
        <ToolTraceCard
          icon={icon}
          signature={signature}
          description={`${name} · ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`}
          result={result}
        />
      );
    },
  },
  get_weather: {
    description:
      "Fetch the weather for coordinates from `geocode_location`. Returns an " +
      "`id`; pass that `id` to `present_weather` to show the user a card.",
    parameters: z.object({
      location: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }),
    execute: async ({
      location,
      latitude,
      longitude,
    }: {
      location: string;
      latitude: number;
      longitude: number;
    }) => {
      const weather = await fetchWeatherWidgetFromOpenMeteo({
        query: location,
        latitude,
        longitude,
      });
      if (!weather.success) {
        return { success: false as const, error: weather.error };
      }

      return {
        success: true as const,
        id: crypto.randomUUID().slice(0, 8),
        location,
        widget: weather.widget,
      };
    },
    render: ({ toolName, args, result }: any) => {
      const signature = formatToolCall(toolName, args);
      const icon = <CloudSun className="size-4" />;

      if (result?.success === false) {
        return <ToolErrorCard signature={signature} error={result.error} />;
      }
      if (!result) {
        return (
          <ToolStatusCard
            signature={signature}
            icon={icon}
            message="Fetching weather..."
            loading
          />
        );
      }

      const current = result.widget?.current;
      return (
        <ToolTraceCard
          icon={icon}
          signature={signature}
          description={
            current
              ? `${Math.round(current.temperature)}°F · ${current.conditionCode} in ${result.location}`
              : "Weather ready"
          }
          result={result}
        />
      );
    },
  },
  present_weather: {
    display: "standalone",
    description:
      "Show the user a rich weather card. Pass the `id` returned by " +
      "`get_weather`; the card reads that result's payload.",
    parameters: z.object({
      id: z.string(),
    }),
    execute: async ({ id }: { id: string }) => ({ id }),
    render: (props: any) => <PresentWeatherCard {...props} />,
  },
});

const PresentWeatherCard = ({ toolName, args }: any) => {
  // The payload lives on the `get_weather` result; `present_weather` only
  // carries the `id`. Scan the whole thread (the two calls usually land in
  // separate assistant messages) for the matching result.
  const source = useAuiState((s) => {
    for (const message of s.thread.messages) {
      for (const part of message.content) {
        if (
          part.type === "tool-call" &&
          part.toolName === "get_weather" &&
          (part.result as any)?.id === args?.id
        ) {
          return part.result as any;
        }
      }
    }
    return undefined;
  });

  if (source?.success === false) {
    return (
      <ToolCard variant="error">
        <ToolCardIcon>
          <AlertCircle className="size-4" />
        </ToolCardIcon>
        <ToolCardContent>
          <ToolCardTitle>Weather unavailable</ToolCardTitle>
          <ToolCardDescription>{source.error}</ToolCardDescription>
        </ToolCardContent>
      </ToolCard>
    );
  }

  if (!source?.widget) {
    return (
      <ToolCard>
        <ToolCardIcon loading>
          <CloudSun className="size-4" />
        </ToolCardIcon>
        <ToolCardContent>
          <ToolCardTitle>Preparing weather...</ToolCardTitle>
        </ToolCardContent>
      </ToolCard>
    );
  }

  return (
    <div className="mt-2 mb-4 flex flex-col items-center">
      <WeatherWidget {...source.widget} />
      <p className="text-muted-foreground/70 mt-1.5 text-center font-mono text-xs">
        {formatToolCall(toolName, args)}
      </p>
    </div>
  );
};

// Shared Tool Card Components
const ToolCard = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "error";
}) => (
  <div
    className={cn(
      "my-2 flex items-center gap-3 rounded-lg border px-3 py-2.5",
      variant === "error"
        ? "border-destructive/30 bg-destructive/5"
        : "bg-muted/30",
    )}
  >
    {children}
  </div>
);

/**
 * A backend tool's trace: the call signature and a one-line summary, with the
 * full JSON result tucked inside a collapsible.
 */
const ToolTraceCard = ({
  icon,
  signature,
  description,
  result,
}: {
  icon: React.ReactNode;
  signature: string;
  description: React.ReactNode;
  result: unknown;
}) => (
  <details className="group bg-muted/30 my-2 overflow-hidden rounded-lg border">
    <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-2.5 select-none">
      <ToolCardIcon>{icon}</ToolCardIcon>
      <ToolCardContent>
        <ToolCardTitle mono>{signature}</ToolCardTitle>
        <ToolCardDescription>{description}</ToolCardDescription>
      </ToolCardContent>
      <ChevronRight className="text-muted-foreground/70 mt-1.5 ml-auto size-4 shrink-0 transition-transform group-open:rotate-90" />
    </summary>
    <pre className="text-muted-foreground bg-muted/50 mx-3 mb-3 max-h-60 overflow-auto rounded-md p-2 text-[11px] leading-relaxed">
      {JSON.stringify(result, null, 2)}
    </pre>
  </details>
);

/** A backend tool's pending/loading trace: the call signature with a spinner icon. */
const ToolStatusCard = ({
  icon,
  signature,
  message,
  loading = false,
}: {
  icon: React.ReactNode;
  signature: string;
  message: string;
  loading?: boolean;
}) => (
  <ToolCard>
    <ToolCardIcon loading={loading}>{icon}</ToolCardIcon>
    <ToolCardContent>
      <ToolCardTitle mono>{signature}</ToolCardTitle>
      <ToolCardDescription>{message}</ToolCardDescription>
    </ToolCardContent>
  </ToolCard>
);

/** A backend tool's error trace: the call signature with the error message. */
const ToolErrorCard = ({
  signature,
  error,
}: {
  signature: string;
  error?: string;
}) => (
  <ToolCard variant="error">
    <ToolCardIcon>
      <AlertCircle className="size-4" />
    </ToolCardIcon>
    <ToolCardContent>
      <ToolCardTitle mono>{signature}</ToolCardTitle>
      <ToolCardDescription>{error || "Unknown error"}</ToolCardDescription>
    </ToolCardContent>
  </ToolCard>
);

const ToolCardIcon = ({
  children,
  loading = false,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) => (
  <div
    className={cn(
      "bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md shadow-sm",
      loading && "animate-pulse",
    )}
  >
    {children}
  </div>
);

const ToolCardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
);

const ToolCardTitle = ({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) => (
  <span
    className={cn(
      "truncate text-sm font-medium",
      mono && "font-mono text-[13px] font-normal",
    )}
  >
    {children}
  </span>
);

const ToolCardDescription = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground truncate text-xs">{children}</span>
);

/** Renders a tool call as a readable signature, e.g. `get_weather({ location: "SF" })`. */
const formatToolCall = (
  toolName: string,
  args: Record<string, unknown> | undefined,
): string => {
  const entries = Object.entries(args ?? {});
  if (entries.length === 0) return `${toolName}()`;
  const body = entries
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
  return `${toolName}({ ${body} })`;
};
