/**
 * Docs-only staging CSS for the generative-ui gallery: canvas, elevation, and hover. These are properties of the gallery's presentation context (a showroom), not of the vocabulary's own anatomy, so they stay out of the shipped stylesheet in packages/ui and never affect how a widget renders inside a real chat stream.
 */
export const galleryStagingCss = `
.aui-gallery {
  --aui-control-height: 2.25rem;
  --aui-control-font-size: 0.8125rem;
  --aui-button-padding-x: 1rem;
  --aui-field-padding-x: 0.75rem;
}

.aui-gallery-canvas {
  background: color-mix(in oklab, var(--muted) 45%, var(--background));
  border-radius: 24px;
  padding: 2rem;
}

.aui-gallery [data-aui="card"] {
  border-color: transparent;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.05), 0 8px 24px -12px rgb(0 0 0 / 0.12);
}

.dark .aui-gallery [data-aui="card"],
.aui-gallery .dark [data-aui="card"] {
  border-color: color-mix(in oklab, var(--border) 70%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2), 0 12px 32px -12px rgb(0 0 0 / 0.5);
}

.aui-gallery [data-aui="carousel-slide"] [data-aui="card"] {
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.08);
}

.dark .aui-gallery [data-aui="carousel-slide"] [data-aui="card"],
.aui-gallery .dark [data-aui="carousel-slide"] [data-aui="card"] {
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
}

@media (hover: hover) and (pointer: fine) {
  .aui-gallery-item {
    transition:
      transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
      box-shadow 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .aui-gallery-item:hover {
    transform: translateY(-2px);
  }

  .aui-gallery-item:hover [data-aui="card"] {
    box-shadow: 0 4px 8px rgb(0 0 0 / 0.08), 0 16px 32px -12px rgb(0 0 0 / 0.18);
  }

  .aui-gallery-item:hover [data-aui="carousel-slide"] [data-aui="card"] {
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    .aui-gallery-item {
      transition: box-shadow 150ms cubic-bezier(0.23, 1, 0.32, 1);
    }

    .aui-gallery-item:hover {
      transform: none;
    }
  }
}
`;
