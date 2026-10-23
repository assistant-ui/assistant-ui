import type { GenerativeUILibrary } from "../types";
import { mediaDefinitions } from "./definitions/media";
import { allowedImageSrc, imageStyle } from "./imageStyle";
import { mapPlaces, placeHref } from "./structureValues";
import { toTextContent } from "./toTextContent";

export const mediaVocabulary = {
  Image: {
    ...mediaDefinitions.Image,
    render: ({ src, alt, size, round, $imageOrigins }) => {
      if (!allowedImageSrc(src, $imageOrigins)) return alt ?? null;
      const { numericSize, style } = imageStyle(size, round);

      return (
        <img
          data-aui="image"
          data-aui-size={numericSize === undefined ? size : undefined}
          data-aui-sized={numericSize !== undefined || undefined}
          data-aui-round={round || undefined}
          src={src}
          alt={alt}
          style={style}
        />
      );
    },
  },
  Divider: {
    ...mediaDefinitions.Divider,
    render: ({ flush }) => (
      <hr data-aui="divider" data-aui-flush={flush || undefined} />
    ),
  },
  Diagram: {
    ...mediaDefinitions.Diagram,
    render: ({ code, title }) => {
      const caption = toTextContent(title);
      return (
        <figure data-aui="diagram">
          <pre data-aui="diagram-code">
            <code>{toTextContent(code)}</code>
          </pre>
          {caption != null ? (
            <figcaption data-aui="diagram-title">{caption}</figcaption>
          ) : null}
        </figure>
      );
    },
  },
  Map: {
    ...mediaDefinitions.Map,
    render: ({ places }) => (
      <ol data-aui="map">
        {mapPlaces(places).map((place, index) => (
          <li key={index} data-aui="map-place">
            <a
              data-aui="map-place-label"
              href={placeHref(place)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {place.label}
            </a>
            {place.detail !== undefined ? (
              <div data-aui="map-place-detail">{place.detail}</div>
            ) : null}
          </li>
        ))}
      </ol>
    ),
  },
} satisfies GenerativeUILibrary;
