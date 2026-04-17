"use client";

import { useState } from "react";
import type { RuntimePreflight } from "../lib/schemas";
import { SettingsSectionCard } from "./settings-section-card";

type PlannerProvider = "openai" | "linglu";

export interface SettingsFormInitialState {
  hasOpenAiKey: boolean;
  plannerProvider: PlannerProvider;
  hasLingluKey: boolean;
  lingluBaseUrl: string;
  hasKlingKey: boolean;
  klingBaseUrl: string;
  hasJimengKey: boolean;
  jimengBaseUrl: string;
}

interface SettingsFormProps {
  initialSettings: SettingsFormInitialState;
  runtimePreflight: RuntimePreflight;
}

export function SettingsForm({
  initialSettings,
  runtimePreflight,
}: SettingsFormProps) {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [hasSavedOpenAiKey, setHasSavedOpenAiKey] = useState(
    initialSettings.hasOpenAiKey,
  );
  const [klingApiKey, setKlingApiKey] = useState("");
  const [hasSavedKlingKey, setHasSavedKlingKey] = useState(
    initialSettings.hasKlingKey,
  );
  const [klingBaseUrl, setKlingBaseUrl] = useState(initialSettings.klingBaseUrl);
  const [jimengApiKey, setJimengApiKey] = useState("");
  const [hasSavedJimengKey, setHasSavedJimengKey] = useState(
    initialSettings.hasJimengKey,
  );
  const [jimengBaseUrl, setJimengBaseUrl] = useState(initialSettings.jimengBaseUrl);
  const [plannerProvider, setPlannerProvider] =
    useState<PlannerProvider>(initialSettings.plannerProvider);
  const [lingluApiKey, setLingluApiKey] = useState("");
  const [hasSavedLingluKey, setHasSavedLingluKey] = useState(
    initialSettings.hasLingluKey,
  );
  const [lingluBaseUrl, setLingluBaseUrl] = useState(initialSettings.lingluBaseUrl);
  const [runtime, setRuntime] = useState(runtimePreflight);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const payload: Record<string, string> = {
      plannerProvider,
    };

    const trimmedOpenAiKey = openaiApiKey.trim();
    const trimmedKlingKey = klingApiKey.trim();
    const trimmedKlingBaseUrl = klingBaseUrl.trim();
    const trimmedJimengKey = jimengApiKey.trim();
    const trimmedJimengBaseUrl = jimengBaseUrl.trim();
    const trimmedLingluKey = lingluApiKey.trim();
    const trimmedLingluBaseUrl = lingluBaseUrl.trim();

    if (trimmedOpenAiKey) {
      payload.openaiApiKey = trimmedOpenAiKey;
    }

    if (trimmedKlingKey) {
      payload.klingApiKey = trimmedKlingKey;
    }

    if (trimmedKlingBaseUrl) {
      payload.klingBaseUrl = trimmedKlingBaseUrl;
    }

    if (trimmedJimengKey) {
      payload.jimengApiKey = trimmedJimengKey;
    }

    if (trimmedJimengBaseUrl) {
      payload.jimengBaseUrl = trimmedJimengBaseUrl;
    }

    if (plannerProvider === "linglu") {
      payload.lingluBaseUrl =
        trimmedLingluBaseUrl || "https://gateway.linglu.ai/v1";
    }

    if (trimmedLingluKey) {
      payload.lingluApiKey = trimmedLingluKey;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存设置失败。");
      }

      setHasSavedOpenAiKey(Boolean(data.hasOpenAiKey));
      setHasSavedKlingKey(Boolean(data.hasKlingKey));
      setKlingBaseUrl(data.klingBaseUrl || "");
      setHasSavedJimengKey(Boolean(data.hasJimengKey));
      setJimengBaseUrl(data.jimengBaseUrl || "");
      setHasSavedLingluKey(Boolean(data.hasLingluKey));
      setPlannerProvider((data.plannerProvider as PlannerProvider) || "openai");
      setLingluBaseUrl(data.lingluBaseUrl || "https://gateway.linglu.ai/v1");
      setRuntime(data.runtimePreflight ?? runtimePreflight);
      setOpenaiApiKey("");
      setKlingApiKey("");
      setJimengApiKey("");
      setLingluApiKey("");
      setMessage("设置已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  }

  const hasOpenAiCandidate = hasSavedOpenAiKey || Boolean(openaiApiKey.trim());
  const hasLingluCandidate = hasSavedLingluKey || Boolean(lingluApiKey.trim());
  const canSave =
    hasOpenAiCandidate &&
    (plannerProvider === "openai" ||
      (hasLingluCandidate && Boolean(lingluBaseUrl.trim())));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        className={`rounded-[28px] border px-5 py-4 text-sm leading-6 ${
          runtime.canGenerate
            ? "border-[color:var(--success)]/20 bg-[color:var(--success-soft)] text-[color:var(--ink-900)]"
            : "border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] text-[color:var(--ink-900)]"
        }`}
      >
        <span className="font-semibold">
          {runtime.canGenerate ? "当前已可开始生成。" : "暂时无法开始生成。"}
        </span>
        <span className="ml-2">
          {runtime.blockingReason || "当前配置已经可以正常使用。"}
        </span>
      </div>

      <SettingsSectionCard
        title="OpenAI"
        description="当前创作流程依赖的基础服务。"
        badge={hasSavedOpenAiKey ? "已配置" : "未配置"}
      >
        <label className="block">
          <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
            OpenAI API Key
          </span>
          <input
            aria-label="OpenAI API Key"
            type="password"
            className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            value={openaiApiKey}
            onChange={(event) => setOpenaiApiKey(event.target.value)}
            placeholder={hasSavedOpenAiKey ? "留空则保留当前已保存 key" : "sk-..."}
          />
        </label>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="故事服务"
        description="用于整理故事方向和内容结构。"
        badge={plannerProvider === "openai" ? "当前使用 OpenAI" : "已切换到灵鹿"}
      >
        <label className="block">
          <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
            规划提供方
          </span>
          <select
            className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            value={plannerProvider}
            onChange={(event) => setPlannerProvider(event.target.value as PlannerProvider)}
          >
            <option value="openai">官方 OpenAI</option>
            <option value="linglu">灵鹿</option>
          </select>
        </label>

        {plannerProvider === "linglu" ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-[22px] border border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--ink-900)]">
              当前版本会先保存灵鹿配置，实际创作仍以 OpenAI 为主。
            </div>

            <label className="block">
              <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
                灵鹿运行时 API Key
              </span>
              <input
                type="password"
                className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                value={lingluApiKey}
                onChange={(event) => setLingluApiKey(event.target.value)}
                placeholder={
                  hasSavedLingluKey ? "留空则保留当前已保存 key" : "输入团队 API Key"
                }
              />
            </label>

            <label className="block">
              <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
                灵鹿 Base URL
              </span>
              <input
                type="text"
                className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                value={lingluBaseUrl}
                onChange={(event) => setLingluBaseUrl(event.target.value)}
                placeholder="https://gateway.linglu.ai/v1"
              />
            </label>
          </div>
        ) : null}
      </SettingsSectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSectionCard
          title="Kling"
          description="先保存配置，接通后即可启用。"
          badge={hasSavedKlingKey ? "已保存配置" : "未配置"}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
                Kling API Key
              </span>
              <input
                type="password"
                className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                value={klingApiKey}
                onChange={(event) => setKlingApiKey(event.target.value)}
                placeholder={
                  hasSavedKlingKey ? "留空则保留当前已保存 key" : "等待你填入 Kling key"
                }
              />
            </label>

            <label className="block">
              <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
                Kling Base URL
              </span>
              <input
                type="text"
                className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                value={klingBaseUrl}
                onChange={(event) => setKlingBaseUrl(event.target.value)}
                placeholder="填写 Kling API Base URL"
              />
            </label>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          title="即梦"
          description="先保存配置，接通后即可启用。"
          badge={hasSavedJimengKey ? "已保存配置" : "未配置"}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
                即梦 API Key
              </span>
              <input
                type="password"
                className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                value={jimengApiKey}
                onChange={(event) => setJimengApiKey(event.target.value)}
                placeholder={
                  hasSavedJimengKey ? "留空则保留当前已保存 key" : "等待你填入即梦 key"
                }
              />
            </label>

            <label className="block">
              <span className="mb-3 block text-sm font-medium text-[color:var(--ink-900)]">
                即梦 Base URL
              </span>
              <input
                type="text"
                className="w-full rounded-[22px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                value={jimengBaseUrl}
                onChange={(event) => setJimengBaseUrl(event.target.value)}
                placeholder="填写即梦 API Base URL"
              />
            </label>
          </div>
        </SettingsSectionCard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[color:var(--ink-700)]">
          保存后会立即刷新当前可用状态。
        </p>

        <button
          type="submit"
          disabled={isSaving || !canSave}
          className="inline-flex items-center justify-center rounded-full bg-[color:var(--ink-900)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:bg-[color:var(--ink-500)]"
        >
          {isSaving ? "保存中..." : "保存设置"}
        </button>
      </div>

      {message ? (
        <p className="text-sm text-[color:var(--ink-700)]">{message}</p>
      ) : null}
    </form>
  );
}
