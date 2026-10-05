import { safeStorage } from "../safeStorage";

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// 保存形式が変わっても古い盤面を誤って復元しない。壊れた元データは読み込み時に削除しない。
export function readSavedProgress<T>(key: string, validate: (value: unknown) => value is T): T | null {
  const raw = safeStorage.getItem(key);
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : null;
  } catch {
    return null;
  }
}
