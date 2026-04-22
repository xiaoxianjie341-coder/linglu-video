"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RunRecord } from "../lib/schemas";
import { buildRunAssetUrl } from "../lib/run-assets";
import {
  formatRunCreatedAt,
  getRunDisplaySummary,
  getRunDisplayTitle,
  getRunPreviewPath,
} from "../lib/run-presenter";

interface HistoryListProps {
  runs: RunRecord[];
}

function getFallbackPreviewLabel(run: RunRecord): string {
  if (run.request.generationMode === "image") {
    if (run.status === "completed") {
      return "已生成图片";
    }

    if (run.status === "failed") {
      return "图片生成失败";
    }

    return "图片生成中";
  }

  return run.video ? "已生成视频" : "创作记录";
}

export function HistoryList({ runs: initialRuns }: HistoryListProps) {
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

  // Sync state if initialRuns changes from server refresh
  useEffect(() => {
    setRuns(initialRuns);
  }, [initialRuns]);

  const statusLabels: Record<RunRecord["status"], string> = {
    queued: "排队中",
    planning: "构思中",
    storyboarding: "出图中",
    videoing: "成片中",
    imaging: "出图中",
    completed: "已完成",
    failed: "失败",
  };

  async function handleDeleteRun(runId: string) {
    setDeletingRunId(runId);

    try {
      const response = await fetch(`/api/runs/${runId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      setRuns((currentRuns) => currentRuns.filter((run) => run.id !== runId));
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingRunId(null);
    }
  }

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
        const previewPath = getRunPreviewPath(run);
        const previewUrl = buildRunAssetUrl(run.id, previewPath);
        const title = getRunDisplayTitle(run, 34);
        const summary = getRunDisplaySummary(run, 100);

        return (
          <div
            key={run.id}
            className="group relative rounded-[28px] border border-[color:var(--line-soft)] bg-white/72 transition hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] shadow-sm hover:shadow-[0_14px_36px_rgba(15,23,42,0.06)]"
          >
            <button
              type="button"
              aria-label={`删除 ${title}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleDeleteRun(run.id);
              }}
              disabled={deletingRunId === run.id}
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white/92 text-base text-[color:var(--ink-500)] opacity-100 shadow-[0_8px_20px_rgba(15,23,42,0.1)] transition hover:text-[color:var(--ink-900)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
            >
              {deletingRunId === run.id ? "…" : "×"}
            </button>
            <Link
              href={`/runs/${run.id}`}
              className="block p-4"
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
                        {getFallbackPreviewLabel(run)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 pr-6 md:pr-10">
                      <p className="text-base font-semibold text-[color:var(--ink-900)]">
                        {title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-700)]">
                        {summary}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 text-xs text-[color:var(--ink-500)] mt-2 md:mt-0 md:flex-col md:items-end">
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
          </div>
        );
      })}
    </div>
  );
}
