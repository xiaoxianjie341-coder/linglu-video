import { NextResponse } from "next/server";
import { generationRequestSchema } from "../../../lib/schemas";
import { createRun } from "../../../lib/storage";
import { runGeneration } from "../../../lib/pipeline/run-generation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = generationRequestSchema.parse(body);
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
