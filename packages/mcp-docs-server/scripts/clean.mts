import { rm } from "fs/promises";

await Promise.all([
  rm("dist", { recursive: true, force: true }),
  rm(".docs", { recursive: true, force: true })
]);
