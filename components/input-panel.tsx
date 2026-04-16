"use client";

import { useState } from "react";
import type { GenerationRequest } from "../lib/schemas";

interface InputPanelProps {
  onSubmit: (payload: GenerationRequest) => Promise<void>;
  isSubmitting: boolean;
}

export function InputPanel({ onSubmit, isSubmitting }: InputPanelProps) {
  const [sourceType, setSourceType] = useState<"text" | "url">("text");
  const [sourceInput, setSourceInput] = useState(
    "一只长满青苔的茶壶吉祥物穿过灯笼夜市，最终发现一扇发光的门。",
  );
  const [brandTone, setBrandTone] = useState("电影感、克制、高级、氛围强");
  const [shotCount, setShotCount] = useState(3);
  const [videoModel, setVideoModel] = useState<"sora-2" | "sora-2-pro">(
    "sora-2",
  );
  const [videoSeconds, setVideoSeconds] = useState(8);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      sourceType,
      sourceInput,
      brandTone,
      shotCount,
      videoModel,
      videoSeconds,
    });
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          输入
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
          一键生成 OpenAI 视频原型
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          粘贴文本或公开链接。流程会先用 GPT-5.4 生成分镜方案，再用 GPT
          Image 生成故事板，最后用 Sora 输出一个视频片段。
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            输入类型
          </span>
          <select
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            value={sourceType}
            onChange={(event) =>
              setSourceType(event.target.value as "text" | "url")
            }
          >
            <option value="text">纯文本</option>
            <option value="url">公开链接</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            {sourceType === "url" ? "公开链接" : "原始内容"}
          </span>
          <textarea
            className="min-h-[220px] w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition focus:border-blue-500"
            value={sourceInput}
            onChange={(event) => setSourceInput(event.target.value)}
            placeholder={
              sourceType === "url"
                ? "https://x.com/... 或 https://www.xiaohongshu.com/..."
                : "粘贴你想转成视频的帖子、文章或内容脚本..."
            }
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            品牌调性
          </span>
          <input
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            value={brandTone}
            onChange={(event) => setBrandTone(event.target.value)}
            placeholder="例如：电影感、极简、高信任感、轻奢"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              镜头数量
            </span>
            <select
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              value={shotCount}
              onChange={(event) => setShotCount(Number(event.target.value))}
            >
              <option value={3}>3 个镜头</option>
              <option value={4}>4 个镜头</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              视频模型
            </span>
            <select
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              value={videoModel}
              onChange={(event) =>
                setVideoModel(event.target.value as "sora-2" | "sora-2-pro")
              }
            >
              <option value="sora-2">Sora 2</option>
              <option value="sora-2-pro">Sora 2 Pro</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              视频时长
            </span>
            <select
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              value={videoSeconds}
              onChange={(event) => setVideoSeconds(Number(event.target.value))}
            >
              <option value={4}>4 秒</option>
              <option value={8}>8 秒</option>
              <option value={12}>12 秒</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !sourceInput.trim()}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
        >
          {isSubmitting ? "生成中..." : "一键生成"}
        </button>
      </form>
    </section>
  );
}
