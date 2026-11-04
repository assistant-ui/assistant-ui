import { CLOUD_URL } from "./constants.ts";

export const RENDERER_PATH = "/renderer";

export const RENDERER_ALLOWED_ORIGINS = [
  CLOUD_URL,
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3001"] : []),
];
