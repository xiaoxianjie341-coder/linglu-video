import Link from "next/link";
import type { RunRecord } from "../lib/schemas";
import { buildRunAssetUrl } from "../lib/run-assets";
import {
  getRunDisplaySummary,
  getRunDisplayTitle,
  getRunPreviewPath,
  hasRenderableResult,
} from "../lib/run-presenter";

interface RecentRunsStripProps {
  runs: RunRecord[];
  deletingRunId?: string | null;
  onDelete?: (runId: string) => void | Promise<void>;
}

const statusLabelMap: Record<RunRecord["status"], string> = {
  queued: "排队中",
  planning: "构思中",
  storyboarding: "出图中",
  videoing: "成片中",
  imaging: "出图中",
  completed: "已完成",
  failed: "失败",
};

export function RecentRunsStrip({
  runs,
  deletingRunId = null,
  onDelete,
}: RecentRunsStripProps) {
  const visibleRuns = runs.filter((run) => hasRenderableResult(run));

  if (visibleRuns.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--ink-900)]">
            最近创作
          </h2>
        </div>
        <Link
          href="/history"
          className="rounded-full border border-[color:var(--line-soft)] bg-white/78 px-4 py-2 text-sm text-[color:var(--ink-700)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--ink-900)]"
        >
          查看全部
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {visibleRuns.slice(0, 6).map((run) => (
          (() => {
            const previewPath = getRunPreviewPath(run);
            const previewUrl = buildRunAssetUrl(run.id, previewPath);
            const cardTitle = getRunDisplayTitle(run, 28);
            const cardSummary = getRunDisplaySummary(run, 72);

            return (
              <div
                key={run.id}
                className="group relative overflow-hidden rounded-[26px] border border-[color:var(--line-soft)] bg-white/76 transition hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
              >
                {onDelete ? (
                  <button
                    type="button"
                    aria-label={`删除 ${cardTitle}`}
                    onClick={() => onDelete(run.id)}
                    disabled={deletingRunId === run.id}
                    className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white/92 text-base text-[color:var(--ink-500)] opacity-100 shadow-[0_8px_20px_rgba(15,23,42,0.1)] transition hover:text-[color:var(--ink-900)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                  >
                    {deletingRunId === run.id ? "…" : "×"}
                  </button>
                ) : null}

                <Link href={`/runs/${run.id}`} className="block">
                  <div className="aspect-[1.7/1] bg-[linear-gradient(135deg,rgba(54,192,255,0.14),rgba(122,184,255,0.08),rgba(255,255,255,0.8))]">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={cardTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(227,238,252,0.92),rgba(214,229,248,0.96))] px-6 text-center">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                          {run.request.generationMode === "image"
                            ? "已生成图片"
                            : "已生成视频"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[color:var(--ink-900)]">
                        {cardTitle}
                      </p>
                      <span className="rounded-full bg-[color:var(--paper-soft)] px-3 py-1 text-xs text-[color:var(--ink-500)]">
                        {statusLabelMap[run.status]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--ink-700)]">
                      {cardSummary}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })()
        ))}
      </div>
    </section>
  );
}
