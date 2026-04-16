import type { PlannerOutput } from "../lib/schemas";

interface DirectorReportProps {
  planner: PlannerOutput;
}

export function DirectorReport({ planner }: DirectorReportProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          导演拆解
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-zinc-50">
          {planner.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {planner.content_summary}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            品牌调性
          </p>
          <p className="mt-2 text-sm text-zinc-200">{planner.brand_tone}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            视觉风格
          </p>
          <p className="mt-2 text-sm text-zinc-200">{planner.visual_style}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          提示词约束
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-200">
          {planner.overall_prompt_guardrails}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {planner.shots.map((shot) => (
          <div
            key={shot.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-100">{shot.id}</p>
                <p className="mt-1 text-sm text-zinc-400">{shot.goal}</p>
              </div>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
                {shot.camera || "镜头待补充"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {shot.narrative_beat}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
