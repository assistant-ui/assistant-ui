declare const process: undefined | { env?: Record<string, string | undefined> };

export const isDevelopment =
  typeof process !== "undefined" &&
  (process.env?.NODE_ENV === "development" || process.env?.NODE_ENV === "test");
