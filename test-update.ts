import { updateSettings, readSettings } from "./lib/storage";

async function run() {
  const existing = await readSettings();
  console.log("existing:", existing.plannerProvider);
  
  const updated = await updateSettings({ plannerProvider: "openai" });
  console.log("updated:", updated.plannerProvider);
}

run().catch(console.error);
