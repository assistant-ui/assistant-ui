import { isDevelopment } from "../../core/helpers/env";

export const depsShallowEqual = (
  a: readonly unknown[],
  b: readonly unknown[],
) => {
  if (isDevelopment && a.length !== b.length) {
    console.error(
      "The final argument passed to a hook changed size between renders. " +
        "The order and size of this array must remain constant.\n\n" +
        `Previous: [${a.join(", ")}]\n` +
        `Incoming: [${b.join(", ")}]`,
    );
  }

  for (let i = 0; i < a.length && i < b.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
};
