"use client";

import type { ComponentType, FC } from "react";
import {
  MessagePrimitiveGenerativeUI as MessagePrimitiveGenerativeUIBase,
  GenerativeUIRender,
  GenerativeUIRenderError,
  type GenerativeUIComponentRegistry,
} from "@assistant-ui/core/react";
import type { GenerativeUISpec } from "@assistant-ui/core";
import { GenerativeUISandboxFrame } from "./GenerativeUISandboxFrame";

export namespace MessagePrimitiveGenerativeUI {
  export type Props = {
    /**
     * The component allowlist. Keys are the names referenced in the spec
     * (e.g. `"Card"`, `"Button"`); values are React components.
     *
     * This registry is the security boundary in the same-realm path —
     * unknown names throw {@link GenerativeUIRenderError}.
     */
    components: GenerativeUIComponentRegistry;
    /**
     * Rendering strategy.
     * - `"same-realm"` (default): render directly with allowlist enforcement.
     * - `"iframe"`: render inside an isolated iframe via `safe-content-frame`
     *   for CSS / origin isolation in addition to allowlist enforcement.
     */
    sandbox?: "same-realm" | "iframe" | undefined;
    /** Optional spec override. */
    spec?: GenerativeUISpec | undefined;
    /** Optional fallback for unknown component names. */
    Fallback?:
      | ComponentType<{ component: string; props?: unknown }>
      | undefined;
  };
}

/**
 * Web-distribution wrapper for `MessagePrimitive.GenerativeUI` that adds
 * the iframe sandbox path on top of the platform-agnostic same-realm
 * renderer from `@assistant-ui/core/react`.
 *
 * @example Same-realm (default)
 * ```tsx
 * <MessagePrimitive.GenerativeUI
 *   components={{ Card: MyCard, Button: MyButton }}
 * />
 * ```
 *
 * @example Iframe sandbox
 * ```tsx
 * <MessagePrimitive.GenerativeUI
 *   components={{ Card, Button }}
 *   sandbox="iframe"
 * />
 * ```
 */
export const MessagePrimitiveGenerativeUI: FC<
  MessagePrimitiveGenerativeUI.Props
> = ({ components, sandbox, spec, Fallback }) => {
  if (sandbox === "iframe") {
    return (
      <GenerativeUISandboxFrame
        components={components}
        spec={spec}
        Fallback={Fallback}
      />
    );
  }

  return (
    <MessagePrimitiveGenerativeUIBase
      components={components}
      spec={spec}
      Fallback={Fallback}
      sandbox="same-realm"
    />
  );
};

MessagePrimitiveGenerativeUI.displayName = "MessagePrimitive.GenerativeUI";

export {
  GenerativeUIRender,
  GenerativeUIRenderError,
  type GenerativeUIComponentRegistry,
};
