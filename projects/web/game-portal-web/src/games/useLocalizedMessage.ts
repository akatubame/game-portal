import { useCallback, useState } from "react";
import { useI18n } from "../i18n";

// 発生時の数値を含む日英文を同時に保持し、言語変更ではゲーム状態を変更しない。
export function useLocalizedMessage(initialJapanese: string, initialEnglish: string) {
  const { language } = useI18n();
  const [message, setMessage] = useState({ ja: initialJapanese, en: initialEnglish });
  const updateMessage = useCallback((ja: string, en: string) => setMessage({ ja, en }), []);
  return [language === "en" ? message.en : message.ja, updateMessage] as const;
}
