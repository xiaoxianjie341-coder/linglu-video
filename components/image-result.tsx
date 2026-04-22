import { useEffect, useState } from "react";
import { DEFAULT_IMAGE_COUNT } from "../lib/image-generation";
import type { ImageAsset, ImageAspect } from "../lib/schemas";
import { buildRunAssetUrl } from "../lib/run-assets";
import { MagicIcon, SparkLogoIcon, XIcon, DownloadIcon } from "./product-icons";

interface ImageResultProps {
  runId: string;
  images: ImageAsset[];
  expectedCount?: number;
  isGenerating?: boolean;
  previewAspect?: ImageAspect;
}

function getAspectClass(aspect: ImageAsset["aspect"]): string {
  if (aspect === "landscape") {
    return "aspect-video";
  }

  if (aspect === "square") {
    return "aspect-square";
  }

  return "aspect-[3/4]";
}

function getAspectLabel(aspect: ImageAsset["aspect"]): string {
  if (aspect === "landscape") {
    return "横版";
  }

  if (aspect === "square") {
    return "方图";
  }

  return "竖版";
}

interface PreviewPlaceholderCardProps {
  index: number;
  aspect: ImageAspect;
}

function PreviewPlaceholderCard({
  index,
  aspect,
}: PreviewPlaceholderCardProps) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div
        className={`relative isolate overflow-hidden ${getAspectClass(aspect)}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(241,247,255,0.96)_0%,rgba(229,251,255,0.98)_28%,rgba(224,231,255,0.98)_55%,rgba(247,233,255,0.98)_78%,rgba(248,252,255,0.96)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(94,214,255,0.3),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(180,147,255,0.24),transparent_30%),radial-gradient(circle_at_64%_72%,rgba(122,184,255,0.26),transparent_34%)] animate-[pulse_2.8s_ease-in-out_infinite]" />
        <div className="absolute -left-8 top-4 h-28 w-28 rounded-full bg-[#87d8ff]/30 blur-3xl animate-[spin_12s_linear_infinite]" />
        <div className="absolute bottom-0 right-2 h-32 w-32 rounded-full bg-[#c5a7ff]/24 blur-3xl animate-[pulse_3.2s_ease-in-out_infinite]" />
        <div className="absolute inset-y-0 left-[-35%] w-[45%] rotate-12 bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.78),rgba(255,255,255,0))] opacity-70 animate-[pulse_2.2s_ease-in-out_infinite]" />

        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/86 px-3 py-1 text-xs font-medium text-[color:var(--ink-700)] shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent-strong)] animate-pulse" />
          生成中
        </div>

        <div className="absolute inset-x-3 bottom-3 rounded-[20px] border border-white/50 bg-white/62 px-3 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <SparkLogoIcon className="h-4 w-4 shrink-0" />
              <p className="text-sm font-semibold text-[color:var(--ink-900)]">
                正在铺开这一张
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[color:var(--accent-strong)]">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-[bounce_1.4s_infinite_ease-in-out_both]" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.24s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.12s]" />
            </div>
          </div>
          <p className="mt-2 text-xs leading-6 text-[color:var(--ink-700)]">
            先帮你把光影、颜色和画面节奏铺出来，方便直接挑感觉。
          </p>
        </div>
      </div>
    </article>
  );
}

export function ImageResult({
  runId,
  images,
  expectedCount,
  isGenerating = false,
  previewAspect,
}: ImageResultProps) {
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);

  // Close modal on escape key
  useEffect(() => {
    if (!selectedImage) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

  const targetCount = Math.max(
    expectedCount ?? (isGenerating ? DEFAULT_IMAGE_COUNT : images.length),
    images.length,
  );

  if (targetCount === 0) {
    return null;
  }

  const resolvedAspect = previewAspect ?? images[0]?.aspect ?? "portrait";
  const imageMap = new Map(images.map((image) => [image.index, image] as const));
  const slots = Array.from({ length: targetCount }, (_, offset) => offset + 1);
  const progressLabel = `${images.length} / ${targetCount} 张已就绪`;

  return (
    <>
      <section
        data-testid="image-result-panel"
        className="rounded-[28px] border border-[color:var(--line-soft)] bg-white/70 p-5"
      >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-500)]">
            图片结果
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[color:var(--ink-900)]">
            {isGenerating ? `先看 ${targetCount} 张候选画面` : "候选画面"}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
            {isGenerating
              ? "先铺开不同感觉的画面，不展示技术提示词，直接挑你更喜欢的方向。"
              : "已经整理成可直接筛选的候选画面，前台不再展示技术提示词。"}
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--line-soft)] bg-white/75 px-3 py-1 text-xs text-[color:var(--ink-500)]">
          {isGenerating ? progressLabel : `${images.length} 张候选图`}
        </span>
      </div>

      {isGenerating ? (
        <div className="mb-5 rounded-[22px] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,rgba(245,248,255,0.96),rgba(255,255,255,0.88))] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--ink-900)]">
              <MagicIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
              {`正在为你准备 ${targetCount} 张候选画面`}
            </div>
            <span className="text-xs text-[color:var(--ink-500)]">
              {progressLabel}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#77d8ff,#9fb7ff,#c5a7ff)] transition-[width] duration-500"
              style={{
                width: `${Math.max(
                  images.length === 0 ? 10 : 20,
                  Math.round((images.length / targetCount) * 100),
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {slots.map((slotIndex) => {
          const image = imageMap.get(slotIndex);

          if (!image) {
            return (
              <PreviewPlaceholderCard
                key={`placeholder_${slotIndex}`}
                index={slotIndex}
                aspect={resolvedAspect}
              />
            );
          }

          const src = buildRunAssetUrl(runId, image.path);

          return (
            <article
              key={image.imageId}
              className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] shadow-[0_10px_28px_rgba(15,23,42,0.04)] group"
            >
              <div className="relative h-full w-full">
                {src ? (
                  <img
                    src={src}
                    alt={`候选预览 ${image.index}`}
                    className={`w-full object-cover cursor-pointer ${getAspectClass(image.aspect)}`}
                    onClick={() => setSelectedImage(image)}
                  />
                ) : null}
                <div className="absolute left-3 top-3 rounded-full bg-white/86 px-3 py-1 text-xs font-medium text-[color:var(--ink-700)] shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm pointer-events-none">
                  已就绪
                </div>
              </div>
            </article>
          );
        })}
      </div>
      </section>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity p-4 sm:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative flex max-h-full max-w-full items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={buildRunAssetUrl(runId, selectedImage.path) ?? ""}
              alt="放大预览"
              className="max-h-[90vh] max-w-full rounded-[16px] object-contain shadow-2xl"
            />
            
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white/90 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-md"
              onClick={() => setSelectedImage(null)}
              title="关闭预览"
              aria-label="关闭预览"
            >
              <XIcon className="h-5 w-5" />
            </button>

            <a
              href={buildRunAssetUrl(runId, selectedImage.path) ?? ""}
              download={`image-${selectedImage.index}.png`}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 flex items-center justify-center rounded-full bg-white/90 p-3 text-black hover:bg-white transition-colors shadow-lg backdrop-blur-md"
              title="下载图片"
              aria-label="下载图片"
            >
              <DownloadIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
