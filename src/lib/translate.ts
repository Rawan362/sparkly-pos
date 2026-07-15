import { languageLabel } from "./languages";

const CACHE_PREFIX = "sparkly.i18n.";

function cacheKey(languageCode: string): string {
  return `${CACHE_PREFIX}${languageCode}`;
}

function loadCache(languageCode: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(cacheKey(languageCode));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveCache(languageCode: string, cache: Record<string, string>): void {
  try {
    window.localStorage.setItem(cacheKey(languageCode), JSON.stringify(cache));
  } catch {
    // localStorage full/unavailable -- translations just won't persist
    // across reloads; nothing else in the app depends on this succeeding.
  }
}

/**
 * Translates whatever `texts` aren't already cached for `languageCode`,
 * via the /api/translate Cloudflare Pages Function (which holds the
 * Anthropic key server-side), then merges the results into the
 * localStorage cache so each string is only ever translated once per
 * language. Returns the full English->translated map for the requested
 * texts (cached + newly-fetched). Never throws -- on any failure the
 * caller gets the English originals back so the UI still renders.
 */
export async function translateBatch(
  languageCode: string,
  texts: string[]
): Promise<Record<string, string>> {
  const cache = loadCache(languageCode);
  const missing = Array.from(new Set(texts)).filter((t) => !(t in cache));

  if (missing.length === 0) {
    return cache;
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language: languageLabel(languageCode),
        texts: missing,
      }),
    });
    if (!res.ok) return cache;

    const data = (await res.json()) as { translations?: string[] };
    if (!Array.isArray(data.translations) || data.translations.length !== missing.length) {
      return cache;
    }

    const next = { ...cache };
    missing.forEach((text, i) => {
      const translated = data.translations![i];
      if (typeof translated === "string" && translated.trim()) {
        next[text] = translated;
      }
    });
    saveCache(languageCode, next);
    return next;
  } catch {
    return cache;
  }
}
