import type { ComponentProps, ElementType, JSX } from "react";
import ReactMarkdown, {
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

const list = "mt-3 flex flex-col gap-1.5 ps-5 text-sm leading-relaxed";

const Table = styled("table", "w-full text-left text-sm");

// Headings start at h3: the page or drawer around the file owns h1 and h2.
const components: Components = {
  h1: styled("h3", "text-lg font-medium text-balance"),
  h2: styled("h4", "mt-8 text-base font-medium text-balance"),
  h3: styled("h5", "mt-6 text-sm font-medium"),
  h4: styled("h6", "mt-4 text-sm font-medium"),
  p: styled("p", "mt-3 text-sm leading-relaxed"),
  ul: styled("ul", `${list} list-disc`),
  ol: styled("ol", `${list} list-decimal`),
  a: styled(
    "a",
    "decoration-foreground/30 hover:decoration-foreground focus-visible:ring-ring rounded-sm underline underline-offset-4 outline-none focus-visible:ring-2",
    { target: "_blank", rel: "noreferrer" },
  ),
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

export default function SkillMarkdownBody({ text }: { text: string }) {
  return (
    <div className="min-w-0 [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
