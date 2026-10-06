import { renderTractionImage } from "@/lib/traction-image";
import { connection } from "next/server";

export const maxDuration = 60;

export const GET = async () => {
  // api.npmjs.org limits requests per IP, so npm is read at request time.
  await connection();
  return renderTractionImage("dark");
};
