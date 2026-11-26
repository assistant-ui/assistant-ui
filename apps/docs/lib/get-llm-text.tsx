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
import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-docs-directive";
import { LLM_COMPONENTS } from "@/lib/llm-components";
import { describeDemo } from "@/lib/demo-description";
import { DEFAULT_PLATFORM, type Platform } from "@/lib/constants";
import type {
  design,
  DocsSitePage,
  elementsDocs,
  examples,
  source,
} from "@/lib/source";
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

export type LLMRenderContext = {
  flavor: "radix" | "base";
  platform: Platform;
};

const DEFAULT_LLM_CONTEXT: LLMRenderContext = {
  flavor: "base",
  platform: DEFAULT_PLATFORM,
};

type StaticFunctionComponent = (
  props: Record<string, unknown>,
  ctx?: LLMRenderContext,
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

// Directly-imported MDX components (e.g. PreviewCode) bypass the LLM map, so they
// carry their text rendering as a `.llm` static instead.
function getLLMVariant(type: unknown): StaticFunctionComponent | undefined {
  if (
    (typeof type === "function" || typeof type === "object") &&
    type !== null
  ) {
    const llm = (type as { llm?: unknown }).llm;
    if (typeof llm === "function") return llm as StaticFunctionComponent;
  }
  return undefined;
}

function componentDisplayName(type: unknown): string {
  if (type == null) return "";
  const named = type as {
    displayName?: unknown;
    name?: unknown;
    $$id?: unknown;
  };
  if (typeof named.displayName === "string" && named.displayName)
    return named.displayName;
  if (typeof named.name === "string" && named.name) return named.name;
  // A client reference's id is `<module>#<export>`; lazy wrappers have no
  // name of their own, but their export does.
  if (typeof named.$$id === "string") {
    const exportName = named.$$id.split("#").pop();
    if (exportName && exportName !== "default" && exportName !== "*")
      return exportName;
  }
  return "";
}

const installCommand = (command: string, packages: unknown) =>
  Array.isArray(packages) && packages.length > 0 ? (
    <pre>
      <code className="language-bash">{`${command} ${packages.join(" ")}`}</code>
    </pre>
  ) : null;

// Client components that server components render directly, or that MDX
// imports itself, never pass through the MDX component map. These are keyed by
// export name; a variant returns undefined when the props are not the shape it
// knows, and the generic fallback takes over.
const CLIENT_LLM_VARIANTS: Record<
  string,
  (props: Record<string, unknown>, children: ReactNode) => ReactNode
> = {
  PackageManagerTabs: ({ packages }) => installCommand("npm install", packages),
  ExpoInstallTabs: ({ packages }) =>
    installCommand("npx expo install", packages),
  // The API reference overview's context tree: one nested list item per
  // component, with its link, props, tooltip and the contexts it provides.
  Component: (
    { name, docsLink, tooltip, props, providedContexts },
    children,
  ) => {
    if (typeof name !== "string") return undefined;
    const label = (
      <code>{typeof props === "string" ? `<${name} ${props}>` : name}</code>
    );
    const provides = (
      Array.isArray(providedContexts) ? providedContexts : []
    ).flatMap((context: { name?: unknown; link?: unknown }) =>
      typeof context.name !== "string"
        ? []
        : [
            typeof context.link === "string" ? (
              <a key={context.name} href={context.link}>
                {context.name}
              </a>
            ) : (
              context.name
            ),
          ],
    );
    return (
      <ul>
        <li>
          {typeof docsLink === "string" ? (
            <a href={docsLink}>{label}</a>
          ) : (
            label
          )}
          {typeof tooltip === "string" ? ` — ${tooltip}` : null}
          {provides.length > 0 ? (
            <>
              {". Provides: "}
              {provides.map((context, i) => (
                <Fragment key={i}>
                  {i > 0 ? ", " : null}
                  {context}
                </Fragment>
              ))}
            </>
          ) : null}
          {children}
        </li>
      </ul>
    );
  },
  ContextLevel: ({ color }, children) =>
    typeof color === "string" ? <>{children}</> : undefined,
  // fumadocs file trees: one nested list, folders ending in `/`.
  Files: (_props, children) =>
    isEmptyNode(children) ? undefined : <ul>{children}</ul>,
  Folder: ({ name }, children) =>
    typeof name === "string" ? (
      <li>
        <code>{`${name}/`}</code>
        {isEmptyNode(children) ? null : <ul>{children}</ul>}
      </li>
    ) : undefined,
  File: ({ name }) =>
    typeof name === "string" ? (
      <li>
        <code>{name}</code>
      </li>
    ) : undefined,
};

// Props a demo carries only to describe itself in agent markdown.
const DEMO_DESCRIPTION_PROPS = new Set(["description", "title", "aria-label"]);

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
      !key.endsWith("ClassName") &&
      !key.startsWith("on") &&
      value != null &&
      typeof value !== "boolean" &&
      typeof value !== "function",
  );
}

async function renderDescriptionList(
  entries: Array<[string, unknown]>,
  ctx: LLMRenderContext,
): Promise<ReactNode> {
  const renderedEntries = (
    await Promise.all(
      entries.map(async ([key, value]) => {
        const rendered = await renderStaticValue(value, ctx);
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

async function renderStaticValue(
  value: unknown,
  ctx: LLMRenderContext,
): Promise<ReactNode> {
  if (value == null || typeof value === "boolean") return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  ) {
    return <span>{String(value)}</span>;
  }

  if (isValidElement(value)) {
    return resolveStaticReactNode(value, ctx);
  }

  if (Array.isArray(value)) {
    const items = await Promise.all(
      value.map((item) => renderStaticValue(item, ctx)),
    );
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
      ctx,
    );
  }

  return null;
}

async function renderClientFallback(
  props: Record<string, unknown>,
  children: ReactNode,
  ctx: LLMRenderContext,
): Promise<ReactNode> {
  const data = await renderDescriptionList(getStaticEntries(props), ctx);

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

async function resolveStaticReactNode(
  node: ReactNode,
  ctx: LLMRenderContext,
): Promise<ReactNode> {
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
      await Promise.all(node.map((item) => resolveStaticReactNode(item, ctx))),
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
      ctx,
    );
    return <>{resolvedChildren}</>;
  }

  if (typeof element.type === "string") {
    const resolvedChildren = await resolveStaticReactNode(
      children as ReactNode,
      ctx,
    );
    return cloneElement(element, props, resolvedChildren);
  }

  if (isClientReference(element.type)) {
    const resolvedChildren = await resolveStaticReactNode(
      children as ReactNode,
      ctx,
    );
    // Turn links (e.g. next/link) into real anchors so they survive as markdown
    // links, not a dumped `href` entry.
    const href = props.href;
    if (typeof href === "string" && href) {
      return <a href={href}>{resolvedChildren}</a>;
    }
    const clientName = componentDisplayName(element.type);
    if (Object.hasOwn(CLIENT_LLM_VARIANTS, clientName)) {
      const rendered = CLIENT_LLM_VARIANTS[clientName]!(
        props,
        resolvedChildren,
      );
      if (rendered !== undefined) return rendered;
    }
    // Client highlighters take their source as a `code` prop; keep it a fenced
    // block instead of a flattened `code` entry.
    const code = props.code;
    const language = props.language ?? props.lang;
    if (typeof code === "string" && code.trim() && typeof language === "string")
      return (
        <pre>
          <code className={`language-${language}`}>{code}</code>
        </pre>
      );
    // A live demo that only describes itself becomes that one line.
    const staticEntries = getStaticEntries(props);
    if (
      isEmptyNode(resolvedChildren) &&
      staticEntries.every(([key]) => DEMO_DESCRIPTION_PROPS.has(key))
    ) {
      return <p>{describeDemo(clientName, props)}</p>;
    }
    const fallback = await renderClientFallback(props, resolvedChildren, ctx);
    if (!isEmptyNode(fallback)) return fallback;
    return <p>{describeDemo(clientName)}</p>;
  }

  if (typeof element.type === "function") {
    const Component = (getLLMVariant(element.type) ??
      element.type) as StaticFunctionComponent;
    try {
      const rendered = Component(
        { ...props, children: children as ReactNode },
        ctx,
      );
      return resolveStaticReactNode(await rendered, ctx);
    } catch (error) {
      const resolvedChildren = await resolveStaticReactNode(
        children as ReactNode,
        ctx,
      );
      const fallback = await renderClientFallback(props, resolvedChildren, ctx);
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

  const resolvedChildren = await resolveStaticReactNode(
    children as ReactNode,
    ctx,
  );
  return renderClientFallback(props, resolvedChildren, ctx);
}

type LLMPage =
  | InferPageType<typeof source>
  | InferPageType<typeof examples>
  | InferPageType<typeof design>
  | InferPageType<typeof elementsDocs>
  | DocsSitePage;

export async function getLLMText(
  page: LLMPage,
  options: Partial<LLMRenderContext> = {},
) {
  const { body: Body } = await page.data.load();
  const ctx: LLMRenderContext = { ...DEFAULT_LLM_CONTEXT, ...options };

  const staticBody = await resolveStaticReactNode(
    <Body components={LLM_COMPONENTS} />,
    ctx,
  );
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(staticBody);
  // remark-stringify escapes the leading `[` of a callout admonition marker
  // (`> [!info]` → `> \[!info]`); restore it so the GitHub syntax stays intact.
  const markdown = String(await processor.process(html))
    .replace(/^(\s*>\s*)\\\[!/gm, "$1[!")
    .trim();

  return `# ${page.data.title}
URL: ${page.url}
${page.data.description ? `\n${page.data.description}\n` : ""}
${AGENT_DOCS_DIRECTIVE_MARKDOWN}

${markdown}`;
}
