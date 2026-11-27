import {
  GALLERY_TEMPLATES,
  type GalleryTemplate,
} from "@/lib/gallery-templates";

export type GenerativeElement = {
  slug: string;
  templateSlug: string;
  template: GalleryTemplate;
};

export const GENERATIVE_ELEMENTS: GenerativeElement[] = GALLERY_TEMPLATES.map(
  (template) => ({
    slug: `generative-${template.slug}`,
    templateSlug: template.slug,
    template,
  }),
);

export function getGenerativeElement(
  slug: string,
): GenerativeElement | undefined {
  return GENERATIVE_ELEMENTS.find((entry) => entry.slug === slug);
}

export const GENERATIVE_USAGE = `import { renderGenerativeUI } from "@assistant-ui/generative-ui/react";

<div data-aui-theme="elements">
  {renderGenerativeUI(spec, library, { status: "done" })}
</div>`;
