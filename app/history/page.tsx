import { HistoryList } from "../../components/history-list";
import { listRuns } from "../../lib/storage";

export default async function HistoryPage() {
  const runs = await listRuns();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          历史记录
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-50">
          本地生成记录
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          这里直接读取本地 JSON 运行记录。
        </p>
      </div>

      <HistoryList runs={runs} />
    </div>
  );
}
