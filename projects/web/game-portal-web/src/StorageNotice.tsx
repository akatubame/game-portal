import { useSyncExternalStore } from "react";
import { useI18n } from "./i18n";
import { safeStorage } from "./safeStorage";

export function StorageNotice() {
  const issue = useSyncExternalStore(safeStorage.subscribe, safeStorage.getIssue, () => null);
  const { language } = useI18n();
  if (!issue) return null;
  const message = issue === "unavailable"
    ? language === "ja"
      ? "このブラウザでは記録を保存できません。ゲームは続けられますが、今回の記録や設定は再読み込みすると失われる場合があります。"
      : "Records cannot be saved in this browser. You can keep playing, but new records and settings may be lost when you reload."
    : language === "ja"
      ? "一部の保存データを読み込めなかったため、その記録を未記録として扱っています。他の記録は保持しています。"
      : "Some saved data could not be read and is being treated as empty. Other records have been kept.";
  return <p className="storage-notice" role="status" data-native-i18n>{message}</p>;
}
