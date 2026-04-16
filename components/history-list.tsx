import Link from "next/link";
import type { RunRecord } from "../lib/schemas";

interface HistoryListProps {
  runs: RunRecord[];
}

export function HistoryList({ runs }: HistoryListProps) {
  const statusLabels: Record<RunRecord["status"], string> = {
    queued: "排队中",
    planning: "拆解中",
    storyboarding: "分镜生成中",
    videoing: "视频生成中",
    completed: "已完成",
    failed: "失败",
  };

  if (runs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-sm text-zinc-400">
        暂时还没有任务记录。先去工作台生成一次内容吧。
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {runs.map((run) => (
        <Link
          key={run.id}
          href={`/?runId=${run.id}`}
          className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-100">{run.id}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {run.source.input.slice(0, 120)}
              </p>
            </div>

            <div className="flex gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <span>{statusLabels[run.status]}</span>
              <span>{new Date(run.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
