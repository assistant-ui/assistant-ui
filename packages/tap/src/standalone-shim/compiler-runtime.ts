/* oxlint-disable react/rules-of-hooks -- this module deliberately routes c() to tap at runtime */
// React-free runtime drop-in for "react/compiler-runtime": route compiler memo caches to tap inside a resource render and throw outside one. Alias `react/compiler-runtime` to this module in compiled code hosted inside `createTapRoot`.
import { peekResourceFiber } from "../core/helpers/execution-context";
import { useMemoCache } from "../react-hooks/useMemoCache";

const throwOutsideTap = (name: string): never => {
  throw new Error(
    `${name} from @assistant-ui/tap/standalone-shim was called outside a tap resource render. The standalone shim has no React fallback; host this code inside createTapRoot.`,
  );
};

export const c = (size: number): unknown[] =>
  peekResourceFiber() !== null ? useMemoCache(size) : throwOutsideTap("c");
