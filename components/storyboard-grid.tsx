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

  const hasExplicitGrid = storyboards.some(
    (storyboard) => storyboard.kind === "grid",
  );
  const gridStoryboard = hasExplicitGrid
    ? storyboards.find((storyboard) => storyboard.kind === "grid") ?? null
    : null;
  const panelStoryboards = hasExplicitGrid
    ? storyboards.filter((storyboard) => storyboard.kind !== "grid")
    : storyboards;

  return (
    <section className="rounded-[28px] border border-[color:var(--line-soft)] bg-white/70 p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-500)]">
          故事板
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[color:var(--ink-900)]">
          3x3 总分镜
        </h3>
      </div>

      {gridStoryboard ? (
        <article className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)]">
          {buildRunAssetUrl(runId, gridStoryboard.path) ? (
            <img
              src={buildRunAssetUrl(runId, gridStoryboard.path) ?? undefined}
              alt={gridStoryboard.shotId}
              className="aspect-video w-full object-cover"
            />
          ) : null}

          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[color:var(--ink-900)]">
                3x3 总分镜母版
              </h4>
              <span className="rounded-full border border-[color:var(--line-soft)] bg-white/75 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                连续 9 格
              </span>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                总图提示词
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                {gridStoryboard.imagePrompt}
              </p>
            </div>

            {!panelStoryboards.length ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                  生成方式
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                  系统会基于这张总分镜，按左上到右下的剧情顺序一次性生成完整视频。
                </p>
              </div>
            ) : null}
          </div>
        </article>
      ) : null}

      {panelStoryboards.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {panelStoryboards.map((storyboard) => {
            const src = buildRunAssetUrl(runId, storyboard.path);
            const clipUrl = buildRunAssetUrl(runId, storyboard.clipPath);

            return (
              <article
                key={storyboard.shotId}
                className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)]"
              >
                {src ? (
                  <img
                    src={src}
                    alt={storyboard.shotId}
                    className="aspect-video w-full object-cover"
                  />
                ) : null}

                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-[color:var(--ink-900)]">
                      {storyboard.shotId}
                      {storyboard.gridIndex
                        ? ` · 第 ${storyboard.gridIndex} 格`
                        : ""}
                    </h4>
                    {storyboard.qaVerdict ? (
                      <span
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                          storyboard.qaVerdict === "PASS"
                            ? "border-[color:var(--success)]/20 bg-[color:var(--success-soft)] text-[color:var(--ink-900)]"
                            : "border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] text-[color:var(--ink-900)]"
                        }`}
                      >
                        {storyboard.qaVerdict}
                        {typeof storyboard.qaScore === "number"
                          ? ` ${storyboard.qaScore}`
                          : ""}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                      当前格画面
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                      {storyboard.imagePrompt}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                      镜头执行提示词
                    </p>
                    <p className="mt-2 line-clamp-6 text-sm leading-7 text-[color:var(--ink-700)]">
                      {storyboard.videoPrompt}
                    </p>
                  </div>

                  {clipUrl ? (
                    <a
                      href={clipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-[color:var(--line-strong)] bg-white/75 px-3 py-2 text-xs font-medium text-[color:var(--ink-900)] transition hover:border-[color:var(--accent)]"
                    >
                      打开镜头视频
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
