"use client";

import { useEffect, useState } from "react";

type PlannerProvider = "openai" | "linglu";

export function SettingsForm() {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [hasSavedOpenAiKey, setHasSavedOpenAiKey] = useState(false);
  const [plannerProvider, setPlannerProvider] =
    useState<PlannerProvider>("openai");
  const [lingluApiKey, setLingluApiKey] = useState("");
  const [hasSavedLingluKey, setHasSavedLingluKey] = useState(false);
  const [lingluBaseUrl, setLingluBaseUrl] = useState(
    "https://gateway.linglu.ai/v1",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const data = await response.json();

      if (!cancelled) {
        setHasSavedOpenAiKey(Boolean(data.hasOpenAiKey));
        setPlannerProvider((data.plannerProvider as PlannerProvider) || "openai");
        setHasSavedLingluKey(Boolean(data.hasLingluKey));
        setLingluBaseUrl(data.lingluBaseUrl || "https://gateway.linglu.ai/v1");
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const payload: Record<string, string> = {
      plannerProvider,
    };

    const trimmedOpenAiKey = openaiApiKey.trim();
    const trimmedLingluKey = lingluApiKey.trim();
    const trimmedLingluBaseUrl = lingluBaseUrl.trim();

    if (trimmedOpenAiKey) {
      payload.openaiApiKey = trimmedOpenAiKey;
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
      setHasSavedLingluKey(Boolean(data.hasLingluKey));
      setPlannerProvider((data.plannerProvider as PlannerProvider) || "openai");
      setLingluBaseUrl(data.lingluBaseUrl || "https://gateway.linglu.ai/v1");
      setOpenaiApiKey("");
      setLingluApiKey("");
      setMessage("接入配置已保存到本地。");
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
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur"
    >
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          模型设置
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
          API 接入配置
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          文本规划可以切到灵鹿网关；分镜图和视频生成目前仍使用官方 OpenAI。
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-100">媒体生成</p>
            <p className="mt-1 text-sm text-zinc-400">
              用于 `gpt-image-1.5` 和 `sora-2`，是分镜图与视频生成的必需密钥。
            </p>
          </div>

          <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            OpenAI Key 状态：{hasSavedOpenAiKey ? "已配置" : "未配置"}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              OpenAI API Key
            </span>
            <input
              type="password"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              value={openaiApiKey}
              onChange={(event) => setOpenaiApiKey(event.target.value)}
              placeholder={
                hasSavedOpenAiKey ? "留空则保留当前已保存 key" : "sk-..."
              }
            />
          </label>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-100">文本规划</p>
            <p className="mt-1 text-sm text-zinc-400">
              当前支持用灵鹿网关承接 `gpt-5.4` 的规划阶段，请求走
              `chat/completions`。
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              规划提供方
            </span>
            <select
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              value={plannerProvider}
              onChange={(event) =>
                setPlannerProvider(event.target.value as PlannerProvider)
              }
            >
              <option value="openai">官方 OpenAI</option>
              <option value="linglu">灵鹿网关</option>
            </select>
          </label>

          {plannerProvider === "linglu" ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                灵鹿运行时 Key 状态：{hasSavedLingluKey ? "已配置" : "未配置"}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  灵鹿运行时 API Key
                </span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  value={lingluApiKey}
                  onChange={(event) => setLingluApiKey(event.target.value)}
                  placeholder={
                    hasSavedLingluKey
                      ? "留空则保留当前已保存 key"
                      : "输入模型路由页生成的团队 API Key"
                  }
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  灵鹿 Base URL
                </span>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  value={lingluBaseUrl}
                  onChange={(event) => setLingluBaseUrl(event.target.value)}
                  placeholder="https://gateway.linglu.ai/v1"
                />
              </label>
            </div>
          ) : null}
        </section>
      </div>

      <button
        type="submit"
        disabled={isSaving || !canSave}
        className="mt-5 inline-flex rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
      >
        {isSaving ? "保存中..." : "保存设置"}
      </button>

      {message ? (
        <p className="mt-4 text-sm text-zinc-300">{message}</p>
      ) : null}
    </form>
  );
}
