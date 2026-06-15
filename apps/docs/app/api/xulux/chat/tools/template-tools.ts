import { getXuluxHostedTemplatesCatalog } from "@/lib/xulux/templates-catalog";
import type { XuluxTemplate } from "@/components/xulux/templates/types";
import { getDemoDownloadManifest } from "@/lib/xulux/demo-downloads/manifest";
import { tool, zodSchema } from "ai";
import z from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function templateId(t: XuluxTemplate): string {
  return t.templateId ?? t.id;
}

function findFirstByTemplateId(
  templates: XuluxTemplate[],
  tid: string,
): XuluxTemplate | undefined {
  return templates.find((t) => templateId(t) === tid);
}

function toAbsolute(baseUrl: string, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function withVersion(url: string, versionId: string | undefined): string {
  if (!versionId) return url;
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("v")) params.set("v", versionId);
  return `${path}?${params.toString()}`;
}

function hasConfig(config: Record<string, unknown> | undefined): boolean {
  return !!config && Object.keys(config).length > 0;
}

function isFixedDemo(entry: XuluxTemplate): boolean {
  return entry.kind === "example" && !!getDemoDownloadManifest(entry.id);
}

async function fetchTemplateContract(entry: XuluxTemplate, versionId?: string) {
  if (!entry.sandboxBaseUrl) return null;
  try {
    const url = new URL("/api/template/contract", entry.sandboxBaseUrl);
    if (versionId) url.searchParams.set("v", versionId);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Agent-facing static metadata (selection + authoring hints per template id)
// These are agent-facing descriptions, not catalog/runtime metadata.
// ---------------------------------------------------------------------------

type TemplateListMeta = {
  name: string;
  summary: string;
  assistantPlacement: string;
  features: string[];
  customizable: string[];
};

const TEMPLATE_LIST_META: Record<string, TemplateListMeta> = {
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

function fixedDemoListMeta(entry: XuluxTemplate): TemplateListMeta | undefined {
  const demo = getDemoDownloadManifest(entry.id);
  if (!demo) return undefined;

  return {
    name: demo.name,
    summary: demo.description,
    assistantPlacement: "full-page demo route",
    features: demo.features,
    customizable: [],
  };
}

const CONFIG_ROOTS_SCHEMAS: Record<string, Record<string, unknown>> = {
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

const TOOLS_META: Record<
  string,
  {
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
  }
> = {
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

const RULES: Record<string, string[]> = {
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

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export function createTemplateTools() {
  return {
    getTemplateList: tool({
      description:
        "Get all available hosted app templates and fixed demos with their features, customizable surfaces, and versions. " +
        "Call this first for any app-building request. Use the features and customizable fields to decide which template fits. " +
        "If customizable is empty, the entry is a fixed demo that should be shown as-is rather than configured. " +
        "Call getTemplateDetails on the chosen template before opening a preview.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const { templates } = getXuluxHostedTemplatesCatalog();
        const seen = new Set<string>();
        const list: Array<{
          id: string;
          name: string;
          summary: string;
          assistantPlacement: string;
          features: string[];
          customizable: string[];
          versions: Array<{ id: string; name: string; description: string }>;
        }> = [];

        for (const t of templates) {
          const tid = templateId(t);
          if (seen.has(tid)) continue;
          seen.add(tid);
          const meta = TEMPLATE_LIST_META[tid] ?? fixedDemoListMeta(t);
          if (!meta) continue;
          list.push({
            id: tid,
            name: meta.name,
            summary: meta.summary,
            assistantPlacement: meta.assistantPlacement,
            features: meta.features,
            customizable: meta.customizable,
            versions: (t.versions ?? []).map((v) => ({
              id: v.id,
              name: v.title,
              description: v.description,
            })),
          });
        }

        return { templates: list };
      },
    }),

    getTemplateDetails: tool({
      description:
        "Get the full authoring surface for a specific template. " +
        "Returns configRoots schemas (with types, defaults, and enums), rules, built-in tool input/outputShape, renderer contracts, and an exampleConfig. " +
        "Fixed demos return no configRoots; open those as-is without config. " +
        "Use this before calling openTemplatePreview to understand exactly what config to write. " +
        "If openTemplatePreview returns validationWarnings, call this again and cross-reference configRoots to correct the config.",
      inputSchema: zodSchema(
        z.object({
          templateId: z
            .string()
            .describe("The template id from getTemplateList"),
          versionId: z
            .string()
            .optional()
            .describe(
              "Optional version id. When provided, exampleConfig reflects that version's resolved defaults.",
            ),
        }),
      ),
      execute: async ({ templateId: tid, versionId }) => {
        const { templates } = getXuluxHostedTemplatesCatalog();
        const entry =
          (versionId
            ? templates.find(
                (t) => templateId(t) === tid && t.versionId === versionId,
              )
            : undefined) ?? findFirstByTemplateId(templates, tid);

        if (!entry) {
          return { error: `Template "${tid}" not found.` };
        }

        if (isFixedDemo(entry)) {
          const demo = getDemoDownloadManifest(entry.id);
          return {
            id: tid,
            name: demo?.name ?? entry.title,
            selectedVersionId: null,
            summary: demo?.description ?? entry.description,
            assistantPlacement: "full-page demo route",
            features: demo?.features ?? [],
            customizable: [],
            previewUrl: entry.previewUrl,
            downloadUrl: entry.downloadUrl,
            sourcePath: demo?.entry ?? entry.sourcePath,
            tools: {
              builtIn: [],
              customToolSupported: false,
              renderers: [],
            },
            rules: {
              required: [
                "No configRoots are returned for this entry, so it is not schema-customizable.",
                "Use openTemplatePreview without config to show this demo as-is.",
                "If the user needs domain-specific content or behavior changes, choose a configurable hosted template or produce a custom implementation brief instead.",
              ],
            },
            fixedDemoNote:
              "This is a fixed assistant-ui demo. It supports preview and download, but not template config.",
          };
        }

        const effectiveVersionId = versionId ?? entry.versionId;
        const configRootsSchema = CONFIG_ROOTS_SCHEMAS[tid];
        const toolsMeta = TOOLS_META[tid];
        const rules = RULES[tid] ?? [];

        if (!configRootsSchema || !toolsMeta) {
          return { error: `No authoring schema found for template "${tid}".` };
        }

        // Fetch exampleConfig from the live sandbox contract endpoint.
        // Falls back to null if the sandbox is unreachable — the static schema
        // above is still returned so the agent can author config.
        const contract = await fetchTemplateContract(entry, effectiveVersionId);
        const exampleConfig =
          (contract?.exampleCompleteConfig as Record<string, unknown> | null) ??
          null;

        return {
          id: tid,
          name: TEMPLATE_LIST_META[tid]?.name ?? tid,
          selectedVersionId: effectiveVersionId,
          configRoots: configRootsSchema,
          rules: { required: rules },
          tools: toolsMeta,
          exampleConfig,
          exampleConfigNote: exampleConfig
            ? `Resolved defaults for version "${effectiveVersionId}". Use as a complete working starting point.`
            : `Could not reach sandbox to resolve exampleConfig. Use configRoots schemas and defaults to author config manually.`,
        };
      },
    }),

    openTemplatePreview: tool({
      description:
        "Open a hosted template preview in the canvas. " +
        "If you are using an existing version, you can pass versionId to select a specific variant. " +
        "If you are customizing the template, you can pass config to apply customizations and generate a preview. " +
        "Do not pass config for fixed demos that have no configRoots in getTemplateDetails. " +
        "Returns previewUrl and downloadUrl on success. " +
        "Only after a successful call, include an open-in block with the exact downloadUrl from this result. " +
        "If no template fits, do not call this tool — read docs instead and use a prompt-only open-in block without downloadUrl.",
      inputSchema: zodSchema(
        z.object({
          templateId: z
            .string()
            .describe("The template id from getTemplateList"),
          versionId: z
            .string()
            .optional()
            .describe(
              "Version id to open. Uses the template default if omitted.",
            ),
          config: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
              "Customization config for the preview. Must contain only the top-level keys: hostUi, assistant, and brandTheme. " +
                "Use the schemas from getTemplateDetails.configRoots as the source of truth for each root. " +
                "Do not pass any other root keys.",
            ),
        }),
      ),
      execute: async ({ templateId: tid, versionId, config }) => {
        const { templates } = getXuluxHostedTemplatesCatalog();

        let entry: XuluxTemplate | undefined;
        if (versionId) {
          entry = templates.find(
            (t) => templateId(t) === tid && t.versionId === versionId,
          );
        }
        if (!entry) entry = findFirstByTemplateId(templates, tid);

        if (!entry) {
          return { success: false, error: `Template "${tid}" not found.` };
        }

        if (isFixedDemo(entry)) {
          if (hasConfig(config)) {
            return {
              success: false,
              error: `Template "${tid}" is a fixed demo and does not support config.`,
              retryHint:
                "Call getTemplateDetails for this template. If no configRoots are returned, call openTemplatePreview again without config or choose a configurable hosted template.",
            };
          }

          return {
            success: true,
            templateId: tid,
            versionId: null,
            previewUrl: entry.previewUrl ?? `/demos/${entry.id}`,
            downloadUrl:
              entry.downloadUrl ?? `/api/xulux/demo-download?slug=${entry.id}`,
            title: entry.title,
            summary: `Opened ${entry.title} as a fixed demo.`,
          };
        }

        const baseUrl = entry.sandboxBaseUrl;
        if (!baseUrl) {
          return {
            success: false,
            error: `Template "${tid}" has no sandbox URL configured.`,
          };
        }

        if (hasConfig(config)) {
          try {
            const sessionUrl = new URL("/api/preview/session", baseUrl);
            if (versionId) sessionUrl.searchParams.set("v", versionId);
            const res = await fetch(sessionUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(config),
            });
            if (!res.ok) {
              const details = await res.text();
              return {
                success: false,
                error: `Preview session failed: HTTP ${res.status}`,
                details,
                retryHint:
                  "Check validationWarnings for the specific fields that failed. " +
                  "Call getTemplateDetails for this template and use configRoots schemas to correct the config. " +
                  "Pass only hostUi, assistant, and brandTheme at the top level.",
              };
            }
            const data = (await res.json()) as {
              previewUrl?: string;
              downloadUrl?: string;
              validationWarnings?: unknown[];
            };
            if (!data.previewUrl) {
              return {
                success: false,
                error: "Session endpoint did not return a previewUrl.",
              };
            }
            return {
              success: true,
              templateId: tid,
              versionId: versionId ?? entry.versionId,
              previewUrl: toAbsolute(
                baseUrl,
                withVersion(data.previewUrl, versionId),
              ),
              downloadUrl: toAbsolute(
                baseUrl,
                withVersion(data.downloadUrl ?? "/api/download", versionId),
              ),
              title: entry.title,
              summary: `Opened ${entry.title} with custom configuration.`,
              validationWarnings: data.validationWarnings ?? [],
            };
          } catch (err) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }

        return {
          success: true,
          templateId: tid,
          versionId: versionId ?? entry.versionId,
          previewUrl: entry.previewUrl ?? baseUrl,
          downloadUrl: entry.downloadUrl ?? `${baseUrl}/api/download`,
          title: entry.title,
          summary: `Opened ${entry.title}.`,
        };
      },
    }),
  };
}
