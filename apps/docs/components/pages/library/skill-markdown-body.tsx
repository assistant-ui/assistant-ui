import {
  isValidElement,
  type ComponentProps,
  type ElementType,
  type JSX,
  type ReactNode,
} from "react";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
  type ExtraProps,
} from "react-markdown";
import remarkGfm from "remark-gfm";

/** An element with fixed classes; `node` is react-markdown's own prop and stays off the DOM. */
const styled = <Tag extends keyof JSX.IntrinsicElements>(
  tag: Tag,
  className: string,
  rest?: ComponentProps<Tag>,
) =>
  function Styled({ node: _node, ...props }: ComponentProps<Tag> & ExtraProps) {
    const Element = tag as ElementType;
    return <Element className={className} {...rest} {...props} />;
  };

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return isValidElement<{ children?: ReactNode }>(node)
    ? textOf(node.props.children)
    : "";
};

/** The anchor GitHub gives a heading, which the files' own contents lists link to. */
const anchorOf = (children: ReactNode) =>
  textOf(children)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

type HeadingTag = "h3" | "h4" | "h5" | "h6";

const heading = (tag: HeadingTag, className: string) =>
  function Heading({
    node: _node,
    children,
    ...props
  }: ComponentProps<HeadingTag> & ExtraProps) {
    const Element = tag;
    return (
      <Element
        data-anchor={anchorOf(children)}
        className={`scroll-mt-4 ${className}`}
        {...props}
      >
        {children}
      </Element>
    );
  };

const link =
  "decoration-foreground/30 hover:decoration-foreground focus-visible:ring-ring rounded-sm underline underline-offset-4 outline-none focus-visible:ring-2";

/** A link to a heading scrolls to it inside the file; any other link opens in a new tab. */
function MarkdownLink({
  node: _node,
  href,
  ...props
}: ComponentProps<"a"> & ExtraProps) {
  if (!href?.startsWith("#")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={link}
        {...props}
      />
    );
  }
  return (
    <a
      href={href}
      className={link}
      onClick={(event) => {
        event.preventDefault();
        event.currentTarget
          .closest("[data-skill-markdown]")
          ?.querySelector(
            `[data-anchor="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`,
          )
          ?.scrollIntoView({ block: "start" });
      }}
      {...props}
    />
  );
}

const list = "mt-3 flex flex-col gap-1.5 ps-5 text-sm leading-relaxed";

const Table = styled("table", "w-full text-left text-sm");

// Headings start at h3: the page or drawer around the file owns h1 and h2.
const components: Components = {
  h1: heading("h3", "text-lg font-medium text-balance"),
  h2: heading("h4", "mt-8 text-base font-medium text-balance"),
  h3: heading("h5", "mt-6 text-sm font-medium"),
  h4: heading("h6", "mt-4 text-sm font-medium"),
  p: styled("p", "mt-3 text-sm leading-relaxed"),
  ul: styled("ul", `${list} list-disc`),
  ol: styled("ol", `${list} list-decimal`),
  a: MarkdownLink,
  code: styled(
    "code",
    "bg-foreground/[0.05] rounded-sm px-1 py-0.5 font-mono text-[0.9em] [font-variant-ligatures:none]",
  ),
  pre: styled(
    "pre",
    "rounded-document bg-foreground/[0.025] dark:bg-foreground/[0.04] focus-visible:ring-ring mt-3 overflow-x-auto p-4 text-xs leading-relaxed outline-none focus-visible:ring-2 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-xs",
    { tabIndex: 0 },
  ),
  table: (props) => (
    <div className="mt-3 overflow-x-auto">
      <Table {...props} />
    </div>
  ),
  th: styled("th", "text-muted-foreground border-b py-2 pe-4 font-normal"),
  td: styled("td", "py-2 pe-4 align-top"),
  hr: styled("hr", "mt-8"),
};

const isRelative = (url: string) => !/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(url);

/** `base` is the file's own address; its relative links are read against it. */
export default function SkillMarkdownBody({
  text,
  base,
}: {
  text: string;
  base?: string;
}) {
  return (
    <div data-skill-markdown className="min-w-0 [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) =>
          defaultUrlTransform(
            base && isRelative(url) ? new URL(url, base).href : url,
          )
        }
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
