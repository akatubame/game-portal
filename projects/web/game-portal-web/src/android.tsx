import { safeStorage } from "./safeStorage";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { I18nContext, detectInitialLanguage, type Language } from "./i18n";
import { ColorChainRotationTest } from "./games/colorChain/ColorChainRotationTest";
import "./styles.css";

function AndroidPuzzle() {
  const [language, updateLanguage] = useState<Language>(detectInitialLanguage);
  const setLanguage = (next: Language) => {
    updateLanguage(next);
    try { safeStorage.setItem("game-shelf-language", next); } catch { /* 保存不可でも遊べる */ }
  };
  return <I18nContext.Provider value={{ language, setLanguage }}>
    <ColorChainRotationTest presentation="android" onBack={() => {
      const host = window as Window & { PuzzleHost?: { requestExit: () => void } };
      host.PuzzleHost?.requestExit();
    }} />
  </I18nContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<AndroidPuzzle />);
