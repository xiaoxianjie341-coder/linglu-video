import { NextResponse } from "next/server";
import { generationRequestSchema } from "../../../lib/schemas";
import { loadRuntimePreflight } from "../../../lib/runtime-preflight";
import { createRun } from "../../../lib/storage";
import { runGeneration } from "../../../lib/pipeline/run-generation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = generationRequestSchema.parse(body);
    const runtimePreflight = await loadRuntimePreflight(undefined, {
      videoProvider: payload.videoProvider,
      videoModel: payload.videoModel,
    });

    if (!runtimePreflight.canGenerate) {
      return NextResponse.json(
        {
          error: runtimePreflight.blockingReason || "当前配置还不能开始生成。",
        },
        { status: 400 },
      );
    }

    const run = await createRun(payload);

    void runGeneration(run.id, payload);

    return NextResponse.json({ runId: run.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
