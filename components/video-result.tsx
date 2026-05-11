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
      </div>
    </section>
  );
}
