/**
 * Offline assets for the content sections: `data:` URLs, so no section
 * depends on the network (img-src allows `data:`).
 */

const svgUrl = (width: number, height: number, body: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;

/** A landscape picture with a sky gradient, hills and a sun. */
export const landscape = (sky: string, hill: string, sun: string) =>
  svgUrl(
    640,
    400,
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="640" height="400" fill="url(#s)"/><circle cx="470" cy="120" r="54" fill="${sun}"/><path d="M0 300 Q160 200 320 290 T640 260 V400 H0 Z" fill="${hill}"/><path d="M0 340 Q200 280 380 340 T640 330 V400 H0 Z" fill="${hill}" opacity="0.7"/>`,
  );

export const IMAGES = {
  dawn: landscape("#f9a8d4", "#1e3a8a", "#fde68a"),
  noon: landscape("#60a5fa", "#166534", "#fef08a"),
  dusk: landscape("#f97316", "#431407", "#fecaca"),
  night: landscape("#1e1b4b", "#020617", "#e0e7ff"),
  mist: landscape("#cbd5e1", "#475569", "#f8fafc"),
};

/** A 32x32 square favicon. */
export const FAVICON = svgUrl(
  32,
  32,
  `<rect width="32" height="32" rx="8" fill="#2563eb"/><path d="M9 22 L16 9 L23 22 Z" fill="#fff"/>`,
);

/** A one-second 440 Hz sine tone as a 8 kHz mono 8-bit WAV `data:` URL. */
export const TONE_WAV = (() => {
  const rate = 8000;
  const samples = rate;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, "data");
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) {
    bytes[44 + i] =
      128 + Math.round(60 * Math.sin((2 * Math.PI * 440 * i) / rate));
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
})();
