export const CONSENT_STORAGE_KEY = "aui-consent";
export const CONSENT_CHANGE_EVENT = "aui-consent-change";

export type ConsentChoice = "granted" | "denied";

export function getStoredConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function setStoredConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {}
  window.dispatchEvent(
    new CustomEvent<ConsentChoice>(CONSENT_CHANGE_EVENT, { detail: choice }),
  );
}

export function hasGlobalPrivacyControl(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl ===
      true
  );
}

let consentRequiredPromise: Promise<boolean> | undefined;

export function isConsentRequired(): Promise<boolean> {
  consentRequiredPromise ??= fetch("/api/consent")
    .then((res): Promise<{ required?: boolean }> =>
      res.ok ? res.json() : Promise.resolve({}),
    )
    .then((data) => data.required !== false)
    .catch(() => true);
  return consentRequiredPromise;
}
