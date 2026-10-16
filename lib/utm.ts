import { UTM_KEYS, type UtmKey } from "@/lib/validation/waitlist";

const STORAGE_KEY = "utm-params";

/**
 * Reads UTM parameters from the current URL, falling back to ones captured earlier this session
 * (so they survive in-page navigation). Browser only.
 */
export function captureUtmParams(): Partial<Record<UtmKey, string>> {
  const fromUrl: Partial<Record<UtmKey, string>> = {};
  const params = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) fromUrl[key] = value.slice(0, 128);
  }
  try {
    if (Object.keys(fromUrl).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Partial<Record<UtmKey, string>>) : {};
  } catch {
    return fromUrl;
  }
}
