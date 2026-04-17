import type { PlannerOutput } from "../lib/schemas";

interface DirectorReportProps {
  planner: PlannerOutput;
}

export function DirectorReport({ planner }: DirectorReportProps) {
  return (
    <section className="rounded-[28px] border border-[color:var(--line-soft)] bg-white/70 p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-500)]">
          内容规划
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[color:var(--ink-900)]">
          {planner.title}
        </h3>
        <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
          {planner.content_summary}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
            品牌调性
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-900)]">
            {planner.brand_tone}
          </p>
        </div>

        <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
            视觉风格
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-900)]">
            {planner.visual_style}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
          生成要求
        </p>
        <p className="mt-2 text-sm leading-7 text-[color:var(--ink-900)]">
          {planner.overall_prompt_guardrails}
        </p>
      </div>

      {planner.frozen_world ? (
        <div className="mt-4 rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
            主体与场景设定
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                主体
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-900)]">
                {planner.frozen_world.subject_identity}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                场景
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-900)]">
                {planner.frozen_world.setting}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                时间氛围
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-900)]">
                {planner.frozen_world.time_of_day}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                类型
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-900)]">
                {planner.frozen_world.subject_type}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
              关键锚点
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {planner.frozen_world.anchors.map((anchor) => (
                <span
                  key={anchor}
                  className="rounded-full border border-[color:var(--line-soft)] bg-white/75 px-3 py-1 text-xs text-[color:var(--ink-700)]"
                >
                  {anchor}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {planner.shots.map((shot) => (
          <div
            key={shot.id}
            className="rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--ink-900)]">
                  {shot.id}
                  {shot.grid_index ? ` · 第 ${shot.grid_index} 格` : ""}
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                  {shot.goal}
                </p>
              </div>
              <span className="rounded-full border border-[color:var(--line-soft)] bg-white/75 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                {shot.camera || "镜头待补充"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
              {shot.narrative_beat}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
