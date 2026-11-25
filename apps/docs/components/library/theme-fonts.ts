import {
  DM_Sans,
  EB_Garamond,
  Figtree,
  Geist,
  Geist_Mono,
  IBM_Plex_Sans,
  Instrument_Sans,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Lora,
  Manrope,
  Merriweather,
  Montserrat,
  Noto_Sans,
  Noto_Serif,
  Nunito_Sans,
  Outfit,
  Oxanium,
  Playfair_Display,
  Public_Sans,
  Raleway,
  Roboto,
  Roboto_Slab,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
import type { ThemeFont } from "@/lib/library/themes";

/*
 * Every font a preset can name. None is preloaded, so a page fetches only the
 * ones a preview on it uses. The font loader reads its options at build time,
 * so each call writes them out.
 */
const dmSans = DM_Sans({ subsets: ["latin"], preload: false });
const ebGaramond = EB_Garamond({ subsets: ["latin"], preload: false });
const figtree = Figtree({ subsets: ["latin"], preload: false });
const geist = Geist({ subsets: ["latin"], preload: false });
const geistMono = Geist_Mono({ subsets: ["latin"], preload: false });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"], preload: false });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], preload: false });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  preload: false,
  weight: "400",
});
const inter = Inter({ subsets: ["latin"], preload: false });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], preload: false });
const lora = Lora({ subsets: ["latin"], preload: false });
const manrope = Manrope({ subsets: ["latin"], preload: false });
const merriweather = Merriweather({ subsets: ["latin"], preload: false });
const montserrat = Montserrat({ subsets: ["latin"], preload: false });
const notoSans = Noto_Sans({ subsets: ["latin"], preload: false });
const notoSerif = Noto_Serif({ subsets: ["latin"], preload: false });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], preload: false });
const outfit = Outfit({ subsets: ["latin"], preload: false });
const oxanium = Oxanium({ subsets: ["latin"], preload: false });
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  preload: false,
});
const publicSans = Public_Sans({ subsets: ["latin"], preload: false });
const raleway = Raleway({ subsets: ["latin"], preload: false });
const roboto = Roboto({ subsets: ["latin"], preload: false });
const robotoSlab = Roboto_Slab({ subsets: ["latin"], preload: false });
const sourceSans3 = Source_Sans_3({ subsets: ["latin"], preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], preload: false });

export const THEME_FONT_FAMILIES: Record<ThemeFont, string> = {
  inter: inter.style.fontFamily,
  "noto-sans": notoSans.style.fontFamily,
  "nunito-sans": nunitoSans.style.fontFamily,
  figtree: figtree.style.fontFamily,
  roboto: roboto.style.fontFamily,
  raleway: raleway.style.fontFamily,
  "dm-sans": dmSans.style.fontFamily,
  "public-sans": publicSans.style.fontFamily,
  outfit: outfit.style.fontFamily,
  "jetbrains-mono": jetbrainsMono.style.fontFamily,
  geist: geist.style.fontFamily,
  "geist-mono": geistMono.style.fontFamily,
  lora: lora.style.fontFamily,
  merriweather: merriweather.style.fontFamily,
  "playfair-display": playfairDisplay.style.fontFamily,
  "noto-serif": notoSerif.style.fontFamily,
  "roboto-slab": robotoSlab.style.fontFamily,
  oxanium: oxanium.style.fontFamily,
  manrope: manrope.style.fontFamily,
  "space-grotesk": spaceGrotesk.style.fontFamily,
  montserrat: montserrat.style.fontFamily,
  "ibm-plex-sans": ibmPlexSans.style.fontFamily,
  "source-sans-3": sourceSans3.style.fontFamily,
  "instrument-sans": instrumentSans.style.fontFamily,
  "eb-garamond": ebGaramond.style.fontFamily,
  "instrument-serif": instrumentSerif.style.fontFamily,
};
