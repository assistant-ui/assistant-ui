import type { ReactNode } from "react";
import type { ZodType } from "zod";
import type { Action, NormalizedUIElement } from "./ir";

/**
 * The canonical generative-ui element, normalized from the flat `$type` shape
 * or the legacy `component` shape (see {@link normalizeUINode}). `children` is
 * a reserved top-level key, not a prop, so it lives here rather than inside
 * `props`. Alias of {@link NormalizedUIElement}; kept under its old name so the
 * package's public surface stays append-only.
 */
export type GenerativeUIElement = NormalizedUIElement;

/** The inline prop bag of a {@link GenerativeUIElement}. */
export type GenerativeUIProps = NormalizedUIElement["props"];

/**
 * Anything renderable as generative UI — mirrors React's `ReactNode`: an
 * element, primitive text, a list of nodes, or nothing. Widened beyond the
 * model payload (a {@link GenerativeUIElement}) with the renderer's
 * null/boolean/undefined inputs.
 */
export type GenerativeUINode =
  | GenerativeUIElement
  | string
  | number
  | boolean
  | null
  | undefined
  | GenerativeUINode[];

/** A behavior payload carried by an interactive node. Alias of {@link Action}. */
export type GenerativeUIAction = Action;

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
