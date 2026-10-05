import { useI18n } from "../i18n";

export function useConfirmRecordReset() {
  const { language } = useI18n();
  return () => window.confirm(language === "en"
    ? "Reset this game's saved records? This cannot be undone. Rankings will not be deleted."
    : "このゲームの保存記録を初期化しますか？元に戻せません。ランキングは削除しません。");
}
