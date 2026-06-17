import type {
  XuluxTemplate,
  XuluxTemplateCatalog,
  XuluxTemplateCategory,
} from "@/components/xulux/templates/types";
import {
  DEMO_DOWNLOAD_CATEGORY,
  DEMO_DOWNLOAD_MANIFESTS,
} from "@/lib/xulux/demo-downloads/manifest";

const DOCS_BASE_URL = "https://0d9e27d14127c0eeadfc34b424cc7ed0.preview.bl.run";
const SUPPORT_BASE_URL =
  "https://8fd186ab9f30417b876d717f734067a9.preview.bl.run";

const CATEGORIES: XuluxTemplateCategory[] = [
  DEMO_DOWNLOAD_CATEGORY,
  {
    id: "docs",
    name: "Docs and Knowledge",
    description:
      "Docs, API references, website guidance, search, and examples.",
  },
  {
    id: "support",
    name: "Support and Operations",
    description:
      "Support triage, troubleshooting, handoffs, and tool-call demos.",
  },
];

type HostedTemplateVersion = {
  id: string;
  title: string;
  description: string;
  goodFor: string[];
  previewPath: string;
  downloadPath: string;
  tags: string[];
  prompt: string;
};

const docsVersions: HostedTemplateVersion[] = [
  {
    id: "product-docs",
    title: "Product Docs Assistant",
    description:
      "Answers product documentation questions beside a SaaS docs article.",
    goodFor: ["Product guides", "Onboarding docs", "Release notes"],
    previewPath: "/preview?v=product-docs",
    downloadPath: "/api/download?v=product-docs",
    tags: ["Docs", "Product", "Guides"],
    prompt:
      "Spin up a product docs assistant for onboarding and release notes.",
  },
  {
    id: "developer-api",
    title: "Developer API Integration Assistant",
    description:
      "Helps developers debug API setup, auth, SDKs, webhooks, and errors.",
    goodFor: ["API authentication", "Webhook handlers", "SDK setup"],
    previewPath: "/preview?v=developer-api",
    downloadPath: "/api/download?v=developer-api",
    tags: ["API", "Developers", "Webhooks"],
    prompt: "Spin up an API docs assistant for debugging auth and webhooks.",
  },
  {
    id: "website-copilot",
    title: "Website Page Copilot",
    description:
      "Explains the current site page and suggests the visitor's next action.",
    goodFor: ["Marketing pages", "Pricing guidance", "Visitor help"],
    previewPath: "/preview?v=website-copilot",
    downloadPath: "/api/download?v=website-copilot",
    tags: ["Website", "Copilot", "Guidance"],
    prompt: "Spin up a website copilot that explains pages and next steps.",
  },
  {
    id: "docs-search",
    title: "Search-and-Navigate Docs Helper",
    description:
      "Prioritizes source search and page preview navigation across a docs corpus.",
    goodFor: ["Docs search", "Source previews", "Knowledge base navigation"],
    previewPath: "/preview?v=docs-search",
    downloadPath: "/api/download?v=docs-search",
    tags: ["Search", "Knowledge Base", "Navigation"],
    prompt: "Spin up a docs search assistant with source previews.",
  },
  {
    id: "code-examples",
    title: "Code Example Generator",
    description:
      "Focuses on generating implementation snippets grounded in docs context.",
    goodFor: ["curl snippets", "TypeScript examples", "Webhook examples"],
    previewPath: "/preview?v=code-examples",
    downloadPath: "/api/download?v=code-examples",
    tags: ["Code", "Snippets", "Examples"],
    prompt: "Spin up a docs-backed code example generator.",
  },
];

const supportVersions: HostedTemplateVersion[] = [
  {
    id: "integration-health",
    title: "Integration Health Assistant",
    description:
      "Triage sync delays, connector health, and access issues for integration teams.",
    goodFor: ["Connector health", "Sync delays", "Integration access"],
    previewPath: "/preview?v=integration-health",
    downloadPath: "/api/download?v=integration-health",
    tags: ["Support", "Integrations", "Sync"],
    prompt:
      "Spin up an integration health assistant for connector support teams.",
  },
  {
    id: "incident-command",
    title: "Incident Command Assistant",
    description:
      "Prepare incident triage notes for reliability and on-call teams.",
    goodFor: ["Incident triage", "On-call handoffs", "Reliability workflows"],
    previewPath: "/preview?v=incident-command",
    downloadPath: "/api/download?v=incident-command",
    tags: ["Incident", "On-call", "Reliability"],
    prompt: "Spin up an incident command assistant for on-call teams.",
  },
  {
    id: "billing-operations",
    title: "Billing Operations Assistant",
    description:
      "Triage payment, invoice, and account-access issues for revenue teams.",
    goodFor: ["Payment issues", "Invoice access", "Finance handoffs"],
    previewPath: "/preview?v=billing-operations",
    downloadPath: "/api/download?v=billing-operations",
    tags: ["Billing", "Finance", "Operations"],
    prompt: "Spin up a billing operations assistant for finance support.",
  },
];

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path}`;
}

function pickGradient(gradients: readonly string[], index: number): string {
  return gradients[index % gradients.length] ?? gradients[0]!;
}

function docsVersionCards(): XuluxTemplate[] {
  const versions = docsVersions.map((version) => ({
    id: version.id,
    title: version.title,
    description: version.description,
    previewUrl: joinUrl(DOCS_BASE_URL, version.previewPath),
    downloadUrl: joinUrl(DOCS_BASE_URL, version.downloadPath),
  }));

  return docsVersions.map((version, index) => {
    const gradients = [
      "from-sky-500/40 via-cyan-500/30 to-emerald-400/20",
      "from-blue-500/40 via-indigo-500/30 to-violet-400/20",
      "from-teal-500/40 via-cyan-500/30 to-sky-400/20",
      "from-indigo-500/40 via-purple-500/30 to-pink-400/20",
      "from-cyan-500/40 via-sky-500/30 to-blue-400/20",
    ];
    return {
      id: `webpage-assistant-${version.id}`,
      templateId: "webpage-assistant",
      versionId: version.id,
      title: version.title,
      description: version.description,
      categoryId: "docs",
      categoryName: "Docs and Knowledge",
      tags: version.tags,
      prompt: version.prompt,
      gradient: pickGradient(gradients, index),
      kind: "template",
      previewStatus: "live",
      previewUrl: joinUrl(DOCS_BASE_URL, version.previewPath),
      downloadUrl: joinUrl(DOCS_BASE_URL, version.downloadPath),
      sandboxBaseUrl: DOCS_BASE_URL,
      featured: index < 4,
      versions,
      intent: {
        goodFor: version.goodFor,
        notFor: ["Support ticket triage", "CRM workflows"],
        exampleUserRequests: [
          "Build me an API docs assistant for a billing API.",
          "Create a website copilot that explains the current page.",
          "Make a docs search assistant that can generate code snippets.",
        ],
      },
      customization: {
        safeFieldsSummary: [
          "hostUi docs shell names, default page, nav groups, and rendered pages",
          "assistant product/docs/assistant names, welcome copy, labels, and suggested prompts",
          "assistant tools with fixed ids, display metadata, implementation hints, and renderer types",
          "assistant.demoFlows steps with assistant text, tool order, tool input, mock output, and final response",
          "brandTheme shared visual tokens",
          "template-owned contract at /api/template/contract",
        ],
        supportedRenderers: [
          "sourceResults",
          "pagePreview",
          "codeSnippet",
          "generic",
        ],
        sourceEditFiles: [
          "lib/docs/host-ui.ts",
          "lib/docs/assistant-config.ts",
          "lib/docs/tool-data.ts",
          "lib/docs/version-presets.ts",
          "lib/docs/preview-schema.ts",
          "lib/docs/download-materializer.ts",
        ],
      },
      tech: {
        framework: "Next.js",
        runtime: "assistant-ui + AI SDK",
        frontendPattern: "Docs assistant",
      },
      env: [],
      canStart: true,
    };
  });
}

function supportVersionCards(): XuluxTemplate[] {
  const versions = supportVersions.map((version) => ({
    id: version.id,
    title: version.title,
    description: version.description,
    previewUrl: joinUrl(SUPPORT_BASE_URL, version.previewPath),
    downloadUrl: joinUrl(SUPPORT_BASE_URL, version.downloadPath),
  }));

  return supportVersions.map((version, index) => {
    const gradients = [
      "from-rose-500/40 via-orange-500/30 to-amber-400/20",
      "from-violet-500/40 via-fuchsia-500/25 to-sky-400/20",
      "from-teal-500/40 via-emerald-500/25 to-cyan-400/20",
    ];
    return {
      id: `product-page-assistant-${version.id}`,
      templateId: "product-page-assistant",
      versionId: version.id,
      title: version.title,
      description: version.description,
      categoryId: "support",
      categoryName: "Support and Operations",
      tags: version.tags,
      prompt: version.prompt,
      gradient: pickGradient(gradients, index),
      kind: "template",
      previewStatus: "live",
      previewUrl: joinUrl(SUPPORT_BASE_URL, version.previewPath),
      downloadUrl: joinUrl(SUPPORT_BASE_URL, version.downloadPath),
      sandboxBaseUrl: SUPPORT_BASE_URL,
      featured: true,
      versions,
      intent: {
        goodFor: version.goodFor,
        notFor: ["Docs search", "API reference helpers"],
        exampleUserRequests: [
          "Build me a support assistant that triages customer issues.",
          "Create a troubleshooting copilot with two tool calls and a handoff summary.",
          "Make an integration health assistant for support teams.",
        ],
      },
      customization: {
        safeFieldsSummary: [
          "hostUi dashboard shell names, labels, metrics, status lists, and activity content",
          "assistant company/product/assistant names, welcome copy, labels, prompts, and scenario ids",
          "assistant tools with fixed ids, display metadata, implementation hints, and card types",
          "assistant.demoFlows steps with assistant text, tool order, tool input, mock output, and final response",
          "support-specific assistant.toolData for routing, account status, labels, and scenario metadata",
          "brandTheme shared visual tokens",
          "template-owned contract at /api/template/contract",
        ],
        supportedRenderers: ["analysis", "summary", "generic"],
        sourceEditFiles: [
          "lib/support/host-ui.ts",
          "lib/support/assistant-config.ts",
          "lib/support/tool-data.ts",
          "lib/support/version-presets.ts",
          "lib/support/preview-schema.ts",
          "lib/support/download-materializer.ts",
        ],
      },
      tech: {
        framework: "Next.js",
        runtime: "assistant-ui + AI SDK",
        frontendPattern: "Support modal + dashboard",
      },
      env: [],
      canStart: true,
    };
  });
}

function demoCards(): XuluxTemplate[] {
  return Object.values(DEMO_DOWNLOAD_MANIFESTS).map((demo) => ({
    id: demo.slug,
    title: demo.name,
    description: demo.description,
    categoryId: DEMO_DOWNLOAD_CATEGORY.id,
    categoryName: DEMO_DOWNLOAD_CATEGORY.name,
    tags: demo.tags,
    prompt: `Open the ${demo.name} demo.`,
    gradient: demo.gradient,
    kind: "example",
    previewStatus: "live",
    previewUrl: `/demos/${demo.slug}`,
    downloadUrl: `/api/xulux/demo-download?slug=${demo.slug}`,
    sourcePath: demo.entry,
    docsUrl: `/demos/${demo.slug}`,
    featured: demo.featured,
    tech: {
      framework: "Next.js",
      runtime: "assistant-ui + AI SDK",
      frontendPattern: "Fixed demo",
    },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: false,
        secret: true,
        description:
          "Optional. Enables live AI responses in the downloaded starter app.",
      },
    ],
    canStart: true,
  }));
}

export function getXuluxHostedTemplatesCatalog(): XuluxTemplateCatalog {
  return {
    categories: CATEGORIES,
    templates: [
      ...demoCards(),
      ...docsVersionCards(),
      ...supportVersionCards(),
    ],
  };
}
