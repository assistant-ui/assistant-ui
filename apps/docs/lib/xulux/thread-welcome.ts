import type { SelectedTemplateContext } from "@/components/xulux/XuluxApp";
import { getDemoDownloadManifest } from "@/lib/xulux/demo-downloads/manifest";
import { getXuluxHostedTemplatesCatalog } from "@/lib/xulux/templates-catalog";

export type XuluxThreadWelcomeSuggestion = {
  label: string;
  prompt: string;
};

export type XuluxThreadWelcome = {
  headline: string;
  body: string;
  composerPlaceholder: string;
  suggestions: XuluxThreadWelcomeSuggestion[];
};

const DEFAULT_WELCOME: XuluxThreadWelcome = {
  headline: "What should we build?",
  body: "Describe an app idea or open a template preview to customize it with Xulux.",
  composerPlaceholder: "Ask Xulux to build or refine the UI...",
  suggestions: [
    {
      label: "ChatGPT style app",
      prompt:
        "Build me a ChatGPT-style chat app with assistant-ui — empty state, composer, and message layout.",
    },
    {
      label: "docs assistant",
      prompt:
        "Build a SaaS product docs site with a sidebar assistant for onboarding guides.",
    },
    {
      label: "website copilot",
      prompt:
        "Build a marketing website with an on-page copilot that explains each page.",
    },
  ],
};

const DEMO_WELCOME_OVERRIDES: Record<
  string,
  Pick<XuluxThreadWelcome, "suggestions" | "composerPlaceholder">
> = {
  chatgpt: {
    composerPlaceholder:
      "Ask to customize the ChatGPT-style layout, tools, or theme...",
    suggestions: [
      {
        label: "dark mode polish",
        prompt:
          "Customize this ChatGPT-style demo for dark mode — composer, message surface, and empty state.",
      },
      {
        label: "tool menu",
        prompt:
          "Update the tools menu and suggested prompts for a developer productivity assistant.",
      },
      {
        label: "download starter",
        prompt:
          "Open this ChatGPT-style demo and give me the download link with setup notes.",
      },
    ],
  },
  claude: {
    composerPlaceholder:
      "Ask to customize the Claude-style layout, typography, or actions...",
    suggestions: [
      {
        label: "warm typography",
        prompt:
          "Customize this Claude-style demo with warmer serif typography and document-like messages.",
      },
      {
        label: "file attachments",
        prompt:
          "Tune the attachment controls and welcome copy for a research assistant.",
      },
      {
        label: "download starter",
        prompt:
          "Open this Claude-style demo and give me the download link with setup notes.",
      },
    ],
  },
  grok: {
    composerPlaceholder:
      "Ask to customize the Grok-style layout, branding, or controls...",
    suggestions: [
      {
        label: "centered composer",
        prompt:
          "Customize this Grok-style demo with a centered composer and minimal dark branding.",
      },
      {
        label: "message actions",
        prompt:
          "Update message actions and suggested prompts for a concise Q&A assistant.",
      },
      {
        label: "download starter",
        prompt:
          "Open this Grok-style demo and give me the download link with setup notes.",
      },
    ],
  },
};

const DOCS_VERSION_WELCOME: Record<
  string,
  Pick<XuluxThreadWelcome, "suggestions" | "composerPlaceholder">
> = {
  "product-docs": {
    composerPlaceholder:
      "Ask to customize product name, docs pages, or welcome copy...",
    suggestions: [
      {
        label: "rebrand product",
        prompt:
          "Rebrand this product docs template for a SaaS called Acme Cloud with onboarding-focused welcome copy.",
      },
      {
        label: "add docs page",
        prompt:
          "Add a Quickstart docs page with setup steps and update the left nav.",
      },
      {
        label: "tune prompt chips",
        prompt:
          "Update the in-app suggested prompts for onboarding and release notes.",
      },
    ],
  },
  "developer-api": {
    composerPlaceholder:
      "Ask to customize API branding, docs pages, or assistant prompts...",
    suggestions: [
      {
        label: "rebrand API",
        prompt:
          'Rebrand this developer API docs template for "Nimbus API" with auth and webhook-focused welcome copy.',
      },
      {
        label: "add auth page",
        prompt:
          "Add an Authentication docs page covering API keys, OAuth, and error handling.",
      },
      {
        label: "tune prompt chips",
        prompt:
          "Update the in-app suggested prompts for 401 debugging and webhook setup.",
      },
    ],
  },
  "website-copilot": {
    composerPlaceholder:
      "Ask to customize site pages, copilot copy, or visitor guidance...",
    suggestions: [
      {
        label: "rebrand site",
        prompt:
          "Rebrand this website copilot template for a B2B analytics product with pricing and product pages.",
      },
      {
        label: "pricing guidance",
        prompt:
          "Customize the pricing page and copilot welcome copy to explain plans and next steps.",
      },
      {
        label: "tune prompt chips",
        prompt:
          "Update the in-app suggested prompts for page explanations and visitor help.",
      },
    ],
  },
  "docs-search": {
    composerPlaceholder:
      "Ask to customize search flows, docs pages, or preview navigation...",
    suggestions: [
      {
        label: "rebrand docs",
        prompt:
          "Rebrand this docs search template for an internal knowledge base called Atlas Docs.",
      },
      {
        label: "search prompts",
        prompt:
          "Update welcome copy and suggested prompts for docs search and page previews.",
      },
      {
        label: "add corpus page",
        prompt:
          "Add a docs page about webhooks and link it in the nav for search demos.",
      },
    ],
  },
  "code-examples": {
    composerPlaceholder:
      "Ask to customize snippet flows, docs pages, or example prompts...",
    suggestions: [
      {
        label: "rebrand generator",
        prompt:
          "Rebrand this code example generator for a payments API with SDK-focused welcome copy.",
      },
      {
        label: "snippet prompts",
        prompt:
          "Update suggested prompts for curl, TypeScript, and webhook handler examples.",
      },
      {
        label: "add examples page",
        prompt:
          "Add a Webhooks docs page with keywords for grounded snippet generation.",
      },
    ],
  },
};

const SUPPORT_VERSION_WELCOME: Record<
  string,
  Pick<XuluxThreadWelcome, "suggestions" | "composerPlaceholder">
> = {
  "integration-health": {
    composerPlaceholder:
      "Ask to customize the dashboard, support persona, or handoff flows...",
    suggestions: [
      {
        label: "rebrand dashboard",
        prompt:
          "Customize the integration health template for a data pipeline product called Pipestream.",
      },
      {
        label: "sync failure flow",
        prompt:
          "Tune the support welcome message and suggested prompts for connector sync failures.",
      },
      {
        label: "dashboard panels",
        prompt:
          "Update the dashboard panels to highlight connector status and recent sync delays.",
      },
    ],
  },
  "incident-command": {
    composerPlaceholder:
      "Ask to customize incident triage copy, dashboard panels, or handoffs...",
    suggestions: [
      {
        label: "on-call persona",
        prompt:
          "Customize the incident command template for a reliability team at CloudScale.",
      },
      {
        label: "triage prompts",
        prompt:
          "Update suggested prompts for incident triage and on-call handoff notes.",
      },
      {
        label: "dashboard panels",
        prompt:
          "Update dashboard panels for active incidents, severity, and recent alerts.",
      },
    ],
  },
  "billing-operations": {
    composerPlaceholder:
      "Ask to customize billing support copy, dashboard panels, or handoffs...",
    suggestions: [
      {
        label: "finance persona",
        prompt:
          "Customize the billing operations template for a subscription billing team at Ledgerly.",
      },
      {
        label: "payment prompts",
        prompt:
          "Update suggested prompts for invoice access, failed payments, and finance handoffs.",
      },
      {
        label: "dashboard panels",
        prompt:
          "Update dashboard panels for payment issues, open invoices, and account access.",
      },
    ],
  },
};

function findCatalogEntry(template: SelectedTemplateContext) {
  const { templates } = getXuluxHostedTemplatesCatalog();
  return (
    templates.find((entry) => entry.id === template.id) ??
    templates.find(
      (entry) =>
        entry.templateId === template.templateId &&
        entry.versionId === template.versionId,
    )
  );
}

function hostedWelcomeOverrides(
  template: SelectedTemplateContext,
): Pick<XuluxThreadWelcome, "suggestions" | "composerPlaceholder"> | undefined {
  const versionId = template.versionId;
  if (!versionId) return undefined;

  if (template.templateId === "webpage-assistant") {
    return DOCS_VERSION_WELCOME[versionId];
  }
  if (template.templateId === "product-page-assistant") {
    return SUPPORT_VERSION_WELCOME[versionId];
  }
  return undefined;
}

function demoWelcomeOverrides(
  template: SelectedTemplateContext,
): Pick<XuluxThreadWelcome, "suggestions" | "composerPlaceholder"> | undefined {
  const slug = template.id;
  return DEMO_WELCOME_OVERRIDES[slug];
}

function exampleRequestsSuggestions(
  template: SelectedTemplateContext,
): XuluxThreadWelcomeSuggestion[] {
  const entry = findCatalogEntry(template);
  const examples = entry?.intent?.exampleUserRequests ?? [];
  return examples.slice(0, 3).map((prompt, index) => ({
    label: `idea ${index + 1}`,
    prompt,
  }));
}

export function getXuluxThreadWelcome(
  template: SelectedTemplateContext | null | undefined,
): XuluxThreadWelcome {
  if (!template) {
    return DEFAULT_WELCOME;
  }

  const catalogEntry = findCatalogEntry(template);
  const headline = template.title;
  const body =
    template.kind === "example"
      ? (getDemoDownloadManifest(template.id)?.tagline ?? template.description)
      : `${template.description} Ask Xulux to customize branding, copy, pages, or demo flows.`;

  const overrides =
    template.kind === "example"
      ? demoWelcomeOverrides(template)
      : hostedWelcomeOverrides(template);

  const suggestions =
    overrides?.suggestions ??
    (catalogEntry?.prompt
      ? [
          {
            label: "open preview",
            prompt: `Open the ${template.title} template and show me the live preview.`,
          },
          {
            label: "customize branding",
            prompt: `Customize branding and welcome copy on the ${template.title} template.`,
          },
          ...exampleRequestsSuggestions(template),
        ].slice(0, 3)
      : exampleRequestsSuggestions(template));

  const composerPlaceholder =
    overrides?.composerPlaceholder ??
    (template.kind === "template"
      ? "Ask to customize this template — branding, pages, copy, or flows..."
      : "Ask to customize this example or get the download link...");

  return {
    headline,
    body,
    composerPlaceholder,
    suggestions:
      suggestions.length > 0 ? suggestions : DEFAULT_WELCOME.suggestions,
  };
}
