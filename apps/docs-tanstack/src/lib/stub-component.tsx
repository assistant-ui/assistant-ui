import type { ReactNode } from "react";

/** Placeholder for a component the spike does not port. Property access returns more stubs (Flow.Node etc.). */
export function makeStub(name: string, from = "mdx"): any {
  const C = ({ children }: { children?: ReactNode }) => (
    <div
      data-spike-stub={name}
      data-from={from}
      className="my-4 rounded border border-dashed p-3 text-sm opacity-70"
    >
      [{name}]{children}
    </div>
  );
  return new Proxy(C, {
    get(target, prop, recv) {
      if (prop in target || typeof prop === "symbol")
        return Reflect.get(target, prop, recv);
      return makeStub(`${name}.${String(prop)}`, from);
    },
  });
}
