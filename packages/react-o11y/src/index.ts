export * as SpanPrimitive from "./primitives/span";
export * as TracePrimitive from "./primitives/trace";

export { TraceResource } from "./resources/TraceResource";
export type { SpanData } from "./resources/TraceResource";
export type { SpanItemState, TraceState } from "./o11y-scope";

export { SpanByIndexProvider } from "./context/SpanByIndexProvider";
