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
const BASE_ASSISTANT_UI_URL =
  "https://71e34324f44b97fed5523a6a9857f14b.preview.bl.run";
const REACT_NATIVE_PREVIEW_URL = "https://assistant-ui-expo.vercel.app/";

const CATEGORIES: XuluxTemplateCategory[] = [
  DEMO_DOWNLOAD_CATEGORY,
  {
    id: "base",
    name: "Base Chat Templates",
    description:
      "assistant-ui Base chat templates with thread history, composer, suggestions, and AI SDK runtime.",
  },
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
    previewUrl: demo.previewUrl ?? `/demos/${demo.slug}`,
    ...(demo.previewFrame ? { previewFrame: demo.previewFrame } : {}),
    downloadUrl: `/api/xulux/demo-download?slug=${demo.slug}`,
    sourcePath: demo.sourcePath ?? demo.entry,
    docsUrl: demo.docsUrl ?? `/demos/${demo.slug}`,
    featured: demo.featured,
    tech: demo.tech ?? {
      framework: "Next.js",
      runtime: "assistant-ui + AI SDK",
      frontendPattern: "Fixed demo",
    },
    env:
      demo.target === "node-cli"
        ? []
        : [
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

function baseAssistantCards(): XuluxTemplate[] {
  return [
    {
      id: "base-assistant-ui",
      templateId: "base-assistant-ui",
      title: "Configurable Base Assistant UI",
      description:
        "The assistant-ui Base demo as a hosted configurable chat template with threads, composer, mic input, suggestions, slash commands, local/cloud persistence fallback, and no-key demo flows.",
      categoryId: "base",
      categoryName: "Base Chat Templates",
      tags: ["assistant-ui", "Base", "Chat", "AI SDK", "Customizable"],
      prompt:
        "Spin up the configurable assistant-ui Base chat app with thread history, suggestions, slash commands, model picker, mic input, and AI SDK runtime.",
      gradient: "from-teal-500/40 via-cyan-500/30 to-zinc-400/20",
      kind: "template",
      previewStatus: "live",
      previewUrl: BASE_ASSISTANT_UI_URL,
      downloadUrl: joinUrl(BASE_ASSISTANT_UI_URL, "/api/download"),
      sandboxBaseUrl: BASE_ASSISTANT_UI_URL,
      sourcePath:
        "docsAgentVersion/xuluxVersion2Agent/generated-templates/base-assistant-ui",
      docsUrl: "/demos/base",
      featured: true,
      intent: {
        goodFor: [
          "General chat assistants",
          "assistant-ui Base starters",
          "Configurable no-key demos",
        ],
        notFor: ["Docs article shells", "Support dashboard workflows"],
        exampleUserRequests: [
          "Build me a branded assistant-ui Base chat app.",
          "Customize the welcome message, suggestions, theme, and demo flows.",
          "Create a downloadable starter from the Base assistant template.",
        ],
      },
      customization: {
        safeFieldsSummary: [
          "brandTheme preset plus accent, background, surface, and text hex overrides",
          "assistant appName, welcome headline/body, composer and thread labels",
          "assistant suggestionGroups and slashCommands with controlled icon ids",
          "assistant tools and demoFlows for deterministic no-key mock behavior",
        ],
        supportedRenderers: ["generic"],
        sourceEditFiles: [
          "lib/base/defaults.ts",
          "lib/base/preview-schema.ts",
          "lib/base/template-contract.ts",
          "lib/base/runtime-config.ts",
          "lib/base/download-materializer.ts",
        ],
      },
      tech: {
        framework: "Next.js",
        runtime: "assistant-ui + AI SDK",
        frontendPattern: "Base demo shell",
      },
      env: [],
      canStart: true,
    },
  ];
}

function platformPreviewCards(): XuluxTemplate[] {
  return [
    {
      id: "expo-react-native",
      title: "Expo React Native Assistant",
      description:
        "A mobile AI chat app built with Expo and assistant-ui React Native primitives, with drawer navigation, thread management, streaming responses, and native mobile UI.",
      categoryId: DEMO_DOWNLOAD_CATEGORY.id,
      categoryName: DEMO_DOWNLOAD_CATEGORY.name,
      tags: ["assistant-ui", "React Native", "Expo", "mobile", "chat"],
      prompt:
        "Open the Expo React Native assistant demo and give me setup notes.",
      gradient: "from-sky-500/35 via-blue-400/25 to-zinc-300/20",
      kind: "example",
      previewStatus: "live",
      previewUrl: REACT_NATIVE_PREVIEW_URL,
      previewFrame: {
        kind: "phone",
        width: 320,
        aspectRatio: "9 / 19.5",
        chrome: "ios-dark",
      },
      sourcePath: "examples/with-expo",
      docsUrl: "/docs/react-native",
      featured: true,
      intent: {
        goodFor: ["Mobile chat apps", "Expo starters", "React Native UI"],
        notFor: ["Terminal assistants", "Browser-only chat skins"],
        exampleUserRequests: [
          "Build me a React Native assistant app.",
          "Show me the Expo mobile chat starter.",
          "I want an assistant-ui app for iOS and Android.",
        ],
      },
      tech: {
        framework: "Expo",
        runtime: "React Native",
        frontendPattern: "Mobile chat with drawer navigation",
      },
      env: [],
      canStart: true,
    },
  ];
}

export function getXuluxHostedTemplatesCatalog(): XuluxTemplateCatalog {
  return {
    categories: CATEGORIES,
    templates: [
      ...demoCards(),
      ...platformPreviewCards(),
      ...baseAssistantCards(),
      ...docsVersionCards(),
      ...supportVersionCards(),
    ],
  };
}
