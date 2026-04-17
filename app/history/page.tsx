import { AppShell } from "../../components/app-shell";
import { HistoryList } from "../../components/history-list";
import { listRuns } from "../../lib/storage";

export default async function HistoryPage() {
  const runs = await listRuns();

  return (
    <AppShell activeNav="history">
      <div className="space-y-6">
        <div className="px-2 pt-4">
          <h1 className="mt-3 text-4xl font-semibold text-[color:var(--ink-900)]">
            创作记录
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-700)]">
            这里保留最近的创作结果和未完成记录，方便回看、继续查看和重新开始。
          </p>
        </div>

        <HistoryList runs={runs} />
      </div>
    </AppShell>
  );
}
