"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GenerationRequest,
  RunRecord,
  RuntimePreflight,
} from "../lib/schemas";
import { DEFAULT_IMAGE_COUNT } from "../lib/image-generation";
import {
  formatRunCreatedAt,
  getRunDisplaySummary,
  getRunDisplayTitle,
  getRunPreviewPath,
} from "../lib/run-presenter";
import { buildRunAssetUrl } from "../lib/run-assets";
import { mapRunToStages } from "../lib/run-stage-mapping";
import { DirectorReport } from "./director-report";
import { ImageResult } from "./image-result";
import { InputPanel } from "./input-panel";
import { RunInputCard } from "./run-input-card";
import { RunStageCard } from "./run-stage-card";
import { RunSummaryCard } from "./run-summary-card";
import { RunTimeline } from "./run-timeline";
import { StoryboardGrid } from "./storyboard-grid";
import { VideoResult } from "./video-result";
import { HistoryIcon, SparkIcon, StoryIcon } from "./product-icons";

interface RunDetailPageProps {
  initialRun: RunRecord;
  runId: string;
  recentRuns: RunRecord[];
  preflight: RuntimePreflight;
}

const statusLabelMap: Record<RunRecord["status"], string> = {
  queued: "排队中",
  planning: "构思中",
  storyboarding: "出图中",
  videoing: "成片中",
  imaging: "出图中",
  completed: "已完成",
  failed: "失败",
};

export function RunDetailPage({
  initialRun,
  runId,
  recentRuns,
  preflight,
}: RunDetailPageProps) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (run.status === "completed" || run.status === "failed") {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/runs/${runId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("加载任务状态失败。");
        }

        const nextRun = (await response.json()) as RunRecord;

        if (cancelled) {
          return;
        }

        setRun(nextRun);
        setRequestError(null);

        if (nextRun.status === "completed" || nextRun.status === "failed") {
          return;
        }

        timeoutId = window.setTimeout(poll, 2500);
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : String(error));
          timeoutId = window.setTimeout(poll, 4000);
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
  }, [run.status, runId]);

  const stages = useMemo(() => mapRunToStages(run), [run]);
  const pipelineStages = stages.slice(1);
  const runTitle = getRunDisplayTitle(run, 40);
  const runSummary = getRunDisplaySummary(run, 120);
  const isImageRun = run.request.generationMode === "image";
  const imageRequest = isImageRun
    ? (run.request as Extract<GenerationRequest, { generationMode: "image" }>)
    : null;

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

  return (
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-[24px] border border-[color:var(--line-soft)] bg-white/78 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] xl:sticky xl:top-6 xl:h-fit">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--ink-900)]">
              新建创作
            </p>
            <p className="mt-1 text-xs text-[color:var(--ink-500)]">
              随时开始下一条
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-[color:var(--paper-soft)] px-3 py-2 text-xs text-[color:var(--ink-700)]"
          >
            新对话
          </Link>
        </div>

        <div className="mt-5 border-t border-[color:var(--line-soft)] pt-4">
          <p className="text-xs tracking-[0.18em] text-[color:var(--ink-500)]">
            最近
          </p>
          <div className="mt-3 space-y-1">
            {recentRuns
              .filter((r) => r.status !== "failed")
              .slice(0, 10)
              .map((item) => {
                const active = item.id === run.id;
                const itemTitle = getRunDisplayTitle(item, 22);
                const previewPath = getRunPreviewPath(item);
                const previewUrl = buildRunAssetUrl(item.id, previewPath);

                return (
                  <Link
                    key={item.id}
                    href={`/runs/${item.id}`}
                    className={`block rounded-xl px-2 py-2 text-sm transition ${
                      active
                        ? "bg-[color:var(--paper-soft)] text-[color:var(--ink-900)]"
                        : "text-[color:var(--ink-700)] hover:bg-[color:var(--paper-soft)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {previewUrl ? (
                        <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)]">
                          <img
                            src={previewUrl}
                            alt={itemTitle}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded border border-[color:var(--line-soft)] bg-[color:var(--paper-soft)] text-[color:var(--ink-400)]">
                          <HistoryIcon className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-medium text-[color:var(--ink-900)]">
                          {itemTitle}
                        </p>
                        <p className="mt-1 text-[11px] text-[color:var(--ink-500)]">
                          {statusLabelMap[item.status]}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-white/76 px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-2 text-2xl font-semibold text-[color:var(--ink-900)]">
                {runTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--ink-500)]">
                {runSummary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[color:var(--ink-700)]">
              <span className="rounded-full bg-[color:var(--paper-soft)] px-3 py-2">
                {statusLabelMap[run.status]}
              </span>
              <span className="rounded-full bg-[color:var(--paper-soft)] px-3 py-2">
                {formatRunCreatedAt(run.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-[color:var(--line-soft)] bg-[rgba(255,255,255,0.72)] px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:px-6">
          {requestError ? (
            <div className="mb-5 rounded-[24px] border border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] px-5 py-4 text-sm text-[color:var(--ink-900)]">
              {requestError}
            </div>
          ) : null}

          <div className="mb-5 flex items-center gap-2 text-sm text-[color:var(--ink-500)]">
            <SparkIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
            {run.status === "completed"
              ? isImageRun
                ? `${run.images.length || imageRequest?.imageCount || DEFAULT_IMAGE_COUNT} 张候选画面已经准备好，直接挑你更喜欢的方向就行。`
                : "这条已经完成，可以直接开始下一条。"
              : isImageRun
                ? `正在先给你铺开 ${imageRequest?.imageCount ?? DEFAULT_IMAGE_COUNT} 张预览图，喜欢的方向会逐张亮起。`
                : "正在生成中，结果会自动更新。"}
          </div>

          <RunTimeline>
            <RunInputCard run={run} />

            {pipelineStages.map((stage) => {
              const stageContent =
                stage.id === "planning" ? (
                  <>
                    <RunSummaryCard planner={run.planner} />
                    {run.planner ? <DirectorReport planner={run.planner} /> : null}
                  </>
                ) : stage.id === "storyboarding" ? (
                  <StoryboardGrid runId={run.id} storyboards={run.storyboards} />
                ) : stage.id === "imaging" ? (
                  <ImageResult
                    runId={run.id}
                    images={run.images}
                    expectedCount={
                      imageRequest?.imageCount
                    }
                    isGenerating={stage.state === "active"}
                    previewAspect={
                      imageRequest?.imageAspect
                    }
                  />
                ) : stage.id === "videoing" ? (
                  <VideoResult runId={run.id} video={run.video} />
                ) : null;

              return (
                <RunStageCard
                  key={stage.id}
                  title={stage.title}
                  description={stage.description}
                  state={stage.state}
                  error={stage.error}
                  isFinal={stage.id === "videoing" || stage.id === "imaging"}
                >
                  {stageContent}
                </RunStageCard>
              );
            })}
          </RunTimeline>

          <div className="sticky bottom-0 mt-6 bg-[linear-gradient(180deg,rgba(245,247,251,0),rgba(245,247,251,0.8)_16%,rgba(245,247,251,0.96)_38%,rgba(245,247,251,1)_100%)] pt-8">
            <div className="mx-auto max-w-[980px]">
              <div className="mb-3 flex items-center gap-2 text-xs text-[color:var(--ink-500)]">
                <StoryIcon className="h-4 w-4" />
                继续输入，会创建新的创作。
              </div>
              <InputPanel
                key={run.id}
                onSubmit={handleGenerate}
                isSubmitting={isSubmitting}
                preflight={preflight}
                mode="workspace"
                defaultGenerationMode={run.request.generationMode}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
