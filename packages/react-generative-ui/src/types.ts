import type { ReactNode } from "react";
import type { ZodType } from "zod";

/** Whether a node's props are still streaming in or have fully arrived. */
export type GenerativeUIStatus = "streaming" | "done";

/** The render context threaded through {@link renderGenerativeUI}. */
export type GenerativeUIRenderContext = {
  /** Whether the tool call's arguments are still streaming or are complete. */
  status: GenerativeUIStatus;
};

/**
 * Props a component's `render` receives: its model props, rendered `children`,
 * and the injected `$status`. `$status` is the discriminant — when it is
 * `"done"`, `P` is complete; while `"streaming"`, `P` is partial. It is named
 * `$status` (not `status`) so it never collides with a real `status` prop, the
 * same reservation as `$type`.
 */
type StreamingRenderProps<P> =
  | (Partial<P> & { children?: ReactNode; $status: "streaming" })
  | (P & { children?: ReactNode; $status: "done" });

/** Props for a component that only renders once complete — `$status` is always `"done"`. */
type StaticRenderProps<P> = P & { children?: ReactNode; $status: "done" };

/**
 * A component the model is allowed to render, with the schema for its props.
 *
 * Components opt into prop streaming with `streamProperties`: they render as
 * props arrive, so `render` sees `Partial<P>` while `$status` is `"streaming"`
 * and the full `P` once it is `"done"`. By default a component opts out and is
 * only rendered once its props are complete.
 *
 * `render` is a function of `props`, not a React component. Direct hook use is
 * fine (each node is mounted on its own fiber), but a given node must keep its
 * `type` across renders for hook identity to be stable.
 */
export type GenerativeUIComponent<P = any> =
  | {
      /** Natural-language description shown to the model when selecting the component. */
      description: string;
      /** Schema for the props the model must provide. Drives the tool parameters. */
      properties: ZodType<P>;
      /**
       * Render from partially-streamed props. Widened to `boolean | undefined`
       * so a non-literal value (e.g. a variable) still resolves to this branch
       * cleanly rather than matching neither; the strict `false | undefined`
       * branch below is the only one that promises complete props.
       */
      streamProperties: boolean | undefined;
      render: (props: StreamingRenderProps<P>) => ReactNode;
    }
  | {
      description: string;
      properties: ZodType<P>;
      /** Render only once props are complete (the default). */
      streamProperties?: false | undefined;
      render: (props: StaticRenderProps<P>) => ReactNode;
    };

/**
 * The consumer-provided allowlist of components the model is permitted to
 * render. Keys are the `type` values referenced in the generative-ui tree
 * (e.g. `"Card"`, `"Button"`); values describe each component.
 *
 * This registry is the security boundary — any `type` not present is rejected.
 */
export type GenerativeUILibrary = Record<string, GenerativeUIComponent>;

/**
 * A component invocation — mirrors React's `ReactElement`.
 *
 * `type` selects a component from the {@link GenerativeUILibrary}; `props` are
 * passed to it. The `children` prop is special: it is itself a renderable
 * {@link GenerativeUINode}, drawn as generative UI rather than passed as data.
 *
 * On the wire the model emits the flattened form `{ $type, ...props }`, where
 * `$type` names the component so a real `type` prop never collides. This is the
 * normalized shape the renderer works with, the same way React normalizes
 * `createElement` arguments into an element.
 */
export type GenerativeUIElement = {
  type: string;
  props: GenerativeUIProps;
};

/** Props passed to a component — mirrors a React component's props. */
export type GenerativeUIProps = {
  children?: GenerativeUINode;
} & Record<string, unknown>;

/**
 * Anything renderable as generative UI — mirrors React's `ReactNode`: an
 * element, primitive text, or a list of nodes.
 */
export type GenerativeUINode =
  | GenerativeUIElement
  | string
  | number
  | boolean
  | null
  | undefined
  | GenerativeUINode[];
