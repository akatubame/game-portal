import { registerSW } from "virtual:pwa-register";

export type PwaSnapshot = {
  needRefresh: boolean;
  offlineReady: boolean;
};

let snapshot: PwaSnapshot = { needRefresh: false, offlineReady: false };
const listeners = new Set<() => void>();
let reloadingForUpdate = false;
let updateRequested = false;

if ("serviceWorker" in navigator) {
  let wasControlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) {
      return;
    }

    if (!wasControlled) {
      wasControlled = true;
      return;
    }
    if (updateRequested) {
      reloadingForUpdate = true;
      window.location.reload();
    } else {
      // 他タブの更新でも対局を強制終了せず、明示的な更新操作を待つ。
      updateSnapshot({ needRefresh: true });
    }
  });
}

function updateSnapshot(next: Partial<PwaSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

const applyServiceWorkerUpdate = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSnapshot({ needRefresh: true });
  },
  onOfflineReady() {
    updateSnapshot({ offlineReady: true });
  }
});

export async function updateServiceWorker(reload = true) {
  updateRequested = reload;
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) await applyServiceWorkerUpdate(reload);
  else if (reload) window.location.reload();
}

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
