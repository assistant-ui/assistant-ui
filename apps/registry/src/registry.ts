import type { RegistryItem } from "./schema";

const collapsibleStateCss = {
  '@custom-variant data-open (&:where([data-state="open"], [data-open]:not([data-open="false"])))':
    {},
  '@custom-variant data-closed (&:where([data-state="closed"], [data-closed]:not([data-closed="false"])))':
    {},
  "@keyframes collapsible-down": {
    from: { height: "0" },
    to: {
      height:
        "var(--radix-collapsible-content-height, var(--collapsible-panel-height, auto))",
    },
  },
  "@keyframes collapsible-up": {
    from: {
      height:
        "var(--radix-collapsible-content-height, var(--collapsible-panel-height, auto))",
    },
    to: { height: "0" },
  },
};

const accordionKeyframesCss = {
  "@keyframes accordion-down": {
    from: { height: "0" },
    to: {
      height:
        "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
    },
  },
  "@keyframes accordion-up": {
    from: {
      height:
        "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
    },
    to: { height: "0" },
  },
};

const auiHairlineBorder = "color-mix(in oklab, var(--border) 60%, transparent)";

const generativeUiVocabularyCss = {
  "[data-aui]": {
    "box-sizing": "border-box",
  },

  '[data-aui="header"]': {
    margin: "0",
    "font-weight": "600",
    "line-height": "1.4",
  },
  '[data-aui="text"]': {
    "line-height": "1.5",
  },
  '[data-aui="caption"]': {
    margin: "0",
    "font-size": "0.75rem",
    "line-height": "1.5",
    color: "var(--muted-foreground)",
  },

  '[data-aui="text"][data-aui-size="sm"], [data-aui="header"][data-aui-size="sm"]':
    { "font-size": "0.75rem" },
  '[data-aui="text"][data-aui-size="md"], [data-aui="header"][data-aui-size="md"]':
    { "font-size": "0.875rem" },
  '[data-aui="text"][data-aui-size="lg"], [data-aui="header"][data-aui-size="lg"]':
    { "font-size": "1.125rem" },
  '[data-aui="text"][data-aui-size="xl"], [data-aui="header"][data-aui-size="xl"]':
    { "font-size": "1.25rem" },
  '[data-aui="text"][data-aui-size="2xl"], [data-aui="header"][data-aui-size="2xl"]':
    { "font-size": "1.5rem" },
  '[data-aui="text"][data-aui-size="3xl"], [data-aui="header"][data-aui-size="3xl"]':
    { "font-size": "1.875rem" },

  '[data-aui="text"][data-aui-weight="normal"]': { "font-weight": "400" },
  '[data-aui="text"][data-aui-weight="medium"]': { "font-weight": "500" },
  '[data-aui="text"][data-aui-weight="semibold"]': { "font-weight": "600" },
  '[data-aui="text"][data-aui-weight="bold"]': { "font-weight": "700" },

  '[data-aui="text"][data-aui-color="emphasis"]': {
    color: "var(--foreground)",
  },
  '[data-aui="text"][data-aui-color="secondary"]': {
    color: "var(--muted-foreground)",
  },
  '[data-aui="text"][data-aui-color="alpha-70"]': {
    color: "color-mix(in oklab, var(--foreground) 70%, transparent)",
  },
  '[data-aui="text"][data-aui-color="white"]': { color: "white" },
  '[data-aui="text"][data-aui-color="white-70"]': {
    color: "color-mix(in oklab, white 70%, transparent)",
  },
  '[data-aui="text"][data-aui-color="white-50"]': {
    color: "color-mix(in oklab, white 50%, transparent)",
  },

  '[data-aui="fact"]': { margin: "0" },
  '[data-aui="fact-label"]': {
    margin: "0",
    "font-size": "0.75rem",
    color: "var(--muted-foreground)",
  },
  '[data-aui="fact-value"]': {
    margin: "0",
    "font-size": "0.875rem",
  },

  '[data-aui="button"], [data-aui="card-confirm"], [data-aui="card-cancel"]': {
    display: "inline-flex",
    "align-items": "center",
    "justify-content": "center",
    gap: "0.375rem",
    height: "2.25rem",
    padding: "0 1rem",
    "border-radius": "calc(var(--radius) - 2px)",
    "font-size": "0.875rem",
    "font-weight": "500",
    border: "1px solid transparent",
    cursor: "pointer",
    "background-color": "var(--secondary)",
    color: "var(--secondary-foreground)",
    transition: "background-color 0.15s ease",
  },
  '[data-aui="button"]:focus-visible, [data-aui="card-confirm"]:focus-visible, [data-aui="card-cancel"]:focus-visible':
    {
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
    },
  '[data-aui="button"][data-aui-style="primary"], [data-aui="card-confirm"]': {
    "background-color": "var(--primary)",
    color: "var(--primary-foreground)",
  },
  '[data-aui="button"][data-aui-style="primary"]:hover, [data-aui="card-confirm"]:hover':
    {
      "background-color":
        "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  '[data-aui="button"][data-aui-style="secondary"]': {
    "background-color": "var(--secondary)",
    color: "var(--secondary-foreground)",
  },
  '[data-aui="button"][data-aui-style="secondary"]:hover': {
    "background-color":
      "color-mix(in oklab, var(--secondary) 90%, transparent)",
  },
  '[data-aui="button"][data-aui-style="outline"]': {
    "background-color": "transparent",
    color: "var(--foreground)",
    "border-color": auiHairlineBorder,
  },
  '[data-aui="button"][data-aui-style="outline"]:hover': {
    "background-color": "var(--accent)",
    color: "var(--accent-foreground)",
  },
  '[data-aui="button"][data-aui-style="ghost"], [data-aui="card-cancel"]': {
    "background-color": "transparent",
    color: "var(--foreground)",
  },
  '[data-aui="button"][data-aui-style="ghost"]:hover, [data-aui="card-cancel"]:hover':
    {
      "background-color": "var(--accent)",
      color: "var(--accent-foreground)",
    },
  '[data-aui="button"][data-aui-style="danger"]': {
    "background-color": "var(--destructive)",
    color: "var(--primary-foreground)",
  },
  '[data-aui="button"][data-aui-style="danger"]:hover': {
    "background-color":
      "color-mix(in oklab, var(--destructive) 90%, transparent)",
  },
  '[data-aui="button"][data-aui-block]': { width: "100%" },

  '[data-aui="select"], [data-aui="input"], [data-aui="datepicker"]': {
    display: "block",
    width: "100%",
    height: "2.25rem",
    padding: "0 0.75rem",
    "border-radius": "calc(var(--radius) - 2px)",
    border: "1px solid var(--input)",
    "background-color": "transparent",
    "font-size": "0.875rem",
    color: "var(--foreground)",
  },
  '[data-aui="input"][data-aui-multiline]': {
    height: "auto",
    "min-height": "2.25rem",
    padding: "0.5rem 0.75rem",
    "line-height": "1.5",
    resize: "vertical",
  },
  '[data-aui="input"]::placeholder': { color: "var(--muted-foreground)" },
  '[data-aui="select"]:focus-visible, [data-aui="input"]:focus-visible, [data-aui="datepicker"]:focus-visible':
    {
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
    },

  '[data-aui="checkbox"]': {
    display: "inline-flex",
    "align-items": "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  '[data-aui="radiogroup-option"]': {
    display: "flex",
    "align-items": "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  '[data-aui="checkbox"] input, [data-aui="radiogroup-option"] input': {
    "accent-color": "var(--primary)",
    width: "1rem",
    height: "1rem",
    margin: "0",
    cursor: "pointer",
  },
  '[data-aui="checkbox"] input:focus-visible, [data-aui="radiogroup-option"] input:focus-visible':
    {
      outline: "2px solid var(--ring)",
      "outline-offset": "2px",
    },
  '[data-aui="radiogroup"]': {
    border: "none",
    margin: "0",
    padding: "0",
    display: "flex",
    "flex-direction": "column",
    gap: "0.375rem",
  },

  '[data-aui="card"]': {
    "background-color": "var(--card)",
    color: "var(--card-foreground)",
    border: `1px solid ${auiHairlineBorder}`,
    "border-radius": "var(--radius)",
    padding: "1rem",
    "box-shadow":
      "0 1px 2px color-mix(in oklab, var(--foreground) 8%, transparent)",
  },
  '[data-aui="card-title"]': {
    margin: "0 0 0.75rem 0",
    "font-size": "0.875rem",
    "font-weight": "600",
  },
  '[data-aui="card-footer"]': {
    display: "flex",
    "justify-content": "flex-end",
    gap: "0.5rem",
    "margin-top": "0.75rem",
    "padding-top": "0.75rem",
    "border-top": `1px solid ${auiHairlineBorder}`,
  },
  '[data-aui="card"][data-aui-padding="0"]': { padding: "0" },
  '[data-aui="card"][data-aui-padding="1"]': { padding: "calc(1 * 4px)" },
  '[data-aui="card"][data-aui-padding="2"]': { padding: "calc(2 * 4px)" },
  '[data-aui="card"][data-aui-padding="3"]': { padding: "calc(3 * 4px)" },
  '[data-aui="card"][data-aui-padding="4"]': { padding: "calc(4 * 4px)" },
  '[data-aui="card"][data-aui-padding="5"]': { padding: "calc(5 * 4px)" },
  '[data-aui="card"][data-aui-padding="6"]': { padding: "calc(6 * 4px)" },
  '[data-aui="card"][data-aui-padding="7"]': { padding: "calc(7 * 4px)" },
  '[data-aui="card"][data-aui-padding="8"]': { padding: "calc(8 * 4px)" },

  '[data-aui="row"]': {
    display: "flex",
    "flex-direction": "row",
    gap: "0.5rem",
  },
  '[data-aui="col"]': {
    display: "flex",
    "flex-direction": "column",
    gap: "0.5rem",
  },
  '[data-aui="form"]': {
    display: "flex",
    "flex-direction": "column",
    gap: "0.5rem",
    margin: "0",
  },
  '[data-aui="spacer"]': { flex: "1" },

  '[data-aui="row"][data-aui-align="start"], [data-aui="col"][data-aui-align="start"]':
    { "align-items": "flex-start" },
  '[data-aui="row"][data-aui-align="center"], [data-aui="col"][data-aui-align="center"]':
    { "align-items": "center" },
  '[data-aui="row"][data-aui-align="end"], [data-aui="col"][data-aui-align="end"]':
    {
      "align-items": "flex-end",
    },
  '[data-aui="row"][data-aui-justify="start"]': {
    "justify-content": "flex-start",
  },
  '[data-aui="row"][data-aui-justify="center"]': {
    "justify-content": "center",
  },
  '[data-aui="row"][data-aui-justify="end"]': { "justify-content": "flex-end" },
  '[data-aui="row"][data-aui-justify="between"]': {
    "justify-content": "space-between",
  },

  '[data-aui="row"][data-aui-gap="0"], [data-aui="col"][data-aui-gap="0"], [data-aui="form"][data-aui-gap="0"]':
    { gap: "0" },
  '[data-aui="row"][data-aui-gap="1"], [data-aui="col"][data-aui-gap="1"], [data-aui="form"][data-aui-gap="1"]':
    { gap: "calc(1 * 4px)" },
  '[data-aui="row"][data-aui-gap="2"], [data-aui="col"][data-aui-gap="2"], [data-aui="form"][data-aui-gap="2"]':
    { gap: "calc(2 * 4px)" },
  '[data-aui="row"][data-aui-gap="3"], [data-aui="col"][data-aui-gap="3"], [data-aui="form"][data-aui-gap="3"]':
    { gap: "calc(3 * 4px)" },
  '[data-aui="row"][data-aui-gap="4"], [data-aui="col"][data-aui-gap="4"], [data-aui="form"][data-aui-gap="4"]':
    { gap: "calc(4 * 4px)" },
  '[data-aui="row"][data-aui-gap="5"], [data-aui="col"][data-aui-gap="5"], [data-aui="form"][data-aui-gap="5"]':
    { gap: "calc(5 * 4px)" },
  '[data-aui="row"][data-aui-gap="6"], [data-aui="col"][data-aui-gap="6"], [data-aui="form"][data-aui-gap="6"]':
    { gap: "calc(6 * 4px)" },
  '[data-aui="row"][data-aui-gap="7"], [data-aui="col"][data-aui-gap="7"], [data-aui="form"][data-aui-gap="7"]':
    { gap: "calc(7 * 4px)" },
  '[data-aui="row"][data-aui-gap="8"], [data-aui="col"][data-aui-gap="8"], [data-aui="form"][data-aui-gap="8"]':
    { gap: "calc(8 * 4px)" },

  '[data-aui="alert"]': {
    "border-width": "1px",
    "border-style": "solid",
    "border-radius": "var(--radius)",
    padding: "0.75rem 1rem",
  },
  '[data-aui="alert"][data-aui-tone="info"]': {
    "border-color": "color-mix(in oklab, var(--primary) 45%, transparent)",
    "background-color": "color-mix(in oklab, var(--primary) 8%, transparent)",
  },
  '[data-aui="alert"][data-aui-tone="success"]': {
    "border-color": "color-mix(in oklab, var(--aui-success) 45%, transparent)",
    "background-color":
      "color-mix(in oklab, var(--aui-success) 8%, transparent)",
  },
  '[data-aui="alert"][data-aui-tone="warning"]': {
    "border-color": "color-mix(in oklab, var(--aui-warning) 45%, transparent)",
    "background-color":
      "color-mix(in oklab, var(--aui-warning) 8%, transparent)",
  },
  '[data-aui="alert"][data-aui-tone="danger"]': {
    "border-color": "color-mix(in oklab, var(--destructive) 45%, transparent)",
    "background-color":
      "color-mix(in oklab, var(--destructive) 8%, transparent)",
  },
  '[data-aui="alert-title"]': { margin: "0 0 0.25rem 0", "font-weight": "500" },
  '[data-aui="alert-desc"]': {
    margin: "0",
    color: "var(--muted-foreground)",
    "font-size": "0.8125rem",
  },

  '[data-aui="table"]': { width: "100%", "border-collapse": "collapse" },
  '[data-aui="table-col"]': {
    "text-align": "left",
    "font-size": "0.75rem",
    "font-weight": "500",
    color: "var(--muted-foreground)",
    padding: "0.5rem 0.75rem",
    "border-bottom": `1px solid ${auiHairlineBorder}`,
  },
  '[data-aui="table"] td': {
    "font-size": "0.875rem",
    padding: "0.5rem 0.75rem",
    "text-align": "left",
  },
  '[data-aui="table"] tbody tr:not(:last-child) td': {
    "border-bottom": `1px solid ${auiHairlineBorder}`,
  },

  '[data-aui="chart"]': {
    display: "block",
    width: "100%",
    height: "3rem",
    color: "var(--chart-1)",
  },
  '[data-aui="chart"] polyline': { "stroke-width": "1.5" },
  '[data-aui="chart"][data-aui-color="emphasis"]': {
    color: "var(--foreground)",
  },
  '[data-aui="chart"][data-aui-color="secondary"]': {
    color: "var(--muted-foreground)",
  },

  '[data-aui="carousel"]': {
    display: "flex",
    "overflow-x": "auto",
    "scroll-snap-type": "x mandatory",
    "scroll-behavior": "smooth",
    gap: "0.75rem",
    "padding-bottom": "0.5rem",
    "scrollbar-width": "thin",
  },
  '[data-aui="carousel"]:focus-visible': {
    outline: "2px solid var(--ring)",
    "outline-offset": "2px",
  },
  '[data-aui="carousel-slide"]': {
    "scroll-snap-align": "start",
    flex: "0 0 auto",
    "min-width": "14rem",
  },
  "@media (prefers-reduced-motion: reduce)": {
    '[data-aui="carousel"]': { "scroll-behavior": "auto" },
  },

  '[data-aui="listview"]': {
    "list-style": "none",
    margin: "0",
    padding: "0",
  },
  '[data-aui="listview-item"] + [data-aui="listview-item"]': {
    "border-top": `1px solid ${auiHairlineBorder}`,
  },
  '[data-aui="listview-item-trigger"]': {
    padding: "0.625rem 0.75rem",
    "border-radius": "calc(var(--radius) - 2px)",
    cursor: "pointer",
  },
  '[data-aui="listview-item-trigger"]:hover': {
    "background-color": "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  '[data-aui="listview-item-trigger"]:focus-visible': {
    outline: "2px solid var(--ring)",
    "outline-offset": "2px",
  },

  '[data-aui="divider"]': {
    border: "none",
    "border-top": `1px solid ${auiHairlineBorder}`,
    margin: "0.75rem 0",
  },
  '[data-aui="divider"][data-aui-flush]': { margin: "0" },

  '[data-aui="image"]': {
    "max-width": "100%",
    display: "block",
    "border-radius": "calc(var(--radius) - 2px)",
  },
  '[data-aui="image"][data-aui-size="sm"]': { "max-width": "8rem" },
  '[data-aui="image"][data-aui-size="md"]': { "max-width": "16rem" },
  '[data-aui="image"][data-aui-size="lg"]': { "max-width": "24rem" },

  '[data-aui="markdown"]': { "font-size": "0.875rem", "line-height": "1.6" },
  '[data-aui="markdown"] p': { margin: "0 0 0.5rem 0" },
  '[data-aui="markdown"] p:last-child': { "margin-bottom": "0" },
  '[data-aui="markdown"] a': {
    color: "var(--primary)",
    "text-decoration": "underline",
    "text-underline-offset": "2px",
  },
  '[data-aui="markdown"] code': {
    "font-size": "0.8125em",
    "background-color": "color-mix(in oklab, var(--muted) 60%, transparent)",
    padding: "0.125rem 0.375rem",
    "border-radius": "calc(var(--radius) - 4px)",
    "font-family":
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  '[data-aui="markdown"] pre': {
    "background-color": "color-mix(in oklab, var(--muted) 60%, transparent)",
    padding: "0.75rem",
    "border-radius": "calc(var(--radius) - 2px)",
    "overflow-x": "auto",
  },
  '[data-aui="markdown"] pre code': {
    "background-color": "transparent",
    padding: "0",
  },
  '[data-aui="markdown"] ul, [data-aui="markdown"] ol': {
    "padding-left": "1.25rem",
  },
  '[data-aui="markdown"] li': { margin: "0.25rem 0" },
  '[data-aui="markdown"] h1, [data-aui="markdown"] h2, [data-aui="markdown"] h3':
    {
      margin: "0.75em 0 0.25em",
      "font-weight": "600",
    },
  '[data-aui="markdown"] h1': { "font-size": "1.125em" },
  '[data-aui="markdown"] h2': { "font-size": "1.0625em" },
  '[data-aui="markdown"] h3': { "font-size": "1em" },
  '[data-aui="markdown"] blockquote': {
    "border-left": `2px solid ${auiHairlineBorder}`,
    "padding-left": "0.75rem",
    color: "var(--muted-foreground)",
    margin: "0.5em 0",
  },

  '[data-aui="badge"]': {
    display: "inline-flex",
    "align-items": "center",
    gap: "0.25rem",
    "border-radius": "9999px",
    padding: "0.125rem 0.5rem",
    "font-size": "0.75rem",
    "font-weight": "500",
    "line-height": "1.4",
    "background-color": "var(--muted)",
    color: "var(--muted-foreground)",
  },
  '[data-aui="badge"][data-aui-variant="info"]': {
    "background-color": "color-mix(in oklab, var(--primary) 15%, transparent)",
    color: "var(--primary)",
  },
  '[data-aui="badge"][data-aui-variant="success"]': {
    "background-color":
      "color-mix(in oklab, var(--aui-success) 15%, transparent)",
    color: "var(--aui-success)",
  },
  '[data-aui="badge"][data-aui-variant="warning"]': {
    "background-color":
      "color-mix(in oklab, var(--aui-warning) 15%, transparent)",
    color: "var(--aui-warning)",
  },
  '[data-aui="badge"][data-aui-variant="danger"]': {
    "background-color":
      "color-mix(in oklab, var(--destructive) 15%, transparent)",
    color: "var(--destructive)",
  },
};

export const registry: RegistryItem[] = [
  {
    name: "shimmer-style",
    type: "registry:style",
    cssVars: {
      theme: {
        "--animate-shimmer":
          "shimmer-sweep var(--shimmer-duration, 1000ms) linear infinite both",
      },
    },
    css: {
      "@keyframes shimmer-sweep": {
        from: {
          "background-position": "150% 0",
        },
        to: {
          "background-position": "-100% 0",
        },
      },
    },
  },
  {
    name: "chat/b/ai-sdk-quick-start/json",
    type: "registry:page",
    files: [
      {
        type: "registry:page",
        path: "app/ai-sdk/assistant.tsx",
        target: "app/assistant.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/ai-sdk-backend.json",
      "https://r.assistant-ui.com/thread.json",
    ],
    dependencies: ["@assistant-ui/react-ai-sdk"],
    meta: {
      importSpecifier: "Assistant",
      moduleSpecifier: "@/app/assistant",
      nextVersion: "15.1.6",
    },
  },
  {
    name: "ai-sdk-backend",
    type: "registry:page",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
    ],
    dependencies: ["ai", "@ai-sdk/openai", "@assistant-ui/react-ai-sdk"],
  },
  {
    name: "ai-sdk-backend-resumable",
    type: "registry:page",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        sourcePath: "templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
      {
        type: "registry:page",
        path: "app/api/chat/resume/[streamId]/route.ts",
        sourcePath:
          "templates/ai-sdk-backend-resumable/app/api/chat/resume/[streamId]/route.ts",
        target: "app/api/chat/resume/[streamId]/route.ts",
      },
      {
        type: "registry:lib",
        path: "lib/resumable-context.ts",
        sourcePath:
          "templates/ai-sdk-backend-resumable/lib/resumable-context.ts",
        target: "lib/resumable-context.ts",
      },
    ],
    dependencies: [
      "ai",
      "@ai-sdk/openai",
      "@assistant-ui/react-ai-sdk",
      "assistant-stream",
      "next",
    ],
  },
  {
    name: "thread",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/thread.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "button",
      "https://r.assistant-ui.com/attachment.json",
      "https://r.assistant-ui.com/follow-up-suggestions.json",
      "https://r.assistant-ui.com/markdown-text.json",
      "https://r.assistant-ui.com/reasoning.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/tool-fallback.json",
      "https://r.assistant-ui.com/tool-group.json",
    ],
  },
  {
    name: "voice",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/voice.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/voice.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "button",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
  },
  {
    name: "markdown-text",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/markdown-text.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/markdown-text.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: [
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
    ],
  },
  {
    name: "reasoning",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/reasoning.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/reasoning.tsx",
      },
    ],
    registryDependencies: [
      "collapsible",
      "https://r.assistant-ui.com/markdown-text.json",
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
      "tw-shimmer",
    ],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "message-timing",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/message-timing.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/message-timing.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: ["tooltip"],
  },
  {
    name: "context-display",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/context-display.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/context-display.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "@assistant-ui/react-ai-sdk"],
    registryDependencies: ["tooltip"],
  },
  {
    name: "thread-list",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread-list.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/thread-list.tsx",
      },
    ],
    registryDependencies: [
      "button",
      "input",
      "skeleton",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "mcp-config",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/mcp-config.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/mcp-config.tsx",
      },
    ],
    registryDependencies: [
      "badge",
      "button",
      "dialog",
      "input",
      "label",
      "separator",
    ],
    dependencies: [
      "@assistant-ui/react-mcp",
      "@assistant-ui/store",
      "lucide-react",
    ],
  },
  {
    name: "attachment",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/attachment.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/attachment.tsx",
      },
    ],
    registryDependencies: [
      "dialog",
      "tooltip",
      "avatar",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react", "zustand"],
  },
  {
    name: "follow-up-suggestions",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/follow-up-suggestions.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/follow-up-suggestions.tsx",
      },
    ],
    registryDependencies: [],
    dependencies: ["@assistant-ui/react"],
  },
  {
    name: "tooltip-icon-button",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tooltip-icon-button.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tooltip-icon-button.tsx",
      },
    ],
    radixDependencies: ["radix-ui"],
    registryDependencies: ["tooltip", "button"],
  },
  {
    name: "syntax-highlighter",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/syntax-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/syntax-highlighter.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react-syntax-highlighter",
      "@assistant-ui/react-markdown",
      "react-syntax-highlighter",
      "@types/react-syntax-highlighter",
    ],
  },
  {
    name: "assistant-modal",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/assistant-modal.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/assistant-modal.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "https://r.assistant-ui.com/thread.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    baseRegistryDependencies: ["popover"],
  },
  {
    name: "assistant-sidebar",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/assistant-sidebar.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/assistant-sidebar.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: [
      "resizable",
      "https://r.assistant-ui.com/thread.json",
    ],
  },
  {
    name: "tool-fallback",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tool-fallback.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tool-fallback.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react", "tw-shimmer"],
    registryDependencies: ["button", "collapsible"],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "tool-group",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tool-group.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tool-group.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
      "tw-shimmer",
    ],
    registryDependencies: ["collapsible"],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "shiki-highlighter",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/shiki-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/shiki-highlighter.tsx",
      },
    ],
    dependencies: [
      "react-shiki",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
    ],
  },
  {
    name: "mermaid-diagram",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/mermaid-diagram.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/mermaid-diagram.tsx",
      },
    ],
    dependencies: [
      "beautiful-mermaid",
      "lucide-react",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
    ],
  },
  {
    name: "diff-viewer",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/diff-viewer.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/diff-viewer.tsx",
      },
    ],
    dependencies: [
      "diff",
      "parse-diff",
      "@assistant-ui/react-markdown",
      "class-variance-authority",
    ],
  },
  {
    name: "threadlist-sidebar",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/threadlist-sidebar.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/threadlist-sidebar.tsx",
      },
      {
        type: "registry:component",
        path: "components/icons/github.tsx",
        sourcePath: "../../packages/ui/src/components/icons/github.tsx",
      },
    ],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "sidebar",
      "https://r.assistant-ui.com/thread-list.json",
    ],
  },
  {
    name: "quote",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/quote.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/quote.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [],
  },
  {
    name: "sources",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/sources.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/sources.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["https://r.assistant-ui.com/badge.json"],
  },
  {
    name: "image",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/image.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/image.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: [],
  },
  {
    name: "file",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/file.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/file.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
  },
  {
    name: "model-selector",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/model-selector.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/model-selector.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: ["command", "popover"],
  },
  {
    name: "logos",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/logos.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/logos.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "select",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/select.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/select.tsx",
      },
    ],
    dependencies: ["lucide-react", "class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "direction",
    type: "registry:ui",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/direction.tsx",
        sourcePath: "../../packages/ui/src/components/ui/radix/direction.tsx",
      },
    ],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "badge",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/badge.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/badge.tsx",
      },
    ],
    dependencies: ["class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "tabs",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tabs.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/tabs.tsx",
      },
    ],
    dependencies: ["class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "accordion",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/accordion.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/accordion.tsx",
      },
    ],
    dependencies: ["lucide-react", "class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
    css: accordionKeyframesCss,
  },
  {
    name: "dot-matrix",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/dot-matrix.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/dot-matrix.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "number-roll",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/number-roll.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/number-roll.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "heat-graph",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/heat-graph.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/heat-graph.tsx",
      },
    ],
    dependencies: ["heat-graph"],
    registryDependencies: [],
  },
  {
    name: "composer-trigger-popover",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/composer-trigger-popover.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/composer-trigger-popover.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [],
  },
  {
    name: "directive-text",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/directive-text.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/directive-text.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["https://r.assistant-ui.com/badge.json"],
  },
  {
    name: "generative-ui-style",
    type: "registry:style",
    cssVars: {
      light: {
        "--aui-success": "oklch(0.6 0.15 149)",
        "--aui-warning": "oklch(0.68 0.16 70)",
      },
      dark: {
        "--aui-success": "oklch(0.72 0.17 149)",
        "--aui-warning": "oklch(0.8 0.17 75)",
      },
    },
    css: generativeUiVocabularyCss,
  },
  {
    name: "generative-ui",
    type: "registry:component",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/generative-ui.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/generative-ui.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react-generative-ui",
      "react-markdown",
      "remark-gfm",
      "zod",
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/generative-ui-style.json",
    ],
  },
];
