import { Geist, Geist_Mono, Inter } from "next/font/google";
import type { LibraryMonoId, LibrarySansId } from "@/lib/library/themes";

// The typefaces a library theme can pick beyond the site's own. Nothing is
// preloaded: a face downloads only when a theme uses it.
const geist = Geist({ subsets: ["latin"], preload: false });
const inter = Inter({ subsets: ["latin"], preload: false });
const geistMono = Geist_Mono({ subsets: ["latin"], preload: false });

/** Each typeface's CSS font-family, by its id in `LIBRARY_FONTS`. */
export const LIBRARY_FONT_FAMILIES: Partial<
  Record<LibrarySansId | LibraryMonoId, string>
> = {
  geist: geist.style.fontFamily,
  inter: inter.style.fontFamily,
  "geist-mono": geistMono.style.fontFamily,
};
