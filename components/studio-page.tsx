"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DirectorReport } from "./director-report";
import { InputPanel } from "./input-panel";
import { ProgressPanel } from "./progress-panel";
import { StoryboardGrid } from "./storyboard-grid";
import { VideoResult } from "./video-result";
import type { GenerationRequest, RunRecord } from "../lib/schemas";

export function StudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRunId = searchParams.get("runId");

  const [currentRunId, setCurrentRunId] = useState<string | null>(
    searchRunId,
  );
  const [currentRun, setCurrentRun] = useState<RunRecord | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (searchRunId && searchRunId !== currentRunId) {
      setCurrentRunId(searchRunId);
      setCurrentRun(null);
    }
  }, [currentRunId, searchRunId]);

  useEffect(() => {
    if (!currentRunId) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/runs/${currentRunId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("加载任务状态失败。");
        }

        const run = (await response.json()) as RunRecord;

        if (cancelled) {
          return;
        }

        setCurrentRun(run);
        setRequestError(null);

        if (run.status === "completed" || run.status === "failed") {
          return;
        }

        timeoutId = window.setTimeout(poll, 3000);
      } catch (error) {
        if (!cancelled) {
          setRequestError(
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [currentRunId]);

  async function handleGenerate(payload: GenerationRequest) {
    setRequestError(null);
    setCurrentRun(null);

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

    setCurrentRunId(data.runId);
    router.replace(`/?runId=${data.runId}`);
  }

  const isGenerating =
    Boolean(currentRunId) &&
    (currentRun ? !["completed", "failed"].includes(currentRun.status) : true);

  return (
    <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
      <div className="xl:sticky xl:top-6 xl:self-start">
        <InputPanel onSubmit={handleGenerate} isSubmitting={isGenerating} />
      </div>

      <div className="space-y-6">
        {requestError ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            {requestError}
          </div>
        ) : null}

        <ProgressPanel
          status={currentRun?.status ?? (currentRunId ? "queued" : undefined)}
          phaseLabel={
            currentRun?.phaseLabel ??
            (currentRunId ? "正在准备任务" : "等待新的任务")
          }
          error={currentRun?.error}
        />

        {currentRun ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 text-sm text-zinc-300">
            当前任务：
            <span className="font-medium text-zinc-100">{currentRun.id}</span>
          </div>
        ) : null}

        {currentRun?.planner ? (
          <DirectorReport planner={currentRun.planner} />
        ) : null}

        {currentRun ? (
          <StoryboardGrid
            runId={currentRun.id}
            storyboards={currentRun.storyboards}
          />
        ) : null}

        {currentRun ? (
          <VideoResult runId={currentRun.id} video={currentRun.video} />
        ) : null}

        {!currentRunId ? (
          <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-sm text-zinc-400">
            从左侧输入区开始。提交后，这里会显示导演拆解报告、分镜图，以及最终的
            Sora 视频片段。
          </section>
        ) : null}
      </div>
    </div>
  );
}
