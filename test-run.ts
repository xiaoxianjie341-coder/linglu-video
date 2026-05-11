import { planShots } from "./lib/openai/planner";
import { runStoryboardPipeline } from "./lib/storyboard-pipeline";

async function test() {
  try {
    const result = await runStoryboardPipeline({
      sourceType: "text",
      sourceInput: "一只会发光的柠檬在夜晚便利店门口抬头看霓虹灯，电影感，短片氛围。",
      brandTone: "电影感、克制、叙事清晰、人物和场景稳定",
      videoProvider: "openai",
      videoModel: "sora-2",
      clipSeconds: 4,
      limitShots: 1,
      skipVideo: true,
      outputDir: "data/storyboard-runs/linglu-minimal-proof",
      baseDir: process.cwd()
    });
    console.log("Success:", result.runId);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
