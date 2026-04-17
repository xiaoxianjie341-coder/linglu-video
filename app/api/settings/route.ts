import { NextResponse } from "next/server";
import { loadRuntimePreflight } from "../../../lib/runtime-preflight";
import { readSettings, updateSettings } from "../../../lib/storage";
import { settingsUpdateSchema } from "../../../lib/schemas";

export async function GET() {
  const settings = await readSettings();
  const runtimePreflight = await loadRuntimePreflight();

  return NextResponse.json({
    hasOpenAiKey: Boolean(settings.openaiApiKey),
    plannerProvider: settings.plannerProvider,
    hasLingluKey: Boolean(settings.lingluApiKey),
    lingluBaseUrl: settings.lingluBaseUrl,
    hasKlingKey: Boolean(settings.klingApiKey),
    klingBaseUrl: settings.klingBaseUrl,
    hasJimengKey: Boolean(settings.jimengApiKey),
    jimengBaseUrl: settings.jimengBaseUrl,
    runtimePreflight,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = settingsUpdateSchema.parse(body);
    const settings = await updateSettings(payload);
    const runtimePreflight = await loadRuntimePreflight();

    return NextResponse.json({
      ok: true,
      hasOpenAiKey: Boolean(settings.openaiApiKey),
      plannerProvider: settings.plannerProvider,
      hasLingluKey: Boolean(settings.lingluApiKey),
      lingluBaseUrl: settings.lingluBaseUrl,
      hasKlingKey: Boolean(settings.klingApiKey),
      klingBaseUrl: settings.klingBaseUrl,
      hasJimengKey: Boolean(settings.jimengApiKey),
      jimengBaseUrl: settings.jimengBaseUrl,
      runtimePreflight,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
