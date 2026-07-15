"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabaseClient";
import { useSeller } from "./SellerContext";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
import type { PosSettings } from "./types";
import { formatMoney as formatMoneyUtil } from "./currencies";
import { translateBatch } from "./translate";

const DEFAULTS: Omit<PosSettings, "chat_id"> = {
  inventory_tracking_active: false,
  low_stock_alerts_active: false,
  low_stock_default_threshold: null,
  auto_invoice_active: false,
  invoice_prefix: null,
  next_invoice_number: null,
  language: "en",
  currency: "USD",
};

type SettingsContextValue = {
  settings: PosSettings | null;
  update: (patch: Partial<PosSettings>) => Promise<{ error: string | null }>;
  language: string;
  currency: string;
  // Translates UI chrome text (nav labels, buttons, headers, empty states)
  // -- never call this on seller-authored data (product/customer names).
  // Returns the English original until the async translation resolves and
  // caches, then re-renders with the translated string.
  t: (text: string) => string;
  formatMoney: (amount: number | null | undefined) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadTranslationCache(languageCode: string): Record<string, string> {
  if (languageCode === "en") return {};
  try {
    const raw = window.localStorage.getItem(`sparkly.i18n.${languageCode}`);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { sellerId } = useSeller();
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const language = settings?.language ?? "en";
  const currency = settings?.currency ?? "USD";

  // Strings queued for translation get batched into one request per ~200ms
  // burst of t() calls (i.e. one request per page render), instead of one
  // request per string.
  const pendingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("pos_settings")
      .select("*")
      .eq("chat_id", sellerId)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data ?? { chat_id: sellerId, ...DEFAULTS });
      });
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "pos_settings",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  // Whenever the selected language changes, seed the in-memory map from
  // whatever's already cached for it so previously-translated strings show
  // instantly instead of flashing English while new ones resolve.
  useEffect(() => {
    // Reads localStorage, so this can only happen client-side in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslations(loadTranslationCache(language));
    pendingRef.current.clear();
  }, [language]);

  const flush = useCallback(() => {
    timerRef.current = null;
    const texts = Array.from(pendingRef.current);
    pendingRef.current.clear();
    if (texts.length === 0) return;
    const requestedLanguage = languageRef.current;
    translateBatch(requestedLanguage, texts).then((map) => {
      // Selected language changed while the request was in flight -- drop
      // the stale result instead of applying it to the new language.
      if (languageRef.current !== requestedLanguage) return;
      setTranslations((prev) => ({ ...prev, ...map }));
    });
  }, []);

  const t = useCallback(
    (text: string): string => {
      if (!text || language === "en") return text;
      const cached = translations[text];
      if (cached !== undefined) return cached;
      if (!pendingRef.current.has(text)) {
        pendingRef.current.add(text);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, 200);
      }
      return text;
    },
    [language, translations, flush]
  );

  const update = useCallback(
    async (patch: Partial<PosSettings>): Promise<{ error: string | null }> => {
      if (!sellerId) return { error: "No seller selected." };
      const prev = settings;
      setSettings((cur) => (cur ? { ...cur, ...patch } : cur));
      const { error } = await supabase
        .from("pos_settings")
        .upsert({ chat_id: sellerId, ...patch }, { onConflict: "chat_id" });
      if (error) {
        setSettings(prev);
        return { error: error.message };
      }
      return { error: null };
    },
    [sellerId, settings]
  );

  const formatMoney = useCallback(
    (amount: number | null | undefined) => formatMoneyUtil(amount, currency),
    [currency]
  );

  const value = useMemo(
    () => ({ settings, update, language, currency, t, formatMoney }),
    [settings, update, language, currency, t, formatMoney]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
