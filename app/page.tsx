import { AppShell } from "../components/app-shell";
import { StudioPage } from "../components/studio-page";
import { loadRuntimePreflight } from "../lib/runtime-preflight";
import { listRuns } from "../lib/storage";

export default async function Page() {
  const [preflight, runs] = await Promise.all([
    loadRuntimePreflight(),
    listRuns(),
  ]);

  return (
    <AppShell activeNav="create">
      <StudioPage initialRuns={runs} preflight={preflight} />
    </AppShell>
  );
}
