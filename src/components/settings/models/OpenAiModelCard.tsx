// meetscribe: OpenAI cloud transcription as a choice on the Models page.
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Radio } from "@/components/ui/Radio";
import { useOpenAiStore } from "@/stores/openaiStore";

export const OpenAiModelCard: React.FC = () => {
  const { t } = useTranslation();
  const settings = useOpenAiStore((s) => s.settings);
  const key = useOpenAiStore((s) => s.key);
  const load = useOpenAiStore((s) => s.load);
  const update = useOpenAiStore((s) => s.update);

  useEffect(() => {
    load();
  }, [load]);

  if (!settings) return null;
  const active = settings.dictation;

  return (
    <button
      type="button"
      onClick={() => !active && update({ dictation: true })}
      className={`flex w-full items-center gap-[12px] rounded-lg border px-[12px] py-[10px] text-start transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-logo-primary ${
        active
          ? "border-logo-primary bg-logo-primary/10"
          : "border-line hover:bg-wash cursor-pointer"
      }`}
    >
      <Radio checked={active} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text">
          {t("modelSelector.openai.name", { model: settings.transcribe_model })}
          <span className="ms-1.5 text-[10px] font-medium text-ink-3 uppercase">
            {t("modelSelector.openai.cloud")}
          </span>
        </div>
        <div className="text-xs text-ink-3">
          {key?.found
            ? active
              ? t("modelSelector.openai.activeHint")
              : t("modelSelector.openai.description")
            : t("settings.meeting.openai.key.missing")}
        </div>
      </div>
    </button>
  );
};
