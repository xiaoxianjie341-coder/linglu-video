import { Suspense } from "react";
import { StudioPage } from "../components/studio-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 px-6 py-8 text-sm text-zinc-400">
          正在加载工作台...
        </div>
      }
    >
      <StudioPage />
    </Suspense>
  );
}
