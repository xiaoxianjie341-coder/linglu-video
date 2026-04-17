import type { VideoAsset } from "../lib/schemas";
import { buildRunAssetUrl } from "../lib/run-assets";

interface VideoResultProps {
  runId: string;
  video: VideoAsset | null;
}

export function VideoResult({ runId, video }: VideoResultProps) {
  if (!video) {
    return null;
  }

  const videoUrl = buildRunAssetUrl(runId, video.path);
  const thumbnailUrl = buildRunAssetUrl(runId, video.thumbnailPath);
  const isLandscape =
    typeof video.size === "string" &&
    Number(video.size.split("x")[0]) > Number(video.size.split("x")[1]);

  return (
    <section className="rounded-[28px] border border-[color:var(--line-soft)] bg-white/70 p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-500)]">
          视频结果
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[color:var(--ink-900)]">
          最终视频
        </h3>
      </div>

      <div className="space-y-4">
        {videoUrl ? (
          <video
            controls
            playsInline
            poster={thumbnailUrl ?? undefined}
            src={videoUrl}
            className={`w-full rounded-[28px] border border-[color:var(--line-soft)] bg-black object-cover ${
              isLandscape ? "aspect-video" : "aspect-[9/16]"
            }`}
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
              引擎
            </p>
            <p className="mt-2 text-sm text-[color:var(--ink-900)]">
              {video.provider}
            </p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
              模型
            </p>
            <p className="mt-2 text-sm text-[color:var(--ink-900)]">
              {video.model}
            </p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
              总时长
            </p>
            <p className="mt-2 text-sm text-[color:var(--ink-900)]">
              {video.seconds}
            </p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
              分辨率
            </p>
            <p className="mt-2 break-all text-sm text-[color:var(--ink-900)]">
              {video.size ?? "未知"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
