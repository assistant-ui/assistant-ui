"use client";

import { createContext, useContext, type FC, type ReactNode } from "react";
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type {
  Unstable_TriggerItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";

export type DirectiveChipProps = {
  directiveId: string;
  directiveType: string;
  label: string;
};

const DirectiveChipContext = createContext<FC<DirectiveChipProps> | null>(null);

export const DirectiveChipProvider = DirectiveChipContext.Provider;

export type SerializedDirectiveNode = Spread<
  {
    directiveId: string;
    directiveType: string;
    label: string;
    description?: string | undefined;
    metadata?: Unstable_TriggerItem["metadata"];
    directiveText?: string;
  },
  SerializedLexicalNode
>;

function DefaultDirectiveChip({
  directiveId,
  directiveType,
  label,
}: DirectiveChipProps) {
  return (
    <span
      className="aui-directive-chip"
      data-directive-type={directiveType}
      data-directive-id={directiveId}
    >
      <span className="aui-directive-chip-label">{label}</span>
    </span>
  );
}

function DirectiveChipRenderer(props: DirectiveChipProps) {
  const Custom = useContext(DirectiveChipContext);
  const Chip = Custom ?? DefaultDirectiveChip;
  return <Chip {...props} />;
}

/** Decorator node whose `getTextContent()` returns directive syntax (source-of-truth for plain-text roundtrip). */
export class DirectiveNode extends DecoratorNode<ReactNode> {
  __directiveId: string;
  __directiveType: string;
  __label: string;
  __description: string | undefined;
  __metadata: Unstable_TriggerItem["metadata"];
  __directiveText: string;

  static override getType(): string {
    return "directive";
  }

  static override clone(node: DirectiveNode): DirectiveNode {
    return new DirectiveNode(
      {
        id: node.__directiveId,
        type: node.__directiveType,
        label: node.__label,
        description: node.__description,
        metadata: node.__metadata,
      },
      node.__directiveText,
      node.__key,
    );
  }

  constructor(
    item: Unstable_TriggerItem,
    directiveText: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__directiveId = item.id;
    this.__directiveType = item.type;
    this.__label = item.label;
    this.__description = item.description;
    this.__metadata = item.metadata;
    this.__directiveText = directiveText;
  }

  static override importJSON(
    serialized: SerializedDirectiveNode,
  ): DirectiveNode {
    return $createDirectiveNode(
      {
        id: serialized.directiveId,
        type: serialized.directiveType,
        label: serialized.label,
        description: serialized.description,
        metadata: serialized.metadata,
      },
      serialized.directiveText,
    );
  }

  override exportJSON(): SerializedDirectiveNode {
    return {
      type: "directive",
      version: 1,
      directiveId: this.__directiveId,
      directiveType: this.__directiveType,
      label: this.__label,
      description: this.__description,
      metadata: this.__metadata,
      directiveText: this.__directiveText,
    };
  }

  override createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline";
    // Atomic: editor treats chip as single unit for selection/deletion
    span.contentEditable = "false";
    span.setAttribute("aria-label", this.__label);
    return span;
  }

  override updateDOM(): false {
    return false;
  }

  /** Drops `description` and `metadata` — paste-time consumers re-resolve via adapter. */
  override exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-directive-id", this.__directiveId);
    element.setAttribute("data-directive-type", this.__directiveType);
    element.className = "aui-directive-chip";
    element.textContent = this.__label;
    return { element };
  }

  static override importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) => {
        const directiveId = node.getAttribute("data-directive-id");
        if (!directiveId) return null;
        const directiveType = node.getAttribute("data-directive-type") ?? "";
        return {
          conversion: (element: HTMLElement): DOMConversionOutput => {
            const label = element.textContent ?? "";
            const node = $createDirectiveNode({
              id: directiveId,
              type: directiveType,
              label,
            });
            return { node };
          },
          priority: 1,
        };
      },
    };
  }

  override getTextContent(): string {
    return this.__directiveText;
  }

  getDirectiveText(): string {
    return this.__directiveText;
  }

  override isInline(): boolean {
    return true;
  }

  override isIsolated(): boolean {
    return true;
  }

  override isKeyboardSelectable(): boolean {
    return true;
  }

  override decorate(_editor: LexicalEditor, _config: EditorConfig): ReactNode {
    return (
      <DirectiveChipRenderer
        directiveId={this.__directiveId}
        directiveType={this.__directiveType}
        label={this.__label}
      />
    );
  }

  getDirectiveItem(): Unstable_TriggerItem {
    return {
      id: this.__directiveId,
      type: this.__directiveType,
      label: this.__label,
      description: this.__description,
      metadata: this.__metadata,
    };
  }
}

/** Defaults `directiveText` via `unstable_defaultDirectiveFormatter` when omitted. */
export function $createDirectiveNode(
  item: Unstable_TriggerItem,
  directiveText?: string | undefined,
): DirectiveNode {
  const text =
    directiveText ?? unstable_defaultDirectiveFormatter.serialize(item);
  return $applyNodeReplacement(new DirectiveNode(item, text));
}

/** Uses the caller-supplied `formatter` to produce directive text. */
export function $createDirectiveNodeWithFormatter(
  item: Unstable_TriggerItem,
  formatter: Unstable_DirectiveFormatter,
): DirectiveNode {
  return $applyNodeReplacement(
    new DirectiveNode(item, formatter.serialize(item)),
  );
}

export function $isDirectiveNode(
  node: LexicalNode | null | undefined,
): node is DirectiveNode {
  return node instanceof DirectiveNode;
}
