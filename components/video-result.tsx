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

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          视频结果
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-zinc-50">
          Sora 渲染结果
        </h3>
      </div>

      <div className="space-y-4">
        {videoUrl ? (
          <video
            controls
            playsInline
            poster={thumbnailUrl ?? undefined}
            src={videoUrl}
            className="aspect-[9/16] w-full rounded-3xl border border-zinc-800 bg-black object-cover"
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              模型
            </p>
            <p className="mt-2 text-sm text-zinc-200">{video.model}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              时长
            </p>
            <p className="mt-2 text-sm text-zinc-200">{video.seconds}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              任务 ID
            </p>
            <p className="mt-2 break-all text-sm text-zinc-200">
              {video.jobId ?? "暂无"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
