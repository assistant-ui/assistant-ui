/* oxlint-disable react/rules-of-hooks -- this module deliberately routes c() between tap and React at runtime */
import { peekResourceFiber } from "../core/helpers/execution-context";
import { useMemoCache } from "../react-hooks/useMemoCache";
import { reactC } from "./useReactMemoCache";

// Runtime drop-in for "react/compiler-runtime": React Compiler output calls
// `c(size)` for its memo cache. Alias `react/compiler-runtime` to this module
// so compiled resource bodies use tap's cache while ordinary React components
// use React's runtime.
const inTap = () => peekResourceFiber() !== null;

export const c = (size: number): unknown[] =>
  inTap() ? useMemoCache(size) : reactC(size);
