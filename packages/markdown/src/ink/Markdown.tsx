import { Box, Text, type DOMElement, measureElement } from "ink";
import {
  type ComponentType,
  type FC,
  Fragment,
  type ReactNode,
  memo,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  BlockNode,
  InlineNode,
  ListItemNode,
  MarkdownNode,
  TableNode,
} from "../ast";
import { plainText } from "../plain-text";
import { createMarkdownSession } from "../session";
import { sanitizeTerminalText } from "./sanitizeTerminalText";

type RenderedNode = Exclude<
  MarkdownNode,
  { type: "root" | "tableRow" | "tableCell" }
>;

export type MarkdownComponentProps<
  Type extends RenderedNode["type"] = RenderedNode["type"],
> = {
  node: Extract<RenderedNode, { type: Type }>;
  children?: ReactNode;
};

export type MarkdownComponents = {
  [Type in RenderedNode["type"]]?:
    | ComponentType<MarkdownComponentProps<Type>>
    | undefined;
};

export type MarkdownProps = {
  text: string;
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
      case "hardBreak":
        return "\n";
      case "emphasis":
        return <Text italic>{children}</Text>;
      case "strong":
        return <Text bold>{children}</Text>;
      case "strikethrough":
        return <Text strikethrough>{children}</Text>;
      case "codeSpan":
      case "mathInline":
        return <Text color="cyan">{node.value}</Text>;
      case "link":
        return (
          <>
            <Text underline>{children}</Text>
            {node.url && plainText(node.children) !== node.url && (
              <Text dimColor>{` (${node.url})`}</Text>
            )}
          </>
        );
      case "image":
        return `[image: ${node.alt}]`;
    }
  });
};

const Table: FC<{ node: TableNode; components: MarkdownComponents }> = ({
  node,
  components,
}) => {
  const [measured, setMeasured] = useState<{
    node: TableNode;
    components: MarkdownComponents;
    widths?: number[];
  }>({ node, components });
  const current = measured.node === node && measured.components === components;
  if (!current) setMeasured({ node, components });
  const widths = current ? measured.widths : undefined;
  const cells = useRef<(DOMElement | null)[][]>([]);

  useLayoutEffect(() => {
    if (widths) return;
    const next = node.align.map((_, column) =>
      Math.max(
        0,
        ...node.children.map((_, row) => {
          const element = cells.current[row]?.[column];
          return element ? measureElement(element).width : 0;
        }),
      ),
    );
    setMeasured({ node, components, widths: next });
  }, [node, components, widths]);

  return (
    <Box flexDirection="column">
      {node.children.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {row.children.map((cell, column) => (
            <Fragment key={column}>
              {column > 0 && (
                <Box
                  flexShrink={0}
                  marginLeft={1}
                  paddingLeft={1}
                  borderStyle="single"
                  borderTop={false}
                  borderBottom={false}
                  borderRight={false}
                  borderDimColor
                />
              )}
              <Box
                ref={(element) => {
                  const row = (cells.current[rowIndex] ??= []);
                  row[column] = element;
                }}
                width={widths?.[column]}
                flexShrink={widths ? 1 : 0}
                justifyContent={
                  node.align[column] === "right"
                    ? "flex-end"
                    : node.align[column] === "center"
                      ? "center"
                      : "flex-start"
                }
              >
                <Text bold={rowIndex === 0}>
                  {renderInlines(cell.children, components)}
                </Text>
              </Box>
            </Fragment>
          ))}
        </Box>
      ))}
    </Box>
  );
};

const renderBlocks = (
  nodes: BlockNode[],
  components: MarkdownComponents,
): ReactNode[] =>
  nodes.map((node, index) => (
    <Block key={index} node={node} components={components} />
  ));

const ListItem: FC<{
  node: ListItemNode;
  marker: string;
  tight: boolean;
  components: MarkdownComponents;
}> = ({ node, marker, tight, components }) => {
  const children = renderBlocks(node.children, components);
  return override(components, node, children, () => (
    <Box>
      <Box flexShrink={0}>
        <Text color="cyan">
          {node.checked === undefined ? marker : node.checked ? "[x] " : "[ ] "}
        </Text>
      </Box>
      <Box flexDirection="column" rowGap={tight ? 0 : 1} flexGrow={1}>
        {children}
      </Box>
    </Box>
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
            marker={node.ordered ? `${node.start! + index}. ` : "• "}
            tight={node.tight}
            components={components}
          />
        ));
        break;
      case "table":
        children = <Table node={node} components={components} />;
        break;
    }

    return override(components, node, children, () => {
      switch (node.type) {
        case "paragraph":
          return (
            <Box flexDirection="column">
              <Text>{children}</Text>
            </Box>
          );
        case "heading":
          return (
            <Box flexDirection="column">
              <Text bold underline={node.depth === 1}>
                {children}
              </Text>
            </Box>
          );
        case "thematicBreak":
          return (
            <Box
              height={1}
              borderStyle="single"
              borderBottom={false}
              borderLeft={false}
              borderRight={false}
              borderDimColor
            />
          );
        case "blockquote":
          return (
            <Box
              flexDirection="column"
              rowGap={1}
              borderStyle="single"
              borderTop={false}
              borderBottom={false}
              borderRight={false}
              borderDimColor
              paddingLeft={1}
            >
              {children}
            </Box>
          );
        case "list":
          return (
            <Box flexDirection="column" rowGap={node.tight ? 0 : 1}>
              {children}
            </Box>
          );
        case "codeBlock":
          return (
            <Box flexDirection="column" paddingLeft={2}>
              <Text color="green">{node.value.replace(/\n$/, "")}</Text>
            </Box>
          );
        case "mathBlock":
          return (
            <Box flexDirection="column">
              <Text color="cyan">{node.value}</Text>
            </Box>
          );
        case "htmlBlock":
          return (
            <Box flexDirection="column">
              <Text>{node.value.replace(/\n$/, "")}</Text>
            </Box>
          );
        case "table":
          return <Box flexDirection="column">{children}</Box>;
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

  const root = session.update(sanitizeTerminalText(text), {
    final: final === true,
  });
  return (
    <Box flexDirection="column" rowGap={1} width="100%">
      {renderBlocks(root.children, stableComponents)}
    </Box>
  );
};
