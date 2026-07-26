import "@radix-ui/react-primitive";

import "@standard-schema/spec";

import "radix-ui";

import { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";

import "react-textarea-autosize";

import { Options as RemarkRehypeOptions } from "remark-rehype";

import { RemendOptions } from "remend";

import { BundledLanguage, BundledTheme, BundledTheme as BundledTheme$1, CjkPlugin, CodeHighlighterPlugin, DiagramPlugin, HighlightOptions, MathPlugin, MermaidErrorComponentProps, MermaidOptions, StreamdownContext, StreamdownProps, StreamdownProps as StreamdownProps$1, StreamdownProps as StreamdownProps$2, parseMarkdownIntoBlocks } from "streamdown";

import "zustand";

type AllowedTags = Record<string, string[]>;

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

type AssistantClient = {
  [K in ClientNames]: AssistantClientAccessor<K>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe;
};

type AssistantClientAccessor<K extends ClientNames> = (() => ClientSchemas[K]["methods"]) & (ClientMeta<K> | {
  source: "root";
  query: Record<string, never>;
} | {
  source: null;
  query: null;
}) & {
  name: K;
};

type AssistantEventCallback<TEvent extends AssistantEventName> = (payload: AssistantEventPayload[TEvent]) => void;

type AssistantEventName = keyof AssistantEventPayload;

type AssistantEventPayload = ClientEventMap & {
  "*": WildcardPayload;
};

type AssistantEventScope<TEvent extends AssistantEventName> = "*" | EventSource<TEvent> | (EventSource<TEvent> extends ClientNames ? AncestorsOf<EventSource<TEvent>> : never);

type AssistantEventSelector<TEvent extends AssistantEventName> = TEvent | {
  scope: AssistantEventScope<TEvent>;
  event: TEvent;
};

type BlockProps = {
  content: string;
  shouldParseIncompleteMarkdown: boolean;
  index: number;
  components?: StreamdownProps$2["components"];
  rehypePlugins?: StreamdownProps$2["rehypePlugins"];
  remarkPlugins?: StreamdownProps$2["remarkPlugins"];
  remarkRehypeOptions?: RemarkRehypeOptions;
};

type CaretStyle = "block" | "circle";

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: {
    source: ClientNames;
    query: Record<E, E>;
  };
  events: Record<`${E}.`, E>;
};

type ClientEventMap = UnionToIntersection<{
  [K in ClientNames]: ClientEvents<K>;
}[ClientNames]>;

type ClientEvents<K extends ClientNames> = "events" extends keyof ClientSchemas[K] ? ClientSchemas[K]["events"] extends ClientEventsType<K> ? ClientSchemas[K]["events"] : never : never;

type ClientEventsType<K extends ClientNames> = Record<`${K}.${string}`, unknown>;

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "query" | "source"> : never;

type ClientMetaType = {
  source: ClientNames;
  query: Record<string, unknown>;
};

interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientNames = keyof ClientSchemas extends (infer U) ? U : never;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K>;
};

type CodeHeaderProps = {
  node?: Element | undefined;
  language: string | undefined;
  code: string;
};

interface Comment extends Literal {
  type: "comment";
  data?: CommentData | undefined;
}

interface CommentData extends Data {
}

type ComponentsByLanguage = Record<string, {
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
}>;

type ControlsConfig = boolean | {
  table?: boolean;
  code?: boolean;
  mermaid?: boolean | {
    download?: boolean;
    copy?: boolean;
    fullscreen?: boolean;
    panZoom?: boolean;
  };
};

declare const DEFAULT_SHIKI_THEME: [
  BundledTheme,
  BundledTheme
];

interface Data extends Data$1 {
}

interface Data$1 {
}

interface DevToolsApiEntry {
  api: Partial<AssistantClient>;
  logs: EventLog[];
}

interface DevToolsHook {
  apis: Map<number, DevToolsApiEntry>;
  nextId: number;
  listeners: Set<(apiId: number) => void>;
}

interface Doctype extends Node$1 {
  type: "doctype";
  data?: DoctypeData | undefined;
}

interface DoctypeData extends Data {
}

interface Element extends Parent {
  type: "element";
  tagName: string;
  properties: Properties;
  children: ElementContent[];
  content?: Root | undefined;
  data?: ElementData | undefined;
}

type ElementContent = ElementContentMap[keyof ElementContentMap];

interface ElementContentMap {
  comment: Comment;
  element: Element;
  text: Text;
}

interface ElementData extends Data {
}

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type LinkSafetyConfig = {
  enabled: boolean;
  onLinkCheck?: (url: string) => Promise<boolean> | boolean;
  renderModal?: (props: LinkSafetyModalProps) => ReactNode;
};

type LinkSafetyModalProps = {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

interface Literal extends Node {
  value: string;
}

interface Node extends Node$1 {
  data?: Data | undefined;
}

interface Node$1 {
  type: string;
  data?: Data$1 | undefined;
  position?: Position | undefined;
}

interface Parent extends Node {
  children: RootContent[];
}

type ParentOf<K extends ClientNames> = AssistantClientAccessor<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type PluginConfig = {
  code?: unknown | false | undefined;
  math?: unknown | false | undefined;
  cjk?: unknown | false | undefined;
  mermaid?: unknown | false | undefined;
};

interface Point {
  line: number;
  column: number;
  offset?: number | undefined;
}

interface Position {
  start: Point;
  end: Point;
}

type PreOverrideProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

interface Properties {
  abbr?: string | undefined;
  about?: Array<string> | undefined;
  accentHeight?: number | string | undefined;
  accept?: Array<string> | undefined;
  acceptCharset?: Array<string> | undefined;
  accessKey?: Array<string> | undefined;
  accumulate?: string | undefined;
  action?: string | undefined;
  additive?: string | undefined;
  align?: string | undefined;
  alignmentBaseline?: string | undefined;
  aLink?: string | undefined;
  allow?: string | undefined;
  allowFullScreen?: boolean | string | undefined;
  allowPaymentRequest?: boolean | string | undefined;
  allowTransparency?: string | undefined;
  allowUserMedia?: boolean | string | undefined;
  alpha?: boolean | string | undefined;
  alphabetic?: number | string | undefined;
  alt?: string | undefined;
  amplitude?: number | string | undefined;
  arabicForm?: string | undefined;
  archive?: Array<string> | undefined;
  ariaActiveDescendant?: string | undefined;
  ariaAtomic?: "false" | "true" | (string & {}) | undefined;
  ariaAutoComplete?: string | undefined;
  ariaBusy?: "false" | "true" | (string & {}) | undefined;
  ariaChecked?: "false" | "true" | (string & {}) | undefined;
  ariaColCount?: number | string | undefined;
  ariaColIndex?: number | string | undefined;
  ariaColSpan?: number | string | undefined;
  ariaControls?: Array<string> | undefined;
  ariaCurrent?: string | undefined;
  ariaDescribedBy?: Array<string> | undefined;
  ariaDetails?: string | undefined;
  ariaDisabled?: "false" | "true" | (string & {}) | undefined;
  ariaDropEffect?: Array<string> | undefined;
  ariaErrorMessage?: string | undefined;
  ariaExpanded?: "false" | "true" | (string & {}) | undefined;
  ariaFlowTo?: Array<string> | undefined;
  ariaGrabbed?: "false" | "true" | (string & {}) | undefined;
  ariaHasPopup?: string | undefined;
  ariaHidden?: "false" | "true" | (string & {}) | undefined;
  ariaInvalid?: string | undefined;
  ariaKeyShortcuts?: string | undefined;
  ariaLabel?: string | undefined;
  ariaLabelledBy?: Array<string> | undefined;
  ariaLevel?: number | string | undefined;
  ariaLive?: string | undefined;
  ariaModal?: "false" | "true" | (string & {}) | undefined;
  ariaMultiLine?: "false" | "true" | (string & {}) | undefined;
  ariaMultiSelectable?: "false" | "true" | (string & {}) | undefined;
  ariaOrientation?: string | undefined;
  ariaOwns?: Array<string> | undefined;
  ariaPlaceholder?: string | undefined;
  ariaPosInSet?: number | string | undefined;
  ariaPressed?: "false" | "true" | (string & {}) | undefined;
  ariaReadOnly?: "false" | "true" | (string & {}) | undefined;
  ariaRelevant?: string | undefined;
  ariaRequired?: "false" | "true" | (string & {}) | undefined;
  ariaRoleDescription?: Array<string> | undefined;
  ariaRowCount?: number | string | undefined;
  ariaRowIndex?: number | string | undefined;
  ariaRowSpan?: number | string | undefined;
  ariaSelected?: "false" | "true" | (string & {}) | undefined;
  ariaSetSize?: number | string | undefined;
  ariaSort?: string | undefined;
  ariaValueMax?: number | string | undefined;
  ariaValueMin?: number | string | undefined;
  ariaValueNow?: number | string | undefined;
  ariaValueText?: string | undefined;
  as?: string | undefined;
  ascent?: number | string | undefined;
  async?: boolean | string | undefined;
  attributeName?: string | undefined;
  attributeType?: string | undefined;
  autoCapitalize?: string | undefined;
  autoComplete?: Array<string> | undefined;
  autoCorrect?: string | undefined;
  autoFocus?: boolean | string | undefined;
  autoPlay?: boolean | string | undefined;
  autoSave?: string | undefined;
  axis?: string | undefined;
  azimuth?: number | string | undefined;
  background?: string | undefined;
  bandwidth?: string | undefined;
  baseFrequency?: string | undefined;
  baselineShift?: string | undefined;
  baseProfile?: string | undefined;
  bbox?: string | undefined;
  begin?: string | undefined;
  bgColor?: string | undefined;
  bias?: number | string | undefined;
  blocking?: Array<string> | undefined;
  border?: number | string | undefined;
  borderColor?: string | undefined;
  bottomMargin?: number | string | undefined;
  by?: string | undefined;
  calcMode?: string | undefined;
  capHeight?: number | string | undefined;
  capture?: string | undefined;
  cellPadding?: string | undefined;
  cellSpacing?: string | undefined;
  char?: string | undefined;
  charOff?: string | undefined;
  charSet?: string | undefined;
  checked?: boolean | string | undefined;
  cite?: string | undefined;
  classId?: string | undefined;
  className?: Array<string> | undefined;
  clear?: string | undefined;
  clip?: string | undefined;
  clipPath?: string | undefined;
  clipPathUnits?: string | undefined;
  clipRule?: string | undefined;
  closedBy?: string | undefined;
  code?: string | undefined;
  codeBase?: string | undefined;
  codeType?: string | undefined;
  color?: string | undefined;
  colorInterpolation?: string | undefined;
  colorInterpolationFilters?: string | undefined;
  colorProfile?: string | undefined;
  colorRendering?: string | undefined;
  colorSpace?: string | undefined;
  cols?: number | string | undefined;
  colSpan?: number | string | undefined;
  command?: string | undefined;
  commandFor?: string | undefined;
  compact?: boolean | string | undefined;
  content?: string | undefined;
  contentEditable?: "false" | "true" | (string & {}) | undefined;
  contentScriptType?: string | undefined;
  contentStyleType?: string | undefined;
  controls?: boolean | string | undefined;
  controlsList?: Array<string> | undefined;
  coords?: Array<number | string> | undefined;
  credentialless?: boolean | string | undefined;
  crossOrigin?: string | undefined;
  cursor?: string | undefined;
  cx?: string | undefined;
  cy?: string | undefined;
  d?: string | undefined;
  data?: string | undefined;
  dataType?: string | undefined;
  dateTime?: string | undefined;
  declare?: boolean | string | undefined;
  decoding?: string | undefined;
  default?: boolean | string | undefined;
  defaultAction?: string | undefined;
  defer?: boolean | string | undefined;
  descent?: number | string | undefined;
  diffuseConstant?: number | string | undefined;
  dir?: string | undefined;
  direction?: string | undefined;
  dirName?: string | undefined;
  disabled?: boolean | string | undefined;
  disablePictureInPicture?: boolean | string | undefined;
  disableRemotePlayback?: boolean | string | undefined;
  display?: string | undefined;
  divisor?: number | string | undefined;
  dominantBaseline?: string | undefined;
  download?: boolean | string | undefined;
  draggable?: "false" | "true" | (string & {}) | undefined;
  dur?: string | undefined;
  dx?: string | undefined;
  dy?: string | undefined;
  edgeMode?: string | undefined;
  editable?: string | undefined;
  elevation?: number | string | undefined;
  enableBackground?: string | undefined;
  encType?: string | undefined;
  end?: string | undefined;
  enterKeyHint?: string | undefined;
  event?: string | undefined;
  exponent?: number | string | undefined;
  exportParts?: Array<string> | undefined;
  externalResourcesRequired?: string | undefined;
  face?: string | undefined;
  fetchPriority?: string | undefined;
  fill?: string | undefined;
  fillOpacity?: number | string | undefined;
  fillRule?: string | undefined;
  filter?: string | undefined;
  filterRes?: string | undefined;
  filterUnits?: string | undefined;
  floodColor?: string | undefined;
  floodOpacity?: string | undefined;
  focusable?: string | undefined;
  focusHighlight?: string | undefined;
  fontFamily?: string | undefined;
  fontSize?: string | undefined;
  fontSizeAdjust?: string | undefined;
  fontStretch?: string | undefined;
  fontStyle?: string | undefined;
  fontVariant?: string | undefined;
  fontWeight?: string | undefined;
  form?: string | undefined;
  formAction?: string | undefined;
  format?: string | undefined;
  formEncType?: string | undefined;
  formMethod?: string | undefined;
  formNoValidate?: boolean | string | undefined;
  formTarget?: string | undefined;
  fr?: string | undefined;
  frame?: string | undefined;
  frameBorder?: string | undefined;
  from?: string | undefined;
  fx?: string | undefined;
  fy?: string | undefined;
  g1?: Array<string> | undefined;
  g2?: Array<string> | undefined;
  glyphName?: Array<string> | undefined;
  glyphOrientationHorizontal?: string | undefined;
  glyphOrientationVertical?: string | undefined;
  glyphRef?: string | undefined;
  gradientTransform?: string | undefined;
  gradientUnits?: string | undefined;
  handler?: string | undefined;
  hanging?: number | string | undefined;
  hatchContentUnits?: string | undefined;
  hatchUnits?: string | undefined;
  headers?: Array<string> | undefined;
  height?: number | string | undefined;
  hidden?: boolean | string | undefined;
  high?: number | string | undefined;
  horizAdvX?: number | string | undefined;
  horizOriginX?: number | string | undefined;
  horizOriginY?: number | string | undefined;
  href?: string | undefined;
  hrefLang?: string | undefined;
  hSpace?: number | string | undefined;
  htmlFor?: Array<string> | undefined;
  httpEquiv?: Array<string> | undefined;
  id?: string | undefined;
  ideographic?: number | string | undefined;
  imageRendering?: string | undefined;
  imageSizes?: string | undefined;
  imageSrcSet?: string | undefined;
  in?: string | undefined;
  in2?: string | undefined;
  inert?: boolean | string | undefined;
  initialVisibility?: string | undefined;
  inputMode?: string | undefined;
  integrity?: string | undefined;
  intercept?: number | string | undefined;
  is?: string | undefined;
  isMap?: boolean | string | undefined;
  itemId?: string | undefined;
  itemProp?: Array<string> | undefined;
  itemRef?: Array<string> | undefined;
  itemScope?: boolean | string | undefined;
  itemType?: Array<string> | undefined;
  k?: number | string | undefined;
  k1?: number | string | undefined;
  k2?: number | string | undefined;
  k3?: number | string | undefined;
  k4?: number | string | undefined;
  kernelMatrix?: Array<string> | undefined;
  kernelUnitLength?: string | undefined;
  kerning?: string | undefined;
  keyPoints?: string | undefined;
  keySplines?: string | undefined;
  keyTimes?: string | undefined;
  kind?: string | undefined;
  label?: string | undefined;
  lang?: string | undefined;
  language?: string | undefined;
  leftMargin?: number | string | undefined;
  lengthAdjust?: string | undefined;
  letterSpacing?: string | undefined;
  lightingColor?: string | undefined;
  limitingConeAngle?: number | string | undefined;
  link?: string | undefined;
  list?: string | undefined;
  loading?: string | undefined;
  local?: string | undefined;
  longDesc?: string | undefined;
  loop?: boolean | string | undefined;
  low?: number | string | undefined;
  lowSrc?: string | undefined;
  manifest?: string | undefined;
  marginHeight?: number | string | undefined;
  marginWidth?: number | string | undefined;
  markerEnd?: string | undefined;
  markerHeight?: string | undefined;
  markerMid?: string | undefined;
  markerStart?: string | undefined;
  markerUnits?: string | undefined;
  markerWidth?: string | undefined;
  mask?: string | undefined;
  maskContentUnits?: string | undefined;
  maskType?: string | undefined;
  maskUnits?: string | undefined;
  mathematical?: string | undefined;
  max?: string | undefined;
  maxLength?: number | string | undefined;
  media?: string | undefined;
  mediaCharacterEncoding?: string | undefined;
  mediaContentEncodings?: string | undefined;
  mediaSize?: number | string | undefined;
  mediaTime?: string | undefined;
  method?: string | undefined;
  min?: string | undefined;
  minLength?: number | string | undefined;
  mode?: string | undefined;
  multiple?: boolean | string | undefined;
  muted?: boolean | string | undefined;
  name?: string | undefined;
  navDown?: string | undefined;
  navDownLeft?: string | undefined;
  navDownRight?: string | undefined;
  navLeft?: string | undefined;
  navNext?: string | undefined;
  navPrev?: string | undefined;
  navRight?: string | undefined;
  navUp?: string | undefined;
  navUpLeft?: string | undefined;
  navUpRight?: string | undefined;
  noHref?: boolean | string | undefined;
  noModule?: boolean | string | undefined;
  nonce?: string | undefined;
  noResize?: boolean | string | undefined;
  noShade?: boolean | string | undefined;
  noValidate?: boolean | string | undefined;
  noWrap?: boolean | string | undefined;
  numOctaves?: string | undefined;
  object?: string | undefined;
  observer?: string | undefined;
  offset?: string | undefined;
  onAbort?: string | undefined;
  onActivate?: string | undefined;
  onAfterPrint?: string | undefined;
  onAuxClick?: string | undefined;
  onBeforeMatch?: string | undefined;
  onBeforePrint?: string | undefined;
  onBeforeToggle?: string | undefined;
  onBeforeUnload?: string | undefined;
  onBegin?: string | undefined;
  onBlur?: string | undefined;
  onCancel?: string | undefined;
  onCanPlay?: string | undefined;
  onCanPlayThrough?: string | undefined;
  onChange?: string | undefined;
  onClick?: string | undefined;
  onClose?: string | undefined;
  onContextLost?: string | undefined;
  onContextMenu?: string | undefined;
  onContextRestored?: string | undefined;
  onCopy?: string | undefined;
  onCueChange?: string | undefined;
  onCut?: string | undefined;
  onDblClick?: string | undefined;
  onDrag?: string | undefined;
  onDragEnd?: string | undefined;
  onDragEnter?: string | undefined;
  onDragExit?: string | undefined;
  onDragLeave?: string | undefined;
  onDragOver?: string | undefined;
  onDragStart?: string | undefined;
  onDrop?: string | undefined;
  onDurationChange?: string | undefined;
  onEmptied?: string | undefined;
  onEnd?: string | undefined;
  onEnded?: string | undefined;
  onError?: string | undefined;
  onFocus?: string | undefined;
  onFocusIn?: string | undefined;
  onFocusOut?: string | undefined;
  onFormData?: string | undefined;
  onHashChange?: string | undefined;
  onInput?: string | undefined;
  onInvalid?: string | undefined;
  onKeyDown?: string | undefined;
  onKeyPress?: string | undefined;
  onKeyUp?: string | undefined;
  onLanguageChange?: string | undefined;
  onLoad?: string | undefined;
  onLoadedData?: string | undefined;
  onLoadedMetadata?: string | undefined;
  onLoadEnd?: string | undefined;
  onLoadStart?: string | undefined;
  onMessage?: string | undefined;
  onMessageError?: string | undefined;
  onMouseDown?: string | undefined;
  onMouseEnter?: string | undefined;
  onMouseLeave?: string | undefined;
  onMouseMove?: string | undefined;
  onMouseOut?: string | undefined;
  onMouseOver?: string | undefined;
  onMouseUp?: string | undefined;
  onMouseWheel?: string | undefined;
  onOffline?: string | undefined;
  onOnline?: string | undefined;
  onPageHide?: string | undefined;
  onPageShow?: string | undefined;
  onPaste?: string | undefined;
  onPause?: string | undefined;
  onPlay?: string | undefined;
  onPlaying?: string | undefined;
  onPopState?: string | undefined;
  onProgress?: string | undefined;
  onRateChange?: string | undefined;
  onRejectionHandled?: string | undefined;
  onRepeat?: string | undefined;
  onReset?: string | undefined;
  onResize?: string | undefined;
  onScroll?: string | undefined;
  onScrollEnd?: string | undefined;
  onSecurityPolicyViolation?: string | undefined;
  onSeeked?: string | undefined;
  onSeeking?: string | undefined;
  onSelect?: string | undefined;
  onShow?: string | undefined;
  onSlotChange?: string | undefined;
  onStalled?: string | undefined;
  onStorage?: string | undefined;
  onSubmit?: string | undefined;
  onSuspend?: string | undefined;
  onTimeUpdate?: string | undefined;
  onToggle?: string | undefined;
  onUnhandledRejection?: string | undefined;
  onUnload?: string | undefined;
  onVolumeChange?: string | undefined;
  onWaiting?: string | undefined;
  onWheel?: string | undefined;
  onZoom?: string | undefined;
  opacity?: string | undefined;
  open?: boolean | string | undefined;
  operator?: string | undefined;
  optimum?: number | string | undefined;
  order?: string | undefined;
  orient?: string | undefined;
  orientation?: string | undefined;
  origin?: string | undefined;
  overflow?: string | undefined;
  overlay?: string | undefined;
  overlinePosition?: number | string | undefined;
  overlineThickness?: number | string | undefined;
  paintOrder?: string | undefined;
  panose1?: string | undefined;
  part?: Array<string> | undefined;
  path?: string | undefined;
  pathLength?: number | string | undefined;
  pattern?: string | undefined;
  patternContentUnits?: string | undefined;
  patternTransform?: string | undefined;
  patternUnits?: string | undefined;
  phase?: string | undefined;
  ping?: Array<string> | undefined;
  pitch?: string | undefined;
  placeholder?: string | undefined;
  playbackOrder?: string | undefined;
  playsInline?: boolean | string | undefined;
  pointerEvents?: string | undefined;
  points?: string | undefined;
  pointsAtX?: number | string | undefined;
  pointsAtY?: number | string | undefined;
  pointsAtZ?: number | string | undefined;
  popover?: string | undefined;
  popoverTarget?: string | undefined;
  popoverTargetAction?: string | undefined;
  poster?: string | undefined;
  prefix?: string | undefined;
  preload?: string | undefined;
  preserveAlpha?: string | undefined;
  preserveAspectRatio?: string | undefined;
  primitiveUnits?: string | undefined;
  profile?: string | undefined;
  prompt?: string | undefined;
  propagate?: string | undefined;
  property?: string | Array<string> | undefined;
  r?: string | undefined;
  radius?: string | undefined;
  readOnly?: boolean | string | undefined;
  referrerPolicy?: string | undefined;
  refX?: string | undefined;
  refY?: string | undefined;
  rel?: Array<string> | undefined;
  renderingIntent?: string | undefined;
  repeatCount?: string | undefined;
  repeatDur?: string | undefined;
  required?: boolean | string | undefined;
  requiredExtensions?: Array<string> | undefined;
  requiredFeatures?: Array<string> | undefined;
  requiredFonts?: Array<string> | undefined;
  requiredFormats?: Array<string> | undefined;
  resource?: string | undefined;
  restart?: string | undefined;
  result?: string | undefined;
  results?: number | string | undefined;
  rev?: string | Array<string> | undefined;
  reversed?: boolean | string | undefined;
  rightMargin?: number | string | undefined;
  role?: string | undefined;
  rotate?: string | undefined;
  rows?: number | string | undefined;
  rowSpan?: number | string | undefined;
  rules?: string | undefined;
  rx?: string | undefined;
  ry?: string | undefined;
  sandbox?: Array<string> | undefined;
  scale?: string | undefined;
  scheme?: string | undefined;
  scope?: string | undefined;
  scoped?: boolean | string | undefined;
  scrolling?: "false" | "true" | (string & {}) | undefined;
  seamless?: boolean | string | undefined;
  security?: string | undefined;
  seed?: string | undefined;
  selected?: boolean | string | undefined;
  shadowRootClonable?: boolean | string | undefined;
  shadowRootCustomElementRegistry?: boolean | string | undefined;
  shadowRootDelegatesFocus?: boolean | string | undefined;
  shadowRootMode?: string | undefined;
  shadowRootSerializable?: boolean | string | undefined;
  shape?: string | undefined;
  shapeRendering?: string | undefined;
  side?: string | undefined;
  size?: number | string | undefined;
  sizes?: string | undefined;
  slope?: string | undefined;
  slot?: string | undefined;
  snapshotTime?: string | undefined;
  spacing?: string | undefined;
  span?: number | string | undefined;
  specularConstant?: number | string | undefined;
  specularExponent?: number | string | undefined;
  spellCheck?: "false" | "true" | (string & {}) | undefined;
  spreadMethod?: string | undefined;
  src?: string | undefined;
  srcDoc?: string | undefined;
  srcLang?: string | undefined;
  srcSet?: string | undefined;
  standby?: string | undefined;
  start?: number | string | undefined;
  startOffset?: string | undefined;
  stdDeviation?: string | undefined;
  stemh?: string | undefined;
  stemv?: string | undefined;
  step?: string | undefined;
  stitchTiles?: string | undefined;
  stopColor?: string | undefined;
  stopOpacity?: string | undefined;
  strikethroughPosition?: number | string | undefined;
  strikethroughThickness?: number | string | undefined;
  string?: string | undefined;
  stroke?: string | undefined;
  strokeDashArray?: Array<string> | undefined;
  strokeDashOffset?: string | undefined;
  strokeLineCap?: string | undefined;
  strokeLineJoin?: string | undefined;
  strokeMiterLimit?: number | string | undefined;
  strokeOpacity?: number | string | undefined;
  strokeWidth?: string | undefined;
  style?: string | undefined;
  summary?: string | undefined;
  surfaceScale?: number | string | undefined;
  syncBehavior?: string | undefined;
  syncBehaviorDefault?: string | undefined;
  syncMaster?: string | undefined;
  syncTolerance?: string | undefined;
  syncToleranceDefault?: string | undefined;
  systemLanguage?: Array<string> | undefined;
  tabIndex?: number | string | undefined;
  tableValues?: string | undefined;
  target?: string | undefined;
  targetX?: number | string | undefined;
  targetY?: number | string | undefined;
  text?: string | undefined;
  textAnchor?: string | undefined;
  textDecoration?: string | undefined;
  textLength?: string | undefined;
  textRendering?: string | undefined;
  timelineBegin?: string | undefined;
  title?: string | undefined;
  to?: string | undefined;
  topMargin?: number | string | undefined;
  transform?: string | undefined;
  transformBehavior?: string | undefined;
  transformOrigin?: string | undefined;
  translate?: string | undefined;
  type?: string | undefined;
  typeMustMatch?: boolean | string | undefined;
  typeOf?: Array<string> | undefined;
  u1?: string | undefined;
  u2?: string | undefined;
  underlinePosition?: number | string | undefined;
  underlineThickness?: number | string | undefined;
  unicode?: string | undefined;
  unicodeBidi?: string | undefined;
  unicodeRange?: string | undefined;
  unitsPerEm?: number | string | undefined;
  unselectable?: string | undefined;
  useMap?: string | undefined;
  vAlign?: string | undefined;
  vAlphabetic?: number | string | undefined;
  value?: "false" | "true" | (string & {}) | undefined;
  values?: string | undefined;
  valueType?: string | undefined;
  vectorEffect?: string | undefined;
  version?: string | undefined;
  vertAdvY?: number | string | undefined;
  vertOriginX?: number | string | undefined;
  vertOriginY?: number | string | undefined;
  vHanging?: number | string | undefined;
  vIdeographic?: number | string | undefined;
  viewBox?: string | undefined;
  viewTarget?: string | undefined;
  visibility?: string | undefined;
  vLink?: string | undefined;
  vMathematical?: number | string | undefined;
  vSpace?: number | string | undefined;
  width?: number | string | undefined;
  widths?: string | undefined;
  wordSpacing?: string | undefined;
  wrap?: string | undefined;
  writingMode?: string | undefined;
  writingSuggestions?: string | undefined;
  x?: string | undefined;
  x1?: string | undefined;
  x2?: string | undefined;
  xChannelSelector?: string | undefined;
  xHeight?: number | string | undefined;
  xLinkActuate?: string | undefined;
  xLinkArcRole?: string | undefined;
  xLinkHref?: string | undefined;
  xLinkRole?: string | undefined;
  xLinkShow?: string | undefined;
  xLinkTitle?: string | undefined;
  xLinkType?: string | undefined;
  xmlBase?: string | undefined;
  xmlLang?: string | undefined;
  xmlns?: string | undefined;
  xmlnsXLink?: string | undefined;
  xmlSpace?: string | undefined;
  y?: string | undefined;
  y1?: string | undefined;
  y2?: string | undefined;
  yChannelSelector?: string | undefined;
  z?: string | undefined;
  zoomAndPan?: string | undefined;
  [PropertyName: string]: boolean | number | string | null | undefined | Array<string | number>;
}

type RemendConfig = {
  links?: boolean;
  images?: boolean;
  linkMode?: "protocol" | "text-only";
  bold?: boolean;
  italic?: boolean;
  boldItalic?: boolean;
  inlineCode?: boolean;
  strikethrough?: boolean;
  katex?: boolean;
  setextHeadings?: boolean;
  handlers?: RemendHandler[];
};

type RemendHandler = {
  name: string;
  handle: (text: string) => string;
  priority?: number;
};

type ResolvedPluginConfig = NonNullable<StreamdownProps$2["plugins"]>;

interface Root extends Parent {
  type: "root";
  children: RootContent[];
  data?: RootData | undefined;
}

type RootContent = RootContentMap[keyof RootContentMap];

interface RootContentMap {
  comment: Comment;
  doctype: Doctype;
  element: Element;
  text: Text;
}

interface RootData extends Data {
}

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type SecurityConfig = {
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
  allowedProtocols?: string[];
  allowDataImages?: boolean;
  defaultOrigin?: string;
  blockedLinkClass?: string;
  blockedImageClass?: string;
};

type SmoothOptions = {
  drainMs?: number | undefined;
  maxCharIntervalMs?: number | undefined;
  maxCharsPerFrame?: number | undefined;
  minCommitMs?: number | undefined;
};

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

type StreamdownTextComponents = NonNullable<StreamdownProps$2["components"]> & {
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
};

declare const StreamdownTextPrimitive: import("react").ForwardRefExoticComponent<Omit<StreamdownProps, "BlockComponent" | "caret" | "children" | "components" | "controls" | "linkSafety" | "mermaid" | "parseMarkdownIntoBlocksFn" | "plugins" | "remend"> & {
  components?: StreamdownTextComponents | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
  plugins?: PluginConfig | undefined;
  preprocess?: ((text: string) => string) | undefined;
  defer?: boolean | undefined;
  smooth?: boolean | SmoothOptions | undefined;
  containerProps?: Omit<import("react").ComponentPropsWithoutRef<"div">, "children"> | undefined;
  containerClassName?: string | undefined;
  caret?: CaretStyle | undefined;
  controls?: ControlsConfig | undefined;
  linkSafety?: LinkSafetyConfig | undefined;
  remend?: RemendConfig | undefined;
  mermaid?: import("streamdown").MermaidOptions | undefined;
  parseIncompleteMarkdown?: boolean | undefined;
  allowedTags?: AllowedTags | undefined;
  remarkRehypeOptions?: import("remark-rehype").Options | undefined;
  security?: SecurityConfig | undefined;
  BlockComponent?: StreamdownProps["BlockComponent"] | undefined;
  parseMarkdownIntoBlocksFn?: ((markdown: string) => string[]) | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

type StreamdownTextPrimitiveProps = Omit<StreamdownProps$2, "BlockComponent" | "caret" | "children" | "components" | "controls" | "linkSafety" | "mermaid" | "parseMarkdownIntoBlocksFn" | "plugins" | "remend"> & {
  components?: StreamdownTextComponents | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
  plugins?: PluginConfig | undefined;
  preprocess?: ((text: string) => string) | undefined;
  defer?: boolean | undefined;
  smooth?: boolean | SmoothOptions | undefined;
  containerProps?: Omit<ComponentPropsWithoutRef<"div">, "children"> | undefined;
  containerClassName?: string | undefined;
  caret?: CaretStyle | undefined;
  controls?: ControlsConfig | undefined;
  linkSafety?: LinkSafetyConfig | undefined;
  remend?: RemendConfig | undefined;
  mermaid?: MermaidOptions | undefined;
  parseIncompleteMarkdown?: boolean | undefined;
  allowedTags?: AllowedTags | undefined;
  remarkRehypeOptions?: RemarkRehypeOptions | undefined;
  security?: SecurityConfig | undefined;
  BlockComponent?: StreamdownProps$2["BlockComponent"] | undefined;
  parseMarkdownIntoBlocksFn?: ((markdown: string) => string[]) | undefined;
};

type SyntaxHighlighterProps = {
  node?: Element | undefined;
  components: {
    Pre: ComponentType<ComponentPropsWithoutRef<"pre"> & {
      node?: Element | undefined;
    }>;
    Code: ComponentType<ComponentPropsWithoutRef<"code"> & {
      node?: Element | undefined;
    }>;
  };
  language: string;
  code: string;
};

interface Text extends Literal {
  type: "text";
  data?: TextData | undefined;
}

interface TextData extends Data {
}

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

type Unsubscribe = () => void;

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
} ? "meta" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["meta"] extends ClientMetaType ? "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid meta type`> : "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid methods type`>;

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

declare function escapeCurrencyDollars(text: string): string;

declare function findRemendWindowStart(text: string): number;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare global {
  interface Window {
    __ASSISTANT_UI_DEVTOOLS_HOOK__?: any;
  }
}

declare namespace entry_root_exports {
  export { AllowedTags, BlockProps, BundledLanguage, BundledTheme$1 as BundledTheme, CaretStyle, CjkPlugin, CodeHeaderProps, CodeHighlighterPlugin, ComponentsByLanguage, ControlsConfig, DEFAULT_SHIKI_THEME, DiagramPlugin, HighlightOptions, LinkSafetyConfig, LinkSafetyModalProps, MathPlugin, MermaidErrorComponentProps, MermaidOptions, PluginConfig, RemarkRehypeOptions, RemendConfig, RemendHandler, ResolvedPluginConfig, SecurityConfig, StreamdownContext, StreamdownProps$1 as StreamdownProps, StreamdownTextComponents, StreamdownTextPrimitive, StreamdownTextPrimitiveProps, SyntaxHighlighterProps, escapeCurrencyDollars, findRemendWindowStart, memoCompareNodes, normalizeMathDelimiters, parseMarkdownIntoBlocks, rewriteCustomMathTags, rewriteLatexBracketDelimiters, tailBoundedRemend, useIsStreamdownCodeBlock, useStreamdownPreProps };
}

declare function memoCompareNodes<T extends {
  children?: ReactNode;
  [key: string]: unknown;
}>(prev: Readonly<T>, next: Readonly<T>): boolean;

declare function normalizeMathDelimiters(text: string): string;

declare function rewriteCustomMathTags(text: string): string;

declare function rewriteLatexBracketDelimiters(text: string): string;

declare function tailBoundedRemend(text: string, options?: RemendOptions): string;

declare function useIsStreamdownCodeBlock(): boolean;

declare function useStreamdownPreProps(): PreOverrideProps | null;

export { entry_root_exports as entry_root };
