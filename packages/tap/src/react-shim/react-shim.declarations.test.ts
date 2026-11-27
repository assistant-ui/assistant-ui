import type * as ReactShim from "@assistant-ui/tap/react-shim";
import type * as CompilerRuntimeShim from "@assistant-ui/tap/react-shim/compiler-runtime";
import type * as React from "react";
import { expectTypeOf, it } from "vitest";

// The package name resolves through the exports map to the built declarations
// a consumer type-checks against, which the relative module does not reach.
it("types the published react-shim exports as React's", () => {
  expectTypeOf<typeof ReactShim.default>().toEqualTypeOf<typeof React>();
  expectTypeOf<typeof ReactShim.useState>().toEqualTypeOf<
    typeof React.useState
  >();
  expectTypeOf<typeof ReactShim.useEffect>().toEqualTypeOf<
    typeof React.useEffect
  >();
  expectTypeOf<typeof ReactShim.useEffectEvent>().toEqualTypeOf<
    typeof React.useEffectEvent
  >();
  expectTypeOf<typeof ReactShim.use>().toEqualTypeOf<typeof React.use>();
  expectTypeOf<typeof ReactShim.createContext>().toEqualTypeOf<
    typeof React.createContext
  >();
  expectTypeOf<typeof ReactShim.Component>().toEqualTypeOf<
    typeof React.Component
  >();
  expectTypeOf<typeof CompilerRuntimeShim.c>().toEqualTypeOf<
    (size: number) => unknown[]
  >();
});
