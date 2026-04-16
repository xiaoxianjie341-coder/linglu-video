import { NextResponse } from "next/server";
import { getRun } from "../../../../lib/storage";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const run = await getRun(id);

  if (!run) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  return NextResponse.json(run);
}
