import { ComponentPropsWithoutRef, FC, ReactNode } from "react";

import { DOMConversionMap, DOMExportOutput, DecoratorNode, EditorConfig, LexicalEditor, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type Unstable_TriggerItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

type Unstable_DirectiveSegment = {
  readonly kind: "text";
  readonly text: string;
} | {
  readonly kind: "mention";
  readonly type: string;
  readonly label: string;
  readonly id: string;
};

type Unstable_DirectiveFormatter = {
  serialize(item: Unstable_TriggerItem): string;
  parse(text: string): readonly Unstable_DirectiveSegment[];
};

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type DirectiveChipProps = {
  directiveId: string;
  directiveType: string;
  label: string;
};

declare const DirectiveChipProvider: import("react").Provider<FC<DirectiveChipProps> | null>;

type SerializedDirectiveNode = Spread<{
  directiveId: string;
  directiveType: string;
  label: string;
  description?: string | undefined;
  metadata?: Unstable_TriggerItem["metadata"];
  directiveText?: string;
}, SerializedLexicalNode>;

declare class DirectiveNode extends DecoratorNode<ReactNode> {
  __directiveId: string;
  __directiveType: string;
  __label: string;
  __description: string | undefined;
  __metadata: Unstable_TriggerItem["metadata"];
  __directiveText: string;
  static getType(): string;
  static clone(node: DirectiveNode): DirectiveNode;
  constructor(item: Unstable_TriggerItem, directiveText: string, key?: NodeKey);
  static importJSON(serialized: SerializedDirectiveNode): DirectiveNode;
  exportJSON(): SerializedDirectiveNode;
  createDOM(_config: EditorConfig): HTMLElement;
  updateDOM(): false;
  exportDOM(_editor: LexicalEditor): DOMExportOutput;
  static importDOM(): DOMConversionMap | null;
  getTextContent(): string;
  getDirectiveText(): string;
  isInline(): boolean;
  isIsolated(): boolean;
  isKeyboardSelectable(): boolean;
  decorate(_editor: LexicalEditor, _config: EditorConfig): ReactNode;
  getDirectiveItem(): Unstable_TriggerItem;
}

declare function $createDirectiveNode(item: Unstable_TriggerItem, directiveText?: string | undefined): DirectiveNode;

declare function $createDirectiveNodeWithFormatter(item: Unstable_TriggerItem, formatter: Unstable_DirectiveFormatter): DirectiveNode;

declare function $isDirectiveNode(node: LexicalNode | null | undefined): node is DirectiveNode;

type DirectivePluginProps = {
  onDirectiveSelect?: ((item: Unstable_TriggerItem) => void) | undefined;
};

declare function DirectivePlugin(_param0?: DirectivePluginProps): null;

type LexicalComposerInputProps = Omit<ComponentPropsWithoutRef<"div">, "autoFocus"> & {
  submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
  cancelOnEscape?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  directivePluginProps?: DirectivePluginProps | undefined;
  directiveChip?: FC<DirectiveChipProps> | undefined;
  formatter?: Unstable_DirectiveFormatter | undefined;
};

declare const LexicalComposerInput: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref">, "autoFocus"> & {
  submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
  cancelOnEscape?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  directivePluginProps?: DirectivePluginProps | undefined;
  directiveChip?: FC<DirectiveChipProps> | undefined;
  formatter?: Unstable_DirectiveFormatter | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace entry_root_exports {
  export { $createDirectiveNode, $createDirectiveNodeWithFormatter, $isDirectiveNode, DirectiveChipProps, DirectiveChipProvider, DirectiveNode, DirectivePlugin, DirectivePluginProps, LexicalComposerInput, LexicalComposerInputProps };
}

export { entry_root_exports as entry_root };
