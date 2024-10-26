import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function highlightText(
  searchTerm: string,
  textToHighlight: string | null | undefined,
) {
  const regex = new RegExp(`(${searchTerm})`, "gi");
  if (textToHighlight && textToHighlight.match(regex)) {
    const parts = textToHighlight.split(regex);
    const highlightedText = parts
      .map((part) => (part.match(regex) ? `<mark>${part}</mark>` : part))
      .join("");
    return highlightedText;
  } else {
    return textToHighlight;
  }
}