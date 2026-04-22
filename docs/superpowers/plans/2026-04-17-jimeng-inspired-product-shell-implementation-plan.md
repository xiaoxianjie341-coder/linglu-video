# 即梦参考式产品壳重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前内部工具感较强的 Web 界面重构成更像对外产品的统一壳子，新增真实可用的首页 preflight、任务详情页与增量结果写回，保证首页、任务页、历史页、设置页都围绕现有业务能力工作。

**Architecture:** 这次改造分成两层同时推进。第一层是数据与路由层，补首页可用性 preflight、运行阶段持久化字段、任务页所需的增量结果写回，并把首页查询参数式任务展示迁移到独立任务详情页。第二层是产品壳与页面层，抽出统一导航/页面舞台/任务流卡片等共享组件，在此基础上分别重做首页、历史页和设置页，使首页高拟合参考即梦的大输入入口，内页按真实业务流程重排。

**Tech Stack:** Next.js App Router、React 19、TypeScript、Tailwind CSS、Zod、现有 JSON 文件存储、Vitest。

---

## Repository Note

当前工作区不是 git 仓库，因此本计划里的“提交”步骤改为“保存检查点”，使用测试、类型检查和构建结果代替 commit。若后续初始化 git，可把这些检查点替换为真实提交。

## File Structure

### Existing Files To Modify

- `package.json`
  - 如需补组件行为测试，新增 `@testing-library/react`、`@testing-library/user-event` 与 `jsdom`。
- `app/layout.tsx`
  - 改为统一产品壳入口，承载左侧导航与更轻量的页面外层结构。
- `app/page.tsx`
  - 从“首页 + 任务详情混合页”调整为纯首页入口，承载新的创作首页。
- `app/history/page.tsx`
  - 接入新的产品壳与历史页结构。
- `app/settings/page.tsx`
  - 接入新的产品壳与设置页文案结构。
- `app/api/generate/route.ts`
  - 复用首页 preflight 校验，避免首页显示可生成而提交后立即失败。
- `app/api/settings/route.ts`
  - 扩展为返回首页所需的真实可用性信息，或转接新的 preflight 逻辑。
- `app/api/runs/[id]/route.ts`
  - 返回扩展后的 run 数据，包括阶段与增量产物。
- `lib/openai/client.ts`
  - 复用现有 planner runtime 解析，避免 preflight 与真实执行分叉。
- `lib/video-providers/runtime.ts`
  - 复用现有 provider/runtime 解析，保证首页只暴露真实可执行的视频 provider。
- `components/studio-page.tsx`
  - 拆出首页逻辑，移除当前 query-param 驱动的任务详情混排。
- `components/input-panel.tsx`
  - 重做为即梦参考式大输入卡，并消费服务端 preflight 结果。
- `components/history-list.tsx`
  - 改成作品记录卡片列表。
- `components/settings-form.tsx`
  - 改成接入配置卡片式布局，清晰区分可用能力与预接入能力。
- `components/progress-panel.tsx`
  - 现有进度面板可能保留部分阶段映射逻辑，或被新的任务流卡片替代。
- `components/storyboard-grid.tsx`
  - 改成任务页时间线中的总分镜产物卡。
- `components/video-result.tsx`
  - 改成任务页时间线中的最终视频产物卡。
- `lib/schemas.ts`
  - 扩展 `RunRecord` 的阶段字段，并定义 preflight 返回结构。
- `lib/storage.ts`
  - 支持增量更新阶段字段、故事提要、总分镜与视频结果。
- `lib/pipeline/run-generation.ts`
  - 改成增量写回 planner/storyboard/video，并在失败时记录准确失败阶段。
- `lib/storyboard-pipeline.ts`
  - 通过 `onPhase` 与新增产物级回调把活跃阶段/失败阶段传回上层。

### New Files To Create

- `app/runs/[id]/page.tsx`
  - 新的任务详情页路由，负责渲染对话式/时间线式任务执行现场。
- `components/run-detail-page.tsx`
  - 任务详情页的客户端容器，迁移并承接现有轮询逻辑，驱动阶段持续推进与增量产物刷新。
- `components/app-shell.tsx`
  - 统一产品壳组件，包含左侧窄导航、页面头部与主内容舞台。
- `components/home-hero.tsx`
  - 首页主视觉与能力说明区域。
- `components/recent-runs-strip.tsx`
  - 首页底部的最近任务轻列表。
- `components/run-timeline.tsx`
  - 任务详情页的阶段时间线容器。
- `components/run-stage-card.tsx`
  - 单个阶段卡片，支持待开始/处理中/成功/失败/上游失败未开始。
- `components/run-input-card.tsx`
  - 任务页顶部的用户输入回显卡。
- `components/run-summary-card.tsx`
  - 任务页里的故事提要卡。
- `components/settings-section-card.tsx`
  - 设置页统一配置卡壳。
- `lib/runtime-preflight.ts`
  - 统一解析首页/提交接口共用的“是否可生成”判定。
- `lib/run-stage-mapping.ts`
  - 把 run 数据映射成任务页阶段卡状态。

### Tests To Create Or Update

- `tests/lib/runtime-preflight.test.ts`
  - 验证首页/提交共用的可用性判断。
- `tests/app/api/generate.route.test.ts`
  - 验证提交接口复用 preflight，阻断不可执行请求。
- `tests/app/api/settings.route.test.ts`
  - 验证设置接口返回首页所需的 preflight 元数据。
- `tests/lib/run-stage-mapping.test.ts`
  - 验证任务页阶段映射在成功、失败、未开始等情况下的输出。
- `tests/lib/pipeline/run-generation.test.ts`
  - 扩展现有运行编排测试，验证增量写回 planner/storyboard/video，并记录失败阶段。
- `tests/components/studio-page.test.tsx`
  - 验证首页真实提交流程会在成功后跳转到 `/runs/[id]`。
- `tests/components/settings-form.test.tsx`
  - 验证设置页会消费 `runtimePreflight` 并通过 POST 正确回写。
- `tests/components/history-list.test.tsx`
  - 验证历史卡片链接统一跳到 `/runs/[id]`。
- `tests/lib/schemas.test.ts`
  - 扩展 run schema 与 preflight schema 的断言。
- `tests/lib/storage.test.ts`
  - 扩展增量写回与阶段字段持久化断言。

## Task 1: 打通首页可用性与提交前校验

**Files:**
- Create: `lib/runtime-preflight.ts`
- Modify: `app/api/settings/route.ts`
- Modify: `app/api/generate/route.ts`
- Modify: `lib/openai/client.ts`
- Modify: `lib/video-providers/runtime.ts`
- Modify: `lib/schemas.ts`
- Test: `tests/lib/runtime-preflight.test.ts`
- Test: `tests/app/api/generate.route.test.ts`
- Test: `tests/app/api/settings.route.test.ts`
- Test: `tests/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
it("reports homepage generation as blocked when the OpenAI execution chain is unavailable", async () => {
  const result = await resolveRuntimePreflight({
    openaiApiKey: "",
    plannerProvider: "linglu",
    lingluApiKey: "ll-test-123",
  });

  expect(result.canGenerate).toBe(false);
  expect(result.blockingReason).toContain("OpenAI");
});

it("still blocks generation when linglu is configured but the real storyboard pipeline cannot execute it yet", () => {
  const result = resolveRuntimePreflight({
    openaiApiKey: "sk-test-123",
    plannerProvider: "linglu",
    lingluApiKey: "ll-test-123",
    lingluBaseUrl: "https://gateway.linglu.ai/v1",
    klingApiKey: "",
    klingBaseUrl: "",
    jimengApiKey: "",
    jimengBaseUrl: "",
  });

  expect(result.plannerReady).toBe(false);
  expect(result.canGenerate).toBe(false);
  expect(result.blockingReason).toContain("当前规划器链路仅支持 OpenAI");
});

it("keeps unimplemented providers out of available homepage options", async () => {
  const result = await resolveRuntimePreflight({
    openaiApiKey: "sk-test-123",
    klingApiKey: "kling-key-123",
  });

  expect(result.availableVideoProviders).toEqual(["openai"]);
});

it("rejects generate requests when preflight says the run cannot start", async () => {
  const response = await POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify({
        ...minimalRequest,
        videoProvider: "kling",
        videoModel: "kling-v1",
      }),
    }),
  );

  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test tests/lib/runtime-preflight.test.ts tests/lib/schemas.test.ts`

Expected: FAIL because `runtime-preflight.ts`, route-level preflight reuse, and the related schema fields do not exist yet.

- [ ] **Step 3: Implement the minimal preflight layer**

```typescript
export function resolveRuntimePreflight(
  settings: StoredSettings,
  request?: Pick<GenerationRequest, "videoProvider" | "videoModel">,
): RuntimePreflight {
  // Must mirror the execution truth in storyboard-pipeline.ts, not a theoretical config.
  // Until linglu is truly executable in storyboard-pipeline.ts, treat it as blocked here too.
  const plannerReady = settings.plannerProvider === "openai" && canUseOpenAIMedia(settings);
  const openaiMediaReady = canUseOpenAIMedia(settings);
  const availableVideoProviders = resolveImplementedVideoProviders(settings);
  const requestAllowed = request
    ? availableVideoProviders.includes(request.videoProvider)
    : true;

  return {
    plannerReady,
    storyboardImageReady: openaiMediaReady,
    availableVideoProviders,
    canGenerate:
      openaiMediaReady &&
      plannerReady &&
      availableVideoProviders.length > 0 &&
      requestAllowed,
    blockingReason: /* derive one clear blocking reason */,
  };
}
```

```typescript
export async function loadRuntimePreflight(
  baseDir?: string,
  request?: Pick<GenerationRequest, "videoProvider" | "videoModel">,
) {
  const settings = await readSettings(baseDir);
  return resolveRuntimePreflight(settings, request);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/lib/runtime-preflight.test.ts tests/app/api/generate.route.test.ts tests/app/api/settings.route.test.ts tests/lib/schemas.test.ts`

Expected: PASS

- [ ] **Step 5: Save a checkpoint**

Run: `npm run typecheck`

Expected: PASS

## Task 2: 扩展 run 数据契约并支持增量写回

**Files:**
- Modify: `lib/schemas.ts`
- Modify: `lib/storage.ts`
- Modify: `lib/pipeline/run-generation.ts`
- Modify: `lib/storyboard-pipeline.ts`
- Test: `tests/lib/pipeline/run-generation.test.ts`
- Test: `tests/lib/storage.test.ts`
- Test: `tests/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
it("persists active and failed phases on a run record", async () => {
  const run = await createRun(minimalRequest, tempDir);

  const updated = await updateRun(
    run.id,
    { activePhase: "storyboarding", failedPhase: "storyboarding" },
    tempDir,
  );

  expect(updated.activePhase).toBe("storyboarding");
  expect(updated.failedPhase).toBe("storyboarding");
});

it("keeps planner and storyboard artifacts when written incrementally", async () => {
  const run = await createRun(minimalRequest, tempDir);
  await updateRun(run.id, { planner: plannerFixture }, tempDir);
  await updateRun(run.id, { storyboards: [gridStoryboardFixture] }, tempDir);

  const reloaded = await getRun(run.id, tempDir);
  expect(reloaded?.planner?.content_summary).toBeTruthy();
  expect(reloaded?.storyboards).toHaveLength(1);
});

it("writes planner and storyboard results before the final video completes", async () => {
  const writes = await runGenerationWithMockedPipelinePhases();

  expect(writes).toContainEqual(expect.objectContaining({ planner: expect.any(Object) }));
  expect(writes).toContainEqual(expect.objectContaining({ storyboards: expect.any(Array) }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test tests/lib/pipeline/run-generation.test.ts tests/lib/storage.test.ts tests/lib/schemas.test.ts`

Expected: FAIL because `activePhase` / `failedPhase` are not in the run schema yet and generation orchestration does not emit incremental writes.

- [ ] **Step 3: Implement the minimal data contract changes**

```typescript
export const runRecordSchema = z.object({
  // ...
  activePhase: z.string().nullable().default(null),
  failedPhase: z.string().nullable().default(null),
  // keep planner/storyboards/video as incrementally writable fields
});
```

```typescript
await updateRun(runId, {
  status,
  phaseLabel,
  activePhase: status,
}, baseDir);
```

```typescript
await runStoryboardPipeline({
  // ...
  onPlanner: async (planner) => updateRun(runId, { planner }, baseDir),
  onStoryboard: async (storyboards) => updateRun(runId, { storyboards }, baseDir),
  onVideo: async (video) => updateRun(runId, { video }, baseDir),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/lib/pipeline/run-generation.test.ts tests/lib/storage.test.ts tests/lib/schemas.test.ts`

Expected: PASS

- [ ] **Step 5: Save a checkpoint**

Run: `npm run typecheck`

Expected: PASS

## Task 3: 新增任务阶段映射、详情页路由与轮询容器

**Files:**
- Create: `lib/run-stage-mapping.ts`
- Create: `app/runs/[id]/page.tsx`
- Create: `components/run-detail-page.tsx`
- Create: `components/run-timeline.tsx`
- Create: `components/run-stage-card.tsx`
- Create: `components/run-input-card.tsx`
- Create: `components/run-summary-card.tsx`
- Modify: `app/api/runs/[id]/route.ts`
- Test: `tests/lib/run-stage-mapping.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
it("marks downstream stages as blocked after a storyboard failure", () => {
  const result = mapRunToStages({
    status: "failed",
    activePhase: "storyboarding",
    failedPhase: "storyboarding",
    planner: plannerFixture,
    storyboards: [],
    video: null,
  });

  expect(result[2]?.state).toBe("failed");
  expect(result[3]?.state).toBe("blocked");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test tests/lib/run-stage-mapping.test.ts`

Expected: FAIL because the mapping module does not exist yet.

- [ ] **Step 3: Implement the minimal route and mapping**

```typescript
export function mapRunToStages(run: RunRecord): StageViewModel[] {
  return [
    { id: "planning", state: /* derive from run.activePhase / run.failedPhase */ },
    { id: "storyboarding", state: /* ... */ },
    { id: "videoing", state: /* ... */ },
  ];
}
```

```tsx
export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  return <RunDetailPageClient initialRun={run} runId={id} />;
}
```

```tsx
function RunDetailPageClient({ initialRun, runId }: Props) {
  // migrate polling logic from StudioPage and refresh planner/storyboards/video incrementally
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/lib/run-stage-mapping.test.ts`

Expected: PASS

- [ ] **Step 5: Save a checkpoint**

Run: `npm run typecheck`

Expected: PASS

## Task 4: 重做首页并迁移生成入口

**Files:**
- Modify: `app/page.tsx`
- Modify: `package.json`
- Modify: `components/studio-page.tsx`
- Modify: `components/input-panel.tsx`
- Create: `components/app-shell.tsx`
- Create: `components/home-hero.tsx`
- Create: `components/recent-runs-strip.tsx`
- Modify: `app/layout.tsx`
- Test: `tests/components/studio-page.test.tsx`
- Test: `tests/app/api/generate.route.test.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
// @vitest-environment jsdom
it("navigates to /runs/[id] after a successful homepage submission", async () => {
  render(<StudioPage initialRuns={[]} initialRun={null} preflight={readyPreflight} />);
  await userEvent.type(screen.getByRole("textbox"), "测试题材");
  await userEvent.click(screen.getByRole("button", { name: /开始生成/i }));

  expect(mockPush).toHaveBeenCalledWith("/runs/run_123");
});

``` 

```typescript
it("returns a run id that the homepage can redirect to after successful submission", async () => {
  const response = await POST(validGenerateRequest());
  const payload = await response.json();

  expect(payload.runId).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/components/studio-page.test.tsx tests/app/api/generate.route.test.ts`

Expected: FAIL because the route helper / homepage navigation shape is not defined yet.

- [ ] **Step 3: Implement the minimal homepage shell**

```tsx
<AppShell activeNav="create">
  <HomeHero />
  <InputPanel variant="hero" preflight={preflight} />
  <RecentRunsStrip runs={recentRuns} />
</AppShell>
```

```tsx
router.push(`/runs/${data.runId}`);
```

- [ ] **Step 4: Run focused verification**

Run: `npm run typecheck && npm run web:build`

Expected: PASS

- [ ] **Step 5: Save a checkpoint**

Run: `npm test tests/components/studio-page.test.tsx tests/app/api/generate.route.test.ts`

Expected: PASS

## Task 5: 重做历史页与设置页

**Files:**
- Modify: `app/history/page.tsx`
- Modify: `package.json`
- Modify: `components/history-list.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `components/settings-form.tsx`
- Create: `components/settings-section-card.tsx`
- Modify: `app/api/settings/route.ts`
- Test: `tests/app/api/settings.route.test.ts`
- Test: `tests/components/settings-form.test.tsx`
- Test: `tests/components/history-list.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
it("returns homepage preflight metadata alongside saved settings", async () => {
  const response = await GET();
  const payload = await response.json();
  expect(payload).toHaveProperty("runtimePreflight");
});

it("persists updated settings through POST and returns the latest runtime preflight", async () => {
  const response = await POST(validSettingsRequest());
  const payload = await response.json();

  expect(payload.ok).toBe(true);
  expect(payload.runtimePreflight).toBeTruthy();
});
```

```tsx
// @vitest-environment jsdom
it("renders settings status from runtimePreflight and posts updates back", async () => {
  render(<SettingsForm initialSettings={settingsFixture} runtimePreflight={blockedPreflight} />);
  expect(screen.getByText(/暂时无法开始生成/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /保存设置/i }));
  expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({ method: "POST" }));
});

it("links each history card to the dedicated run detail page", () => {
  render(<HistoryList runs={[runFixture]} />);
  expect(screen.getByRole("link")).toHaveAttribute("href", "/runs/run_123");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/app/api/settings.route.test.ts tests/components/settings-form.test.tsx tests/components/history-list.test.tsx`

Expected: FAIL because the response shape does not include preflight metadata yet.

- [ ] **Step 3: Implement the minimal history/settings rewrite**

```tsx
<HistoryList runs={runs} variant="gallery" />
```

```tsx
<SettingsSectionCard title="OpenAI 媒体底座">
  {/* current key state + next action */}
</SettingsSectionCard>
```

- [ ] **Step 4: Run focused verification**

Run: `npm run typecheck && npm run web:build`

Expected: PASS

- [ ] **Step 5: Save a checkpoint**

Run: `npm test tests/app/api/settings.route.test.ts tests/components/settings-form.test.tsx tests/components/history-list.test.tsx`

Expected: PASS

## Task 6: 全量验证并手动走通主流程

**Files:**
- Modify: `components/*` and `app/*` as needed based on verification results
- Test: existing and new tests from previous tasks

- [ ] **Step 1: Run the full targeted test suite**

Run: `npm test tests/lib/runtime-preflight.test.ts tests/app/api/generate.route.test.ts tests/app/api/settings.route.test.ts tests/lib/run-stage-mapping.test.ts tests/lib/pipeline/run-generation.test.ts tests/lib/schemas.test.ts tests/lib/storage.test.ts tests/components/studio-page.test.tsx tests/components/settings-form.test.tsx tests/components/history-list.test.tsx`

Expected: PASS

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck && npm run web:build`

Expected: PASS

- [ ] **Step 3: Run the app and verify the end-to-end shell**

Run: `npm run web:dev`

Expected: dev server starts successfully

- [ ] **Step 4: Manually verify the three critical flows**

```text
1. 首页：可见大输入卡；未配置时正确禁用并提示
2. 生成后：跳转到 /runs/[id]；阶段卡按时间线推进；故事提要/总分镜/视频逐步出现
3. 历史/设置：历史卡片化；设置显示接入状态与预接入 provider
```

- [ ] **Step 5: Save a final checkpoint**

Run: `npm run typecheck && npm run web:build`

Expected: PASS
