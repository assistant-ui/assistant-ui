import { renderTractionImage } from "@/lib/traction-image";

export const maxDuration = 60;

export const GET = async () => {
  // api.npmjs.org limits requests per IP, so npm is read at request time.
  return renderTractionImage("dark");
};
