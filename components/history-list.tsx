import Link from "next/link";
import type { RunRecord } from "../lib/schemas";
import { buildRunAssetUrl } from "../lib/run-assets";
import {
  formatRunCreatedAt,
  getRunDisplaySummary,
  getRunDisplayTitle,
} from "../lib/run-presenter";

interface HistoryListProps {
  runs: RunRecord[];
}

export function HistoryList({ runs }: HistoryListProps) {
  const statusLabels: Record<RunRecord["status"], string> = {
    queued: "排队中",
    planning: "构思中",
    storyboarding: "出图中",
    videoing: "成片中",
    completed: "已完成",
    failed: "失败",
  };

  if (runs.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[color:var(--line-strong)] bg-white/60 p-8 text-sm text-[color:var(--ink-700)]">
        还没有创作记录，先开始第一条吧。
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {runs.map((run) => {
        const previewPath =
          run.video?.thumbnailPath ||
          run.storyboards.find((item) => item.kind === "grid")?.path ||
          run.storyboards[0]?.path;
        const previewUrl = buildRunAssetUrl(run.id, previewPath);
        const title = getRunDisplayTitle(run, 34);
        const summary = getRunDisplaySummary(run, 100);

        return (
          <Link
            key={run.id}
            href={`/runs/${run.id}`}
            className="rounded-[28px] border border-[color:var(--line-soft)] bg-white/72 p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--line-strong)]"
          >
            <div className="flex gap-4">
              <div className="hidden h-24 w-36 shrink-0 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,rgba(54,192,255,0.14),rgba(122,184,255,0.08),rgba(255,255,255,0.8))] sm:block">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(227,238,252,0.92),rgba(214,229,248,0.96))] px-4 text-center">
                    <p className="text-[11px] font-medium tracking-[0.18em] text-[color:var(--ink-500)]">
                      {run.video ? "已生成视频" : "创作记录"}
                    </p>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[color:var(--ink-900)]">
                      {title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--ink-700)]">
                      {summary}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 text-xs text-[color:var(--ink-500)]">
                    <span className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-3 py-1">
                      {statusLabels[run.status]}
                    </span>
                    <span className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] px-3 py-1">
                      {formatRunCreatedAt(run.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
