import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Language } from "./i18n";
import {
  dismissOfflineReady,
  dismissRefresh,
  getPwaSnapshot,
  subscribePwa,
  updateServiceWorker
} from "./pwa";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const copy = {
  ja: {
    install: "アプリとして追加",
    iosHint: "Safariの共有ボタンから「ホーム画面に追加」を選んでください。",
    offline: "オフラインモード",
    offlineReady: "オフラインでも遊べる準備ができました。",
    update: "新しいバージョンがあります。",
    updateButton: "更新して再読み込み",
    close: "閉じる"
  },
  en: {
    install: "Install app",
    iosHint: "In Safari, open Share and choose Add to Home Screen.",
    offline: "Offline mode",
    offlineReady: "Game Shelf is ready to play offline.",
    update: "A new version is available.",
    updateButton: "Update and reload",
    close: "Close"
  }
} as const;

export function PwaControls({
  language,
  showInstall = true
}: {
  language: Language;
  showInstall?: boolean;
}) {
  const pwa = useSyncExternalStore(subscribePwa, getPwaSnapshot, getPwaSnapshot);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  const t = copy[language];
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const canOfferInstall = showInstall && !installed && (installPrompt !== null || isIos);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstallHint(false);
    };
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const requestInstall = async () => {
    if (!installPrompt) {
      setShowInstallHint(true);
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <>
      {canOfferInstall && (
        <button className="pwa-install-button" type="button" onClick={requestInstall}>
          <Download aria-hidden="true" />
          {t.install}
        </button>
      )}

      {!online && (
        <div className="pwa-offline-badge" role="status">
          <WifiOff aria-hidden="true" />
          {t.offline}
        </div>
      )}

      {(pwa.needRefresh || pwa.offlineReady || showInstallHint) && (
        <div className="pwa-toast" role="status" aria-live="polite">
          <p>{pwa.needRefresh ? t.update : showInstallHint ? t.iosHint : t.offlineReady}</p>
          {pwa.needRefresh && (
            <button type="button" onClick={() => void updateServiceWorker(true)}>
              <RefreshCw aria-hidden="true" />
              {t.updateButton}
            </button>
          )}
          <button
            className="pwa-toast-close"
            type="button"
            aria-label={t.close}
            onClick={() => {
              dismissRefresh();
              dismissOfflineReady();
              setShowInstallHint(false);
            }}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
