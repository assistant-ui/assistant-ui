"use client";

import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  useState,
} from "react";
import { Image, Linking, Platform, StyleSheet, Text, View } from "react-native";
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

const styles = StyleSheet.create({
  blocks: { gap: 12 },
  strong: { fontWeight: "bold" },
  emphasis: { fontStyle: "italic" },
  strikethrough: { textDecorationLine: "line-through" },
  monospace: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  h1: { fontSize: 32 },
  h2: { fontSize: 28 },
  h3: { fontSize: 24 },
  h4: { fontSize: 20 },
  h5: { fontSize: 18 },
  h6: { fontSize: 16 },
  link: { textDecorationLine: "underline" },
  image: { width: 200, height: 200, maxWidth: "100%" },
  blockquote: { borderLeftWidth: 2, paddingLeft: 12 },
  thematicBreak: { borderBottomWidth: StyleSheet.hairlineWidth },
  tightList: { gap: 4 },
  listItem: { flexDirection: "row", gap: 8 },
  listMarker: { minWidth: 24 },
  listContent: { flex: 1, minWidth: 0 },
  tableRow: { flexDirection: "row" },
  tableCell: {
    flex: 1,
    minWidth: 0,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  left: { textAlign: "left" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
});

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
        return <Text style={styles.emphasis}>{children}</Text>;
      case "strong":
        return <Text style={styles.strong}>{children}</Text>;
      case "strikethrough":
        return <Text style={styles.strikethrough}>{children}</Text>;
      case "codeSpan":
      case "mathInline":
        return <Text style={styles.monospace}>{node.value}</Text>;
      case "link":
        return (
          <Text
            accessibilityRole="link"
            onPress={() => {
              Linking.openURL(node.url).catch(() => undefined);
            }}
            style={styles.link}
          >
            {children}
          </Text>
        );
      case "image":
        return (
          <Image
            source={{ uri: node.url }}
            accessibilityLabel={node.alt}
            resizeMode="contain"
            style={styles.image}
          />
        );
    }
  });
};

const renderRow = (
  row: TableRowNode,
  align: TableAlign[],
  header: boolean,
  components: MarkdownComponents,
) =>
  row.children.map((cell, index) => {
    const alignment = align[index];
    return (
      <View key={index} style={styles.tableCell}>
        <Text style={[header && styles.strong, alignment && styles[alignment]]}>
          {renderInlines(cell.children, components)}
        </Text>
      </View>
    );
  });

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
  components: MarkdownComponents;
}> = ({ node, marker, components }) => {
  const [first] = node.children;
  const children = renderBlocks(node.children, components);
  return override(components, node, children, () => (
    <View style={styles.listItem}>
      <Text
        accessibilityRole={node.checked === undefined ? undefined : "checkbox"}
        accessibilityState={
          node.checked === undefined ? undefined : { checked: node.checked }
        }
        aria-checked={node.checked}
        accessibilityLabel={
          node.checked !== undefined && first?.type === "paragraph"
            ? plainText(first.children)
            : undefined
        }
        style={styles.listMarker}
      >
        {node.checked === undefined ? marker : node.checked ? "☑" : "☐"}
      </Text>
      <View style={[styles.blocks, styles.listContent]}>{children}</View>
    </View>
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
            marker={node.ordered ? `${(node.start ?? 1) + index}.` : "•"}
            components={components}
          />
        ));
        break;
      case "table":
        children = node.children.map((row, index) => (
          <View key={index} style={styles.tableRow}>
            {renderRow(row, node.align, index === 0, components)}
          </View>
        ));
        break;
    }

    return override(components, node, children, () => {
      switch (node.type) {
        case "paragraph":
          return <Text>{children}</Text>;
        case "heading":
          return (
            <Text
              accessibilityRole="header"
              style={[styles.strong, styles[`h${node.depth}`]]}
            >
              {children}
            </Text>
          );
        case "thematicBreak":
          return <View style={styles.thematicBreak} />;
        case "blockquote":
          return (
            <View style={[styles.blocks, styles.blockquote]}>{children}</View>
          );
        case "list":
          return (
            <View style={node.tight ? styles.tightList : styles.blocks}>
              {children}
            </View>
          );
        case "codeBlock":
        case "mathBlock":
          return <Text style={styles.monospace}>{node.value}</Text>;
        case "htmlBlock":
          return <Text>{node.value}</Text>;
        case "table":
          return <View>{children}</View>;
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

  const root = session.update(text, { final: final === true });
  return (
    <View style={styles.blocks}>
      {renderBlocks(root.children, stableComponents)}
    </View>
  );
};
