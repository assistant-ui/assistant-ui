import { renderTractionImage } from "@/lib/traction-image";

export const runtime = "nodejs";
export const revalidate = 21_600;

export const GET = () => renderTractionImage("dark");
