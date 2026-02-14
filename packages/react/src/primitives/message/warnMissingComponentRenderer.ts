const warnedComponentNames = new Set<string>();

export const warnMissingComponentRenderer = (name: string) => {
  if (typeof process === "undefined" || process.env.NODE_ENV === "production")
    return;

  if (warnedComponentNames.has(name)) return;
  warnedComponentNames.add(name);

  console.warn(
    `No renderer registered for component message part "${name}". ` +
      `Add components.Component.by_name["${name}"], components.Component.Fallback, or components.Component.Override.`,
  );
};
