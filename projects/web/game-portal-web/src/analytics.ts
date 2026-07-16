export const gaMeasurementId = "G-VHFQGEJ5D7";

type GtagCommand = "config" | "event" | "js";

type Gtag = (
  command: GtagCommand,
  target: string | Date,
  params?: Record<string, unknown>
) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

function isAnalyticsReady() {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackPageView(pageTitle: string) {
  if (!isAnalyticsReady()) {
    return;
  }

  window.gtag?.("event", "page_view", {
    send_to: gaMeasurementId,
    page_title: pageTitle,
    page_path: `${window.location.pathname}${window.location.search}`,
    page_location: window.location.href
  });
}

export function trackGameOpen(gameId: string, gameTitle: string, gameKind: string) {
  if (!isAnalyticsReady()) {
    return;
  }

  window.gtag?.("event", "game_open", {
    game_id: gameId,
    game_title: gameTitle,
    game_kind: gameKind
  });
}
