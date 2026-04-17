import { AppShell } from "../../components/app-shell";
import {
  SettingsForm,
  type SettingsFormInitialState,
} from "../../components/settings-form";
import { loadRuntimePreflight } from "../../lib/runtime-preflight";
import { readSettings } from "../../lib/storage";

export default async function SettingsPage() {
  const [settings, runtimePreflight] = await Promise.all([
    readSettings(),
    loadRuntimePreflight(),
  ]);

  const initialSettings: SettingsFormInitialState = {
    hasOpenAiKey: Boolean(settings.openaiApiKey),
    plannerProvider: settings.plannerProvider,
    hasLingluKey: Boolean(settings.lingluApiKey),
    lingluBaseUrl: settings.lingluBaseUrl,
    hasKlingKey: Boolean(settings.klingApiKey),
    klingBaseUrl: settings.klingBaseUrl,
    hasJimengKey: Boolean(settings.jimengApiKey),
    jimengBaseUrl: settings.jimengBaseUrl,
  };

  return (
    <AppShell activeNav="settings">
      <div className="space-y-6">
        <div className="px-2 pt-4">
          <h1 className="mt-3 text-4xl font-semibold text-[color:var(--ink-900)]">
            服务设置
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-700)]">
            把需要的服务接好后，就可以直接开始创作。
          </p>
        </div>

        <SettingsForm
          initialSettings={initialSettings}
          runtimePreflight={runtimePreflight}
        />
      </div>
    </AppShell>
  );
}
