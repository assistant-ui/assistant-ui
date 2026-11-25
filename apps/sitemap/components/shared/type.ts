/*
 * The docs site's type styles, with each size, leading, weight, and tracking
 * read from a `--type-*` variable whose fallback is the docs value, so the
 * token panel can change them live. Unset, they render as in apps/docs.
 */

export const typeHero =
  "font-display text-balance text-[length:var(--type-hero-size,2.75rem)] lg:text-[length:var(--type-hero-size-lg,4.5rem)] [line-height:var(--type-hero-leading,1.04)] [font-weight:var(--type-hero-weight,500)] [letter-spacing:var(--type-hero-tracking,var(--tracking-hero))]";

export const typeSection =
  "font-display text-balance text-[length:var(--type-section-size,1.5rem)] lg:text-[length:var(--type-section-size-lg,1.75rem)] [line-height:var(--type-section-leading,1.375)] [font-weight:var(--type-section-weight,550)] [letter-spacing:var(--type-section-tracking,var(--tracking-section))]";

export const typePage =
  "font-display text-balance text-[length:var(--type-page-size,1.875rem)] md:text-[length:var(--type-page-size-lg,2.25rem)] [line-height:var(--type-page-leading,1.2)] md:[line-height:var(--type-page-leading,1.111)] [font-weight:var(--type-page-weight,550)] [letter-spacing:var(--type-page-tracking,var(--tracking-section))]";

export const typeDeck =
  "text-muted-foreground max-w-[40ch] text-pretty text-[length:var(--type-deck-size,15px)] [line-height:var(--type-deck-leading,1.625)] [font-weight:var(--type-deck-weight,400)] [letter-spacing:var(--type-deck-tracking,0em)]";

export const typePackage =
  "font-mono text-balance text-[length:var(--type-package-size,1.5rem)] lg:text-[length:var(--type-package-size-lg,1.75rem)] [line-height:var(--type-package-leading,1.375)] [font-weight:var(--type-package-weight,500)] [letter-spacing:var(--type-package-tracking,var(--tracking-section))] [font-variant-ligatures:none]";
