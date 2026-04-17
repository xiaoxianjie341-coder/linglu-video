export const VIDEO_PROVIDER_IDS = ["openai", "kling", "jimeng"] as const;

export type VideoProviderId = (typeof VIDEO_PROVIDER_IDS)[number];

export const VIDEO_MODEL_OPTIONS = {
  openai: [
    { value: "sora-2", label: "Sora 2" },
    { value: "sora-2-pro", label: "Sora 2 Pro" },
  ],
  kling: [{ value: "kling-image-to-video", label: "Kling 图参考视频" }],
  jimeng: [{ value: "jimeng-image-to-video", label: "即梦图参考视频" }],
} as const satisfies Record<
  VideoProviderId,
  readonly { value: string; label: string }[]
>;

export function getDefaultVideoModel(provider: VideoProviderId): string {
  return VIDEO_MODEL_OPTIONS[provider][0]?.value ?? "sora-2";
}

export function normalizeVideoSelection(
  videoProvider: VideoProviderId,
  videoModel?: string,
): {
  videoProvider: VideoProviderId;
  videoModel: string;
} {
  const trimmedModel = videoModel?.trim() ?? "";
  const models = VIDEO_MODEL_OPTIONS[videoProvider];
  const matchedModel = models.find((item) => item.value === trimmedModel)?.value;

  return {
    videoProvider,
    videoModel: matchedModel || getDefaultVideoModel(videoProvider),
  };
}
