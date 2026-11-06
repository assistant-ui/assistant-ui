export const cn = (...values: (string | false | undefined)[]) =>
  values.filter(Boolean).join(" ");
