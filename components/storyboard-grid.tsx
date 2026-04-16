import type { StoryboardAsset } from "../lib/schemas";
import { buildRunAssetUrl } from "../lib/run-assets";

interface StoryboardGridProps {
  runId: string;
  storyboards: StoryboardAsset[];
}

export function StoryboardGrid({ runId, storyboards }: StoryboardGridProps) {
  if (storyboards.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          故事板
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-zinc-50">
          GPT Image 分镜输出
        </h3>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {storyboards.map((storyboard) => {
          const src = buildRunAssetUrl(runId, storyboard.path);

          return (
            <article
              key={storyboard.shotId}
              className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
            >
              {src ? (
                <img
                  src={src}
                  alt={storyboard.shotId}
                  className="aspect-[9/16] w-full object-cover"
                />
              ) : null}

              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-100">
                    {storyboard.shotId}
                  </h4>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    图片提示词
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {storyboard.imagePrompt}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    视频提示词
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {storyboard.videoPrompt}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
