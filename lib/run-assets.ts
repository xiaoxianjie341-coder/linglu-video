export function buildRunAssetUrl(
  runId: string,
  absolutePath?: string | null,
): string | null {
  if (!absolutePath) {
    return null;
  }

  const normalized = absolutePath.replace(/\\/g, "/");
  const marker = `/${runId}/`;
  const markerIndex = normalized.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const relativePath = normalized.slice(markerIndex + marker.length);
  const encodedSegments = relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/runs/${runId}/files/${encodedSegments}`;
}
