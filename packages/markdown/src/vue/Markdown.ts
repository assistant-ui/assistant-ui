import { type Component, defineComponent, h, type VNodeChild } from "vue";
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
};

export type MarkdownComponents = {
  [Type in RenderedNode["type"]]?:
    | Component<MarkdownComponentProps<Type>>
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
  children: VNodeChild[] | undefined,
  fallback: () => VNodeChild,
): VNodeChild => {
  const component = components[node.type] as
    | Component<MarkdownComponentProps>
    | undefined;
  return component
    ? h(
        component,
        { node },
        children === undefined ? undefined : { default: () => children },
      )
    : fallback();
};

const renderInlines = (
  nodes: InlineNode[],
  components: MarkdownComponents,
): VNodeChild[] =>
  nodes.map((node, index) => h(Inline, { key: index, node, components }));

const Inline = defineComponent(
  (props: { node: InlineNode; components: MarkdownComponents }) =>
    (): VNodeChild => {
      const { node, components } = props;
      const children =
        "children" in node
          ? renderInlines(node.children, components)
          : undefined;
      return override(components, node, children, () => {
        switch (node.type) {
          case "text":
          case "htmlInline":
            return node.value;
          case "softBreak":
            return "\n";
          case "hardBreak":
            return h("br");
          case "emphasis":
            return h("em", children);
          case "strong":
            return h("strong", children);
          case "strikethrough":
            return h("del", children);
          case "codeSpan":
            return h("code", node.value);
          case "mathInline":
            return h(
              "code",
              {
                class: `language-math ${node.display ? "math-display" : "math-inline"}`,
              },
              node.value,
            );
          case "link":
            return h("a", { href: node.url, title: node.title }, children);
          case "image":
            return h("img", {
              src: node.url,
              alt: node.alt,
              title: node.title,
            });
        }
      });
    },
  { name: "MarkdownInline", props: ["node", "components"] },
);

const cellAlign = (align: TableAlign | undefined) =>
  align ? { textAlign: align } : undefined;

const renderRow = (
  row: TableRowNode,
  align: TableAlign[],
  cell: "th" | "td",
  components: MarkdownComponents,
) =>
  row.children.map((node, index) =>
    h(
      cell,
      { key: index, style: cellAlign(align[index]) },
      renderInlines(node.children, components),
    ),
  );

const renderBlocks = (
  nodes: BlockNode[],
  components: MarkdownComponents,
): VNodeChild[] =>
  nodes.map((node, index) => h(Block, { key: index, node, components }));

const ListItem = defineComponent(
  (props: {
    node: ListItemNode;
    tight: boolean;
    components: MarkdownComponents;
  }) =>
    (): VNodeChild => {
      const { node, tight, components } = props;
      const [first] = node.children;
      const checkbox =
        node.checked === undefined
          ? undefined
          : h("input", {
              type: "checkbox",
              disabled: true,
              "aria-label":
                first?.type === "paragraph"
                  ? plainText(first.children)
                  : undefined,
              checked: node.checked,
            });
      const children = node.children.map((child, index) => {
        const prefix = index === 0 ? checkbox : undefined;
        if (child.type !== "paragraph" || (!tight && !prefix)) {
          return h(Block, { key: index, node: child, components });
        }
        const inlines = [
          ...(prefix ? [prefix, " "] : []),
          ...renderInlines(child.children, components),
        ];
        return override(components, child, inlines, () =>
          tight ? inlines : h("p", inlines),
        );
      });
      return override(components, node, children, () =>
        h(
          "li",
          first?.type !== "paragraph" && checkbox
            ? [checkbox, ...children]
            : children,
        ),
      );
    },
  { name: "MarkdownListItem", props: ["node", "tight", "components"] },
);

const Block = defineComponent(
  (props: { node: BlockNode; components: MarkdownComponents }) =>
    (): VNodeChild => {
      const { node, components } = props;
      let children: VNodeChild[] | undefined;
      switch (node.type) {
        case "paragraph":
        case "heading":
          children = renderInlines(node.children, components);
          break;
        case "blockquote":
          children = renderBlocks(node.children, components);
          break;
        case "list":
          children = node.children.map((item, index) =>
            h(ListItem, {
              key: index,
              node: item,
              tight: node.tight,
              components,
            }),
          );
          break;
        case "table": {
          const [head, ...body] = node.children;
          children = [];
          if (head) {
            children.push(
              h("thead", [
                h("tr", renderRow(head, node.align, "th", components)),
              ]),
            );
          }
          if (body.length > 0) {
            children.push(
              h(
                "tbody",
                body.map((row, index) =>
                  h(
                    "tr",
                    { key: index },
                    renderRow(row, node.align, "td", components),
                  ),
                ),
              ),
            );
          }
          break;
        }
      }

      return override(components, node, children, () => {
        switch (node.type) {
          case "paragraph":
            return h("p", children);
          case "heading":
            return h(`h${node.depth}`, children);
          case "thematicBreak":
            return h("hr");
          case "blockquote":
            return h("blockquote", children);
          case "list":
            return node.ordered
              ? h(
                  "ol",
                  { start: node.start === 1 ? undefined : node.start },
                  children,
                )
              : h("ul", children);
          case "codeBlock":
            return h("pre", [
              h(
                "code",
                {
                  class:
                    node.lang === undefined
                      ? undefined
                      : `language-${node.lang}`,
                },
                node.value,
              ),
            ]);
          case "mathBlock":
            return h("pre", [
              h("code", { class: "language-math math-display" }, node.value),
            ]);
          case "htmlBlock":
            return h("p", node.value);
          case "table":
            return h("table", children);
        }
      });
    },
  { name: "MarkdownBlock", props: ["node", "components"] },
);

const isSameComponents = (a: MarkdownComponents, b: MarkdownComponents) => {
  const keys = Object.keys(a) as (keyof MarkdownComponents)[];
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && a[key] === b[key])
  );
};

const noComponents: MarkdownComponents = {};

export const Markdown = defineComponent(
  (props: MarkdownProps) => {
    const session = createMarkdownSession();
    let stableComponents = props.components ?? noComponents;
    return () => {
      const components = props.components ?? noComponents;
      if (
        stableComponents !== components &&
        !isSameComponents(stableComponents, components)
      ) {
        stableComponents = components;
      }
      const root = session.update(props.text, { final: props.final === true });
      return renderBlocks(root.children, stableComponents);
    };
  },
  {
    name: "Markdown",
    props: {
      text: { type: String, required: true },
      final: Boolean,
      components: Object,
    },
  },
);
