import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  commands,
  type DiarizerBackend,
  type LatencyProfile,
  type MeetingSettings as MeetingSettingsT,
  type ModelInfo,
} from "@/bindings";
import { useOpenAiStore } from "@/stores/openaiStore";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Dropdown } from "../../ui/Dropdown";
import { Slider } from "../../ui/Slider";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { Button } from "../../ui/Button";
import { ShortcutInput } from "../ShortcutInput";

const LATENCIES: LatencyProfile[] = ["ultra_low", "very_low", "low", "high"];
const BACKENDS: DiarizerBackend[] = ["auto", "native", "python_sidecar"];
const TRANSCRIBE_MODELS = ["gpt-transcribe", "gpt-4o-transcribe"];
const NOTES_MODELS = ["gpt-5.5", "gpt-5.4-mini"];

/** Dropdown options, keeping a custom value already stored in the settings. */
const withCurrent = (values: string[], current: string) =>
  (values.includes(current) ? values : [current, ...values]).map((v) => ({
    value: v,
    label: v,
  }));

/** meetscribe: OpenAI engine (cloud transcription, speakers and meeting notes). */
const OpenAiGroup: React.FC<{ cloud: boolean }> = ({ cloud }) => {
  const { t } = useTranslation();
  const oa = useOpenAiStore((s) => s.settings);
  const key = useOpenAiStore((s) => s.key);
  const load = useOpenAiStore((s) => s.load);
  const update = useOpenAiStore((s) => s.update);
  const [languages, setLanguages] = useState("");

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (oa) setLanguages(oa.languages.join(", "));
  }, [oa]);

  if (!oa) return null;

  return (
    <SettingsGroup title={t("settings.meeting.openai.title")}>
      <SettingContainer
        title={t("settings.meeting.openai.key.label")}
        description={
          key?.found
            ? t("settings.meeting.openai.key.found", { source: key.source })
            : t("settings.meeting.openai.key.missing")
        }
        grouped={true}
      >
        <span className={key?.found ? "text-green-600" : "text-red-600"}>
          {key?.found ? "✓" : "✗"}
        </span>
      </SettingContainer>
      <ToggleSwitch
        checked={oa.final_pass}
        onChange={(v) => update({ final_pass: v })}
        label={t("settings.meeting.openai.finalPass.label")}
        description={t("settings.meeting.openai.finalPass.description")}
        grouped={true}
        disabled={!cloud}
      />
      <SettingContainer
        title={t("settings.meeting.openai.languages.label")}
        description={t("settings.meeting.openai.languages.description")}
        grouped={true}
      >
        <input
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
          onBlur={() =>
            update({
              languages: languages
                .split(/[\s,]+/)
                .map((l) => l.trim())
                .filter(Boolean),
            })
          }
          className="w-32 rounded-md border border-line bg-background px-2 py-1 text-sm"
        />
      </SettingContainer>
      <SettingContainer
        title={t("settings.meeting.openai.transcribeModel.label")}
        description={t("settings.meeting.openai.transcribeModel.description")}
        grouped={true}
      >
        <Dropdown
          selectedValue={oa.transcribe_model}
          options={withCurrent(TRANSCRIBE_MODELS, oa.transcribe_model)}
          onSelect={(v) => update({ transcribe_model: v })}
        />
      </SettingContainer>
      <ToggleSwitch
        checked={oa.notes}
        onChange={(v) => update({ notes: v })}
        label={t("settings.meeting.openai.notes.label")}
        description={t("settings.meeting.openai.notes.description")}
        grouped={true}
      />
      <SettingContainer
        title={t("settings.meeting.openai.notesModel.label")}
        description={t("settings.meeting.openai.notesModel.description")}
        grouped={true}
      >
        <Dropdown
          selectedValue={oa.notes_model}
          options={withCurrent(NOTES_MODELS, oa.notes_model)}
          onSelect={(v) => update({ notes_model: v })}
        />
      </SettingContainer>
    </SettingsGroup>
  );
};

/** Meeting-mode settings; stored by the backend in their own file. */
export const MeetingSettings: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<MeetingSettingsT | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [outputDir, setOutputDir] = useState("");
  const openai = useOpenAiStore((s) => s.settings);

  useEffect(() => {
    commands.getMeetingSettings().then((s) => {
      setSettings(s);
      setOutputDir(s.output_dir ?? "");
    });
    commands.getAvailableModels().then((r) => {
      if (r.status === "ok") setModels(r.data.filter((m) => m.is_downloaded));
    });
  }, []);

  const update = useCallback(
    async (patch: Partial<MeetingSettingsT>) => {
      if (!settings) return;
      const next = { ...settings, ...patch };
      setSettings(next);
      const r = await commands.setMeetingSettings(next);
      if (r.status === "ok") setSettings(r.data);
      else setSettings(settings);
    },
    [settings],
  );

  if (!settings) return null;

  // meetscribe: meetings run on OpenAI when it is picked here, or when they follow the
  // dictation model and that is OpenAI
  const cloudMeetings =
    settings.asr_model === "openai" ||
    (!settings.asr_model && (openai?.dictation ?? false));

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <OpenAiGroup cloud={cloudMeetings} />
      <SettingsGroup title={t("settings.meeting.title")}>
        <ShortcutInput shortcutId="toggle_meeting" grouped={true} />
        <SettingContainer
          title={t("settings.meeting.open.label")}
          description={t("settings.meeting.open.description")}
          grouped={true}
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() => commands.meetingOpenWindow()}
          >
            {t("settings.meeting.open.button")}
          </Button>
        </SettingContainer>
        <Slider
          value={settings.max_speakers}
          min={1}
          max={8}
          step={1}
          onChange={(v) => update({ max_speakers: v })}
          label={t("settings.meeting.maxSpeakers.label")}
          description={t("settings.meeting.maxSpeakers.description")}
          grouped={true}
          formatValue={(v) => v.toString()}
        />
        {!cloudMeetings && (
          <SettingContainer
            title={t("settings.meeting.latency.label")}
            description={t("settings.meeting.latency.description")}
            grouped={true}
          >
            <Dropdown
              selectedValue={settings.latency_profile}
              options={LATENCIES.map((l) => ({
                value: l,
                label: t(`settings.meeting.latency.${l}`),
              }))}
              onSelect={(v) => update({ latency_profile: v as LatencyProfile })}
            />
          </SettingContainer>
        )}
        <SettingContainer
          title={t("settings.meeting.asrModel.label")}
          description={t("settings.meeting.asrModel.description")}
          grouped={true}
        >
          <Dropdown
            selectedValue={settings.asr_model ?? ""}
            options={[
              { value: "", label: t("settings.meeting.asrModel.same") },
              {
                value: "openai",
                label: t("modelSelector.openai.name", {
                  model: openai?.transcribe_model ?? "gpt-transcribe",
                }),
              },
              ...models.map((m) => ({ value: m.id, label: m.name })),
            ]}
            onSelect={(v) => update({ asr_model: v || null })}
          />
        </SettingContainer>
        {!cloudMeetings && (
          <SettingContainer
            title={t("settings.meeting.backend.label")}
            description={t("settings.meeting.backend.description")}
            grouped={true}
          >
            <Dropdown
              selectedValue={settings.diarizer_backend}
              options={BACKENDS.map((b) => ({
                value: b,
                label: t(`settings.meeting.backend.${b}`),
              }))}
              onSelect={(v) =>
                update({ diarizer_backend: v as DiarizerBackend })
              }
            />
          </SettingContainer>
        )}
      </SettingsGroup>
      <SettingsGroup title={t("meeting.savedTo")}>
        <SettingContainer
          title={t("settings.meeting.outputDir.label")}
          description={t("settings.meeting.outputDir.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="flex gap-2">
            <input
              value={outputDir}
              placeholder={t("settings.meeting.outputDir.placeholder")}
              onChange={(e) => setOutputDir(e.target.value)}
              onBlur={() => update({ output_dir: outputDir.trim() || null })}
              className="flex-1 rounded-md border border-line bg-background px-2 py-1 text-sm"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => commands.meetingRevealOutput(null)}
            >
              {t("meeting.openFolder")}
            </Button>
          </div>
        </SettingContainer>
        <ToggleSwitch
          checked={settings.write_json}
          onChange={(v) => update({ write_json: v })}
          label={t("settings.meeting.writeJson.label")}
          description={t("settings.meeting.writeJson.description")}
          grouped={true}
        />
        <ToggleSwitch
          checked={settings.save_audio}
          onChange={(v) => update({ save_audio: v })}
          label={t("settings.meeting.saveAudio.label")}
          description={t("settings.meeting.saveAudio.description")}
          grouped={true}
        />
      </SettingsGroup>
    </div>
  );
};
