import type { ReactNode } from "react";

/** Placeholder for a component the spike does not port. Capitalized member access returns more stubs (Flow.Node etc.). */
export function makeStub(name: string, from = "mdx"): any {
  function Stub({ children }: { children?: ReactNode }) {
    return (
      <div
        data-spike-stub={name}
        data-from={from}
        className="my-4 rounded border border-dashed p-3 text-sm opacity-70"
      >
        [{name}]{children}
      </div>
    );
  }
  return new Proxy(Stub, {
    get(target, prop, recv) {
      // React probes prototype/isReactComponent/$$typeof; only Capitalized names become sub-stubs.
      if (typeof prop === "symbol" || prop in target || !/^[A-Z]/.test(prop))
        return Reflect.get(target, prop, recv);
      return makeStub(`${name}.${prop}`, from);
    },
  });
}
