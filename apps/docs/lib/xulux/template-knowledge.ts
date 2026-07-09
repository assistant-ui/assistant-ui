import type { XuluxTemplate } from "@/components/xulux/templates/types";
import { getDemoDownloadManifest } from "@/lib/xulux/demo-downloads/manifest";

// ---------------------------------------------------------------------------
// Agent-facing static metadata (selection + authoring hints per template id)
// These are agent-facing descriptions, not catalog/runtime metadata.
// Shared by the Xulux chat route tools and the public MCP catalog endpoint.
// ---------------------------------------------------------------------------

export type TemplateListMeta = {
  name: string;
  summary: string;
  assistantPlacement: string;
  features: string[];
  customizable: string[];
};

export const TEMPLATE_LIST_META: Record<string, TemplateListMeta> = {
  "base-assistant-ui": {
    name: "Configurable Base Assistant UI",
    summary:
      "A hosted configurable version of the assistant-ui Base demo with the same full-page chat shell, thread list, composer, model picker, mic input, suggestions, slash commands, and no-key demo flows.",
    assistantPlacement: "full-page chat shell",
    features: [
      "assistant-ui Base demo layout with sidebar thread list and centered composer",
      "Composer actions including attachments, model picker, send, and mic input",
      "LocalStorage thread persistence with Assistant Cloud fallback when configured in source",
      "Controlled suggestion groups and slash commands",
      "Deterministic demo flows when no model key is present",
      "Hosted preview sessions and downloadable materialized starter app",
    ],
    customizable: [
      "brandTheme: preset plus accent, background, surface, and text hex overrides",
      "assistant: appName, welcome headline/body, composer placeholder, new-thread/new-chat labels",
      "assistant.suggestionGroups: controlled icon ids and prompt options with optional flowId",
      "assistant.slashCommands: controlled icon ids",
      "assistant.tools and assistant.demoFlows for no-key mock behavior",
    ],
  },
  "webpage-assistant": {
    name: "Webpage with Assistant",
    summary:
      "A full-page docs or website layout with a sidebar or modal assistant. Pages are defined in config and the assistant can search, preview, and generate code snippets grounded in those pages.",
    assistantPlacement: "sidebar (desktop) / modal (mobile)",
    features: [
      "ContentShell layout: header, left nav, article area, right assistant sidebar",
      "assistant-ui Thread in sidebar on desktop, AssistantModal on mobile",
      "Three built-in tools: searchDocs (sourceResults card), openPage (pagePreview card), generateCodeSnippet (codeSnippet card)",
      "Deterministic demo flows: scripted tool sequences run without an API key",
      "Suggested prompt chips wired to demo flows",
    ],
    customizable: [
      "hostUi: productName, docsName, defaultPageId, assistantPlacement, navGroups, pages (id/title/section/description/url/markdown/keywords/relatedPageIds)",
      "assistant: productName, docsName, assistantName, welcome (headline/body), labels (10 UI strings), demoModeNotice, suggestedPrompts, tools (id/displayName/aiDescription/realImplementationHint/rendererType), demoFlows (auth401/webhooks/codeExample steps)",
      "brandTheme: accent, surface, border, mutedText, focusRing",
    ],
  },
  "product-page-assistant": {
    name: "Product Page with Floating Assistant",
    summary:
      "A mock product dashboard with a floating modal support assistant. The dashboard is a configurable JSON component tree. The assistant runs a two-step analyze-then-handoff flow.",
    assistantPlacement: "floating modal (bottom-right)",
    features: [
      "DashboardShell layout: nav, alert banner, configurable panel tree",
      "Panel components: Overview, MetricGrid + MetricCard, TwoColumnRow, StatusList, ActivityFeed",
      "assistant-ui AssistantModal as a floating trigger button",
      "Two built-in tools: analyzeIssue (analysis card), createSupportSummary (summary card)",
      "Deterministic demo flows keyed by scenarioId (sync_failure, auth_error)",
      "File attachment support (mock) in demo flows",
    ],
    customizable: [
      "hostUi: full DashboardShell component tree (NOT deep-merged — provide complete tree)",
      "assistant: companyName, productName, assistantName, welcome (badge/title/subtitle), labels, demoModeNotice, agentPrompt (persona/instructions/responseStyle), toolCardLabels, toolCardDesign, suggestedPrompts, tools, demoFlows",
      "assistant.toolData: serviceOptions, mockAccountStatus, escalationLabels, priorityLabels, scenarioPacks",
      "brandTheme: accent, surface, border, mutedText, success, warning, destructive, focusRing",
    ],
  },
};

export function fixedDemoListMeta(
  entry: XuluxTemplate,
): TemplateListMeta | undefined {
  const demo = getDemoDownloadManifest(entry.id);
  if (!demo) {
    if (entry.id === "expo-react-native") {
      return {
        name: entry.title,
        summary: entry.description,
        assistantPlacement: "hosted Expo web preview",
        features: [
          "Expo / React Native mobile chat UI",
          "Drawer navigation and thread management",
          "Streaming assistant responses through assistant-ui runtime",
          "Native mobile UI primitives, with hosted web preview for inspection",
        ],
        customizable: [],
      };
    }
    return undefined;
  }

  return {
    name: demo.name,
    summary: demo.description,
    assistantPlacement: "full-page demo route",
    features: demo.features,
    customizable: [],
  };
}

export const CONFIG_ROOTS_SCHEMAS: Record<string, Record<string, unknown>> = {
  "base-assistant-ui": {
    brandTheme: {
      description:
        "Controls the Base chat visual theme. Use a preset first, then optional 6-digit hex overrides for key surfaces.",
      schema: {
        preset: {
          type: "string",
          enum: [
            "assistantDark",
            "assistantLight",
            "neutralDark",
            "neutralLight",
          ],
          default: "assistantDark",
          optional: true,
        },
        accent: {
          type: "string",
          optional: true,
          description: "6-digit hex color such as #14b8a6.",
        },
        background: {
          type: "string",
          optional: true,
          description: "6-digit hex color for the main background.",
        },
        surface: {
          type: "string",
          optional: true,
          description: "6-digit hex color for sidebar and composer surfaces.",
        },
        text: {
          type: "string",
          optional: true,
          description: "6-digit hex color for primary foreground text.",
        },
      },
    },
    assistant: {
      description:
        "Controls visible Base chat labels, welcome copy, suggestions, slash commands, generic tools, and deterministic no-key demo flows. Omit fields you do not want to change.",
      schema: {
        appName: {
          type: "string",
          default: "assistant-ui",
          description: "Visible app name in the sidebar.",
        },
        welcome: {
          headline: {
            type: "string",
            default: "How can I help you today?",
          },
          body: {
            type: "string",
            optional: true,
            description: "Optional supporting welcome text.",
          },
        },
        labels: {
          type: "object",
          optional: true,
          fields: {
            composerPlaceholder: {
              type: "string",
              default: "Send a message... (@ to mention, / for commands)",
            },
            newThread: { type: "string", default: "New Thread" },
            newChat: { type: "string", default: "New Chat" },
          },
        },
        suggestionGroups: {
          type: "array",
          description:
            "Suggestion buttons shown under the composer. Use only supported icon ids.",
          item: {
            id: { type: "string" },
            label: { type: "string" },
            icon: {
              type: "string",
              optional: true,
              enum: [
                "weather",
                "code",
                "write",
                "analyze",
                "brainstorm",
                "search",
                "document",
                "help",
              ],
            },
            options: {
              type: "array",
              item: {
                label: { type: "string" },
                prompt: { type: "string" },
                flowId: {
                  type: "string",
                  optional: true,
                  description:
                    "When present, should match a key in assistant.demoFlows.",
                },
              },
            },
          },
        },
        slashCommands: {
          type: "array",
          optional: true,
          description:
            "Slash-command menu entries. Use only supported icon ids.",
          item: {
            id: { type: "string" },
            description: { type: "string" },
            icon: {
              type: "string",
              optional: true,
              enum: ["FileText", "Languages", "Globe", "HelpCircle"],
            },
          },
        },
        tools: {
          type: "array",
          optional: true,
          description:
            "Generic demo tools available to no-key demo flows. Custom ids are supported and render as generic tool cards.",
          item: {
            id: { type: "string" },
            displayName: { type: "string" },
            aiDescription: { type: "string" },
            rendererType: {
              type: "string",
              enum: ["generic"],
              default: "generic",
              optional: true,
            },
          },
        },
        demoFlows: {
          type: "object",
          optional: true,
          description:
            "Keyed by flow id. A suggestion option can trigger a flow through options[].flowId. Each step can call one configured generic tool.",
          valueSchema: {
            title: { type: "string", optional: true },
            triggerPhrases: {
              type: "array",
              optional: true,
              items: "string",
            },
            steps: {
              type: "array",
              item: {
                id: { type: "string" },
                assistantText: { type: "string" },
                toolId: {
                  type: "string",
                  description: "Must match an id in assistant.tools.",
                },
                input: { type: "object" },
                output: { type: "object" },
              },
            },
            finalResponse: { type: "string" },
          },
        },
        demoModeNotice: {
          type: "string",
          optional: true,
          description:
            "Short notice shown when deterministic demo mode is used.",
        },
      },
    },
  },
  "webpage-assistant": {
    hostUi: {
      description:
        "Controls the visible page — product name, docs name, navigation, and all page content. All pages the assistant can open or reference must be defined here. Deep-merged with template defaults.",
      schema: {
        version: { type: "number", value: 1, description: "Always 1." },
        root: {
          type: {
            type: "string",
            value: "ContentShell",
            description: "Fixed — do not change.",
          },
          props: {
            productName: {
              type: "string",
              default: "OrbitKit API",
              description: "Product name shown in the top nav.",
            },
            docsName: {
              type: "string",
              default: "OrbitKit Docs",
              description: "Docs workspace label shown below product name.",
            },
            defaultPageId: {
              type: "string",
              default: "quickstart",
              description:
                "Id of the page shown on first load. Must be one of the ids in pages.",
            },
            assistantPlacement: {
              type: "string",
              enum: ["sidebar", "modal"],
              default: "sidebar",
              optional: true,
              description: "Where the assistant appears on desktop.",
            },
            navGroups: {
              type: "array",
              optional: true,
              description:
                "Groups pages under section labels in the left nav. If omitted, pages are listed flat.",
              item: {
                label: {
                  type: "string",
                  description: "Section label shown in the nav.",
                },
                pageIds: {
                  type: "array",
                  items: "string",
                  description: "Page ids in this group. Must exist in pages.",
                },
              },
            },
            pages: {
              type: "array",
              description:
                "All content pages. Must include the page with defaultPageId.",
              item: {
                id: {
                  type: "string",
                  description:
                    "Unique page id. Referenced by defaultPageId, navGroups, and demo flow steps.",
                },
                title: {
                  type: "string",
                  description: "Page title shown in nav and article header.",
                },
                section: {
                  type: "string",
                  description: "Nav section label this page belongs to.",
                },
                description: {
                  type: "string",
                  description: "Short description shown in search results.",
                },
                url: {
                  type: "string",
                  description: "Canonical URL path for the page.",
                },
                markdown: {
                  type: "string",
                  description: "Full page content in markdown.",
                },
                keywords: {
                  type: "array",
                  items: "string",
                  description: "Search keywords for this page.",
                },
                relatedPageIds: {
                  type: "array",
                  items: "string",
                  description: "Ids of related pages. Must exist in pages.",
                },
              },
            },
          },
        },
      },
    },
    assistant: {
      description:
        "Controls the thread experience — identity, welcome, labels, suggested prompts, tools, demo flows, and demo mode notice. Deep-merged with template defaults — only include fields you want to override.",
      schema: {
        productName: { type: "string", default: "OrbitKit API" },
        docsName: { type: "string", default: "OrbitKit Docs" },
        assistantName: { type: "string", default: "Docs Copilot" },
        welcome: {
          headline: { type: "string", default: "Ask about these docs" },
          body: {
            type: "string",
            default:
              "I can search the docs, preview pages, and generate implementation snippets from the current article.",
          },
        },
        labels: {
          type: "object",
          optional: true,
          description:
            "UI label overrides. All fields optional — omit any to keep the default.",
          fields: {
            currentPage: { type: "string", default: "Current page" },
            source: { type: "string", default: "Source" },
            relatedPages: { type: "string", default: "Related pages" },
            openPage: { type: "string", default: "Open in preview" },
            headerSearch: {
              type: "string",
              default: "Search docs with the assistant",
            },
            articleCtaTitle: {
              type: "string",
              default: "Need a targeted answer?",
            },
            articleCtaBody: {
              type: "string",
              default:
                "Use the assistant to search these docs with this page as context.",
            },
            articleCtaAction: { type: "string", default: "Ask in sidebar" },
            composerPlaceholder: {
              type: "string",
              default:
                "Ask about auth, webhooks, errors, or the current page...",
            },
            previewWarning: {
              type: "string",
              default:
                "Preview config could not be loaded. Showing default template.",
            },
          },
        },
        demoModeNotice: {
          type: "string",
          optional: true,
          default:
            "Demo mode is deterministic because no OPENAI_API_KEY is set. Add a key to enable live model responses.",
        },
        suggestedPrompts: {
          type: "array",
          description: "Prompt chips shown on thread open. 1–4 items.",
          item: {
            title: { type: "string" },
            description: { type: "string", optional: true },
            prompt: { type: "string" },
            flowId: {
              type: "string",
              optional: true,
              enum: ["auth401", "webhooks", "codeExample"],
            },
          },
        },
        tools: {
          type: "array",
          description:
            "Tools registered in the assistant. Built-in ids (searchDocs, openPage, generateCodeSnippet) have specialized renderers. Custom ids use generic.",
          item: {
            id: { type: "string" },
            displayName: { type: "string" },
            aiDescription: { type: "string" },
            realImplementationHint: { type: "string" },
            rendererType: {
              type: "string",
              enum: ["sourceResults", "pagePreview", "codeSnippet", "generic"],
            },
          },
        },
        demoFlows: {
          type: "object",
          description:
            "Keyed by flow id. Each flow runs in demo mode or when a matching prompt chip is clicked.",
          keys: ["auth401", "webhooks", "codeExample"],
          valueSchema: {
            title: { type: "string" },
            triggerPhrases: { type: "array", items: "string" },
            steps: {
              type: "array",
              item: {
                id: { type: "string" },
                assistantText: { type: "string" },
                toolId: {
                  type: "string",
                  description: "Must match an id in assistant.tools.",
                },
                input: {
                  type: "object",
                  description: "Must match the tool's input shape.",
                },
                output: {
                  type: "object",
                  description:
                    "Must match the tool's outputShape for the renderer to display correctly.",
                },
              },
            },
            finalResponse: { type: "string" },
          },
        },
      },
    },
    brandTheme: {
      description: "Color tokens shared across the page and thread.",
      schema: {
        accent: { type: "string", default: "#0369a1" },
        surface: { type: "string", default: "#ffffff" },
        border: { type: "string", default: "#dbe3ea" },
        mutedText: { type: "string", default: "#64748b" },
        focusRing: { type: "string", default: "#38bdf8" },
      },
    },
  },
  "product-page-assistant": {
    hostUi: {
      description:
        "Controls the visible dashboard page — shell layout, nav, and all panel content. hostUi is NOT deep-merged. Provide the complete tree whenever you include this root.",
      schema: {
        version: { type: "number", value: 1, description: "Always 1." },
        root: {
          type: {
            type: "string",
            value: "DashboardShell",
            description: "Fixed — do not change.",
          },
          props: {
            productName: { type: "string", default: "Northstar Sync" },
            companyName: { type: "string", default: "Northstar Cloud" },
            workspaceLabel: { type: "string", default: "Workspace" },
            accountName: { type: "string", default: "Acme Operations" },
            accountMeta: { type: "string", default: "Scale plan, us-west" },
            alertText: {
              type: "string",
              optional: true,
              default: "Workflow attention needed in us-west",
              description: "Omit to hide the alert banner.",
            },
            navItems: {
              type: "array",
              items: "string",
              default: ["Overview", "Workflows", "Records", "Assistant"],
            },
          },
          children: {
            type: "array",
            description:
              "Panel components inside the shell. Supported: Overview, MetricGrid+MetricCard, TwoColumnRow, StatusList, ActivityFeed.",
            supportedNodes: {
              Overview: {
                props: {
                  title: "string",
                  subtitle: "string",
                  status: "string",
                },
              },
              MetricGrid: { description: "Wrapper for MetricCard children." },
              MetricCard: {
                props: { label: "string", value: "string", trend: "string" },
              },
              TwoColumnRow: {
                description:
                  "Fixed two-column dashboard row. Place StatusList or ActivityFeed as children.",
              },
              StatusList: {
                props: {
                  title: "string",
                  items: [
                    { name: "string", state: "string", detail: "string" },
                  ],
                },
              },
              ActivityFeed: { props: { title: "string", items: ["string"] } },
            },
          },
        },
      },
    },
    assistant: {
      description:
        "Controls the floating modal thread — identity, welcome, labels, tools, demo flows, and support routing data. Deep-merged with template defaults — only include fields you want to override.",
      schema: {
        companyName: { type: "string", default: "Northstar Cloud" },
        productName: { type: "string", default: "Northstar Sync" },
        assistantName: { type: "string", default: "Northstar Support" },
        welcome: {
          badge: { type: "string", default: "Screenshots and logs supported" },
          title: { type: "string", default: "Get support for your workspace" },
          subtitle: {
            type: "string",
            default:
              "Describe the issue, attach a screenshot or log, and I will prepare a support handoff.",
          },
        },
        labels: {
          type: "object",
          optional: true,
          description:
            "Free-form string record. Any key overrides the matching default label.",
          commonKeys: {
            modalTrigger: { default: "Open support" },
            composerPlaceholder: {
              default: "Describe the issue or attach a screenshot/log...",
            },
            escalationCta: { default: "Ready for support handoff" },
            loading: { default: "Preparing support handoff..." },
            success: { default: "Handoff ready" },
          },
        },
        demoModeNotice: {
          type: "string",
          optional: true,
          default:
            "Demo note: This is a mock support demo. Add OPENAI_API_KEY to .env.local to use real AI and connect your own tools.",
        },
        agentPrompt: {
          persona: {
            type: "string",
            default: "a support troubleshooting assistant",
          },
          instructions: {
            type: "string",
            default:
              "When enough context exists, use the available tools to analyze the issue and prepare a support handoff. Ask a concise follow-up only when the issue is too vague.",
          },
          responseStyle: {
            type: "string",
            default:
              "Keep responses customer-facing, concise, and handoff-ready.",
          },
        },
        toolCardLabels: {
          type: "object",
          optional: true,
          description:
            "Display name overrides for built-in tool result cards. Keyed by tool id.",
          default: {
            analyzeIssue: "Issue analysis",
            createSupportSummary: "Support summary",
          },
        },
        toolCardDesign: {
          type: "object",
          optional: true,
          description: "Visual style options for tool result cards.",
          fields: {
            density: {
              type: "string",
              enum: ["compact", "default"],
              default: "compact",
            },
            iconSet: { type: "string", enum: ["lucide"], default: "lucide" },
            statusBadgeStyle: {
              type: "string",
              enum: ["solid", "outline"],
              default: "solid",
            },
            ticketSummaryLayout: {
              type: "string",
              enum: ["handoff", "default"],
              default: "handoff",
            },
          },
        },
        suggestedPrompts: {
          type: "array",
          description: "Prompt chips shown on modal open. 1–4 items.",
          item: {
            title: { type: "string" },
            label: { type: "string" },
            prompt: { type: "string" },
            scenarioId: {
              type: "string",
              enum: ["sync_failure", "auth_error"],
            },
          },
        },
        tools: {
          type: "array",
          description:
            "Built-in ids (analyzeIssue, createSupportSummary) have specialized renderers. Custom ids use generic.",
          item: {
            id: { type: "string" },
            displayName: { type: "string" },
            aiDescription: { type: "string" },
            realImplementationHint: { type: "string" },
            rendererType: {
              type: "string",
              enum: ["analysis", "summary", "generic"],
            },
          },
        },
        demoFlows: {
          type: "object",
          description:
            "Keyed by scenarioId. Runs in demo mode or when a matching prompt chip is clicked.",
          keys: ["sync_failure", "auth_error"],
          valueSchema: {
            finalResponse: { type: "string" },
            steps: {
              type: "array",
              item: {
                id: { type: "string" },
                toolId: {
                  type: "string",
                  description: "Must match an id in assistant.tools.",
                },
                assistantText: { type: "string" },
                input: {
                  type: "object",
                  description: "Must match the tool's input shape.",
                },
                output: {
                  type: "object",
                  description:
                    "Must match the tool's outputShape for the renderer to display correctly.",
                },
              },
            },
          },
        },
        toolData: {
          description:
            "Support routing data used by demo flows and tool handlers.",
          schema: {
            serviceOptions: {
              type: "array",
              items: "string",
              default: [
                "Primary workflow",
                "User access",
                "Data source",
                "Notifications",
                "API",
              ],
            },
            mockAccountStatus: {
              accountName: { type: "string", default: "Acme Operations" },
              plan: { type: "string", default: "Scale" },
              region: { type: "string", default: "us-west" },
              accountHealth: { type: "string", default: "Active" },
            },
            escalationLabels: {
              defaultOwner: { type: "string", default: "Tier 2 Sync Support" },
              defaultSla: {
                type: "string",
                default: "First response within 2 business hours",
              },
            },
            priorityLabels: {
              P1: { type: "string", default: "Critical" },
              P2: { type: "string", default: "High" },
              P3: { type: "string", default: "Normal" },
            },
            scenarioPacks: {
              type: "array",
              description:
                "One pack per demo scenario. Seeds mock analysis and summary outputs.",
              item: {
                id: { type: "string", enum: ["sync_failure", "auth_error"] },
                title: { type: "string" },
                triggerPhrases: { type: "array", items: "string" },
                defaultAffectedService: { type: "string" },
                mockAttachments: { type: "array", items: "string" },
                firstResponse: { type: "string" },
                analysis: {
                  category: "string",
                  likelyCause: "string",
                  severity: "low|medium|high",
                  explanation: "string",
                  nextStep: "string",
                },
                summary: {
                  ticketId: "string",
                  priority: "P1|P2|P3",
                  customerImpact: "string",
                  recommendedOwner: "string",
                  nextResponseSla: "string",
                },
              },
            },
          },
        },
      },
    },
    brandTheme: {
      description: "Color tokens shared across the dashboard and thread.",
      schema: {
        accent: { type: "string", default: "#2563eb" },
        surface: { type: "string", default: "#ffffff" },
        border: { type: "string", default: "#d8dee8" },
        mutedText: { type: "string", default: "#64748b" },
        success: { type: "string", default: "#15803d" },
        warning: { type: "string", default: "#b45309" },
        destructive: { type: "string", default: "#b91c1c" },
        focusRing: { type: "string", default: "#3b82f6" },
      },
    },
  },
};

export type TemplateToolsMeta = {
  builtIn: Array<{
    id: string;
    description: string;
    renderer: string;
    input: Record<string, unknown>;
    outputShape: Record<string, unknown>;
  }>;
  customToolSupported: boolean;
  renderers: Array<{
    type: string;
    description: string;
    requiredOutputShape: unknown;
  }>;
};

export const TOOLS_META: Record<string, TemplateToolsMeta> = {
  "base-assistant-ui": {
    builtIn: [
      {
        id: "getWeather",
        description: "Demo weather lookup tool used by the default Base flow.",
        renderer: "generic",
        input: {
          city: { type: "string", required: true },
          units: {
            type: "string",
            required: false,
            enum: ["fahrenheit", "celsius"],
          },
        },
        outputShape: {
          city: "string",
          summary: "string",
          temperature: "string",
          wind: "string",
        },
      },
      {
        id: "inspectCode",
        description: "Demo code helper tool used by the default Base flow.",
        renderer: "generic",
        input: {
          language: { type: "string", required: true },
          topic: { type: "string", required: true },
        },
        outputShape: {
          language: "string",
          notes: ["string"],
        },
      },
      {
        id: "draftContent",
        description: "Demo writing helper tool used by the default Base flow.",
        renderer: "generic",
        input: {
          format: { type: "string", required: true },
          tone: { type: "string", required: false },
        },
        outputShape: {
          outline: ["string"],
        },
      },
      {
        id: "compareItems",
        description: "Demo analysis helper tool used by the default Base flow.",
        renderer: "generic",
        input: {
          criteria: { type: "array", required: true, items: "string" },
        },
        outputShape: {
          columns: ["string"],
          rows: "number",
        },
      },
      {
        id: "brainstormIdeas",
        description:
          "Demo brainstorming helper tool used by the default Base flow.",
        renderer: "generic",
        input: {
          count: { type: "number", required: true },
          grouping: { type: "string", required: false },
        },
        outputShape: {
          themes: ["string"],
          count: "number",
        },
      },
    ],
    customToolSupported: true,
    renderers: [
      {
        type: "generic",
        description:
          "Fallback assistant-ui tool card rendering configured tool input and output as structured data.",
        requiredOutputShape: "any JSON-serializable value",
      },
    ],
  },
  "webpage-assistant": {
    builtIn: [
      {
        id: "searchDocs",
        description: "Searches configured pages and returns matching results.",
        renderer: "sourceResults",
        input: {
          query: {
            type: "string",
            required: true,
            description: "Search query string.",
          },
          limit: { type: "number", required: false, default: 3 },
        },
        outputShape: {
          query: "string",
          results: [
            {
              pageId: "string",
              title: "string",
              section: "string",
              url: "string",
              snippet: "string",
              score: "number",
            },
          ],
        },
      },
      {
        id: "openPage",
        description: "Opens a specific page by id and returns its metadata.",
        renderer: "pagePreview",
        input: {
          pageId: {
            type: "string",
            required: true,
            description: "Must match an id in hostUi.root.props.pages.",
          },
        },
        outputShape: {
          pageId: "string",
          title: "string",
          section: "string",
          url: "string",
          description: "string",
          relatedPageIds: ["string"],
        },
      },
      {
        id: "generateCodeSnippet",
        description: "Generates a code snippet grounded in docs context.",
        renderer: "codeSnippet",
        input: {
          topic: { type: "string", required: true },
          language: {
            type: "string",
            required: false,
            enum: ["curl", "typescript", "python"],
            default: "typescript",
          },
        },
        outputShape: {
          topic: "string",
          language: "string",
          code: "string",
          notes: ["string"],
          docsUrl: "string",
        },
      },
    ],
    customToolSupported: true,
    renderers: [
      {
        type: "sourceResults",
        description:
          "List of page result cards showing title, section, snippet, and open link.",
        requiredOutputShape: {
          query: "string",
          results: [
            {
              pageId: "string",
              title: "string",
              section: "string",
              url: "string",
              snippet: "string",
              score: "number",
            },
          ],
        },
      },
      {
        type: "pagePreview",
        description:
          "Single page card with title, section, description, and related page links.",
        requiredOutputShape: {
          pageId: "string",
          title: "string",
          section: "string",
          url: "string",
          description: "string",
          relatedPageIds: ["string"],
        },
      },
      {
        type: "codeSnippet",
        description:
          "Syntax-highlighted code block with topic, language badge, notes, and docs link.",
        requiredOutputShape: {
          topic: "string",
          language: "string",
          code: "string",
          notes: ["string"],
          docsUrl: "string",
        },
      },
      {
        type: "generic",
        description:
          "Fallback collapsible card rendering any tool output as JSON.",
        requiredOutputShape: "any",
      },
    ],
  },
  "product-page-assistant": {
    builtIn: [
      {
        id: "analyzeIssue",
        description:
          "Analyzes the issue and returns severity, likely cause, affected service, and next step.",
        renderer: "analysis",
        input: {
          description: { type: "string", required: true },
          service: { type: "string", required: true },
          attachments: {
            type: "array",
            required: false,
            items: { name: "string", type: "string" },
          },
          scenarioId: {
            type: "string",
            required: true,
            enum: ["sync_failure", "auth_error"],
          },
        },
        outputShape: {
          category: "string",
          confidence: "number",
          likelyCause: "string",
          affectedService: "string",
          severity: "low|medium|high",
          explanation: "string",
          nextStep: "string",
          followUpQuestions: ["string"],
          attachments: [{ name: "string", type: "string" }],
        },
      },
      {
        id: "createSupportSummary",
        description:
          "Creates a structured handoff summary card from the issue analysis.",
        renderer: "summary",
        input: {
          issue: {
            type: "object",
            required: true,
            description: "The full output of analyzeIssue.",
          },
          attachments: {
            type: "array",
            required: false,
            items: { name: "string", type: "string" },
          },
          scenarioId: {
            type: "string",
            required: true,
            enum: ["sync_failure", "auth_error"],
          },
        },
        outputShape: {
          ticketId: "string",
          priority: "P1|P2|P3",
          customerImpact: "string",
          summary: "string",
          recommendedOwner: "string",
          nextResponseSla: "string",
          attachments: ["string"],
        },
      },
    ],
    customToolSupported: true,
    renderers: [
      {
        type: "analysis",
        description:
          "Issue analysis card showing severity badge, likely cause, affected service, explanation, next step, and follow-up questions.",
        requiredOutputShape: {
          category: "string",
          confidence: "number",
          likelyCause: "string",
          affectedService: "string",
          severity: "string",
          explanation: "string",
          nextStep: "string",
          followUpQuestions: ["string"],
        },
      },
      {
        type: "summary",
        description:
          "Handoff summary card showing ticket id, priority, customer impact, recommended owner, and SLA.",
        requiredOutputShape: {
          ticketId: "string",
          priority: "string",
          customerImpact: "string",
          summary: "string",
          recommendedOwner: "string",
          nextResponseSla: "string",
        },
      },
      {
        type: "generic",
        description:
          "Fallback collapsible card rendering any tool output as JSON.",
        requiredOutputShape: "any",
      },
    ],
  },
};

export const RULES: Record<string, string[]> = {
  "base-assistant-ui": [
    "Top-level config should use only assistant and brandTheme.",
    "brandTheme color overrides must be 6-digit hex colors such as #14b8a6.",
    "assistant.suggestionGroups[].icon must be one of weather, code, write, analyze, brainstorm, search, document, or help.",
    "assistant.slashCommands[].icon must be one of FileText, Languages, Globe, or HelpCircle.",
    "assistant.suggestionGroups[].options[].flowId should match a key in assistant.demoFlows.",
    "assistant.demoFlows.*.steps[].toolId must match an id in assistant.tools.",
    "Configured tools render with the generic renderer unless source code is changed to add a specialized renderer.",
  ],
  "webpage-assistant": [
    "hostUi.root.props.defaultPageId must be one of the ids in root.props.pages.",
    "hostUi.root.props.navGroups[].pageIds must reference ids that exist in pages.",
    "assistant.suggestedPrompts[].flowId must match a key in assistant.demoFlows.",
    "assistant.demoFlows.*.steps[].toolId must match an id in assistant.tools.",
    "Each demo flow step must include assistantText, toolId, input, and output.",
  ],
  "product-page-assistant": [
    "If hostUi is provided, provide the complete tree — hostUi is not deep-merged with defaults.",
    "assistant.suggestedPrompts[].scenarioId must match a key in assistant.demoFlows and a pack id in assistant.toolData.scenarioPacks.",
    "assistant.demoFlows.*.steps[].toolId must match an id in assistant.tools.",
    "Each demo flow step must include assistantText, toolId, input, and output.",
    "demoFlows step input and output must match the tool's input shape and outputShape respectively.",
  ],
};
