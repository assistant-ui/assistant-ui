const OPT_IN_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "GB",
  "CH",
]);

// Codes the geo lookup sends when it cannot place a visitor (XX) or sees Tor (T1).
const UNKNOWN_COUNTRIES = new Set(["XX", "T1"]);

/** Whether browser analytics need an opt-in for a visitor from this country. An unknown or malformed country counts as needing one. */
export function consentRequiredFor(country: string | null): boolean {
  if (country === null || !/^[A-Z]{2}$/.test(country)) return true;
  return UNKNOWN_COUNTRIES.has(country) || OPT_IN_COUNTRIES.has(country);
}
