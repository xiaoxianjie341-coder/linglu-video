# `+` 图片入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把输入框左侧的禁用 `+` 变成真正的图片入口，并按已确认设计把上传图片在图片模式里解释为“参考图”、在视频模式里解释为“起始帧”，同时把这些输入稳定接入现有 request、run 存储和生成链路。

**Architecture:** 这次改造分成四层。第一层是输入媒体模型层，显式拆分“客户端提交态 request”和“run 持久化态 request”，让 data URL 只存在于浏览器到 API 的短链路里，进入 `run.json` 后统一变成稳定文件路径。第二层是输入交互层，激活 `components/input-panel.tsx` 里的 `+`，并按模式渲染不同的上传回显：图片模式是“参考图缩略图区”，视频模式是“起始帧卡片位”。第三层是执行链路层，让图片模式把参考图送进现有图片生成适配器，让视频模式把起始帧送进现有 `grid_preview` 的分镜生成阶段，先约束总分镜和开场视觉，再继续沿用现有 `gridPath -> final video` 主流程。第四层是结果回显层，把提交时的输入媒体重新展示到 run 详情页输入卡中，避免用户生成后看不到自己到底传了什么。

**Tech Stack:** Next.js App Router、React 19、TypeScript、Tailwind CSS、Zod、现有 JSON 文件存储、Vitest、OpenAI 图片/视频接口。

---

## Repository Note

当前仓库已经是 git 仓库，但这份计划遵守当前会话的约束：**不主动创建 git commit**。原本“Commit”步骤统一替换成“Save checkpoint”，使用定向测试、`npm run typecheck` 和必要时的 `npm run web:build` 作为检查点。

## File Structure

### Existing Files To Modify

- `app/api/generate/route.ts`
  - 在 `createRun()` 持久化上传图片之后，必须把**持久化后的 request** 传给后台生成链路，而不是继续把原始 data URL payload 传进去。
- `components/input-panel.tsx`
  - 激活当前禁用的 `+`，覆盖 `mode="home"` 与 `mode="workspace"` 两种输入场景，维护图片模式与视频模式各自独立的上传草稿状态，并把它们序列化成 `referenceImages` 或 `startFrame` 提交出去。
- `components/run-detail-page.tsx`
  - 适配扩展后的 request 类型，确保 run 详情页轮询与本地 `handleGenerate()` 仍能正确工作。
- `components/run-input-card.tsx`
  - 在“本次创作”卡片中回显上传的 `参考图` 或 `起始帧`。
- `lib/openai/image.ts`
  - 在已有图片生成能力上增加“可选参考图”的入口，但先保持适配器抽象，不在计划层提前写死某个未验证的 SDK endpoint / model 组合。
- `lib/pipeline/run-generation.ts`
  - 把视频模式新增的 `startFrame` 送入 `runStoryboardPipeline()`，并确保最终 run 记录使用的是持久化后的文件路径。
- `lib/pipeline/run-image-generation.ts`
  - 把图片模式新增的 `referenceImages` 送入候选图生成逻辑。
- `lib/schemas.ts`
  - 扩展 `GenerationRequest` 与 `RunRecord`，区分客户端上传图片的 data URL 形态与持久化后的 path 形态。
- `lib/storage.ts`
  - 把上传图片从请求体写入 `runs/<id>/inputs/`，并把 run.request 里的内联图片改写成稳定文件路径。
- `lib/storyboard-pipeline.ts`
  - 为 `grid_preview` 模式增加可选 `startFramePath`，让分镜网格生成阶段可以消费用户上传的起始帧作为视觉锚点，同时仍保留现有 `gridPath -> final video` 主流程。

### New Files To Create

- `lib/input-media.ts`
  - 统一维护上传图片的限制、标签文案、可接受 mime type、模式语义标签和辅助函数，避免这些常量散落在 `input-panel.tsx`、`schemas.ts` 和测试里。
- `tests/components/run-input-card.test.tsx`
  - 覆盖 run 详情页输入卡的输入媒体回显。

### Tests To Create Or Update

- `tests/app/api/generate.route.test.ts`
  - 验证 `/api/generate` 不会把原始 data URL 直接塞进后台链路，而是消费持久化后的 request。
- `tests/components/input-panel.test.tsx`
  - 验证 `+` 不再是禁用按钮，首页与 workspace 两种输入场景都会渲染入口；图片模式能提交 `referenceImages`，视频模式能提交 `startFrame`，并且两种模式的上传状态互不串味。
- `tests/lib/pipeline/run-generation.test.ts`
  - 验证视频请求会把 `startFrame.path` 透传给 `runStoryboardPipeline()`。
- `tests/lib/pipeline/run-image-generation.test.ts`
  - 验证图片请求会把 `referenceImages` 透传给底层图片候选生成。
- `tests/lib/schemas.test.ts`
  - 验证图片模式与视频模式新增上传字段的 schema 行为。
- `tests/lib/storage.test.ts`
  - 验证内联上传图片会被写入磁盘，并在 run.request 中改写成 path，同时 `runRecordSchema` 能稳定 parse 持久化后的 request。
- `tests/components/run-input-card.test.tsx`
  - 验证 run 输入卡会按模式显示 `参考图` 或 `起始帧`。

## Task 1: 建立输入图片的数据契约与持久化

**Files:**
- Create: `lib/input-media.ts`
- Modify: `lib/schemas.ts`
- Modify: `lib/storage.ts`
- Modify: `app/api/generate/route.ts`
- Test: `tests/lib/schemas.test.ts`
- Test: `tests/lib/storage.test.ts`
- Test: `tests/app/api/generate.route.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
it("accepts image requests with uploaded reference images", () => {
  const result = inboundGenerationRequestSchema.parse({
    generationMode: "image",
    sourceType: "text",
    sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
    imageAspect: "portrait",
    imageCount: 2,
    referenceImages: [
      {
        id: "ref_1",
        name: "coffee.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        dataUrl: "data:image/png;base64,ZmFrZQ==",
      },
    ],
  });

  expect(result.generationMode).toBe("image");
  expect(result.referenceImages).toHaveLength(1);
});

it("accepts video requests with one uploaded start frame", () => {
  const result = inboundGenerationRequestSchema.parse({
    generationMode: "video",
    sourceType: "text",
    sourceInput: "一只茶壶吉祥物推开会发光的门。",
    shotCount: 9,
    videoProvider: "openai",
    videoModel: "sora-2",
    videoSeconds: 8,
    startFrame: {
      id: "start_1",
      name: "opening.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      dataUrl: "data:image/png;base64,ZmFrZQ==",
    },
  });

  expect(result.startFrame?.name).toBe("opening.png");
});

it("stores uploaded input images on disk before saving the run", async () => {
  const run = await createRun(
    {
      generationMode: "video",
      sourceType: "text",
      sourceInput: "一只茶壶吉祥物推开会发光的门。",
      shotCount: 9,
      videoProvider: "openai",
      videoModel: "sora-2",
      videoSeconds: 8,
      startFrame: {
        id: "start_1",
        name: "opening.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        dataUrl: "data:image/png;base64,ZmFrZQ==",
      },
    },
    tempDir,
  );

  expect(run.request.generationMode).toBe("video");
  expect(run.request.startFrame?.path).toContain("/inputs/");
});

it("parses persisted run records with path-based input media", () => {
  const result = runRecordSchema.parse({
    ...minimalRunRecord,
    request: {
      generationMode: "image",
      sourceType: "text",
      sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
      imageAspect: "portrait",
      imageCount: 2,
      referenceImages: [
        {
          id: "ref_1",
          name: "coffee.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          path: "/data/runs/run_1/inputs/ref_1.png",
        },
      ],
    },
  });

  expect(result.request.generationMode).toBe("image");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/schemas.test.ts tests/lib/storage.test.ts tests/app/api/generate.route.test.ts`

Expected: FAIL because `referenceImages` / `startFrame` do not exist yet, `RunRecord` 还只有单一 request 形态，而且 `createRun()` 仍然会把原始 request 直接存进 run。

- [ ] **Step 3: Implement the minimal data layer**

```typescript
// lib/input-media.ts
export const ACCEPTED_INPUT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_IMAGE_MODE_INPUTS = 4;
export const MAX_VIDEO_START_FRAMES = 1;
export const MAX_INPUT_IMAGE_BYTES = 10 * 1024 * 1024;

export function getInputRoleLabel(
  mode: "image" | "video",
): "参考图" | "起始帧" {
  return mode === "image" ? "参考图" : "起始帧";
}
```

```typescript
// lib/schemas.ts
const uploadedInputImageSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.enum(ACCEPTED_INPUT_IMAGE_TYPES),
  sizeBytes: z.number().int().min(1).max(MAX_INPUT_IMAGE_BYTES),
  dataUrl: z.string().startsWith("data:image/"),
});

const storedInputImageSchema = uploadedInputImageSchema
  .omit({ dataUrl: true })
  .extend({ path: z.string().min(1) });

const inboundImageGenerationRequestSchema = requestBaseSchema.extend({
  generationMode: z.literal("image"),
  sourceType: z.literal("text"),
  imageAspect: imageAspectSchema.default("portrait"),
  imageCount: z.number().int().min(1).max(9).default(DEFAULT_IMAGE_COUNT),
  referenceImages: z.array(uploadedInputImageSchema).max(MAX_IMAGE_MODE_INPUTS).default([]),
});

const inboundVideoGenerationRequestSchema = requestBaseSchema.extend({
  generationMode: z.literal("video").default("video"),
  shotCount: z.number().int().min(1).max(9).default(9),
  videoProvider: videoProviderSchema.default("openai"),
  videoModel: z.string().min(1).default(getDefaultVideoModel("openai")),
  videoSeconds: z.number().int().min(4).max(20).default(8),
  startFrame: uploadedInputImageSchema.optional(),
});

const storedImageGenerationRequestSchema = inboundImageGenerationRequestSchema.extend({
  referenceImages: z.array(storedInputImageSchema).max(MAX_IMAGE_MODE_INPUTS).default([]),
});

const storedVideoGenerationRequestSchema = inboundVideoGenerationRequestSchema.extend({
  startFrame: storedInputImageSchema.optional(),
});

export const inboundGenerationRequestSchema = z.union([
  inboundImageGenerationRequestSchema,
  inboundVideoGenerationRequestSchema,
]);

export const storedGenerationRequestSchema = z.union([
  storedImageGenerationRequestSchema,
  storedVideoGenerationRequestSchema,
]);

export const generationRequestSchema = inboundGenerationRequestSchema;
export const runRecordSchema = z.object({
  ...
  request: storedGenerationRequestSchema,
});

export type GenerationRequest = z.infer<typeof inboundGenerationRequestSchema>;
export type StoredGenerationRequest = z.infer<typeof storedGenerationRequestSchema>;
```

```typescript
// lib/storage.ts
async function persistUploadedInputImage(...) {
  // Decode data URL, infer extension, write file to runs/<id>/inputs/
}

export async function createRun(
  requestInput: GenerationRequest,
  baseDir?: string,
): Promise<RunRecord> {
  const request = inboundGenerationRequestSchema.parse(requestInput);
  const persistedRequest = await persistRunInputMedia(request, runId, baseDir);
  const run = runRecordSchema.parse({ ...base, request: persistedRequest });
  await writeJson(getRunPath(run.id, baseDir), run);
  return run;
}
```

```typescript
// app/api/generate/route.ts
const run = await createRun(payload);
void runGeneration(run.id, run.request, undefined);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/schemas.test.ts tests/lib/storage.test.ts tests/app/api/generate.route.test.ts`

Expected: PASS

- [ ] **Step 5: Save checkpoint**

Run: `npm run typecheck`

Expected: PASS

## Task 2: 激活 `+` 并做模式化上传回显

**Files:**
- Modify: `components/input-panel.tsx`
- Create: `components/input-media-preview.tsx`
- Test: `tests/components/input-panel.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```tsx
it("turns the left plus button into a working image uploader", async () => {
  render(<InputPanel onSubmit={handleSubmit} isSubmitting={false} preflight={readyPreflight} />);

  const plusButton = screen.getByRole("button", { name: "上传图片" });
  expect(plusButton).not.toBeDisabled();

  await userEvent.upload(
    screen.getByLabelText("上传图片文件"),
    new File(["fake"], "coffee.png", { type: "image/png" }),
  );

  expect(screen.getByText("参考图")).toBeTruthy();
});

it("renders the same plus entry in workspace mode", () => {
  render(
    <InputPanel
      onSubmit={handleSubmit}
      isSubmitting={false}
      preflight={readyPreflight}
      mode="workspace"
    />,
  );

  expect(screen.getByRole("button", { name: "上传图片" })).toBeTruthy();
});

it("treats the uploaded image as a start frame in video mode", async () => {
  render(<InputPanel onSubmit={handleSubmit} isSubmitting={false} preflight={readyPreflight} />);

  await userEvent.upload(
    screen.getByLabelText("上传图片文件"),
    new File(["fake"], "opening.png", { type: "image/png" }),
  );

  expect(screen.getByText("起始帧")).toBeTruthy();
});

it("keeps image-mode references and video-mode start frame in separate draft state", async () => {
  // Upload in image mode, switch to video, verify image-mode upload is not auto-reinterpreted.
});

it("supports append/remove in image mode and replace in video mode", async () => {
  // Upload two reference images, remove one, then switch to video mode and verify a second upload replaces the first start frame.
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/components/input-panel.test.tsx`

Expected: FAIL because the current `+` button is disabled, `mode="workspace"` still hides the entry, there is no file input, and the panel does not render any mode-specific upload preview.

- [ ] **Step 3: Implement the minimal interaction layer**

```tsx
// components/input-panel.tsx
const [imageModeDrafts, setImageModeDrafts] = useState<UploadedInputImage[]>([]);
const [videoModeStartFrame, setVideoModeStartFrame] = useState<UploadedInputImage | null>(null);

function handlePlusUpload(files: FileList | null) {
  if (!files?.length) return;

  if (generationMode === "image") {
    // append validated uploads into imageModeDrafts
  } else {
    // replace videoModeStartFrame with the first valid image
  }
}

async function handleSubmit(event: FormEvent) {
  ...
  onSubmit({
    ...basePayload,
    ...(generationMode === "image"
      ? { referenceImages: imageModeDrafts }
      : { startFrame: videoModeStartFrame ?? undefined }),
  });
}
```

```tsx
// components/input-media-preview.tsx
export function InputMediaPreview(props: {
  generationMode: "image" | "video";
  referenceImages: UploadedInputImage[];
  startFrame: UploadedInputImage | null;
  onRemoveReference: (id: string) => void;
  onClearStartFrame: () => void;
}) {
  if (props.generationMode === "image") {
    return <ReferenceStrip label="参考图" ... />;
  }

  return <StartFrameCard label="起始帧" ... />;
}
```

Implementation note: `+` 必须在 `mode="home"` 与 `mode="workspace"` 两种输入面板里都渲染，且去掉只在 `sm` 以上可见的隐藏逻辑。响应式观感除 jsdom 测试外，还需要一次浏览器手工检查。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/input-panel.test.tsx`

Expected: PASS

- [ ] **Step 5: Save checkpoint**

Run: `npm run typecheck`

Expected: PASS

## Task 3: 把上传图片接入图片生成与视频生成链路

**Files:**
- Modify: `lib/openai/image.ts`
- Modify: `lib/pipeline/run-image-generation.ts`
- Modify: `lib/pipeline/run-generation.ts`
- Modify: `lib/storyboard-pipeline.ts`
- Test: `tests/lib/pipeline/run-image-generation.test.ts`
- Test: `tests/lib/pipeline/run-generation.test.ts`

- [ ] **Step 1: Write the failing pipeline tests**

```typescript
it("passes stored reference images into image candidate generation", async () => {
  await runImageGeneration(
    run.id,
    {
      generationMode: "image",
      sourceType: "text",
      sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
      imageAspect: "portrait",
      imageCount: 2,
      referenceImages: [
        {
          id: "ref_1",
          name: "coffee.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          path: "/tmp/run/inputs/ref_1.png",
        },
      ],
    },
    tempDir,
  );

  expect(mocked.generateImageCandidate).toHaveBeenCalledWith(
    expect.objectContaining({
      referenceImages: expect.arrayContaining([
        expect.objectContaining({ path: "/tmp/run/inputs/ref_1.png" }),
      ]),
    }),
  );
});

it("forwards the stored video start frame into storyboard generation", async () => {
  await runGeneration(
    run.id,
    {
      generationMode: "video",
      sourceType: "text",
      sourceInput: "一只茶壶吉祥物推开会发光的门。",
      shotCount: 9,
      videoProvider: "openai",
      videoModel: "sora-2",
      videoSeconds: 8,
      startFrame: {
        id: "start_1",
        name: "opening.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        path: "/tmp/run/inputs/opening.png",
      },
    },
    tempDir,
  );

  expect(mocked.runStoryboardPipeline).toHaveBeenCalledWith(
    expect.objectContaining({
      startFramePath: "/tmp/run/inputs/opening.png",
    }),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/pipeline/run-image-generation.test.ts tests/lib/pipeline/run-generation.test.ts`

Expected: FAIL because the pipelines ignore uploaded `referenceImages` / `startFrame`, and storyboard generation has no way to consume a start-frame anchor.

- [ ] **Step 3: Implement the minimal execution behavior**

```typescript
// lib/pipeline/run-image-generation.ts
const prompts = buildImagePrompts(request);

for (const [offset, prompt] of prompts.entries()) {
  await generateImageCandidate({
    index: offset + 1,
    prompt,
    aspect: request.imageAspect,
    outputPath,
    referenceImages: request.referenceImages,
    baseDir,
  });
}
```

```typescript
// lib/storyboard-pipeline.ts
export interface StoryboardPipelineOptions {
  ...
  startFramePath?: string;
}

...

const gridPath = await generateStoryboardGrid(
  resolvedPlan,
  directories,
  baseDir,
  options.startFramePath,
);

finalVideo = await generateReferenceVideo(
  buildGridPreviewVideoPrompt(resolvedPlan, selectedShots),
  gridPath,
  finalVideoPath,
  clipSeconds,
  videoProvider,
  videoModel,
  baseDir,
);
```

```typescript
// lib/openai/image.ts
interface GenerateImageCandidateOptions {
  ...
  referenceImages?: Array<{ path: string }>;
}

if (referenceImages?.length) {
  return generateReferencedImage({
    prompt,
    aspect,
    referenceImages,
    outputPath,
    baseDir,
  });
}

return generatePromptOnlyImage({ prompt, aspect, outputPath, baseDir });
```

Implementation note: 视频模式里的 `起始帧` 在 V1 中是“分镜生成的开场视觉锚点”，不是新的多关键帧时间轴。计划保持现有 `grid_preview` 工作流：先让 `startFramePath` 参与 `generateStoryboardGrid()`，再继续沿用现有 `gridPath -> final video` 主流程。这样实现后，视频仍然对现有总分镜链路诚实，但起始帧已经会真实影响开场视觉和总分镜。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/pipeline/run-image-generation.test.ts tests/lib/pipeline/run-generation.test.ts`

Expected: PASS

- [ ] **Step 5: Save checkpoint**

Run: `npm run typecheck`

Expected: PASS

## Task 4: 在 run 详情页回显上传的输入图片

**Files:**
- Modify: `components/run-input-card.tsx`
- Modify: `components/run-detail-page.tsx`
- Create: `tests/components/run-input-card.test.tsx`

- [ ] **Step 1: Write the failing detail-page tests**

```tsx
it("renders image-mode uploaded references in the run input card", () => {
  render(
    <RunInputCard
      run={buildRun({
        request: {
          generationMode: "image",
          sourceType: "text",
          sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
          imageAspect: "portrait",
          imageCount: 2,
          referenceImages: [
            {
              id: "ref_1",
              name: "coffee.png",
              mimeType: "image/png",
              sizeBytes: 1024,
              path: "/data/runs/run_1/inputs/ref_1.png",
            },
          ],
        },
      })}
    />,
  );

  expect(screen.getByText("参考图")).toBeTruthy();
});

it("renders video-mode uploaded start frame in the run input card", () => {
  // Expect a visible 起始帧 label and preview image.
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/components/run-input-card.test.tsx`

Expected: FAIL because `RunInputCard` currently only shows source text and high-level mode chips.

- [ ] **Step 3: Implement the minimal run-detail rendering**

```tsx
// components/run-input-card.tsx
const request = run.request;
const isImageRun = request.generationMode === "image";

return (
  <section ...>
    ...
    {isImageRun && request.referenceImages.length > 0 ? (
      <InputMediaList label="参考图" items={request.referenceImages} />
    ) : null}

    {!isImageRun && request.startFrame ? (
      <InputMediaList label="起始帧" items={[request.startFrame]} />
    ) : null}
  </section>
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/run-input-card.test.tsx`

Expected: PASS

- [ ] **Step 5: Save checkpoint**

Run: `npm test -- tests/components/run-input-card.test.tsx tests/components/input-panel.test.tsx && npm run typecheck`

Expected: PASS

## Final Verification

- [ ] Run: `npm test -- tests/lib/schemas.test.ts tests/lib/storage.test.ts tests/app/api/generate.route.test.ts tests/components/input-panel.test.tsx tests/lib/pipeline/run-image-generation.test.ts tests/lib/pipeline/run-generation.test.ts tests/components/run-input-card.test.tsx`
- [ ] Expected: PASS
- [ ] Run: `npm run typecheck`
- [ ] Expected: PASS
- [ ] Run: `npm run web:build`
- [ ] Expected: PASS
- [ ] Manual QA: 在浏览器里分别检查首页输入区与 run 详情页输入区，确认 `+` 在桌面和窄宽布局下都可见
- [ ] Manual QA: 图片模式验证“追加/删除/上限”，视频模式验证“替换起始帧/清空后重传”

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-24-plus-button-image-input-implementation-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - 我按任务逐个派新子代理执行，每个任务之间做检查和回顾  
2. **Inline Execution** - 我在当前会话里按这份计划直接实现，分阶段给你检查点

如果你要继续，我建议选 `Subagent-Driven`，因为这次改动会同时碰 UI、schema、存储和 pipeline。
