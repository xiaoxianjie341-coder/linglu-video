import type { RunRecord } from "./schemas";

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function getPrimaryText(run: RunRecord): string {
  return run.planner?.title?.trim() || run.source.input.trim();
}

function getSecondaryText(run: RunRecord): string {
  return run.planner?.content_summary?.trim() || run.source.input.trim();
}

export function getRunDisplayTitle(run: RunRecord, maxLength = 28): string {
  return truncateText(getPrimaryText(run), maxLength);
}

export function getRunDisplaySummary(run: RunRecord, maxLength = 72): string {
  return truncateText(getSecondaryText(run), maxLength);
}

export function getRunPreviewPath(run: RunRecord): string | null {
  return (
    run.video?.thumbnailPath ??
    run.images?.[0]?.path ??
    run.storyboards?.find((item) => item.kind === "grid")?.path ??
    run.storyboards?.[0]?.path ??
    null
  );
}

export function hasRenderableResult(run: RunRecord): boolean {
  return Boolean(
    run.video ||
      (run.images?.length ?? 0) > 0 ||
      (run.storyboards?.length ?? 0) > 0,
  );
}

export function formatRunCreatedAt(
  createdAt: string,
  options?: { timeZone?: string },
): string {
  const date = new Date(createdAt);

  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: options?.timeZone,
  });
  const parts = formatter.formatToParts(date);

  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";

  return `${month}月${day}日 ${hour}:${minute}`;
}
