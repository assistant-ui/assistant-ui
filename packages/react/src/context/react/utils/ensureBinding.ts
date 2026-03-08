type Bindable = {
  __internal_bindMethods?: () => void;
  __isBound?: boolean;
};
const debugVerifyPrototype = (
  runtime: Record<string, unknown>,
  prototype: any,
) => {
  const unboundMethods = Object.getOwnPropertyNames(prototype).filter(
    (methodStr) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodStr);
      const isMethod = descriptor && typeof descriptor.value === "function";
      if (!isMethod) return false;

      const methodName = methodStr as keyof typeof runtime | "constructor";
      return (
        isMethod &&
        !methodName.startsWith("_") &&
        methodName !== "constructor" &&
        prototype[methodName] === runtime[methodName]
      );
    },
  );

  if (unboundMethods.length > 0) {
    throw new Error(
      `The following methods are not bound: ${JSON.stringify(unboundMethods)}`,
    );
  }

  const prototypePrototype = Object.getPrototypeOf(prototype);
  if (prototypePrototype && prototypePrototype !== Object.prototype) {
    debugVerifyPrototype(runtime, prototypePrototype);
  }
};
export const ensureBinding = (r: unknown) => {
  const runtime = r as Bindable;
  if (runtime.__isBound) return;

  runtime.__internal_bindMethods?.();
  runtime.__isBound = true;

  if (process.env.NODE_ENV !== "production") {
    debugVerifyPrototype(runtime, Object.getPrototypeOf(runtime));
  }
};
