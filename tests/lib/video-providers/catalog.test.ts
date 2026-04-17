import { describe, expect, it } from "vitest";
import {
  getDefaultVideoModel,
  normalizeVideoSelection,
} from "../../../lib/video-providers/catalog";

describe("Video provider catalog", () => {
  it("returns the provider-specific default model", () => {
    expect(getDefaultVideoModel("openai")).toBe("sora-2");
    expect(getDefaultVideoModel("kling")).toBe("kling-image-to-video");
    expect(getDefaultVideoModel("jimeng")).toBe("jimeng-image-to-video");
  });

  it("normalizes mismatched provider-model combinations", () => {
    expect(normalizeVideoSelection("kling", "sora-2")).toEqual({
      videoProvider: "kling",
      videoModel: "kling-image-to-video",
    });

    expect(normalizeVideoSelection("jimeng", "kling-image-to-video")).toEqual({
      videoProvider: "jimeng",
      videoModel: "jimeng-image-to-video",
    });
  });
});
