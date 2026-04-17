import type { PlannerOutput } from "../lib/schemas";

interface RunSummaryCardProps {
  planner: PlannerOutput | null;
}

export function RunSummaryCard({ planner }: RunSummaryCardProps) {
  if (!planner) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-white/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-500)]">
        故事提要
      </p>
      <h3 className="mt-3 text-lg font-semibold text-[color:var(--ink-900)]">
        {planner.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
        {planner.content_summary}
      </p>
    </div>
  );
}
