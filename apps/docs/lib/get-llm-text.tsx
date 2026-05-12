import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { getMDXComponents } from "@/mdx-components";
import type { source } from "@/lib/source";
import type { InferPageType } from "fumadocs-core/source";

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemark)
  .use(remarkGfm)
  .use(remarkStringify, {
    bullet: "-",
    fences: true,
    rule: "-",
  });

const OMITTED_STATIC_PROP_NAMES = new Set([
  "children",
  "className",
  "style",
  "id",
  "icon",
  "ref",
  "key",
  "tabIndex",
  "data-line-numbers",
  "src",
  "sizes",
  "width",
  "height",
  "blurWidth",
  "blurHeight",
  "codeblock",
  "loading",
  "priority",
]);

type StaticFunctionComponent = (
  props: Record<string, unknown>,
) => ReactNode | Promise<ReactNode>;

function isClientComponentRenderError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    (error.message.includes("from the server") &&
      error.message.includes("on the client")) ||
    error.message.includes("Invalid hook call") ||
    error.message.includes("Cannot read properties of null (reading 'use")
  );
}

function isEmptyNode(node: ReactNode): boolean {
  return (
    node == null ||
    typeof node === "boolean" ||
    (Array.isArray(node) && node.every(isEmptyNode))
  );
}

function getStaticEntries(props: Record<string, unknown>) {
  return Object.entries(props).filter(
    ([key, value]) =>
      !OMITTED_STATIC_PROP_NAMES.has(key) &&
      !key.startsWith("on") &&
      value != null &&
      typeof value !== "boolean" &&
      typeof value !== "function",
  );
}

async function renderDescriptionList(
  entries: Array<[string, unknown]>,
): Promise<ReactNode> {
  const renderedEntries = (
    await Promise.all(
      entries.map(async ([key, value]) => {
        const rendered = await renderStaticValue(value);
        if (isEmptyNode(rendered)) return null;

        return (
          <Fragment key={key}>
            <dt>{key}</dt>
            <dd>{rendered}</dd>
          </Fragment>
        );
      }),
    )
  ).filter((entry): entry is ReactElement => entry != null);

  return renderedEntries.length > 0 ? <dl>{renderedEntries}</dl> : null;
}

async function renderStaticValue(value: unknown): Promise<ReactNode> {
  if (value == null || typeof value === "boolean") return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  ) {
    return <span>{String(value)}</span>;
  }

  if (isValidElement(value)) {
    return resolveStaticReactNode(value);
  }

  if (Array.isArray(value)) {
    const items = await Promise.all(value.map(renderStaticValue));
    const visibleItems = items.filter((item) => !isEmptyNode(item));
    if (visibleItems.length === 0) return null;

    return (
      <ul>
        {visibleItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return renderDescriptionList(
      Object.entries(value).filter(
        ([, entryValue]) =>
          entryValue != null &&
          typeof entryValue !== "boolean" &&
          typeof entryValue !== "function",
      ),
    );
  }

  return null;
}

async function renderClientFallback(
  props: Record<string, unknown>,
  children: ReactNode,
): Promise<ReactNode> {
  const data = await renderDescriptionList(getStaticEntries(props));

  if (!isEmptyNode(children) && !isEmptyNode(data)) {
    return (
      <section>
        {data}
        {children}
      </section>
    );
  }

  if (!isEmptyNode(children)) return <>{children}</>;
  return data;
}

async function resolveStaticReactNode(node: ReactNode): Promise<ReactNode> {
  if (
    node == null ||
    typeof node === "boolean" ||
    typeof node === "string" ||
    typeof node === "number" ||
    typeof node === "bigint"
  ) {
    return node;
  }

  if (Array.isArray(node)) {
    return Promise.all(Children.toArray(node).map(resolveStaticReactNode));
  }

  if (!isValidElement(node)) {
    return null;
  }

  const element = node as ReactElement<Record<string, unknown>>;
  const { children, ...props } = element.props;

  if (element.type === Fragment) {
    const resolvedChildren = await resolveStaticReactNode(
      children as ReactNode,
    );
    return <>{resolvedChildren}</>;
  }

  if (typeof element.type === "string") {
    const resolvedChildren = await resolveStaticReactNode(
      children as ReactNode,
    );
    return cloneElement(element, props, resolvedChildren);
  }

  if (typeof element.type === "function") {
    try {
      const Component = element.type as StaticFunctionComponent;
      const rendered = Component({ ...props, children: children as ReactNode });
      return resolveStaticReactNode(await rendered);
    } catch (error) {
      const resolvedChildren = await resolveStaticReactNode(
        children as ReactNode,
      );
      const fallback = await renderClientFallback(props, resolvedChildren);
      if (!isEmptyNode(fallback)) return fallback;
      if (!isClientComponentRenderError(error)) throw error;
      return fallback;
    }
  }

  const resolvedChildren = await resolveStaticReactNode(children as ReactNode);
  return renderClientFallback(props, resolvedChildren);
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const Body = page.data.body;
  const components = getMDXComponents({});

  // TODO: Platform-scoped MDX currently renders with the server default
  // platform ("react"). If llms output should include React Native or Ink
  // variants, render once per platform or provide an explicit platform scope.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const staticBody = await resolveStaticReactNode(
    <Body components={components} />,
  );
  const html = renderToStaticMarkup(staticBody);
  const markdown = String(await processor.process(html)).trim();

  return `# ${page.data.title}
URL: ${page.url}
${page.data.description ? `\n${page.data.description}\n` : ""}
${markdown}`;
}
