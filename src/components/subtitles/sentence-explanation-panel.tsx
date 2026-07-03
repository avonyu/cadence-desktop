import { useState, useEffect, memo } from "react";
import { Loader2 } from "lucide-react";
import { explainSentence, type SentenceExplanation } from "@/lib/sentence-explanation";
import { useTranslation } from "react-i18next";

interface SentenceExplanationPanelProps {
  sentence: string;
  translation: string;
  videoName: string;
}

export const SentenceExplanationPanel = memo(function SentenceExplanationPanel({
  sentence,
  translation,
  videoName,
}: SentenceExplanationPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<SentenceExplanation | null>(
    null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    explainSentence(sentence, translation, videoName).then((result) => {
      if (cancelled) return;
      if (result) {
        setExplanation(result);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [sentence, translation, videoName]);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">{t("explain.loading")}</span>
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{t("explain.error")}</p>
      ) : explanation ? (
        <>
          <div className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
            <p className="text-sm font-medium text-foreground">{sentence}</p>
            {translation && (
              <p className="text-sm text-muted-foreground">{translation}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("explain.overallMeaning")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {explanation.overallMeaning}
            </p>
          </div>

          {explanation.grammarPoints.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("explain.grammar")}
              </p>
              <ul className="mt-1 space-y-1.5">
                {explanation.grammarPoints.map((gp, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-(--player-accent)">
                      {gp.pattern}
                    </span>
                    <span className="text-muted-foreground">
                      ：{gp.explanation}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation.keyVocabulary.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("explain.vocabulary")}
              </p>
              <ul className="mt-1 space-y-1">
                {explanation.keyVocabulary.map((v, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-foreground">
                      {v.word}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      {v.meaning}
                    </span>
                    {v.note && (
                      <span className="ml-1 text-muted-foreground/60">
                        ({v.note})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
});
