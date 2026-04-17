import type { RunRecord } from "../lib/schemas";

interface RunInputCardProps {
  run: RunRecord;
}

export function RunInputCard({ run }: RunInputCardProps) {
  return (
    <section className="flex justify-end">
      <div className="max-w-[76%] rounded-[28px] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,#f3f6fb,#eef3fa)] px-5 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[color:var(--ink-500)]">
            本次创作
          </span>
          <span className="text-xs text-[color:var(--ink-500)]">
            {run.source.type === "url" ? "来自链接" : "来自文字"}
          </span>
        </div>

        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-900)]">
          {run.source.input}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--ink-500)]">
          <span className="rounded-full bg-white/80 px-3 py-1">
            {run.request.videoSeconds} 秒短片
          </span>
        </div>
      </div>
    </section>
  );
}
