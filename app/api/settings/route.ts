import { NextResponse } from "next/server";
import { readSettings, updateSettings } from "../../../lib/storage";
import { settingsUpdateSchema } from "../../../lib/schemas";

export async function GET() {
  const settings = await readSettings();

  return NextResponse.json({
    hasOpenAiKey: Boolean(settings.openaiApiKey),
    plannerProvider: settings.plannerProvider,
    hasLingluKey: Boolean(settings.lingluApiKey),
    lingluBaseUrl: settings.lingluBaseUrl,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = settingsUpdateSchema.parse(body);
    const settings = await updateSettings(payload);

    return NextResponse.json({
      ok: true,
      hasOpenAiKey: Boolean(settings.openaiApiKey),
      plannerProvider: settings.plannerProvider,
      hasLingluKey: Boolean(settings.lingluApiKey),
      lingluBaseUrl: settings.lingluBaseUrl,
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
