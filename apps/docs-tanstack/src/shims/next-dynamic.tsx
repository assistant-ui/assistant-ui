import { lazy, Suspense, type ComponentType } from "react";
export default function dynamic<P extends object>(
  load: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
  opts?: { loading?: ComponentType },
) {
  const L = lazy(async () => {
    const m = await load();
    return {
      default: (typeof m === "function"
        ? m
        : (m as { default: ComponentType<P> }).default) as ComponentType<P>,
    };
  });
  const Fallback = opts?.loading;
  return (props: P) => (
    <Suspense fallback={Fallback ? <Fallback /> : null}>
      <L {...props} />
    </Suspense>
  );
}
