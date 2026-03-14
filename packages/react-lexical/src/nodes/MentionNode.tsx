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

// ---------------------------------------------------------------------------
// Module-level directive formatter (configurable from LexicalComposerInput)
// ---------------------------------------------------------------------------

let _directiveFormatter: Unstable_DirectiveFormatter =
  unstable_defaultDirectiveFormatter;

export function setDirectiveFormatter(
  formatter: Unstable_DirectiveFormatter,
): void {
  _directiveFormatter = formatter;
}

// ---------------------------------------------------------------------------
// Chip customization context
// ---------------------------------------------------------------------------

export type MentionChipProps = {
  mentionId: string;
  mentionType: string;
  label: string;
  icon?: string | undefined;
};

const MentionChipContext = createContext<FC<MentionChipProps> | null>(null);

export const MentionChipProvider = MentionChipContext.Provider;

// ---------------------------------------------------------------------------
// Serialized format
// ---------------------------------------------------------------------------

export type SerializedMentionNode = Spread<
  {
    mentionId: string;
    mentionType: string;
    label: string;
    icon?: string | undefined;
    metadata?: Unstable_MentionItem["metadata"];
  },
  SerializedLexicalNode
>;

// ---------------------------------------------------------------------------
// Decorator component rendered inside the editor
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// MentionNode  (DecoratorNode — renders React inline)
// ---------------------------------------------------------------------------

export class MentionNode extends DecoratorNode<ReactNode> {
  __mentionId: string;
  __mentionType: string;
  __label: string;
  __icon: string | undefined;
  __metadata: Unstable_MentionItem["metadata"];

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
        metadata: node.__metadata,
      },
      node.__key,
    );
  }

  constructor(item: Unstable_MentionItem, key?: NodeKey) {
    super(key);
    this.__mentionId = item.id;
    this.__mentionType = item.type;
    this.__label = item.label;
    this.__icon = item.icon;
    this.__metadata = item.metadata;
  }

  // --- Serialization -------------------------------------------------------

  static override importJSON(serialized: SerializedMentionNode): MentionNode {
    return $createMentionNode({
      id: serialized.mentionId,
      type: serialized.mentionType,
      label: serialized.label,
      icon: serialized.icon,
      metadata: serialized.metadata,
    });
  }

  override exportJSON(): SerializedMentionNode {
    return {
      type: "mention",
      version: 1,
      mentionId: this.__mentionId,
      mentionType: this.__mentionType,
      label: this.__label,
      icon: this.__icon,
      metadata: this.__metadata,
    };
  }

  // --- DOM -----------------------------------------------------------------

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

  // --- Text content --------------------------------------------------------

  override getTextContent(): string {
    return _directiveFormatter.serialize(this.getMentionItem());
  }

  // --- Atomic behavior -----------------------------------------------------

  override isInline(): boolean {
    return true;
  }

  override isIsolated(): boolean {
    return true;
  }

  override isKeyboardSelectable(): boolean {
    return true;
  }

  // --- Decorator (React rendering) -----------------------------------------

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

  // --- Convenience getters -------------------------------------------------

  getMentionItem(): Unstable_MentionItem {
    return {
      id: this.__mentionId,
      type: this.__mentionType,
      label: this.__label,
      icon: this.__icon,
      metadata: this.__metadata,
    };
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function $createMentionNode(item: Unstable_MentionItem): MentionNode {
  return $applyNodeReplacement(new MentionNode(item));
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}
