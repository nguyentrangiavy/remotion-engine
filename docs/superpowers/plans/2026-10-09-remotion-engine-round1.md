# remotion-engine Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable Remotion engine — one project, many videos as data (`videos/<id>/video-spec.json`) — covering 8 scene primitives, the Layout/Animation/Transition/Typography systems, a 53-entry scene-category taxonomy, and a 4-command CLI (`create-video`/`validate`/`preview`/`render`), per the approved design at `docs/superpowers/specs/2026-10-09-remotion-engine-round1-design.md`.

**Architecture:** Pure, dependency-free logic (zod schema, taxonomy, AssetResolver, the 8 animation functions, transition direction-mapping) lives under `src/engine/`, `src/animations/`, `src/schemas/`, `src/taxonomy/` and is fully unit tested. Visual pieces (layouts, typography, the 8 scene components, `Video.tsx`) are typecheck-verified only, same boundary as every other Remotion project built in this Workspace — real render output is verified by hand at the end, not by unit test. `scripts/*.ts` are thin Node CLI entry points that read/validate/render a specific `videos/<id>/`; the actual MP4 render goes through `bundle()` + `selectComposition()` + `renderMedia()` from `@remotion/bundler`/`@remotion/renderer` (not the `remotion render` shell command), with `videos/<id>/` set directly as the bundle's `publicDir` — assets referenced by relative path in `video-spec.json` need no staging/copy step.

**Tech Stack:** Remotion 4.0.534 (`remotion`, `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/transitions`, `@remotion/google-fonts`, all pinned exact), React 19.3.0, TypeScript 7.0.2, zod 4.6.5, Vitest 5.0.3, tsx 4.23.15.

---

## File Structure

```
remotion-engine/
├── package.json, tsconfig.json, remotion.config.ts, vitest.config.ts
├── src/
│   ├── index.ts, Root.tsx, Video.tsx
│   ├── schemas/
│   │   ├── video-spec.ts, video-spec.test.ts
│   ├── taxonomy/
│   │   ├── scene-categories.ts, scene-categories.test.ts
│   ├── engine/
│   │   ├── AssetResolver.ts, AssetResolver.test.ts
│   │   ├── AnimationRenderer.ts, AnimationRenderer.test.ts
│   │   ├── TransitionRenderer.ts, TransitionRenderer.test.ts
│   │   ├── LayoutRenderer.tsx
│   │   └── SceneRenderer.tsx
│   ├── animations/
│   │   ├── types.ts, easing.ts
│   │   ├── fade.ts, zoom.ts, pan.ts, slide.ts, reveal.ts, ken-burns.ts, scale.ts, bounce.ts
│   │   ├── typewriter.ts, typewriter.test.ts
│   │   └── *.test.ts (fade/zoom/pan/slide/reveal/ken-burns/scale/bounce)
│   ├── layouts/
│   │   ├── FullScreen.tsx, Centered.tsx, Floating.tsx, SplitScreen.tsx, PictureInPicture.tsx, Grid.tsx
│   ├── typography/
│   │   ├── HeroText.tsx, Subtitle.tsx, KineticText.tsx, HighlightText.tsx, QuoteText.tsx, CounterText.tsx, CodeText.tsx
│   └── scenes/
│       ├── ImageScene.tsx, VideoScene.tsx, TextScene.tsx, SplitScene.tsx,
│       │   DeviceFrameScene.tsx, GridScene.tsx, CodeScene.tsx, QuoteScene.tsx
├── scripts/
│   ├── create-video.ts, validate-video.ts, preview-video.ts, render-video.ts
└── videos/
    └── demo/{video-spec.json, assets/, output/}   # tạo ở Task 19, dùng để kiểm tra pipeline thật
```

---

## Task 1: Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `remotion.config.ts`, `vitest.config.ts`, `.gitignore`
- Create: `src/index.ts`, `src/Root.tsx` (placeholder, thay ở Task 14)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "remotion-engine",
  "version": "1.0.0",
  "private": true,
  "description": "Engine Remotion tổng quát — một project, nhiều video là dữ liệu (video-spec.json).",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "create-video": "tsx scripts/create-video.ts",
    "validate": "tsx scripts/validate-video.ts",
    "preview": "tsx scripts/preview-video.ts",
    "render": "tsx scripts/render-video.ts"
  },
  "dependencies": {
    "@remotion/bundler": "4.0.534",
    "@remotion/cli": "4.0.534",
    "@remotion/google-fonts": "4.0.534",
    "@remotion/renderer": "4.0.534",
    "@remotion/transitions": "4.0.534",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "remotion": "4.0.534",
    "zod": "4.6.5"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "tsx": "4.23.15",
    "typescript": "7.0.2",
    "vitest": "^5.0.3"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "types": ["node"]
  },
  "include": ["src", "scripts"]
}
```

`"types": ["node"]` — `scripts/*.ts` dùng `node:fs`, `node:path`, `process.argv`; không cần cài `@types/node` riêng vì nó đi kèm `typescript`/`tsx` như các project khác trong Workspace đã dùng (xác nhận lại ở Step 5 nếu typecheck báo thiếu).

- [ ] **Step 3: Write `remotion.config.ts`**

```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
dist
videos/*/output
.DS_Store
.env
```

- [ ] **Step 6: Write placeholder `src/index.ts` and `src/Root.tsx` (replaced in Task 14)**

```ts
// src/index.ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

```tsx
// src/Root.tsx
import { Composition } from "remotion";

const Placeholder: React.FC = () => null;

export const RemotionRoot: React.FC = () => (
  <Composition id="Video" component={Placeholder} durationInFrames={30} fps={30} width={1080} height={1920} />
);
```

- [ ] **Step 7: Install and verify**

```bash
npm install
npm run typecheck
```

Expected: `typecheck` succeeds with no output. `npm test` at this point reports "No test files found" — expected, no tests exist yet.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold remotion-engine"
```

---

## Task 2: `schemas/video-spec.ts`

**Files:**
- Create: `src/schemas/video-spec.ts`
- Test: `src/schemas/video-spec.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/schemas/video-spec.test.ts
import { describe, expect, it } from "vitest";
import { videoSpecSchema } from "./video-spec";

const base = {
  version: "1.0" as const,
  id: "demo",
  settings: { width: 1080, height: 1920, fps: 30, duration: 10 },
  scenes: [{ id: "s1", type: "image" as const, duration: 5, src: "assets/a.png" }],
};

describe("videoSpecSchema", () => {
  it("accepts a minimal valid spec and fills in style/audio defaults", () => {
    const result = videoSpecSchema.parse(base);
    expect(result.style.backgroundColor).toBe("#050505");
    expect(result.audio.musicVolume).toBe(0.15);
    expect(result.scenes[0]).toMatchObject({ type: "image", src: "assets/a.png" });
  });

  it("rejects an id with uppercase letters", () => {
    expect(() => videoSpecSchema.parse({ ...base, id: "Demo" })).toThrow();
  });

  it("rejects a spec with zero scenes", () => {
    expect(() => videoSpecSchema.parse({ ...base, scenes: [] })).toThrow();
  });

  it("rejects an image scene with no src", () => {
    expect(() =>
      videoSpecSchema.parse({ ...base, scenes: [{ id: "s1", type: "image", duration: 5 }] }),
    ).toThrow();
  });

  it("rejects an unknown scene type", () => {
    expect(() =>
      videoSpecSchema.parse({ ...base, scenes: [{ id: "s1", type: "not-a-type", duration: 5 }] }),
    ).toThrow();
  });

  it("rejects an unknown animation type", () => {
    const spec = { ...base, scenes: [{ ...base.scenes[0], animation: { type: "superZoom" } }] };
    expect(() => videoSpecSchema.parse(spec)).toThrow();
  });

  it("fills in animation defaults (duration/intensity/easing) when type is given", () => {
    const spec = { ...base, scenes: [{ ...base.scenes[0], animation: { type: "kenBurns" } }] };
    const result = videoSpecSchema.parse(spec);
    expect(result.scenes[0].animation).toMatchObject({ type: "kenBurns", intensity: 0.15, easing: "easeOut" });
  });

  it("accepts a video scene with volume/muted defaults", () => {
    const spec = { ...base, scenes: [{ id: "s1", type: "video", duration: 5, src: "assets/a.mp4" }] };
    const result = videoSpecSchema.parse(spec);
    expect(result.scenes[0]).toMatchObject({ volume: 1, muted: false });
  });

  it("accepts a split scene with two sides", () => {
    const spec = {
      ...base,
      scenes: [
        {
          id: "s1",
          type: "split",
          duration: 5,
          left: { kind: "image", src: "assets/a.png" },
          right: { kind: "text", content: "hello" },
        },
      ],
    };
    expect(() => videoSpecSchema.parse(spec)).not.toThrow();
  });

  it("accepts a grid scene requiring at least 2 items", () => {
    const valid = { ...base, scenes: [{ id: "s1", type: "grid", duration: 5, items: [{ src: "a.png" }, { src: "b.png" }] }] };
    expect(() => videoSpecSchema.parse(valid)).not.toThrow();
    const invalid = { ...base, scenes: [{ id: "s1", type: "grid", duration: 5, items: [{ src: "a.png" }] }] };
    expect(() => videoSpecSchema.parse(invalid)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- video-spec`
Expected: FAIL — `Cannot find module './video-spec'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/schemas/video-spec.ts
import { z } from "zod";

const settingsSchema = z.object({
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().positive().default(30),
  duration: z.number().positive(),
});

const styleSchema = z.object({
  theme: z.string().default("minimal"),
  font: z.string().default("Inter"),
  primaryColor: z.string().default("#FFFFFF"),
  accentColor: z.string().default("#7C5CFF"),
  backgroundColor: z.string().default("#050505"),
});

const audioSchema = z.object({
  voiceOver: z.string().optional(),
  music: z.string().optional(),
  musicVolume: z.number().min(0).max(1).default(0.15),
});

export const layoutSchema = z.object({
  type: z.enum(["full-screen", "centered", "split-screen", "picture-in-picture", "grid", "floating"]),
  direction: z.enum(["horizontal", "vertical"]).optional(),
  ratio: z.number().min(0.1).max(0.9).optional(),
  columns: z.number().int().min(1).max(4).optional(),
});

export const animationSchema = z.object({
  type: z.enum(["fade", "zoom", "pan", "slide", "reveal", "typewriter", "kenBurns", "scale", "bounce"]),
  direction: z.enum(["left", "right", "up", "down", "in", "out"]).optional(),
  duration: z.number().positive().default(1),
  intensity: z.number().min(0).max(1).default(0.15),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).default("easeOut"),
});

export const transitionSchema = z.object({
  type: z.enum(["none", "fade", "slide", "wipe", "zoom", "blur"]).default("fade"),
  direction: z.enum(["left", "right", "up", "down"]).optional(),
  duration: z.number().positive().default(0.4),
});

const textContentSchema = z.object({
  type: z.enum(["hero", "subtitle", "kinetic", "highlight", "quote", "counter", "code"]),
  content: z.string(),
  position: z.enum(["top", "center", "bottom"]).default("center"),
});

const sceneBaseSchema = z.object({
  id: z.string(),
  duration: z.number().positive(),
  layout: layoutSchema.optional(),
  animation: animationSchema.optional(),
  transition: transitionSchema.optional(),
});

const splitSideSchema = z.object({
  kind: z.enum(["image", "video", "text"]),
  src: z.string().optional(),
  content: z.string().optional(),
});

export const sceneSchema = z.discriminatedUnion("type", [
  sceneBaseSchema.extend({ type: z.literal("image"), src: z.string() }),
  sceneBaseSchema.extend({
    type: z.literal("video"),
    src: z.string(),
    volume: z.number().min(0).max(1).default(1),
    muted: z.boolean().default(false),
  }),
  sceneBaseSchema.extend({ type: z.literal("text"), text: textContentSchema }),
  sceneBaseSchema.extend({ type: z.literal("split"), left: splitSideSchema, right: splitSideSchema }),
  sceneBaseSchema.extend({
    type: z.literal("deviceFrame"),
    frame: z.enum(["browser", "macos", "phone", "none"]),
    src: z.string(),
  }),
  sceneBaseSchema.extend({
    type: z.literal("grid"),
    items: z.array(z.object({ src: z.string() })).min(2),
  }),
  sceneBaseSchema.extend({ type: z.literal("code"), code: z.string(), language: z.string().default("text") }),
  sceneBaseSchema.extend({ type: z.literal("quote"), quote: z.string(), author: z.string().optional() }),
]);

export const videoSpecSchema = z.object({
  version: z.literal("1.0"),
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, "id phải viết thường, chỉ gồm a-z 0-9 và dấu gạch ngang"),
  settings: settingsSchema,
  style: styleSchema.default({}),
  audio: audioSchema.default({}),
  scenes: z.array(sceneSchema).min(1, "cần ít nhất 1 scene"),
});

export type VideoSpec = z.infer<typeof videoSpecSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type LayoutConfig = z.infer<typeof layoutSchema>;
export type AnimationConfig = z.infer<typeof animationSchema>;
export type TransitionConfig = z.infer<typeof transitionSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- video-spec`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/video-spec.ts src/schemas/video-spec.test.ts
git commit -m "feat(schema): video-spec.json zod schema — 8 scene types"
```

---

## Task 3: `taxonomy/scene-categories.ts`

Nội dung port nguyên từ §5 của design doc (đã tự rà soát sửa 2 lỗi kiểu `"wipe"`/`"none"` trong lúc viết spec).

**Files:**
- Create: `src/taxonomy/scene-categories.ts`
- Test: `src/taxonomy/scene-categories.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/taxonomy/scene-categories.test.ts
import { describe, expect, it } from "vitest";
import { SCENE_CATEGORIES } from "./scene-categories";

const PRIMITIVES = ["image", "video", "text", "split", "deviceFrame", "grid", "code", "quote"];

describe("SCENE_CATEGORIES", () => {
  it("has exactly 53 entries (52 tên người dùng liệt kê + screenshot_scene)", () => {
    expect(Object.keys(SCENE_CATEGORIES)).toHaveLength(53);
  });

  it("every 'available' entry references a real primitive", () => {
    for (const [name, entry] of Object.entries(SCENE_CATEGORIES)) {
      if (entry.status === "available") {
        expect(PRIMITIVES, `${name}.primitive`).toContain(entry.primitive);
      }
    }
  });

  it("every 'deferred' entry names a subsystem", () => {
    for (const [name, entry] of Object.entries(SCENE_CATEGORIES)) {
      if (entry.status === "deferred") {
        expect(entry.subsystem, name).toBeTruthy();
      }
    }
  });

  it("known examples map to the expected primitive", () => {
    expect(SCENE_CATEGORIES.image_scene).toMatchObject({ status: "available", primitive: "image" });
    expect(SCENE_CATEGORIES.chart_scene).toMatchObject({ status: "deferred", subsystem: "chart" });
    expect(SCENE_CATEGORIES.before_after_scene).toMatchObject({ primitive: "split", animationPreset: "reveal" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- scene-categories`
Expected: FAIL — `Cannot find module './scene-categories'`.

- [ ] **Step 3: Write the implementation**

Copy nguyên bảng đã viết và tự sửa trong design doc §5 (`docs/superpowers/specs/2026-10-09-remotion-engine-round1-design.md`), gồm định nghĩa `LayoutPreset`/`AnimationPreset`/`SceneCategoryEntry` và toàn bộ 53 entry (`video_scene` … `credits_scene`, cộng `screenshot_scene`). Copy chính xác khối code trong design doc — không gõ lại tay để tránh gõ sai 53 dòng.

```bash
sed -n '/^type LayoutPreset/,/^};$/p' docs/superpowers/specs/2026-10-09-remotion-engine-round1-design.md | head -n -1 > /tmp/taxonomy-body.ts
```

(Lệnh trên chỉ để tham khảo cách lấy đúng khối — khi thực thi, copy thủ công đoạn từ `type LayoutPreset = ...` tới dấu `};` đóng `SCENE_CATEGORIES` trong design doc vào file `src/taxonomy/scene-categories.ts`, thêm dòng comment đầu file:)

```ts
// src/taxonomy/scene-categories.ts
// Bảng phân loại 53 tên scene (52 tên người dùng liệt kê khi brainstorm + screenshot_scene) — xem
// docs/superpowers/specs/2026-10-09-remotion-engine-round1-design.md §5 để biết lý do từng ánh xạ.

// ... (toàn bộ nội dung từ design doc §5, nguyên văn)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- scene-categories`
Expected: PASS, 4 tests.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/taxonomy/scene-categories.ts src/taxonomy/scene-categories.test.ts
git commit -m "feat(taxonomy): 53-entry scene category table"
```

---

## Task 4: `engine/AssetResolver.ts`

**Files:**
- Create: `src/engine/AssetResolver.ts`
- Test: `src/engine/AssetResolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/AssetResolver.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { VideoSpec } from "../schemas/video-spec";
import { collectAssetPaths, findMissingAssets, outputPath, specPath, videoDir } from "./AssetResolver";

const spec: VideoSpec = {
  version: "1.0",
  id: "demo",
  settings: { width: 1080, height: 1920, fps: 30, duration: 10 },
  style: { theme: "minimal", font: "Inter", primaryColor: "#fff", accentColor: "#7C5CFF", backgroundColor: "#000" },
  audio: { voiceOver: "assets/voice.mp3", music: "assets/music.mp3", musicVolume: 0.15 },
  scenes: [
    { id: "s1", type: "image", duration: 5, src: "assets/a.png" },
    {
      id: "s2",
      type: "split",
      duration: 5,
      left: { kind: "image", src: "assets/b.png" },
      right: { kind: "text", content: "hi" },
    },
    { id: "s3", type: "grid", duration: 5, items: [{ src: "assets/c.png" }, { src: "assets/d.png" }] },
  ],
};

describe("videoDir / specPath / outputPath", () => {
  it("joins root/videos/<id> and its sub-paths", () => {
    expect(videoDir("/root", "demo")).toBe(path.join("/root", "videos", "demo"));
    expect(specPath("/root", "demo")).toBe(path.join("/root", "videos", "demo", "video-spec.json"));
    expect(outputPath("/root", "demo")).toBe(path.join("/root", "videos", "demo", "output", "video.mp4"));
  });
});

describe("collectAssetPaths", () => {
  it("collects audio + every scene's image/video/split/grid src, skipping text-only sides", () => {
    expect(collectAssetPaths(spec)).toEqual([
      "assets/voice.mp3",
      "assets/music.mp3",
      "assets/a.png",
      "assets/b.png",
      "assets/c.png",
      "assets/d.png",
    ]);
  });
});

describe("findMissingAssets", () => {
  it("reports only the paths that don't exist on disk", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "re-assets-"));
    const dir = videoDir(root, "demo");
    await fs.mkdir(path.join(dir, "assets"), { recursive: true });
    await fs.writeFile(path.join(dir, "assets", "a.png"), "x");
    await fs.writeFile(path.join(dir, "assets", "voice.mp3"), "x");

    const missing = await findMissingAssets(root, "demo", spec);
    expect(missing.sort()).toEqual(["assets/b.png", "assets/c.png", "assets/d.png", "assets/music.mp3"].sort());
  });

  it("returns an empty array when every asset exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "re-assets-"));
    const dir = videoDir(root, "demo");
    await fs.mkdir(path.join(dir, "assets"), { recursive: true });
    for (const rel of collectAssetPaths(spec)) {
      await fs.writeFile(path.join(dir, rel), "x");
    }
    expect(await findMissingAssets(root, "demo", spec)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- AssetResolver`
Expected: FAIL — `Cannot find module './AssetResolver'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/engine/AssetResolver.ts
import fs from "node:fs/promises";
import path from "node:path";
import type { VideoSpec } from "../schemas/video-spec";

export function videoDir(root: string, id: string): string {
  return path.join(root, "videos", id);
}

export function assetsDir(root: string, id: string): string {
  return path.join(videoDir(root, id), "assets");
}

export function specPath(root: string, id: string): string {
  return path.join(videoDir(root, id), "video-spec.json");
}

export function outputPath(root: string, id: string): string {
  return path.join(videoDir(root, id), "output", "video.mp4");
}

/** Mọi đường dẫn asset (ảnh/video) mà spec tham chiếu, theo thứ tự xuất hiện: audio trước, rồi từng scene. */
export function collectAssetPaths(spec: VideoSpec): string[] {
  const paths: string[] = [];
  if (spec.audio.voiceOver) paths.push(spec.audio.voiceOver);
  if (spec.audio.music) paths.push(spec.audio.music);

  for (const scene of spec.scenes) {
    if (scene.type === "image" || scene.type === "video" || scene.type === "deviceFrame") {
      paths.push(scene.src);
    } else if (scene.type === "split") {
      if (scene.left.src) paths.push(scene.left.src);
      if (scene.right.src) paths.push(scene.right.src);
    } else if (scene.type === "grid") {
      for (const item of scene.items) paths.push(item.src);
    }
  }
  return paths;
}

export async function findMissingAssets(root: string, id: string, spec: VideoSpec): Promise<string[]> {
  const dir = videoDir(root, id);
  const missing: string[] = [];
  for (const rel of collectAssetPaths(spec)) {
    try {
      await fs.access(path.join(dir, rel));
    } catch {
      missing.push(rel);
    }
  }
  return missing;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- AssetResolver`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/AssetResolver.ts src/engine/AssetResolver.test.ts
git commit -m "feat(engine): AssetResolver — video paths + missing-asset check"
```

---

## Task 5: Animation primitives (8 hàm thuần + typewriter)

Mỗi animation: `(frame, durationInFrames, fps, opts) => React.CSSProperties`. `opts = {direction?, intensity, easing}` khớp đúng `AnimationConfig` (đã có default ở schema). `typewriter` không nằm trong nhóm này — nó trả về số ký tự hiển thị, không phải style, dùng riêng ở các component chữ (Task 8/11).

**Files:**
- Create: `src/animations/types.ts`, `src/animations/easing.ts`
- Create: `src/animations/fade.ts`, `zoom.ts`, `pan.ts`, `slide.ts`, `reveal.ts`, `ken-burns.ts`, `scale.ts`, `bounce.ts`
- Create: `src/animations/typewriter.ts`
- Test: một file test cho mỗi animation + `typewriter.test.ts`

- [ ] **Step 1: Write `types.ts` và `easing.ts`**

```ts
// src/animations/types.ts
import type { CSSProperties } from "react";
import type { AnimationConfig } from "../schemas/video-spec";

export type AnimationOpts = Pick<AnimationConfig, "direction" | "intensity" | "easing">;
export type AnimationFn = (
  frame: number,
  durationInFrames: number,
  fps: number,
  opts: AnimationOpts,
) => CSSProperties;
```

```ts
// src/animations/easing.ts
import { Easing } from "remotion";
import type { AnimationConfig } from "../schemas/video-spec";

export function getEasingFn(name: AnimationConfig["easing"]): (input: number) => number {
  switch (name) {
    case "linear":
      return Easing.linear;
    case "easeIn":
      return Easing.in(Easing.ease);
    case "easeInOut":
      return Easing.inOut(Easing.ease);
    case "easeOut":
    default:
      return Easing.out(Easing.ease);
  }
}
```

- [ ] **Step 2: Write the failing test for `fade`**

```ts
// src/animations/fade.test.ts
import { describe, expect, it } from "vitest";
import { fade } from "./fade";

const opts = { intensity: 0.15, easing: "easeOut" as const };

describe("fade", () => {
  it("starts at opacity 0 and ends at opacity 0, peaking at 1 in the middle", () => {
    expect(fade(0, 90, 30, opts).opacity).toBeCloseTo(0, 1);
    expect(fade(45, 90, 30, opts).opacity).toBeCloseTo(1, 1);
    expect(fade(89, 90, 30, opts).opacity).toBeLessThan(0.2);
  });
});
```

- [ ] **Step 3: Run it, confirm it fails, then write `fade.ts`**

Run: `npm test -- animations/fade` → FAIL (module not found).

```ts
// src/animations/fade.ts
import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const fade: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const edge = Math.min(Math.round(fps * 0.4), Math.floor(durationInFrames / 2));
  const opacity = interpolate(
    frame,
    [0, edge, durationInFrames - edge, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: getEasingFn(opts.easing) },
  );
  return { opacity };
};
```

Run: `npm test -- animations/fade` → PASS.

- [ ] **Step 4: `zoom.ts` + test**

```ts
// src/animations/zoom.test.ts
import { describe, expect, it } from "vitest";
import { zoom } from "./zoom";

describe("zoom", () => {
  it("direction 'in' grows the scale over time", () => {
    const start = zoom(0, 90, 30, { direction: "in", intensity: 0.2, easing: "linear" });
    const end = zoom(89, 90, 30, { direction: "in", intensity: 0.2, easing: "linear" });
    const startScale = Number(start.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    const endScale = Number(end.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(startScale).toBeCloseTo(1, 1);
    expect(endScale).toBeCloseTo(1.2, 1);
  });

  it("direction 'out' shrinks the scale over time", () => {
    const start = zoom(0, 90, 30, { direction: "out", intensity: 0.2, easing: "linear" });
    const startScale = Number(start.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(startScale).toBeCloseTo(1.2, 1);
  });
});
```

```ts
// src/animations/zoom.ts
import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const zoom: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const grow = opts.direction !== "out"; // mặc định "in"
  const from = grow ? 1 : 1 + opts.intensity;
  const to = grow ? 1 + opts.intensity : 1;
  const scale = interpolate(frame, [0, durationInFrames], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  return { transform: `scale(${scale})` };
};
```

- [ ] **Step 5: `pan.ts` + test**

```ts
// src/animations/pan.test.ts
import { describe, expect, it } from "vitest";
import { pan } from "./pan";

describe("pan", () => {
  it("translates along X for left/right, Y for up/down", () => {
    const left = pan(89, 90, 30, { direction: "left", intensity: 0.2, easing: "linear" });
    const up = pan(89, 90, 30, { direction: "up", intensity: 0.2, easing: "linear" });
    expect(left.transform).toContain("translateX");
    expect(up.transform).toContain("translateY");
  });

  it("starts at zero offset", () => {
    const style = pan(0, 90, 30, { direction: "left", intensity: 0.2, easing: "linear" });
    expect(style.transform).toContain("translateX(0%)") ;
  });
});
```

```ts
// src/animations/pan.ts
import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const pan: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const distance = opts.intensity * 20; // % dịch chuyển tối đa
  const axis = opts.direction === "up" || opts.direction === "down" ? "Y" : "X";
  const sign = opts.direction === "left" || opts.direction === "up" ? -1 : 1;
  const t = interpolate(frame, [0, durationInFrames], [0, sign * distance], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  // scale(1.15) để nền vẫn phủ kín khung hình khi đã dịch chuyển
  return { transform: `scale(1.15) translate${axis}(${t}%)` };
};
```

- [ ] **Step 6: `slide.ts` + test**

```ts
// src/animations/slide.test.ts
import { describe, expect, it } from "vitest";
import { slide } from "./slide";

describe("slide", () => {
  it("starts off-screen and ends at translate 0", () => {
    const opts = { direction: "left" as const, intensity: 0.15, easing: "linear" as const };
    const start = slide(0, 90, 30, opts);
    const end = slide(89, 90, 30, opts);
    expect(start.transform).not.toContain("translateX(0%)");
    expect(end.transform).toContain("translateX(0%)");
  });
});
```

```ts
// src/animations/slide.ts
import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const slide: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const slideFrames = Math.min(durationInFrames, Math.round(fps * 0.5));
  const axis = opts.direction === "up" || opts.direction === "down" ? "Y" : "X";
  const from = opts.direction === "left" || opts.direction === "up" ? 100 : -100;
  const t = interpolate(frame, [0, slideFrames], [from, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  return { transform: `translate${axis}(${t}%)` };
};
```

- [ ] **Step 7: `reveal.ts` + test**

```ts
// src/animations/reveal.test.ts
import { describe, expect, it } from "vitest";
import { reveal } from "./reveal";

const opts = { intensity: 0.15, easing: "linear" as const };

describe("reveal", () => {
  it("is fully clipped at frame 0 and fully visible by the end", () => {
    const start = reveal(0, 90, 30, opts);
    const end = reveal(89, 90, 30, opts);
    expect(start.clipPath).toContain("inset(0 100%");
    expect(end.clipPath).toContain("inset(0 0%");
  });
});
```

```ts
// src/animations/reveal.ts
import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const reveal: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const revealFrames = Math.min(durationInFrames, Math.round(fps * 0.6));
  const hiddenPercent = interpolate(frame, [0, revealFrames], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  return { clipPath: `inset(0 ${hiddenPercent}% 0 0)` };
};
```

- [ ] **Step 8: `ken-burns.ts` + test**

```ts
// src/animations/ken-burns.test.ts
import { describe, expect, it } from "vitest";
import { kenBurns } from "./ken-burns";

describe("kenBurns", () => {
  it("scale grows over the scene duration", () => {
    const opts = { intensity: 0.1, easing: "linear" as const };
    const start = kenBurns(0, 90, 30, opts);
    const end = kenBurns(89, 90, 30, opts);
    const s = (style: typeof start) => Number(style.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(s(start)).toBeCloseTo(1, 1);
    expect(s(end)).toBeGreaterThan(s(start));
  });
});
```

```ts
// src/animations/ken-burns.ts
import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const kenBurns: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const easing = getEasingFn(opts.easing);
  const scale = interpolate(frame, [0, durationInFrames], [1, 1 + opts.intensity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const translate = interpolate(frame, [0, durationInFrames], [0, -opts.intensity * 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  return { transform: `scale(${scale}) translateX(${translate}%)` };
};
```

- [ ] **Step 9: `scale.ts` + test**

```ts
// src/animations/scale.test.ts
import { describe, expect, it } from "vitest";
import { scale } from "./scale";

describe("scale", () => {
  it("pops in from below 1 to exactly 1, fading in alongside", () => {
    const opts = { intensity: 0.3, easing: "linear" as const };
    const start = scale(0, 90, 30, opts);
    const end = scale(45, 90, 30, opts);
    expect(start.opacity).toBeCloseTo(0, 1);
    expect(end.opacity).toBeCloseTo(1, 1);
  });
});
```

```ts
// src/animations/scale.ts
import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const scale: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const popFrames = Math.min(durationInFrames, Math.round(fps * 0.5));
  const easing = getEasingFn(opts.easing);
  const s = interpolate(frame, [0, popFrames], [1 - opts.intensity, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const opacity = interpolate(frame, [0, popFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  return { transform: `scale(${s})`, opacity };
};
```

- [ ] **Step 10: `bounce.ts` + test**

```ts
// src/animations/bounce.test.ts
import { describe, expect, it } from "vitest";
import { bounce } from "./bounce";

describe("bounce", () => {
  it("starts near scale 0 and settles near scale 1", () => {
    const opts = { intensity: 0.5, easing: "linear" as const };
    const start = bounce(0, 90, 30, opts);
    const settled = bounce(60, 90, 30, opts);
    const s = (style: typeof start) => Number(style.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(s(start)).toBeLessThan(0.3);
    expect(s(settled)).toBeGreaterThan(0.85);
  });
});
```

```ts
// src/animations/bounce.ts
import { spring } from "remotion";
import type { AnimationFn } from "./types";

export const bounce: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const s = spring({
    frame,
    fps,
    config: { damping: 9, stiffness: 100 + opts.intensity * 100 },
    durationInFrames: Math.min(durationInFrames, fps * 2),
  });
  return { transform: `scale(${s})` };
};
```

- [ ] **Step 11: `typewriter.ts` + test**

```ts
// src/animations/typewriter.test.ts
import { describe, expect, it } from "vitest";
import { typewriterVisibleChars } from "./typewriter";

describe("typewriterVisibleChars", () => {
  it("shows 0 characters at frame 0", () => {
    expect(typewriterVisibleChars(0, 30, 20, 18)).toBe(0);
  });

  it("shows more characters as frames advance, capped at totalChars", () => {
    expect(typewriterVisibleChars(30, 30, 100, 18)).toBe(18); // 1 giây * 18 ký tự/giây
    expect(typewriterVisibleChars(300, 30, 20, 18)).toBe(20); // đã hiện hết, không vượt quá
  });
});
```

```ts
// src/animations/typewriter.ts
export function typewriterVisibleChars(
  frame: number,
  fps: number,
  totalChars: number,
  charsPerSecond = 18,
): number {
  const shown = Math.floor((frame / fps) * charsPerSecond);
  return Math.min(totalChars, Math.max(0, shown));
}
```

- [ ] **Step 12: Run every animation test together**

Run: `npm test -- animations`
Expected: PASS, 15 tests (fade 1 + zoom 2 + pan 2 + slide 1 + reveal 1 + kenBurns 1 + scale 1 + bounce 1 + typewriter 2 — thực đếm theo file ở trên: 1+2+2+1+1+1+1+1+2 = 12; nếu số không khớp, đó là dấu hiệu một `it()` bị bỏ sót khi copy — đối chiếu lại từng file Step 2–11).

- [ ] **Step 13: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add src/animations/
git commit -m "feat(animations): 8 pure animation functions + typewriter char-count helper"
```

---

## Task 6: `engine/AnimationRenderer.ts`

**Files:**
- Create: `src/engine/AnimationRenderer.ts`
- Test: `src/engine/AnimationRenderer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/AnimationRenderer.test.ts
import { describe, expect, it } from "vitest";
import { getAnimationStyle } from "./AnimationRenderer";

describe("getAnimationStyle", () => {
  it("returns an empty style when there is no animation config", () => {
    expect(getAnimationStyle(undefined, 0, 90, 30)).toEqual({});
  });

  it("returns an empty style for 'typewriter' (handled by text components directly, not here)", () => {
    expect(
      getAnimationStyle({ type: "typewriter", duration: 1, intensity: 0.15, easing: "easeOut" }, 0, 90, 30),
    ).toEqual({});
  });

  it("dispatches to the fade function for type 'fade'", () => {
    const style = getAnimationStyle({ type: "fade", duration: 1, intensity: 0.15, easing: "easeOut" }, 0, 90, 30);
    expect(style.opacity).toBeCloseTo(0, 1);
  });

  it("dispatches every other registered animation type without throwing", () => {
    const types = ["zoom", "pan", "slide", "reveal", "kenBurns", "scale", "bounce"] as const;
    for (const type of types) {
      expect(() =>
        getAnimationStyle({ type, duration: 1, intensity: 0.15, easing: "easeOut" }, 10, 90, 30),
      ).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- AnimationRenderer`
Expected: FAIL — `Cannot find module './AnimationRenderer'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/engine/AnimationRenderer.ts
import type { CSSProperties } from "react";
import { bounce } from "../animations/bounce";
import { fade } from "../animations/fade";
import { kenBurns } from "../animations/ken-burns";
import { pan } from "../animations/pan";
import { reveal } from "../animations/reveal";
import { scale } from "../animations/scale";
import { slide } from "../animations/slide";
import type { AnimationFn } from "../animations/types";
import { zoom } from "../animations/zoom";
import type { AnimationConfig } from "../schemas/video-spec";

const REGISTRY: Record<string, AnimationFn> = { fade, zoom, pan, slide, reveal, kenBurns, scale, bounce };

export function getAnimationStyle(
  animation: AnimationConfig | undefined,
  frame: number,
  durationInFrames: number,
  fps: number,
): CSSProperties {
  if (!animation) return {};
  const fn = REGISTRY[animation.type];
  if (!fn) return {}; // "typewriter": không phải style CSS, xử lý riêng ở component chữ
  return fn(frame, durationInFrames, fps, {
    direction: animation.direction,
    intensity: animation.intensity,
    easing: animation.easing,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- AnimationRenderer`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/AnimationRenderer.ts src/engine/AnimationRenderer.test.ts
git commit -m "feat(engine): AnimationRenderer — animation.type dispatch"
```

---

## Task 7: `engine/TransitionRenderer.ts`

Dùng `@remotion/transitions` thật — mỗi presentation import từ subpath riêng (`@remotion/transitions/fade`, không phải từ `@remotion/transitions`), đã xác nhận bằng cách tải gói thật về kiểm tra `package.json` `exports` lúc viết plan này. `zoomInOut`/`linearBlur` dùng canvas/shader nội bộ nhưng cách gọi từ phía engine không khác gì các presentation CSS khác — vẫn chỉ là gọi hàm factory rồi truyền cho `TransitionSeries.Transition`.

**Files:**
- Create: `src/engine/TransitionRenderer.ts`
- Test: `src/engine/TransitionRenderer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/TransitionRenderer.test.ts
import { describe, expect, it } from "vitest";
import { getTransitionPresentation, getTransitionTiming } from "./TransitionRenderer";

describe("getTransitionTiming", () => {
  it("converts transition.duration (giây) sang durationInFrames theo fps", () => {
    const timing = getTransitionTiming({ type: "fade", duration: 0.5 }, 30);
    expect(timing.getDurationInFrames({ fps: 30 })).toBe(15);
  });
});

describe("getTransitionPresentation", () => {
  it("returns a defined presentation for every transition type without throwing", () => {
    const types = ["none", "fade", "slide", "wipe", "zoom", "blur"] as const;
    for (const type of types) {
      expect(() => getTransitionPresentation({ type, duration: 0.4 })).not.toThrow();
      expect(getTransitionPresentation({ type, duration: 0.4 })).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- TransitionRenderer`
Expected: FAIL — `Cannot find module './TransitionRenderer'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/engine/TransitionRenderer.ts
import { linearTiming, type TransitionPresentation, type TransitionTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearBlur } from "@remotion/transitions/linear-blur";
import { none } from "@remotion/transitions/none";
import { slide, type SlideDirection } from "@remotion/transitions/slide";
import { wipe, type WipeDirection } from "@remotion/transitions/wipe";
import { zoomInOut } from "@remotion/transitions/zoom-in-out";
import type { TransitionConfig } from "../schemas/video-spec";

function toSlideDirection(direction: TransitionConfig["direction"]): SlideDirection {
  switch (direction) {
    case "left":
      return "from-right";
    case "right":
      return "from-left";
    case "up":
      return "from-bottom";
    case "down":
      return "from-top";
    default:
      return "from-right";
  }
}

function toWipeDirection(direction: TransitionConfig["direction"]): WipeDirection {
  switch (direction) {
    case "left":
      return "from-right";
    case "right":
      return "from-left";
    case "up":
      return "from-bottom";
    case "down":
      return "from-top";
    default:
      return "from-left";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTransitionPresentation(transition: TransitionConfig): TransitionPresentation<any> {
  switch (transition.type) {
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: toSlideDirection(transition.direction) });
    case "wipe":
      return wipe({ direction: toWipeDirection(transition.direction) });
    case "zoom":
      return zoomInOut({});
    case "blur":
      return linearBlur({});
    case "none":
    default:
      return none();
  }
}

export function getTransitionTiming(transition: TransitionConfig, fps: number): TransitionTiming {
  return linearTiming({ durationInFrames: Math.round(transition.duration * fps) });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- TransitionRenderer`
Expected: PASS, 2 tests.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors. Nếu báo lỗi import subpath (`Cannot find module '@remotion/transitions/fade'`), kiểm tra lại `tsconfig.json`'s `moduleResolution: "Bundler"` đã đặt đúng ở Task 1 — subpath exports cần chế độ này.

- [ ] **Step 6: Commit**

```bash
git add src/engine/TransitionRenderer.ts src/engine/TransitionRenderer.test.ts
git commit -m "feat(engine): TransitionRenderer — real @remotion/transitions presentations"
```

---

## Task 8: Typography components (7)

Không unit test (component hiển thị thuần, chỉ kiểm bằng mắt lúc preview/render — xem §9 design doc). Mỗi component nhận `color` qua prop (lấy từ `style.primaryColor`/`accentColor` của video-spec ở lớp gọi).

**Files:**
- Create: `src/typography/HeroText.tsx`, `Subtitle.tsx`, `KineticText.tsx`, `HighlightText.tsx`, `QuoteText.tsx`, `CounterText.tsx`, `CodeText.tsx`

- [ ] **Step 1: Write `HeroText.tsx`**

```tsx
// src/typography/HeroText.tsx
import type { CSSProperties, ReactNode } from "react";

export const HeroText: React.FC<{ children: ReactNode; color: string; style?: CSSProperties }> = ({
  children,
  color,
  style,
}) => (
  <div
    style={{
      fontSize: 72,
      fontWeight: 800,
      color,
      textAlign: "center",
      lineHeight: 1.2,
      fontFamily: "Inter, sans-serif",
      ...style,
    }}
  >
    {children}
  </div>
);
```

- [ ] **Step 2: Write `Subtitle.tsx`**

```tsx
// src/typography/Subtitle.tsx
import type { CSSProperties, ReactNode } from "react";

export const Subtitle: React.FC<{ children: ReactNode; color: string; style?: CSSProperties }> = ({
  children,
  color,
  style,
}) => (
  <div style={{ fontSize: 32, fontWeight: 500, color, textAlign: "center", fontFamily: "Inter, sans-serif", ...style }}>
    {children}
  </div>
);
```

- [ ] **Step 3: Write `KineticText.tsx`** (dùng `typewriterVisibleChars`)

```tsx
// src/typography/KineticText.tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { typewriterVisibleChars } from "../animations/typewriter";

export const KineticText: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = typewriterVisibleChars(frame, fps, text.length);
  return (
    <div style={{ fontSize: 56, fontWeight: 700, color, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      {text.slice(0, n)}
    </div>
  );
};
```

- [ ] **Step 4: Write `HighlightText.tsx`**

```tsx
// src/typography/HighlightText.tsx
export const HighlightText: React.FC<{ children: string; color: string; accentColor: string }> = ({
  children,
  color,
  accentColor,
}) => (
  <div style={{ fontSize: 48, fontWeight: 700, color, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
    <span style={{ background: accentColor, padding: "2px 10px", borderRadius: 6 }}>{children}</span>
  </div>
);
```

- [ ] **Step 5: Write `QuoteText.tsx`**

```tsx
// src/typography/QuoteText.tsx
export const QuoteText: React.FC<{ quote: string; author?: string; color: string; accentColor: string }> = ({
  quote,
  author,
  color,
  accentColor,
}) => (
  <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", maxWidth: 800 }}>
    <div style={{ fontSize: 44, fontWeight: 600, color, lineHeight: 1.4 }}>&ldquo;{quote}&rdquo;</div>
    {author ? <div style={{ fontSize: 24, color: accentColor, marginTop: 24 }}>— {author}</div> : null}
  </div>
);
```

- [ ] **Step 6: Write `CounterText.tsx`** (số đếm chạy dần theo frame — không phải kiểu `AnimationFn`, nhưng cùng tinh thần)

```tsx
// src/typography/CounterText.tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const CounterText: React.FC<{ from?: number; to: number; durationInFrames: number; color: string }> = ({
  from = 0,
  to,
  durationInFrames,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const countFrames = Math.min(durationInFrames, Math.round(fps * 1.2));
  const value = Math.round(
    interpolate(frame, [0, countFrames], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  return (
    <div style={{ fontSize: 96, fontWeight: 800, color, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      {value.toLocaleString()}
    </div>
  );
};
```

- [ ] **Step 7: Write `CodeText.tsx`** (dùng `typewriterVisibleChars`, không tô cú pháp màu — Round 2 mới thêm highlight thật)

```tsx
// src/typography/CodeText.tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { typewriterVisibleChars } from "../animations/typewriter";

export const CodeText: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = typewriterVisibleChars(frame, fps, code.length, 30);
  return (
    <pre
      style={{
        fontFamily: "'Courier New', monospace",
        fontSize: 28,
        color: "#E4E7EC",
        background: "#0B0D13",
        padding: 32,
        borderRadius: 12,
        whiteSpace: "pre-wrap",
        maxWidth: 900,
      }}
    >
      <code>{code.slice(0, n)}</code>
      {language ? null : null /* language dành cho Round 2 khi thêm tô cú pháp thật */}
    </pre>
  );
};
```

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/typography/
git commit -m "feat(typography): 7 text components (Hero/Subtitle/Kinetic/Highlight/Quote/Counter/Code)"
```

---

## Task 9: Layouts (6) + `engine/LayoutRenderer.tsx`

`FullScreen`/`Centered`/`Floating` nhận 1 `children`, dùng chung qua `LayoutRenderer`. `SplitScreen`/`PictureInPicture` nhận đúng 2 children (dùng trực tiếp trong `SplitScene`/`VideoScene`, không qua `LayoutRenderer`). `Grid` nhận mảng children (dùng trực tiếp trong `GridScene`).

**Files:**
- Create: `src/layouts/FullScreen.tsx`, `Centered.tsx`, `Floating.tsx`, `SplitScreen.tsx`, `PictureInPicture.tsx`, `Grid.tsx`
- Create: `src/engine/LayoutRenderer.tsx`

- [ ] **Step 1: Write `FullScreen.tsx`, `Centered.tsx`, `Floating.tsx`**

```tsx
// src/layouts/FullScreen.tsx
import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const FullScreen: React.FC<{ children: ReactNode }> = ({ children }) => <AbsoluteFill>{children}</AbsoluteFill>;
```

```tsx
// src/layouts/Centered.tsx
import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const Centered: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>{children}</AbsoluteFill>
);
```

```tsx
// src/layouts/Floating.tsx
import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const Floating: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>
    <div
      style={{
        width: "100%",
        height: "70%",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
        position: "relative",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);
```

- [ ] **Step 2: Write `SplitScreen.tsx`, `PictureInPicture.tsx`, `Grid.tsx`**

```tsx
// src/layouts/SplitScreen.tsx
import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const SplitScreen: React.FC<{
  children: [ReactNode, ReactNode];
  direction?: "horizontal" | "vertical";
  ratio?: number;
}> = ({ children, direction = "horizontal", ratio = 0.5 }) => {
  const [a, b] = children;
  const horizontal = direction === "horizontal";
  const sizeKey = horizontal ? "width" : "height";
  return (
    <AbsoluteFill style={{ flexDirection: horizontal ? "row" : "column" }}>
      <div style={{ [sizeKey]: `${ratio * 100}%`, position: "relative", overflow: "hidden" }}>{a}</div>
      <div style={{ [sizeKey]: `${(1 - ratio) * 100}%`, position: "relative", overflow: "hidden" }}>{b}</div>
    </AbsoluteFill>
  );
};
```

```tsx
// src/layouts/PictureInPicture.tsx
import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const PictureInPicture: React.FC<{ children: [ReactNode, ReactNode] }> = ({ children }) => {
  const [main, pip] = children;
  return (
    <AbsoluteFill>
      {main}
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: 40,
          width: "32%",
          aspectRatio: "16 / 9",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {pip}
      </div>
    </AbsoluteFill>
  );
};
```

```tsx
// src/layouts/Grid.tsx
import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const Grid: React.FC<{ children: ReactNode[]; columns?: number }> = ({ children, columns = 2 }) => (
  <AbsoluteFill style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12, padding: 24 }}>
    {children.map((child, i) => (
      <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
        {child}
      </div>
    ))}
  </AbsoluteFill>
);
```

- [ ] **Step 3: Write `engine/LayoutRenderer.tsx`**

```tsx
// src/engine/LayoutRenderer.tsx
import type { ReactElement, ReactNode } from "react";
import { Centered } from "../layouts/Centered";
import { Floating } from "../layouts/Floating";
import { FullScreen } from "../layouts/FullScreen";

export type SingleChildLayoutType = "full-screen" | "centered" | "floating";

export function renderLayout(type: SingleChildLayoutType | undefined, children: ReactNode): ReactElement {
  switch (type) {
    case "centered":
      return <Centered>{children}</Centered>;
    case "floating":
      return <Floating>{children}</Floating>;
    case "full-screen":
    default:
      return <FullScreen>{children}</FullScreen>;
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/ src/engine/LayoutRenderer.tsx
git commit -m "feat(layouts): 6 layout components + single-child LayoutRenderer dispatch"
```

---

## Task 10: Scene primitives, phần 1 — ImageScene, VideoScene, TextScene

Mỗi scene component: `React.FC<{ scene: <SceneVariant>; style: VideoSpec["style"] }>`, tự đọc `useCurrentFrame()` (frame tương đối trong `TransitionSeries.Sequence` của chính nó) và `useVideoConfig()` để lấy `fps`.

**Files:**
- Create: `src/scenes/ImageScene.tsx`, `VideoScene.tsx`, `TextScene.tsx`

- [ ] **Step 1: Write `ImageScene.tsx`**

```tsx
// src/scenes/ImageScene.tsx
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";

export const ImageScene: React.FC<{ scene: Extract<Scene, { type: "image" }>; style: VideoSpec["style"] }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle = getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  return renderLayout(
    scene.layout?.type as "full-screen" | "centered" | "floating" | undefined,
    <Img src={staticFile(scene.src)} style={{ width: "100%", height: "100%", objectFit: "cover", ...animStyle }} />,
  );
};
```

- [ ] **Step 2: Write `VideoScene.tsx`**

```tsx
// src/scenes/VideoScene.tsx
import { OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";

export const VideoScene: React.FC<{ scene: Extract<Scene, { type: "video" }>; style: VideoSpec["style"] }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle = getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  return renderLayout(
    scene.layout?.type as "full-screen" | "centered" | "floating" | undefined,
    <OffthreadVideo
      src={staticFile(scene.src)}
      volume={scene.muted ? 0 : scene.volume}
      muted={scene.muted}
      style={{ width: "100%", height: "100%", objectFit: "cover", ...animStyle }}
    />,
  );
};
```

- [ ] **Step 3: Write `TextScene.tsx`** (dispatch `text.type` sang đúng component Typography)

```tsx
// src/scenes/TextScene.tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { CounterText } from "../typography/CounterText";
import { HeroText } from "../typography/HeroText";
import { HighlightText } from "../typography/HighlightText";
import { KineticText } from "../typography/KineticText";
import { Subtitle } from "../typography/Subtitle";

export const TextScene: React.FC<{ scene: Extract<Scene, { type: "text" }>; style: VideoSpec["style"] }> = ({
  scene,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle =
    scene.animation?.type === "typewriter" ? {} : getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  const content = (() => {
    switch (scene.text.type) {
      case "kinetic":
        return <KineticText text={scene.text.content} color={style.primaryColor} />;
      case "subtitle":
        return <Subtitle color={style.primaryColor}>{scene.text.content}</Subtitle>;
      case "highlight":
        return (
          <HighlightText color={style.primaryColor} accentColor={style.accentColor}>
            {scene.text.content}
          </HighlightText>
        );
      case "counter": {
        const to = Number(scene.text.content) || 0;
        return <CounterText to={to} durationInFrames={durationInFrames} color={style.primaryColor} />;
      }
      case "hero":
      default:
        return <HeroText color={style.primaryColor}>{scene.text.content}</HeroText>;
    }
  })();

  return renderLayout(
    scene.layout?.type as "full-screen" | "centered" | "floating" | undefined,
    <div style={animStyle}>{content}</div>,
  );
};
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/ImageScene.tsx src/scenes/VideoScene.tsx src/scenes/TextScene.tsx
git commit -m "feat(scenes): ImageScene, VideoScene, TextScene"
```

---

## Task 11: Scene primitives, phần 2 — QuoteScene, CodeScene, DeviceFrameScene

**Files:**
- Create: `src/scenes/QuoteScene.tsx`, `CodeScene.tsx`, `DeviceFrameScene.tsx`

- [ ] **Step 1: Write `QuoteScene.tsx`**

```tsx
// src/scenes/QuoteScene.tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { QuoteText } from "../typography/QuoteText";

export const QuoteScene: React.FC<{ scene: Extract<Scene, { type: "quote" }>; style: VideoSpec["style"] }> = ({
  scene,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle = getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  return renderLayout(
    (scene.layout?.type as "full-screen" | "centered" | "floating" | undefined) ?? "centered",
    <div style={animStyle}>
      <QuoteText quote={scene.quote} author={scene.author} color={style.primaryColor} accentColor={style.accentColor} />
    </div>,
  );
};
```

- [ ] **Step 2: Write `CodeScene.tsx`**

```tsx
// src/scenes/CodeScene.tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { CodeText } from "../typography/CodeText";

export const CodeScene: React.FC<{ scene: Extract<Scene, { type: "code" }>; style: VideoSpec["style"] }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  // typewriter lo việc hiện dần ký tự ngay trong CodeText — animationPreset khác (vd. fade) vẫn áp cho khung bọc ngoài.
  const animStyle =
    scene.animation && scene.animation.type !== "typewriter"
      ? getAnimationStyle(scene.animation, frame, durationInFrames, fps)
      : {};

  return renderLayout(
    (scene.layout?.type as "full-screen" | "centered" | "floating" | undefined) ?? "centered",
    <div style={animStyle}>
      <CodeText code={scene.code} language={scene.language} />
    </div>,
  );
};
```

- [ ] **Step 3: Write `DeviceFrameScene.tsx`**

```tsx
// src/scenes/DeviceFrameScene.tsx
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";

const FRAME_CHROME: Record<Extract<Scene, { type: "deviceFrame" }>["frame"], React.CSSProperties> = {
  browser: { border: "1px solid #2A2F3A", borderRadius: 10, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" },
  macos: { border: "1px solid #2A2F3A", borderRadius: 14, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" },
  phone: { border: "8px solid #111", borderRadius: 36, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" },
  none: {},
};

export const DeviceFrameScene: React.FC<{
  scene: Extract<Scene, { type: "deviceFrame" }>;
  style: VideoSpec["style"];
}> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle = getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  return renderLayout(
    (scene.layout?.type as "full-screen" | "centered" | "floating" | undefined) ?? "centered",
    <div style={{ width: "90%", aspectRatio: "16 / 10", overflow: "hidden", ...FRAME_CHROME[scene.frame] }}>
      <Img src={staticFile(scene.src)} style={{ width: "100%", height: "100%", objectFit: "cover", ...animStyle }} />
    </div>,
  );
};
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/QuoteScene.tsx src/scenes/CodeScene.tsx src/scenes/DeviceFrameScene.tsx
git commit -m "feat(scenes): QuoteScene, CodeScene, DeviceFrameScene"
```

---

## Task 12: Scene primitives, phần 3 — SplitScene, GridScene

Hai scene này tự dựng nội dung bên trong từng nửa/từng ô (ảnh/video/chữ), không tái dùng `ImageScene`/`TextScene` làm con (tránh một `TransitionSeries.Sequence`/layout lồng nhau không cần thiết) — tự viết phần hiển thị ảnh/chữ đơn giản ngay trong file.

**Files:**
- Create: `src/scenes/SplitScene.tsx`, `GridScene.tsx`

- [ ] **Step 1: Write `SplitScene.tsx`**

```tsx
// src/scenes/SplitScene.tsx
import { Img, staticFile } from "remotion";
import { SplitScreen } from "../layouts/SplitScreen";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { HeroText } from "../typography/HeroText";

type Side = Extract<Scene, { type: "split" }>["left"];

const SideContent: React.FC<{ side: Side; color: string }> = ({ side, color }) => {
  if (side.kind === "text") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <HeroText color={color} style={{ fontSize: 44 }}>
          {side.content ?? ""}
        </HeroText>
      </div>
    );
  }
  // "image" và "video" đều hiển thị như ảnh tĩnh ở Round 1 — phát video thật trong SplitScene để Round sau.
  return <Img src={staticFile(side.src ?? "")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
};

export const SplitScene: React.FC<{ scene: Extract<Scene, { type: "split" }>; style: VideoSpec["style"] }> = ({
  scene,
  style,
}) => (
  <SplitScreen direction={scene.layout?.direction ?? "horizontal"} ratio={scene.layout?.ratio ?? 0.5}>
    <SideContent side={scene.left} color={style.primaryColor} />
    <SideContent side={scene.right} color={style.primaryColor} />
  </SplitScreen>
);
```

- [ ] **Step 2: Write `GridScene.tsx`**

```tsx
// src/scenes/GridScene.tsx
import { Img, staticFile } from "remotion";
import { Grid } from "../layouts/Grid";
import type { Scene, VideoSpec } from "../schemas/video-spec";

export const GridScene: React.FC<{ scene: Extract<Scene, { type: "grid" }>; style: VideoSpec["style"] }> = ({
  scene,
}) => (
  <Grid columns={scene.layout?.columns ?? 2}>
    {scene.items.map((item, i) => (
      <Img key={i} src={staticFile(item.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ))}
  </Grid>
);
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/SplitScene.tsx src/scenes/GridScene.tsx
git commit -m "feat(scenes): SplitScene, GridScene"
```

---

## Task 13: `engine/SceneRenderer.tsx`

**Files:**
- Create: `src/engine/SceneRenderer.tsx`

- [ ] **Step 1: Write the file**

```tsx
// src/engine/SceneRenderer.tsx
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { CodeScene } from "../scenes/CodeScene";
import { DeviceFrameScene } from "../scenes/DeviceFrameScene";
import { GridScene } from "../scenes/GridScene";
import { ImageScene } from "../scenes/ImageScene";
import { QuoteScene } from "../scenes/QuoteScene";
import { SplitScene } from "../scenes/SplitScene";
import { TextScene } from "../scenes/TextScene";
import { VideoScene } from "../scenes/VideoScene";

export const SceneRenderer: React.FC<{ scene: Scene; style: VideoSpec["style"] }> = ({ scene, style }) => {
  switch (scene.type) {
    case "image":
      return <ImageScene scene={scene} style={style} />;
    case "video":
      return <VideoScene scene={scene} style={style} />;
    case "text":
      return <TextScene scene={scene} style={style} />;
    case "split":
      return <SplitScene scene={scene} style={style} />;
    case "deviceFrame":
      return <DeviceFrameScene scene={scene} style={style} />;
    case "grid":
      return <GridScene scene={scene} style={style} />;
    case "code":
      return <CodeScene scene={scene} style={style} />;
    case "quote":
      return <QuoteScene scene={scene} style={style} />;
    default: {
      const exhaustive: never = scene;
      throw new Error(`Unknown scene type: ${JSON.stringify(exhaustive)}`);
    }
  }
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (`const exhaustive: never = scene` tự báo lỗi biên dịch nếu sau này thêm `type` mới vào schema mà quên thêm case ở đây — đúng tinh thần §28 Extensibility.)

- [ ] **Step 3: Commit**

```bash
git add src/engine/SceneRenderer.tsx
git commit -m "feat(engine): SceneRenderer — scene.type dispatch, exhaustive switch"
```

---

## Task 14: `Video.tsx` + `Root.tsx` thật

Thay placeholder Task 1. `calculateMetadata` chỉ tính toán từ `props.spec` đã có sẵn (không đọc file) — script CLI (Task 15-18) chịu trách nhiệm đọc/validate `video-spec.json` từ đĩa trước khi truyền vào.

**Files:**
- Modify: `src/Root.tsx`
- Create: `src/Video.tsx`, `src/sample-spec.ts`

- [ ] **Step 1: Write `src/sample-spec.ts`** (dùng làm `defaultProps` khi mở Studio trực tiếp, không qua `npm run preview`)

```ts
// src/sample-spec.ts
import type { VideoSpec } from "./schemas/video-spec";

export const SAMPLE_SPEC: VideoSpec = {
  version: "1.0",
  id: "sample",
  settings: { width: 1080, height: 1920, fps: 30, duration: 6 },
  style: { theme: "minimal", font: "Inter", primaryColor: "#FFFFFF", accentColor: "#7C5CFF", backgroundColor: "#050505" },
  audio: { musicVolume: 0.15 },
  scenes: [
    {
      id: "hook",
      duration: 3,
      type: "text",
      text: { type: "hero", content: "remotion-engine", position: "center" },
      animation: { type: "reveal", duration: 1, intensity: 0.15, easing: "easeOut" },
    },
    {
      id: "tagline",
      duration: 3,
      type: "text",
      text: { type: "subtitle", content: "Một engine, nhiều video là dữ liệu.", position: "center" },
      animation: { type: "fade", duration: 1, intensity: 0.15, easing: "easeOut" },
      transition: { type: "fade", duration: 0.4 },
    },
  ],
};
```

- [ ] **Step 2: Write `Video.tsx`**

```tsx
// src/Video.tsx
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { SceneRenderer } from "./engine/SceneRenderer";
import { getTransitionPresentation, getTransitionTiming } from "./engine/TransitionRenderer";
import type { VideoSpec } from "./schemas/video-spec";

export const Video: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const { fps } = spec.settings;

  return (
    <AbsoluteFill style={{ backgroundColor: spec.style.backgroundColor }}>
      <TransitionSeries>
        {spec.scenes.flatMap((scene, i) => {
          const durationInFrames = Math.round(scene.duration * fps);
          const nodes = [
            <TransitionSeries.Sequence key={`${scene.id}-seq`} durationInFrames={durationInFrames}>
              <SceneRenderer scene={scene} style={spec.style} />
            </TransitionSeries.Sequence>,
          ];
          const nextScene = spec.scenes[i + 1];
          if (nextScene) {
            const transition = nextScene.transition ?? { type: "fade" as const, duration: 0.4 };
            nodes.push(
              <TransitionSeries.Transition
                key={`${scene.id}-trans`}
                presentation={getTransitionPresentation(transition)}
                timing={getTransitionTiming(transition, fps)}
              />,
            );
          }
          return nodes;
        })}
      </TransitionSeries>
      {spec.audio.voiceOver ? <Audio src={staticFile(spec.audio.voiceOver)} /> : null}
      {spec.audio.music ? <Audio src={staticFile(spec.audio.music)} volume={spec.audio.musicVolume} /> : null}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Rewrite `Root.tsx`**

```tsx
// src/Root.tsx
import { Composition, type CalculateMetadataFunction } from "remotion";
import { SAMPLE_SPEC } from "./sample-spec";
import { videoSpecSchema, type VideoSpec } from "./schemas/video-spec";
import { Video } from "./Video";

type Props = { spec: VideoSpec };

const calculateMetadata: CalculateMetadataFunction<Props> = ({ props }) => {
  const parsed = videoSpecSchema.parse(props.spec);
  const { width, height, fps, duration } = parsed.settings;
  return { width, height, fps, durationInFrames: Math.round(duration * fps), props: { spec: parsed } };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Video"
    component={Video}
    durationInFrames={Math.round(SAMPLE_SPEC.settings.duration * SAMPLE_SPEC.settings.fps)}
    fps={SAMPLE_SPEC.settings.fps}
    width={SAMPLE_SPEC.settings.width}
    height={SAMPLE_SPEC.settings.height}
    defaultProps={{ spec: SAMPLE_SPEC }}
    calculateMetadata={calculateMetadata}
  />
);
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/Root.tsx src/Video.tsx src/sample-spec.ts
git commit -m "feat: Video.tsx + Root.tsx — TransitionSeries assembly, audio, calculateMetadata"
```

---

## Task 15: `scripts/create-video.ts`

**Files:**
- Create: `scripts/create-video.ts`

- [ ] **Step 1: Write the file**

```ts
// scripts/create-video.ts
import fs from "node:fs/promises";
import path from "node:path";
import { assetsDir, specPath, videoDir } from "../src/engine/AssetResolver";

const SAMPLE: object = {
  version: "1.0",
  id: "REPLACE_ME",
  settings: { width: 1080, height: 1920, fps: 30, duration: 5 },
  style: {},
  audio: {},
  scenes: [{ id: "s1", type: "image", duration: 5, src: "assets/scene-01.png" }],
};

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run create-video <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const dir = videoDir(root, id);
  try {
    await fs.access(dir);
    console.error(`Lỗi: videos/${id}/ đã tồn tại.`);
    process.exit(1);
  } catch {
    // chưa tồn tại — đúng như mong đợi
  }

  await fs.mkdir(assetsDir(root, id), { recursive: true });
  await fs.mkdir(path.join(dir, "output"), { recursive: true });
  const spec = { ...SAMPLE, id };
  await fs.writeFile(specPath(root, id), JSON.stringify(spec, null, 2));

  console.log(`Đã tạo videos/${id}/`);
  console.log(`  - video-spec.json (mẫu 1 scene ảnh — sửa lại cho đúng ý bạn)`);
  console.log(`  - assets/ (bỏ ảnh/video/âm thanh vào đây)`);
  console.log(`Tiếp theo: bỏ ảnh thật vào assets/scene-01.png rồi chạy: npm run validate ${id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/create-video.ts
git commit -m "feat(cli): create-video — scaffold videos/<id>/ with a sample spec"
```

---

## Task 16: `scripts/validate-video.ts`

**Files:**
- Create: `scripts/validate-video.ts`

- [ ] **Step 1: Write the file**

```ts
// scripts/validate-video.ts
import fs from "node:fs/promises";
import { z } from "zod";
import { findMissingAssets, specPath } from "../src/engine/AssetResolver";
import { videoSpecSchema } from "../src/schemas/video-spec";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run validate <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const file = specPath(root, id);

  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    console.error(`ERROR:\nKhông đọc được ${file}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const result = videoSpecSchema.safeParse(raw);
  if (!result.success) {
    console.error("ERROR:\nSpec không hợp lệ:");
    for (const issue of result.error.issues as z.core.$ZodIssue[]) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }
  const spec = result.data;

  const totalSceneSeconds = spec.scenes.reduce((sum, s) => sum + s.duration, 0);
  if (Math.abs(totalSceneSeconds - spec.settings.duration) > 0.01) {
    console.error(
      `ERROR:\nVideo duration does not match timeline. settings.duration=${spec.settings.duration}s, tổng scenes=${totalSceneSeconds}s.`,
    );
    process.exit(1);
  }

  const missing = await findMissingAssets(root, id, spec);
  if (missing.length > 0) {
    console.error("ERROR:\nAsset not found:");
    for (const rel of missing) console.error(`  videos/${id}/${rel}`);
    process.exit(1);
  }

  console.log(`[validate] ${id}: OK — ${spec.scenes.length} scene(s), ${totalSceneSeconds}s, mọi asset đều có.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. Nếu `z.core.$ZodIssue` không đúng tên type trong zod 4.6.5, dùng `result.error.issues` không cần annotate kiểu tường minh (để TypeScript tự suy ra) — xoá `: z.core.$ZodIssue[]` nếu báo lỗi.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-video.ts
git commit -m "feat(cli): validate — schema, asset existence, duration-matches-timeline checks"
```

---

## Task 17: `scripts/preview-video.ts`

**Files:**
- Create: `scripts/preview-video.ts`

- [ ] **Step 1: Write the file**

```ts
// scripts/preview-video.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { specPath } from "../src/engine/AssetResolver";
import { videoSpecSchema } from "../src/schemas/video-spec";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run preview <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const raw = JSON.parse(await fs.readFile(specPath(root, id), "utf8"));
  const spec = videoSpecSchema.parse(raw); // ném lỗi rõ ràng nếu spec sai — chạy `npm run validate <id>` trước nếu cần chi tiết hơn

  const propsFile = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "remotion-engine-preview-")), "props.json");
  await fs.writeFile(propsFile, JSON.stringify({ spec }));

  console.log(`[preview] Mở Remotion Studio cho videos/${id}/ (publicDir = videos/${id}/)...`);
  const child = spawn(
    "npx",
    ["remotion", "studio", "src/index.ts", `--props=${propsFile}`, `--public-dir=videos/${id}`],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/preview-video.ts
git commit -m "feat(cli): preview — open Remotion Studio with videos/<id>/'s real spec + assets"
```

---

## Task 18: `scripts/render-video.ts`

Theo đúng cách `short-video-engine` đã làm (đã kiểm chứng thật trong Workspace): `bundle()` + `selectComposition()` + `renderMedia()` từ `@remotion/bundler`/`@remotion/renderer`, không gọi `npx remotion render` qua shell.

**Files:**
- Create: `scripts/render-video.ts`

- [ ] **Step 1: Write the file**

```ts
// scripts/render-video.ts
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { outputPath, specPath, videoDir } from "../src/engine/AssetResolver";
import { videoSpecSchema } from "../src/schemas/video-spec";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run render <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const raw = JSON.parse(await fs.readFile(specPath(root, id), "utf8"));
  const spec = videoSpecSchema.parse(raw);

  console.log(`[render] Đang bundle...`);
  const bundleLocation = await bundle({
    entryPoint: path.join(root, "src", "index.ts"),
    publicDir: videoDir(root, id), // assets/ trong spec resolve thẳng từ đây, không cần copy
  });

  console.log(`[render] Đang chọn composition...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "Video",
    inputProps: { spec },
  });

  const out = outputPath(root, id);
  await fs.mkdir(path.dirname(out), { recursive: true });

  console.log(`[render] Đang render ${composition.durationInFrames} khung hình...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: out,
    inputProps: { spec },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[render] ${Math.round(progress * 100)}%`);
    },
  });
  process.stdout.write("\n");

  console.log(`[render] Xong: videos/${id}/output/video.mp4`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/render-video.ts
git commit -m "feat(cli): render — bundle + selectComposition + renderMedia, publicDir = videos/<id>/"
```

---

## Task 19: Video mẫu thật — kiểm tra toàn bộ pipeline

Không có test tự động nào thay được bước này (render MP4 thật không unit test được — xem §9 design doc).

**Files:**
- Create: `videos/demo/assets/*.png` (ảnh placeholder tự tạo bằng code, không cần tải từ đâu)

- [ ] **Step 1: Chạy `create-video` thật**

Run: `npm run create-video demo`
Expected: in ra "Đã tạo videos/demo/...".

- [ ] **Step 2: Tạo 2 ảnh placeholder bằng Node (không cần asset ngoài)**

```bash
node -e "
const fs = require('fs');
const path = require('path');
// PNG 2x2 đỏ đặc, đủ để Remotion đọc được — chỉ để kiểm tra pipeline, không cần đẹp.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mNk+M9QDwAEOQHgwsPp3AAAAABJRU5ErkJggg==','base64');
fs.writeFileSync(path.join('videos','demo','assets','scene-01.png'), png);
"
```

- [ ] **Step 3: Sửa `videos/demo/video-spec.json` thành spec thật có nhiều scene type** (tay sửa file do `create-video` tạo, hoặc ghi đè)

```json
{
  "version": "1.0",
  "id": "demo",
  "settings": { "width": 1080, "height": 1920, "fps": 30, "duration": 8 },
  "style": {},
  "audio": {},
  "scenes": [
    { "id": "hook", "type": "text", "duration": 3, "text": { "type": "hero", "content": "remotion-engine" }, "animation": { "type": "reveal" } },
    { "id": "img", "type": "image", "duration": 3, "src": "assets/scene-01.png", "animation": { "type": "kenBurns" }, "transition": { "type": "slide" } },
    { "id": "quote", "type": "quote", "duration": 2, "quote": "Một engine, nhiều video.", "transition": { "type": "fade" } }
  ]
}
```

- [ ] **Step 4: Validate**

Run: `npm run validate demo`
Expected: `[validate] demo: OK — 3 scene(s), 8s, mọi asset đều có.`

- [ ] **Step 5: Render thật**

Run: `npm run render demo`
Expected: tiến trình `[render] NN%` chạy tới 100%, kết thúc bằng `[render] Xong: videos/demo/output/video.mp4`. Kiểm tra file tồn tại và có kích thước > 0.

Run: `ls -la videos/demo/output/video.mp4`

- [ ] **Step 6: Xem bằng mắt**

Mở `videos/demo/output/video.mp4` bằng trình phát bất kỳ. Xác nhận: scene 1 chữ "remotion-engine" hiện dần (reveal), scene 2 ảnh đỏ phóng to dần (kenBurns) kèm chuyển cảnh trượt (slide) từ scene 1, scene 3 trích dẫn hiện ra kèm chuyển cảnh mờ dần (fade) từ scene 2. Không bị vỡ hình, không treo giữa chừng, đúng 1080×1920.

- [ ] **Step 7: Thử `preview` một lần cho chắc**

Run: `npm run preview demo`
Expected: Remotion Studio mở trên trình duyệt, composition "Video" hiện đúng nội dung spec của `demo` (không phải `SAMPLE_SPEC` mặc định).

- [ ] **Step 8: Commit**

```bash
git add videos/demo/video-spec.json videos/demo/assets/
git commit -m "chore: demo video — verifies create-video/validate/preview/render end to end"
```

(`videos/demo/output/` đã bị `.gitignore` bỏ qua từ Task 1 — không commit file MP4.)

---

## Plan self-review notes

- **Spec coverage:** §2 (8 primitive) → Task 10–12. §3 (Layout/Animation/Transition/Typography) → Task 5–9. §4 (zod schema) → Task 2. §5 (taxonomy 53 entry) → Task 3. §6 (audio phát) → Task 14 (`Video.tsx`). §7 (CLI 4 lệnh) → Task 15–18. §8 (kiến trúc file) → khớp đúng cấu trúc đã tạo qua Task 1–18. §9 (ranh giới test) → mọi task đều theo đúng: pure logic có test, visual component chỉ typecheck, pipeline thật chỉ kiểm ở Task 19.
- **Placeholder scan:** không có "TBD"/"tự thêm sau" nào trong code — `CodeText.tsx`'s comment về tô cú pháp Round 2 là ghi chú phạm vi (đã thống nhất ở §9 Ngoài phạm vi của design doc), không phải chỗ bỏ trống logic cần có ở Round 1.
- **Type consistency:** `VideoSpec`/`Scene`/`AnimationConfig`/`TransitionConfig`/`LayoutConfig` (Task 2) dùng xuyên suốt Task 4 (AssetResolver), Task 5–7 (animations/AnimationRenderer/TransitionRenderer), Task 10–13 (scenes/SceneRenderer), Task 14 (Video.tsx) — cùng field name (`scene.type`, `scene.animation`, `scene.transition`, `scene.layout`) không đổi tên giữa các task. `AnimationFn`/`AnimationOpts` (Task 5) khớp đúng cách `AnimationRenderer` (Task 6) gọi. Import `@remotion/transitions/*` theo đúng subpath thật đã xác nhận bằng cách tải gói về kiểm tra `package.json` `exports`, không đoán.
- **Rủi ro còn lại, cần xác nhận lúc chạy Task 19 thật:** `zoomInOut`/`linearBlur` dùng canvas/shader nội bộ — chưa render thử thật lúc viết plan này (chỉ xác nhận qua `.d.ts`/`exports`), nếu scene demo ở Task 19 không dùng transition `zoom`/`blur` thì nên thử riêng 2 loại này một lần trước khi coi Round 1 là xong hẳn.
