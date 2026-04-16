import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { getRunsDir } from "../../../../../../lib/storage";

interface RouteContext {
  params: Promise<{
    id: string;
    segments: string[];
  }>;
}

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".json": "application/json",
};

export async function GET(_request: Request, context: RouteContext) {
  const { id, segments } = await context.params;
  const runRoot = resolve(getRunsDir(), id);
  const target = resolve(runRoot, ...segments);

  if (!target.startsWith(runRoot)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const file = await readFile(target);
    const extension = extname(target).toLowerCase();

    return new Response(file, {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
