export const isDevelopment =
  typeof process !== "undefined" &&
  (process.env["NODE_ENV"] === "development" ||
    process.env["NODE_ENV"] === "test");
