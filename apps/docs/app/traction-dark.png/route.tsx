import { renderTractionImage } from "@/lib/traction-image";

export const runtime = "nodejs";
export const maxDuration = 60;

// api.npmjs.org allows about forty requests a minute per IP, which a build
// shares with every other build on the platform, so npm is read at request time.
export const dynamic = "force-dynamic";

export const GET = () => renderTractionImage("dark");
