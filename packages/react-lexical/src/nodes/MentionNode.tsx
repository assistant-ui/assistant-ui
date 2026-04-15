"use client";

import { createContext, useContext, type FC, type ReactNode } from "react";
import type {
  DOMConversionMap,
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
  Unstable_MentionItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";

export type MentionChipProps = {
  mentionId: string;
  mentionType: string;
  label: string;
  icon?: string | undefined;
};

const MentionChipContext = createContext<FC<MentionChipProps> | null>(null);

export const MentionChipProvider = MentionChipContext.Provider;

export type SerializedMentionNode = Spread<
  {
    mentionId: string;
    mentionType: string;
    label: string;
    icon?: string | undefined;
    description?: string | undefined;
    metadata?: Unstable_MentionItem["metadata"];
    directiveText?: string;
  },
  SerializedLexicalNode
>;

function DefaultMentionChip({
  mentionId,
  mentionType,
  label,
  icon,
}: MentionChipProps) {
  return (
    <span
      className="aui-mention-chip"
      data-mention-type={mentionType}
      data-mention-id={mentionId}
    >
      {icon && <span className="aui-mention-chip-icon">{icon}</span>}
      <span className="aui-mention-chip-label">{label}</span>
    </span>
  );
}

function MentionChipRenderer(props: MentionChipProps) {
  const Custom = useContext(MentionChipContext);
  const Chip = Custom ?? DefaultMentionChip;
  return <Chip {...props} />;
}

export class MentionNode extends DecoratorNode<ReactNode> {
  __mentionId: string;
  __mentionType: string;
  __label: string;
  __icon: string | undefined;
  __description: string | undefined;
  __metadata: Unstable_MentionItem["metadata"];
  __directiveText: string;

  static override getType(): string {
    return "mention";
  }

  static override clone(node: MentionNode): MentionNode {
    return new MentionNode(
      {
        id: node.__mentionId,
        type: node.__mentionType,
        label: node.__label,
        icon: node.__icon,
        description: node.__description,
        metadata: node.__metadata,
      },
      node.__directiveText,
      node.__key,
    );
  }

  constructor(
    item: Unstable_MentionItem,
    directiveText: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__mentionId = item.id;
    this.__mentionType = item.type;
    this.__label = item.label;
    this.__icon = item.icon;
    this.__description = item.description;
    this.__metadata = item.metadata;
    this.__directiveText = directiveText;
  }

  static override importJSON(serialized: SerializedMentionNode): MentionNode {
    return $createMentionNode(
      {
        id: serialized.mentionId,
        type: serialized.mentionType,
        label: serialized.label,
        icon: serialized.icon,
        description: serialized.description,
        metadata: serialized.metadata,
      },
      serialized.directiveText,
    );
  }

  override exportJSON(): SerializedMentionNode {
    return {
      type: "mention",
      version: 1,
      mentionId: this.__mentionId,
      mentionType: this.__mentionType,
      label: this.__label,
      icon: this.__icon,
      description: this.__description,
      metadata: this.__metadata,
      directiveText: this.__directiveText,
    };
  }

  override createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline";
    // Mark as atomic so the editor treats it as a single unit
    span.contentEditable = "false";
    return span;
  }

  override updateDOM(): false {
    return false;
  }

  override exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-mention-id", this.__mentionId);
    element.setAttribute("data-mention-type", this.__mentionType);
    element.textContent = this.__label;
    return { element };
  }

  static override importDOM(): DOMConversionMap | null {
    return null;
  }

  override getTextContent(): string {
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
      <MentionChipRenderer
        mentionId={this.__mentionId}
        mentionType={this.__mentionType}
        label={this.__label}
        icon={this.__icon}
      />
    );
  }

  getMentionItem(): Unstable_MentionItem {
    return {
      id: this.__mentionId,
      type: this.__mentionType,
      label: this.__label,
      icon: this.__icon,
      description: this.__description,
      metadata: this.__metadata,
    };
  }
}

export function $createMentionNode(
  item: Unstable_MentionItem,
  directiveText?: string | undefined,
): MentionNode {
  const text =
    directiveText ?? unstable_defaultDirectiveFormatter.serialize(item);
  return $applyNodeReplacement(new MentionNode(item, text));
}

export function $createMentionNodeWithFormatter(
  item: Unstable_MentionItem,
  formatter: Unstable_DirectiveFormatter,
): MentionNode {
  return $applyNodeReplacement(
    new MentionNode(item, formatter.serialize(item)),
  );
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}
