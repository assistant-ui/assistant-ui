// Runtime drop-in for "react/compiler-runtime": React Compiler output calls
// `c(size)` for its memo cache, which the shimmed useMemoCache routes to tap
// inside a resource render and to React's own compiler runtime otherwise.
// Aliased the same way as the "react" shim (x-buildutils `output.paths`).
export { useMemoCache as c } from "./index";
