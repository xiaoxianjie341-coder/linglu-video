"use client";

import { DEFAULT_IMAGE_COUNT } from "../lib/image-generation";
import type { GenerationMode, RuntimePreflight } from "../lib/schemas";
import { GenerationModeDropdown } from "./generation-mode-dropdown";

interface HomeHeroProps {
  preflight: RuntimePreflight;
  generationMode: GenerationMode;
  onGenerationModeChange: (mode: GenerationMode) => void;
}

export function HomeHero({
  preflight,
  generationMode,
  onGenerationModeChange,
}: HomeHeroProps) {
  const isImageMode = generationMode === "image";
  const canGenerateCurrentMode = isImageMode
    ? preflight.canGenerateImage
    : preflight.canGenerate;
  const currentBlockingReason = isImageMode
    ? preflight.imageBlockingReason
    : preflight.blockingReason;

  return (
    <section className="px-2 pt-10 pb-2 text-center sm:pt-16">
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[color:var(--ink-900)] sm:text-5xl flex justify-center items-center gap-1">
        <span>开启你的</span>
        <GenerationModeDropdown
          value={generationMode}
          onChange={onGenerationModeChange}
          variant="hero"
          ariaLabel="顶部创作模式"
        />
        <span>即刻开始创作</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-700)] sm:text-base">
        {isImageMode
          ? `先写下一句话，先生成 ${DEFAULT_IMAGE_COUNT} 张可挑选的图片素材，不用先理解技术参数。`
          : "输入一句话或公开链接，把灵感扩成故事分镜并继续生成视频。"}
      </p>
      {!canGenerateCurrentMode ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--line-soft)] bg-white/72 px-4 py-2 text-xs text-[color:var(--ink-700)]">
          <span className="h-2 w-2 rounded-full bg-[color:var(--danger)]" />
          {currentBlockingReason || "当前还不能开始生成"}
        </div>
      ) : null}
    </section>
  );
}
