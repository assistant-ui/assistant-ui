/*
 * A signed-out visitor is a guest. The proxy gives each browser a random
 * session id in a cookie; the guest's name and avatar are worked out from
 * that id, so the same browser keeps the same name until its cookies are
 * cleared. Nothing about a guest is stored on the server.
 */

export const SESSION_COOKIE = "base_session";
export const THEME_COOKIE = "base_theme";

export type Theme = "light" | "dark";

export type Guest = {
  name: string;
  initials: string;
  /** The hue the avatar's gradient starts from, 0 to 359. */
  hue: number;
};

const ADJECTIVES = [
  "Quiet",
  "Bright",
  "Swift",
  "Gentle",
  "Clever",
  "Bold",
  "Calm",
  "Lucky",
  "Merry",
  "Brave",
  "Keen",
  "Sunny",
  "Witty",
  "Noble",
  "Cosmic",
  "Mellow",
] as const;

const ANIMALS = [
  "Otter",
  "Falcon",
  "Panda",
  "Fox",
  "Heron",
  "Lynx",
  "Koala",
  "Robin",
  "Badger",
  "Owl",
  "Seal",
  "Wren",
  "Bison",
  "Hare",
  "Moth",
  "Crane",
] as const;

/* FNV-1a: a small, even hash, so nearby ids still get different names. */
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function guestFromSession(sessionId: string | undefined): Guest {
  if (!sessionId) return { name: "Guest", initials: "G", hue: 220 };
  const value = hash(sessionId);
  const adjective = ADJECTIVES[value % ADJECTIVES.length] ?? ADJECTIVES[0];
  const animal = ANIMALS[(value >>> 4) % ANIMALS.length] ?? ANIMALS[0];
  return {
    name: `${adjective} ${animal}`,
    initials: `${adjective[0]}${animal[0]}`,
    hue: (value >>> 8) % 360,
  };
}

export function themeFromCookie(value: string | undefined): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
