"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GenerationMode,
  GenerationRequest,
  ImageAspect,
  RuntimePreflight,
} from "../lib/schemas";
import {
  getDefaultVideoModel,
  normalizeVideoSelection,
  VIDEO_MODEL_OPTIONS,
  type VideoProviderId,
} from "../lib/video-providers/catalog";
import { DEFAULT_IMAGE_COUNT } from "../lib/image-generation";
import { GenerationModeDropdown } from "./generation-mode-dropdown";
import {
  ArrowUpIcon,
  MagicIcon,
  PlusCardIcon,
  StoryIcon,
  GridIcon,
} from "./product-icons";

const STYLE_PRESET_OPTIONS = [
  {
    id: "质感电影",
    label: "质感电影",
    prompt: "质感电影、克制、光影高级、情绪细腻",
  },
  {
    id: "自然纪实",
    label: "自然纪实",
    prompt: "自然纪实、真实生活感、镜头克制、情绪真实",
  },
  {
    id: "清透日常",
    label: "清透日常",
    prompt: "清透日常、轻松舒展、自然光、生活化细节",
  },
  {
    id: "广告质感",
    label: "广告质感",
    prompt: "广告质感、构图干净、节奏利落、画面精致",
  },
  {
    id: "悬疑氛围",
    label: "悬疑氛围",
    prompt: "悬疑氛围、节奏压低、光影反差、情绪紧张",
  },
  {
    id: "温柔治愈",
    label: "温柔治愈",
    prompt: "温柔治愈、色调柔和、情绪温暖、画面安静",
  },
] as const;
type StylePresetId = (typeof STYLE_PRESET_OPTIONS)[number]["id"];

interface InputPanelProps {
  onSubmit: (payload: GenerationRequest) => Promise<void>;
  isSubmitting: boolean;
  preflight: RuntimePreflight;
  mode?: "home" | "workspace";
  generationMode?: GenerationMode;
  defaultGenerationMode?: GenerationMode;
  onGenerationModeChange?: (mode: GenerationMode) => void;
}

export function InputPanel({
  onSubmit,
  isSubmitting,
  preflight,
  mode = "home",
  generationMode: controlledGenerationMode,
  defaultGenerationMode,
  onGenerationModeChange,
}: InputPanelProps) {
  const [internalGenerationMode, setInternalGenerationMode] =
    useState<GenerationMode>(defaultGenerationMode ?? "video");
  const [sourceType, setSourceType] = useState<"text" | "url">("text");
  const [sourceInput, setSourceInput] = useState("");
  const [stylePreset, setStylePreset] = useState<StylePresetId>(
    STYLE_PRESET_OPTIONS[0].id,
  );
  const [imageAspect, setImageAspect] = useState<ImageAspect>("portrait");
  const availableProviders = useMemo(
    () =>
      preflight.availableVideoProviders.length > 0
        ? preflight.availableVideoProviders
        : (["openai"] as VideoProviderId[]),
    [preflight.availableVideoProviders],
  );
  const [videoProvider, setVideoProvider] = useState<VideoProviderId>(
    availableProviders[0] ?? "openai",
  );
  const [videoModel, setVideoModel] = useState(getDefaultVideoModel("openai"));
  const [videoSeconds, setVideoSeconds] = useState(8);
  const currentModelOptions = VIDEO_MODEL_OPTIONS[videoProvider];
  const generationMode = controlledGenerationMode ?? internalGenerationMode;

  useEffect(() => {
    if (!availableProviders.includes(videoProvider)) {
      const nextProvider = availableProviders[0] ?? "openai";
      const normalized = normalizeVideoSelection(nextProvider, undefined);
      setVideoProvider(normalized.videoProvider);
      setVideoModel(normalized.videoModel);
    }
  }, [availableProviders, videoProvider]);

  useEffect(() => {
    if (generationMode === "image" && sourceType !== "text") {
      setSourceType("text");
    }
  }, [generationMode, sourceType]);

  function handleGenerationModeChange(nextMode: GenerationMode) {
    if (controlledGenerationMode === undefined) {
      setInternalGenerationMode(nextMode);
    }
    onGenerationModeChange?.(nextMode);
  }

  const isWorkspace = mode === "workspace";
  const isImageMode = generationMode === "image";
  const canSubmitCurrentMode = isImageMode
    ? preflight.canGenerateImage
    : preflight.canGenerate;
  const currentBlockingReason = isImageMode
    ? preflight.imageBlockingReason
    : preflight.blockingReason;

  const [isFocused, setIsFocused] = useState(false);
  const isExpanded = !isWorkspace || isFocused || sourceInput.length > 0;
  
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedStyle =
      STYLE_PRESET_OPTIONS.find((option) => option.id === stylePreset) ??
      STYLE_PRESET_OPTIONS[0];

    if (isImageMode) {
      await onSubmit({
        generationMode: "image",
        sourceType: "text",
        sourceInput,
        brandTone: selectedStyle.prompt,
        imageAspect,
        imageCount: DEFAULT_IMAGE_COUNT,
      });
      return;
    }

    const normalizedVideo = normalizeVideoSelection(videoProvider, videoModel);
    await onSubmit({
      generationMode: "video",
      sourceType,
      sourceInput,
      brandTone: selectedStyle.prompt,
      shotCount: 9,
      videoProvider: normalizedVideo.videoProvider,
      videoModel: normalizedVideo.videoModel,
      videoSeconds,
    });
  }

  return (
    <section
      className={`rounded-[24px] border border-[color:var(--line-soft)] bg-white shadow-[0_12px_48px_rgba(15,23,42,0.06)] ${
        isWorkspace ? "p-3 sm:p-4" : "p-4 sm:p-5"
      }`}
    >
      {!isWorkspace ? (
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[color:var(--ink-500)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--paper-soft)] px-3 py-2">
            <MagicIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
            输入想法，开始创作
          </span>
        </div>
      ) : null}

      {!canSubmitCurrentMode ? (
        <div className="mb-4 rounded-[20px] border border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--ink-900)]">
          <span className="font-semibold">暂时无法开始生成。</span>
          <span className="ml-2">
            {currentBlockingReason || "当前模式暂时不可用。"}
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div
          className={`rounded-[20px] bg-[color:var(--paper-soft)] transition-colors focus-within:bg-white focus-within:shadow-sm ${
            isWorkspace ? "p-3" : "p-3 sm:p-4"
          }`}
        >
          <div className="flex gap-3">
            {!isWorkspace ? (
              <button
                type="button"
                disabled
                title="上传素材功能即将上线"
                className="hidden h-[74px] w-[74px] shrink-0 items-center justify-center rounded-[24px] bg-white/60 text-[color:var(--ink-400)] shadow-sm cursor-not-allowed sm:flex"
              >
                <PlusCardIcon className="h-7 w-7" />
              </button>
            ) : null}

            <div className="min-w-0 flex-1 relative pr-12">
              <label className="sr-only" htmlFor={`source-input-${mode}`}>
                一句话灵感
              </label>
              <textarea
                id={`source-input-${mode}`}
                aria-label="一句话灵感"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`w-full resize-none border-0 bg-transparent text-[color:var(--ink-900)] outline-none placeholder:text-[color:var(--ink-500)] transition-all duration-200 ${
                  isExpanded
                    ? isWorkspace
                      ? "min-h-[96px] px-2 py-2 text-sm leading-6"
                      : "min-h-[140px] px-1 py-2 text-[15px] leading-7"
                    : isWorkspace
                      ? "min-h-[40px] px-2 py-2 text-sm leading-6"
                      : "min-h-[44px] px-1 py-2.5 text-[15px] leading-6"
                }`}
                value={sourceInput}
                onChange={(event) => setSourceInput(event.target.value)}
                placeholder={
                  isImageMode
                    ? `输入一句话灵感，先生成 ${DEFAULT_IMAGE_COUNT} 张可挑选的图片素材。`
                    : sourceType === "url"
                    ? "贴一个公开链接，我会先提取内容，再扩成剧情和视频。"
                    : "输入一句话灵感、热点事件或一个很薄的故事起点..."
                }
              />

              <div
                className={`transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "mt-2 max-h-[300px] overflow-visible border-t border-[color:var(--line-soft)] pt-3 opacity-100"
                    : "max-h-0 overflow-hidden opacity-0"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 overflow-visible">
                  <GenerationModeDropdown
                    value={generationMode}
                    onChange={handleGenerationModeChange}
                    ariaLabel="输入框创作模式"
                  />

                  {!isImageMode ? (
                    <div className="inline-flex items-center gap-1 px-1">
                      {[
                        { value: "text", label: "一句话" },
                        { value: "url", label: "公开链接" },
                      ].map((option) => {
                        const active = sourceType === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSourceType(option.value as "text" | "url")}
                            className={`rounded-[12px] px-3 py-2 text-sm transition ${
                              active
                                ? "bg-white text-[color:var(--ink-900)] shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                                : "text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {!isImageMode ? (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-[14px] border border-[color:var(--line-soft)] bg-white px-3 py-2 text-xs text-[color:var(--ink-700)]">
                        <StoryIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
                        <span>模型</span>
                        <select
                          aria-label="视频模型"
                          className="bg-transparent outline-none"
                          value={videoModel}
                          onChange={(event) => setVideoModel(event.target.value)}
                        >
                          {currentModelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-[14px] border border-[color:var(--line-soft)] bg-white px-3 py-2 text-xs text-[color:var(--ink-700)]">
                        <MagicIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
                        <span>时长</span>
                        <select
                          aria-label="视频时长"
                          className="bg-transparent outline-none"
                          value={videoSeconds}
                          onChange={(event) => setVideoSeconds(Number(event.target.value))}
                        >
                          <option value={4}>4 秒</option>
                          <option value={8}>8 秒</option>
                          <option value={12}>12 秒</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-[14px] border border-[color:var(--line-soft)] bg-white px-3 py-2 text-xs text-[color:var(--ink-700)]">
                      <GridIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
                      <span>画幅</span>
                      <select
                        aria-label="图片画幅"
                        className="bg-transparent outline-none"
                        value={imageAspect}
                        onChange={(event) =>
                          setImageAspect(event.target.value as ImageAspect)
                        }
                      >
                        <option value="portrait">竖版</option>
                        <option value="square">方图</option>
                        <option value="landscape">横版</option>
                      </select>
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 rounded-[14px] border border-[color:var(--line-soft)] bg-white px-3 py-2 text-xs text-[color:var(--ink-700)]">
                    <StoryIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
                    <span>风格</span>
                    <select
                      aria-label="风格预设"
                      className="bg-transparent outline-none"
                      value={stylePreset}
                      onChange={(event) =>
                        setStylePreset(event.target.value as StylePresetId)
                      }
                    >
                      {STYLE_PRESET_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 right-0">
                <button
                  type="submit"
                  aria-label="开始生成"
                  disabled={
                    isSubmitting || !sourceInput.trim() || !canSubmitCurrentMode
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] text-white shadow-[0_8px_20px_rgba(26,151,255,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-[color:var(--ink-500)] disabled:to-[color:var(--ink-500)] disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <span className="text-[10px] font-semibold">中</span>
                  ) : (
                    <ArrowUpIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
