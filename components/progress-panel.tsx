interface ProgressPanelProps {
  status?: string;
  phaseLabel?: string;
  error?: string | null;
}

const phases = [
  { id: "queued", label: "排队中" },
  { id: "planning", label: "拆解脚本" },
  { id: "storyboarding", label: "生成分镜图" },
  { id: "videoing", label: "生成视频" },
  { id: "completed", label: "已完成" },
];

export function ProgressPanel({
  status,
  phaseLabel,
  error,
}: ProgressPanelProps) {
  const activeIndex = phases.findIndex((phase) => phase.id === status);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          进度
        </p>
        <h3 className="mt-2 text-xl font-semibold text-zinc-50">
          {phaseLabel || "等待新的任务"}
        </h3>
      </div>

      <div className="space-y-3">
        {phases.map((phase, index) => {
          const isActive = phase.id === status;
          const isComplete = activeIndex > index || status === "completed";

          return (
            <div
              key={phase.id}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                isActive
                  ? "border-blue-500 bg-blue-500/10 text-blue-100"
                  : isComplete
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              <span>{phase.label}</span>
              <span className="text-xs uppercase tracking-[0.2em]">
                {isActive ? "当前" : isComplete ? "完成" : "待处理"}
              </span>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}
