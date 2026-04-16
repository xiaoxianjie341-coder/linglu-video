import { describe, expect, it } from "vitest";
import {
  buildVideoCreateBody,
  mapVideoStatus,
} from "../../../lib/openai/video";

describe("OpenAI video helpers", () => {
  it("maps OpenAI queued state to queued", () => {
    expect(mapVideoStatus({ status: "queued" })).toBe("queued");
  });

  it("maps in-progress jobs to videoing", () => {
    expect(mapVideoStatus({ status: "in_progress" })).toBe("videoing");
  });

  it("maps failed jobs to failed", () => {
    expect(mapVideoStatus({ status: "failed" })).toBe("failed");
  });

  it("builds a JSON payload for image-guided video generation", () => {
    const body = buildVideoCreateBody({
      prompt: "A teapot mascot steps into glowing light.",
      imageUrl: "data:image/png;base64,AAA",
      model: "sora-2",
      seconds: 4,
    });

    expect(body).toEqual({
      model: "sora-2",
      prompt: "A teapot mascot steps into glowing light.",
      size: "720x1280",
      seconds: "4",
      input_reference: {
        image_url: "data:image/png;base64,AAA",
      },
    });
  });
});
