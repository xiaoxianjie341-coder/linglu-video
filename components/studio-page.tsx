"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InputPanel } from "./input-panel";
import { HomeHero } from "./home-hero";
import { RecentRunsStrip } from "./recent-runs-strip";
import type { GenerationRequest, RunRecord, RuntimePreflight } from "../lib/schemas";

interface StudioPageProps {
  initialRuns: RunRecord[];
  preflight: RuntimePreflight;
}

export function StudioPage({ initialRuns, preflight }: StudioPageProps) {
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

  async function handleGenerate(payload: GenerationRequest) {
    setRequestError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "启动生成任务失败。");
      }

      router.push(`/runs/${data.runId}`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRun(runId: string) {
    setRequestError(null);
    setDeletingRunId(runId);

    try {
      const response = await fetch(`/api/runs/${runId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "删除失败，请稍后再试。");
      }

      setRuns((currentRuns) => currentRuns.filter((run) => run.id !== runId));
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingRunId(null);
    }
  }

  return (
    <div className="space-y-8">
      <HomeHero preflight={preflight} />

      {requestError ? (
        <div className="mx-auto max-w-[920px] rounded-[24px] border border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] px-5 py-4 text-sm text-[color:var(--ink-900)]">
          {requestError}
        </div>
      ) : null}

      <div className="mx-auto max-w-[920px]">
        <InputPanel
          onSubmit={handleGenerate}
          isSubmitting={isSubmitting}
          preflight={preflight}
        />
      </div>

      <div className="mx-auto max-w-[1180px]">
        <RecentRunsStrip
          runs={runs}
          deletingRunId={deletingRunId}
          onDelete={handleDeleteRun}
        />
      </div>
    </div>
  );
}
