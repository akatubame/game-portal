import { registerSW } from "virtual:pwa-register";

export type PwaSnapshot = {
  needRefresh: boolean;
  offlineReady: boolean;
};

let snapshot: PwaSnapshot = { needRefresh: false, offlineReady: false };
const listeners = new Set<() => void>();
let reloadingForUpdate = false;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) {
      return;
    }

    reloadingForUpdate = true;
    window.location.reload();
  });
}

function updateSnapshot(next: Partial<PwaSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSnapshot({ needRefresh: true });
  },
  onOfflineReady() {
    updateSnapshot({ offlineReady: true });
  }
});

export function subscribePwa(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaSnapshot() {
  return snapshot;
}

export function dismissOfflineReady() {
  updateSnapshot({ offlineReady: false });
}

export function dismissRefresh() {
  updateSnapshot({ needRefresh: false });
}
