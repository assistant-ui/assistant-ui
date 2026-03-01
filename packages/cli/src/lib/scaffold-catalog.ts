interface ScaffoldCatalogEntry {
  label: string;
  hint: string;
  sourcePath: string;
}

export const scaffoldCatalog = {
  templates: {
    default: {
      label: "Default",
      hint: "Default template with Vercel AI SDK",
      sourcePath: "assistant-ui/assistant-ui-starter",
    },
    minimal: {
      label: "Minimal",
      hint: "Bare-bones starting point",
      sourcePath: "assistant-ui/assistant-ui-starter-minimal",
    },
    cloud: {
      label: "Cloud",
      hint: "Cloud-backed persistence starter",
      sourcePath: "assistant-ui/assistant-ui-starter-cloud",
    },
    "cloud-clerk": {
      label: "Cloud + Clerk",
      hint: "Cloud-backed starter with Clerk auth",
      sourcePath: "assistant-ui/assistant-ui-starter-cloud-clerk",
    },
    langgraph: {
      label: "LangGraph",
      hint: "LangGraph starter template",
      sourcePath: "assistant-ui/assistant-ui-starter-langgraph",
    },
    mcp: {
      label: "MCP",
      hint: "MCP starter template",
      sourcePath: "assistant-ui/assistant-ui-starter-mcp",
    },
  },
  examples: {
    "with-ag-ui": {
      label: "AG-UI",
      hint: "AG-UI protocol integration example",
      sourcePath: "examples/with-ag-ui",
    },
    "with-ai-sdk-v6": {
      label: "AI SDK v6",
      hint: "Vercel AI SDK v6 integration example",
      sourcePath: "examples/with-ai-sdk-v6",
    },
    "with-artifacts": {
      label: "Artifacts",
      hint: "Artifacts and generated output example",
      sourcePath: "examples/with-artifacts",
    },
    "with-assistant-transport": {
      label: "Assistant Transport",
      hint: "Assistant transport protocol example",
      sourcePath: "examples/with-assistant-transport",
    },
    "with-chain-of-thought": {
      label: "Chain Of Thought",
      hint: "Chain-of-thought rendering example",
      sourcePath: "examples/with-chain-of-thought",
    },
    "with-cloud": {
      label: "Cloud",
      hint: "Assistant Cloud integration example",
      sourcePath: "examples/with-cloud",
    },
    "with-custom-thread-list": {
      label: "Custom Thread List",
      hint: "Custom thread list UI example",
      sourcePath: "examples/with-custom-thread-list",
    },
    "with-elevenlabs-scribe": {
      label: "ElevenLabs Scribe",
      hint: "ElevenLabs Scribe integration example",
      sourcePath: "examples/with-elevenlabs-scribe",
    },
    "with-external-store": {
      label: "External Store",
      hint: "External store runtime example",
      sourcePath: "examples/with-external-store",
    },
    "with-ffmpeg": {
      label: "FFmpeg",
      hint: "Audio/video processing with FFmpeg example",
      sourcePath: "examples/with-ffmpeg",
    },
    "with-langgraph": {
      label: "LangGraph",
      hint: "LangGraph integration example",
      sourcePath: "examples/with-langgraph",
    },
    "with-parent-id-grouping": {
      label: "Parent ID Grouping",
      hint: "Parent-id grouping behavior example",
      sourcePath: "examples/with-parent-id-grouping",
    },
    "with-react-hook-form": {
      label: "React Hook Form",
      hint: "React Hook Form integration example",
      sourcePath: "examples/with-react-hook-form",
    },
    "with-react-router": {
      label: "React Router",
      hint: "React Router integration example",
      sourcePath: "examples/with-react-router",
    },
    "with-tanstack": {
      label: "TanStack",
      hint: "TanStack integration example",
      sourcePath: "examples/with-tanstack",
    },
  },
} as const satisfies {
  templates: Record<string, ScaffoldCatalogEntry>;
  examples: Record<string, ScaffoldCatalogEntry>;
};

export type TemplateName = keyof typeof scaffoldCatalog.templates;
export type ExampleName = keyof typeof scaffoldCatalog.examples;

export const templateNames = Object.keys(
  scaffoldCatalog.templates,
) as TemplateName[];

export const exampleNames = Object.keys(
  scaffoldCatalog.examples,
) as ExampleName[];

export const templatePickerOptions: Array<{
  value: TemplateName;
  label: string;
  hint: string;
}> = templateNames.map((name) => {
  const template = scaffoldCatalog.templates[name];
  return {
    value: name,
    label: template.label,
    hint: template.hint,
  };
});

export function isTemplateName(value: string): value is TemplateName {
  return Object.hasOwn(scaffoldCatalog.templates, value);
}

export function isExampleName(value: string): value is ExampleName {
  return Object.hasOwn(scaffoldCatalog.examples, value);
}

export function resolveTemplateSourceUrl(templateName: TemplateName): string {
  const sourcePath = scaffoldCatalog.templates[templateName].sourcePath;
  return `https://github.com/${sourcePath}`;
}

export function resolveExampleSourceSpecifier(
  exampleName: ExampleName,
): string {
  const sourcePath = scaffoldCatalog.examples[exampleName].sourcePath;
  return `assistant-ui/assistant-ui/${sourcePath}`;
}
