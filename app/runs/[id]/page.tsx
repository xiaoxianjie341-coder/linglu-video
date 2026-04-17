import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { RunDetailPage } from "../../../components/run-detail-page";
import { loadRuntimePreflight } from "../../../lib/runtime-preflight";
import { getRun, listRuns } from "../../../lib/storage";

interface RunPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RunPage({ params }: RunPageProps) {
  const { id } = await params;
  const [run, recentRuns, preflight] = await Promise.all([
    getRun(id),
    listRuns(),
    loadRuntimePreflight(),
  ]);

  if (!run) {
    notFound();
  }

  return (
    <AppShell activeNav="create">
      <RunDetailPage
        initialRun={run}
        runId={id}
        recentRuns={recentRuns}
        preflight={preflight}
      />
    </AppShell>
  );
}
