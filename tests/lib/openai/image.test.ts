import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeStoryboardImage } from "../../../lib/openai/image";

describe("OpenAI image helpers", () => {
  it("normalizes portrait storyboards to the target video frame size", async () => {
    const source = await sharp({
      create: {
        width: 1024,
        height: 1536,
        channels: 3,
        background: { r: 24, g: 24, b: 24 },
      },
    })
      .png()
      .toBuffer();

    const output = await normalizeStoryboardImage(source);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(720);
    expect(metadata.height).toBe(1280);
  });
});
