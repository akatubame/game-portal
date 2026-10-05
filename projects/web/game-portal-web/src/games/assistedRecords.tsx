import { useI18n } from "../i18n";
import { RankingPanel, type RankingHandle } from "./ranking";

export function recordCategoryKey(puzzleId: string, assisted: boolean) {
  return `${puzzleId}--${assisted ? "assisted" : "unassisted"}-v1`;
}

export function AssistedRecordNotice({ assisted, legacyBest, legacyRanking }: {
  assisted: boolean; legacyBest: string | null; legacyRanking: RankingHandle;
}) {
  const { language } = useI18n();
  const en = language === "en";
  return <div className="assisted-record-notice" data-native-i18n>
    <p role="status">{assisted
      ? (en ? "Assisted record: hints or the answer were used. Hiding the answer does not undo this." : "補助ありの記録：ヒントまたは答えを使用しました。答えを非表示に戻しても区分は変わりません。")
      : (en ? "Unassisted record. Using a hint or viewing the answer switches to a separate record category." : "補助なしの記録です。ヒントや答えを見ると、別の記録区分に切り替わります。")}</p>
    <details>
      <summary>{en ? "Earlier records (assistance unknown)" : "以前の記録（補助利用の有無は不明）"}</summary>
      <p>{en ? "Earlier best: " : "以前のベスト："}{legacyBest ?? (en ? "No record" : "未記録")}</p>
      <RankingPanel ranking={legacyRanking} />
    </details>
  </div>;
}
