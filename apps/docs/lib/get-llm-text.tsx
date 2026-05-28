import {
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
import type { examples, source } from "@/lib/source";
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

const MDX_COMPONENTS = getMDXComponents({});

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

// Marker that React/Next.js stamp onto `"use client"` module exports. Part of
// the cross-bundler RSC contract, so stable across upgrades.
const REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");

function isClientReference(type: unknown): boolean {
  return (
    (typeof type === "object" || typeof type === "function") &&
    type !== null &&
    (type as { $$typeof?: symbol }).$$typeof === REACT_CLIENT_REFERENCE
  );
}

// Safety net for server components that throw because of transitive
// client-only API use. Stack frames are more durable than error messages.
function looksLikeStaticRenderFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const stack = error.stack ?? "";
  if (
    stack.includes("/react-dom/") ||
    stack.includes("/react-server-dom") ||
    stack.includes("/react/cjs/react.") ||
    stack.includes("react-dom.") ||
    stack.includes("react.development") ||
    stack.includes("react.production")
  ) {
    return true;
  }

  return /invalid hook call|client reference|use client/i.test(error.message);
}

function isEmptyNode(node: ReactNode): boolean {
  return (
    node == null ||
    typeof node === "boolean" ||
    (Array.isArray(node) && node.every(isEmptyNode))
  );
}

function withStableArrayKeys(nodes: ReactNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (Array.isArray(node)) return withStableArrayKeys(node);
    if (!isValidElement(node) || node.key != null) return node;
    return cloneElement(node, { key: index });
  });
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
    return withStableArrayKeys(
      await Promise.all(node.map(resolveStaticReactNode)),
    );
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

  if (isClientReference(element.type)) {
    const resolvedChildren = await resolveStaticReactNode(
      children as ReactNode,
    );
    return renderClientFallback(props, resolvedChildren);
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

      if (!looksLikeStaticRenderFailure(error)) {
        if (process.env.NODE_ENV !== "production") {
          // Tripwire for unrecognized React error shapes; update the
          // heuristic when this fires.
          console.warn(
            "[get-llm-text] unexpected static render failure, rethrowing",
            error,
          );
        }
        throw error;
      }
      return fallback;
    }
  }

  const resolvedChildren = await resolveStaticReactNode(children as ReactNode);
  return renderClientFallback(props, resolvedChildren);
}

type LLMPage = InferPageType<typeof source> | InferPageType<typeof examples>;

export async function getLLMText(page: LLMPage) {
  const Body = page.data.body;

  // TODO: Platform-scoped MDX currently renders with the server default
  // platform ("react"). If llms output should include React Native or Ink
  // variants, render once per platform or provide an explicit platform scope.
  const staticBody = await resolveStaticReactNode(
    <Body components={MDX_COMPONENTS} />,
  );
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(staticBody);
  const markdown = String(await processor.process(html)).trim();

  return `# ${page.data.title}
URL: ${page.url}
${page.data.description ? `\n${page.data.description}\n` : ""}
${markdown}`;
}
