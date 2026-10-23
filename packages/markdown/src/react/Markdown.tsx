"use client";

import {
  type ComponentType,
  type FC,
  Fragment,
  type ReactNode,
  memo,
  useState,
} from "react";
import type {
  BlockNode,
  InlineNode,
  ListItemNode,
  MarkdownNode,
  TableAlign,
  TableRowNode,
} from "../ast";
import { plainText } from "../plain-text";
import { createMarkdownSession } from "../session";

type RenderedNode = Exclude<
  MarkdownNode,
  { type: "root" | "tableRow" | "tableCell" }
>;

export type MarkdownComponentProps<
  Type extends RenderedNode["type"] = RenderedNode["type"],
> = {
  node: Extract<RenderedNode, { type: Type }>;
  /** The node's children, rendered; a leaf node has none. */
  children?: ReactNode;
};

/** Replaces how a node type renders; a table's component receives its rendered head and body. */
export type MarkdownComponents = {
  [Type in RenderedNode["type"]]?:
    | ComponentType<MarkdownComponentProps<Type>>
    | undefined;
};

export type MarkdownProps = {
  /** The markdown source; while it streams, each update reparses only the blocks that can still change and rerenders only those. */
  text: string;
  /** The text is complete, so nothing left open at its end renders as closed provisionally. */
  final?: boolean | undefined;
  components?: MarkdownComponents | undefined;
};

const override = (
  components: MarkdownComponents,
  node: RenderedNode,
  children: ReactNode,
  fallback: () => ReactNode,
): ReactNode => {
  const Component = components[node.type] as
    | ComponentType<MarkdownComponentProps>
    | undefined;
  return Component ? <Component node={node}>{children}</Component> : fallback();
};

const renderInlines = (
  nodes: InlineNode[],
  components: MarkdownComponents,
): ReactNode[] =>
  nodes.map((node, index) => (
    <Inline key={index} node={node} components={components} />
  ));

const Inline: FC<{ node: InlineNode; components: MarkdownComponents }> = ({
  node,
  components,
}) => {
  const children =
    "children" in node ? renderInlines(node.children, components) : undefined;
  return override(components, node, children, () => {
    switch (node.type) {
      case "text":
      case "htmlInline":
        return node.value;
      case "softBreak":
        return "\n";
      case "hardBreak":
        return <br />;
      case "emphasis":
        return <em>{children}</em>;
      case "strong":
        return <strong>{children}</strong>;
      case "strikethrough":
        return <del>{children}</del>;
      case "codeSpan":
        return <code>{node.value}</code>;
      case "mathInline":
        return (
          <code
            className={`language-math ${node.display ? "math-display" : "math-inline"}`}
          >
            {node.value}
          </code>
        );
      case "link":
        return (
          <a href={node.url} title={node.title}>
            {children}
          </a>
        );
      case "image":
        return <img src={node.url} alt={node.alt} title={node.title} />;
    }
  });
};

const cellAlign = (align: TableAlign | undefined) =>
  align ? { textAlign: align } : undefined;

const renderRow = (
  row: TableRowNode,
  align: TableAlign[],
  Cell: "th" | "td",
  components: MarkdownComponents,
) =>
  row.children.map((cell, index) => (
    <Cell key={index} style={cellAlign(align[index])}>
      {renderInlines(cell.children, components)}
    </Cell>
  ));

const renderBlocks = (
  nodes: BlockNode[],
  components: MarkdownComponents,
): ReactNode[] =>
  nodes.map((node, index) => (
    <Block key={index} node={node} components={components} />
  ));

const ListItem: FC<{
  node: ListItemNode;
  tight: boolean;
  components: MarkdownComponents;
}> = ({ node, tight, components }) => {
  const [first] = node.children;
  const checkbox = node.checked !== undefined && (
    <input
      type="checkbox"
      checked={node.checked}
      disabled
      aria-label={
        first?.type === "paragraph" ? plainText(first.children) : undefined
      }
    />
  );
  const children = node.children.map((child, index) => {
    const prefix = index === 0 && checkbox;
    if (child.type !== "paragraph" || (!tight && !prefix)) {
      return <Block key={index} node={child} components={components} />;
    }
    const inlines = (
      <>
        {prefix && <>{prefix} </>}
        {renderInlines(child.children, components)}
      </>
    );
    return (
      <Fragment key={index}>
        {override(components, child, inlines, () =>
          tight ? inlines : <p>{inlines}</p>,
        )}
      </Fragment>
    );
  });
  return override(components, node, children, () => (
    <li>
      {first?.type !== "paragraph" && checkbox}
      {children}
    </li>
  ));
};

const Block: FC<{ node: BlockNode; components: MarkdownComponents }> = memo(
  ({ node, components }) => {
    let children: ReactNode;
    switch (node.type) {
      case "paragraph":
      case "heading":
        children = renderInlines(node.children, components);
        break;
      case "blockquote":
        children = renderBlocks(node.children, components);
        break;
      case "list":
        children = node.children.map((item, index) => (
          <ListItem
            key={index}
            node={item}
            tight={node.tight}
            components={components}
          />
        ));
        break;
      case "table": {
        const [head, ...body] = node.children;
        children = (
          <>
            {head && (
              <thead>
                <tr>{renderRow(head, node.align, "th", components)}</tr>
              </thead>
            )}
            {body.length > 0 && (
              <tbody>
                {body.map((row, index) => (
                  <tr key={index}>
                    {renderRow(row, node.align, "td", components)}
                  </tr>
                ))}
              </tbody>
            )}
          </>
        );
        break;
      }
    }

    return override(components, node, children, () => {
      switch (node.type) {
        case "paragraph":
          return <p>{children}</p>;
        case "heading": {
          const Heading = `h${node.depth}` as const;
          return <Heading>{children}</Heading>;
        }
        case "thematicBreak":
          return <hr />;
        case "blockquote":
          return <blockquote>{children}</blockquote>;
        case "list":
          return node.ordered ? (
            <ol start={node.start === 1 ? undefined : node.start}>
              {children}
            </ol>
          ) : (
            <ul>{children}</ul>
          );
        case "codeBlock":
          return (
            <pre>
              <code
                className={
                  node.lang === undefined ? undefined : `language-${node.lang}`
                }
              >
                {node.value}
              </code>
            </pre>
          );
        case "mathBlock":
          return (
            <pre>
              <code className="language-math math-display">{node.value}</code>
            </pre>
          );
        case "htmlBlock":
          return <p>{node.value}</p>;
        case "table":
          return <table>{children}</table>;
      }
    });
  },
);
Block.displayName = "MarkdownBlock";

const isSameComponents = (a: MarkdownComponents, b: MarkdownComponents) => {
  const keys = Object.keys(a) as (keyof MarkdownComponents)[];
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && a[key] === b[key])
  );
};

const noComponents: MarkdownComponents = {};

/**
 * Renders markdown, keeping every block the stream has settled from
 * rendering again. Raw HTML renders as text.
 */
export const Markdown: FC<MarkdownProps> = ({
  text,
  final,
  components = noComponents,
}) => {
  const [session] = useState(createMarkdownSession);
  const [stableComponents, setStableComponents] = useState(components);
  if (
    stableComponents !== components &&
    !isSameComponents(stableComponents, components)
  ) {
    setStableComponents(components);
  }

  const root = session.update(text, { final: final === true });
  return renderBlocks(root.children, stableComponents);
};
