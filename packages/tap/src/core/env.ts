export const isDevelopment =
  process.env["NODE_ENV"] === "development" ||
  process.env["NODE_ENV"] === "test";
