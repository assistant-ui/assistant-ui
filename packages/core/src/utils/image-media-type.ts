/**
 * Leading-byte signatures for the image formats a browser or attachment
 * adapter realistically produces. `null` matches any byte, which WebP needs
 * because its four size bytes sit between the two markers, and AVIF and HEIC
 * need because their leading `ftyp` box size varies by encoder.
 *
 * These are file format constants rather than an evolving API, so the table
 * mirrors the one the AI SDK applies on the far side of several adapters
 * without taking a dependency to reach it.
 */
const IMAGE_SIGNATURES: readonly {
  readonly mediaType: string;
  readonly prefix: readonly (number | null)[];
}[] = [
  { mediaType: "image/gif", prefix: [0x47, 0x49, 0x46] },
  { mediaType: "image/png", prefix: [0x89, 0x50, 0x4e, 0x47] },
  { mediaType: "image/jpeg", prefix: [0xff, 0xd8] },
  {
    mediaType: "image/webp",
    prefix: [
      0x52,
      0x49,
      0x46,
      0x46,
      null,
      null,
      null,
      null,
      0x57,
      0x45,
      0x42,
      0x50,
    ],
  },
  { mediaType: "image/bmp", prefix: [0x42, 0x4d] },
  { mediaType: "image/tiff", prefix: [0x49, 0x49, 0x2a, 0x00] },
  { mediaType: "image/tiff", prefix: [0x4d, 0x4d, 0x00, 0x2a] },
  {
    mediaType: "image/avif",
    prefix: [
      null,
      null,
      null,
      null,
      0x66,
      0x74,
      0x79,
      0x70,
      0x61,
      0x76,
      0x69,
      0x66,
    ],
  },
  {
    mediaType: "image/heic",
    prefix: [
      null,
      null,
      null,
      null,
      0x66,
      0x74,
      0x79,
      0x70,
      0x68,
      0x65,
      0x69,
      0x63,
    ],
  },
];

/** 16 base64 characters decode to the 12 bytes the longest signature needs. */
const PREFIX_CHARS = 16;

const decodePrefix = (base64: string): Uint8Array | undefined => {
  const prefix = base64.slice(0, PREFIX_CHARS);
  const aligned = prefix.slice(0, prefix.length - (prefix.length % 4));
  if (aligned.length === 0) return undefined;

  const nodeBuffer = (
    globalThis as {
      Buffer?: {
        from(data: string, encoding: string): Uint8Array;
      };
    }
  ).Buffer;
  if (nodeBuffer) return new Uint8Array(nodeBuffer.from(aligned, "base64"));

  try {
    const binary = atob(aligned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return undefined;
  }
};

/**
 * The image media type a base64 payload's leading bytes identify, or
 * `undefined` when they match no known signature or the input is not base64.
 *
 * An `ImageMessagePart` carries no media type, so an adapter that must declare
 * one on the wire reads it from the bytes rather than assuming a format. Never
 * throws: the input is whatever a caller put on the part.
 */
export function detectImageMediaType(base64: string): string | undefined {
  const bytes = decodePrefix(base64);
  if (!bytes) return undefined;

  return IMAGE_SIGNATURES.find(
    ({ prefix }) =>
      bytes.length >= prefix.length &&
      prefix.every((byte, index) => byte === null || bytes[index] === byte),
  )?.mediaType;
}
