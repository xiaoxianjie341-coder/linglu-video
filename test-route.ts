import { settingsUpdateSchema } from "./lib/schemas";
import { updateSettings } from "./lib/storage";
import { loadRuntimePreflight } from "./lib/runtime-preflight";

async function test() {
  const payload = settingsUpdateSchema.parse({ plannerProvider: "openai" });
  await updateSettings(payload);
  const rt = await loadRuntimePreflight();
  console.log("Blocking Reason:", rt.blockingReason);
}
test().catch(console.error);
