import type { UISpec } from "@assistant-ui/generative-ui";
import { defaultGenerativeUILibrary } from "@assistant-ui/generative-ui/react";
import { AUI_ELEMENT_DOCS } from "@/components/pages/elements/aui-element-docs";
import {
  ELEMENTS,
  elementRegistryName,
  getElement,
} from "@/components/pages/elements/registry";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_EXAMPLES,
} from "@/lib/component-reference";
import { describeComponentProps } from "@/lib/component-props";
import { elementsDocs } from "@/lib/source";
import {
  GENERATIVE_USAGE,
  getGenerativeElement,
} from "@/lib/generative-elements";

const VOCABULARY_TITLE = "Component vocabulary";
const VOCABULARY_DESCRIPTION =
  "Intrinsic generative-ui components the model can emit through the present tool, rendered through the elements theme.";

// The page shows the model's spelling of the reserved keys.
const MODEL_SPELLING: Record<string, string> = {
  $type: "_type",
  $key: "_key",
  $action: "_action",
};

const toModelSpelling = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(toModelSpelling)
    : value !== null && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [
            MODEL_SPELLING[key] ?? key,
            toModelSpelling(entry),
          ]),
        )
      : value;

const fence = (lang: string, code: string) =>
  ["```" + lang, code, "```"].join("\n");

const cell = (text: string) => text.replaceAll("|", "\\|").replace(/\n/g, " ");

/**
 * The markdown for an elements gallery page that has no MDX page of its own:
 * the generative-ui templates and the elements documented only in the
 * registry. It carries what the HTML page shows in text: what the element is,
 * how to install it, its usage and its spec or props.
 */
export function elementGalleryMarkdown(slug: string): string | null {
  const element = getElement(slug);
  if (!element) return null;

  const lines = [`# ${element.title}`, "", element.description, ""];
  const generative = element.generative
    ? getGenerativeElement(slug)
    : undefined;

  if (generative) {
    lines.push(
      "## Installation",
      "",
      fence("bash", "npm install @assistant-ui/generative-ui zod"),
      "",
      "## Usage",
      "",
      fence("tsx", GENERATIVE_USAGE),
      "",
      "## Spec",
      "",
      `The ${generative.template.category.toLowerCase()} spec this template renders. Its components are listed in the [component vocabulary](/elements/vocabulary.md).`,
      "",
      fence("json", JSON.stringify(generative.template.tree, null, 2)),
    );
    return lines.join("\n");
  }

  lines.push(
    "## Installation",
    "",
    fence(
      "bash",
      `npx shadcn@latest add "@assistant-ui/${elementRegistryName(element)}"`,
    ),
  );
  const doc = AUI_ELEMENT_DOCS[slug];
  if (doc) {
    lines.push("", "## Usage", "", fence("tsx", doc.usage));
    for (const table of doc.props) {
      lines.push(
        "",
        doc.props.length > 1 ? `## ${table.component} props` : "## Props",
        "",
        "| Prop | Type | Description |",
        "| --- | --- | --- |",
        ...table.rows.map(
          (row) =>
            `| \`${row.name}\`${row.required ? " (required)" : ""} | \`${cell(row.type)}\` | ${cell(row.description)}${row.defaultValue ? ` Default: \`${cell(row.defaultValue)}\`.` : ""} |`,
        ),
      );
    }
  }
  return lines.join("\n");
}

/** The markdown for /elements/vocabulary: every component the model can emit. */
export function vocabularyMarkdown(): string {
  const lines = [
    `# ${VOCABULARY_TITLE}`,
    "",
    `${VOCABULARY_DESCRIPTION} Each example is the JSON the model writes.`,
  ];
  for (const category of COMPONENT_CATEGORIES) {
    lines.push("", `## ${category.label}`);
    for (const name of category.components) {
      const entry = defaultGenerativeUILibrary[name];
      if (!entry) continue;
      lines.push("", `### ${name}`, "", entry.description);
      const props = describeComponentProps(entry);
      if (props.length > 0) {
        lines.push(
          "",
          "| Prop | Type | Description |",
          "| --- | --- | --- |",
          ...props.map((row) => {
            const type =
              row.enumValues && row.enumValues.length > 0
                ? row.enumValues.map((value) => `"${value}"`).join(" | ")
                : row.type;
            return `| \`${row.name}\`${row.required ? " (required)" : ""} | \`${cell(type)}\` | ${cell(row.description ?? "")} |`;
          }),
        );
      }
      const example: UISpec | undefined = COMPONENT_EXAMPLES[name];
      if (example) {
        lines.push(
          "",
          fence("json", JSON.stringify(toModelSpelling(example), null, 2)),
        );
      }
    }
  }
  return lines.join("\n");
}

/**
 * Every page under /elements that has markdown: the MDX pages, then the
 * gallery pages built from the registry.
 */
export function elementsMarkdownPages(): {
  url: string;
  slugs: string[];
  data: { title: string; description?: string | undefined };
}[] {
  const pages = elementsDocs.getPages();
  const urls = new Set(pages.map((page) => page.url));
  return [
    ...pages,
    ...ELEMENTS.filter((element) => !urls.has(`/elements/${element.slug}`)).map(
      (element) => ({
        url: `/elements/${element.slug}`,
        slugs: [element.slug],
        data: { title: element.title, description: element.description },
      }),
    ),
    {
      url: "/elements/vocabulary",
      slugs: ["vocabulary"],
      data: { title: VOCABULARY_TITLE, description: VOCABULARY_DESCRIPTION },
    },
  ];
}
