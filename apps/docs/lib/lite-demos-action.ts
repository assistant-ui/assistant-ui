"use server";

import { isLiteDemo, loadLiteDemo } from "./lite-demos";

// Only the lite-mode placeholder imports this, so it never reaches a build.
export async function loadLiteDemoAction(demo: string) {
  if (process.env.NODE_ENV !== "development" || !isLiteDemo(demo)) return;
  loadLiteDemo(process.cwd(), demo);
}
