import { useCallback, useEffect, useState } from "react";
import { i18n, subscribeToLocaleChange } from "../i18n";

/**
 * Returns a reactive `t()` function that re-renders when the locale changes.
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<string>(i18n.locale);

  useEffect(() => {
    const unsubscribe = subscribeToLocaleChange(() => {
      setLocaleState(i18n.locale);
    });
    return unsubscribe;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => i18n.t(key, params),
    // Re-create when locale changes so components re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  return { t, locale };
}