# remotion-engine — Round 1 — Design

Ngày: 2026-10-09
Trạng thái: thiết kế đã duyệt, chưa triển khai
Repo: [remotion-engine](.) (project riêng, độc lập với [short-video-engine](../short-video-engine), [genvid](../genvid), [auto-gg-flow](../auto-gg-flow))
Phụ thuộc: [remotion-engine.md](../remotion-engine.md) (đặc tả gốc, 41 mục) — Round 1 này triển khai một phần có chủ đích, không phải toàn bộ.

## 1. Bối cảnh và mục tiêu

`remotion-engine.md` mô tả một engine Remotion **tổng quát, tái dùng**: tạo project Remotion một lần, mọi video sau là dữ liệu (`video-spec.json`), không tạo project mới hay sửa engine cho mỗi video (§2). File spec tự chia 10 phase (§39) và cảnh báo rõ "Do NOT over-engineer the first version" (§41).

Qua brainstorm, người dùng muốn phạm vi Round 1 **rộng hơn** mức tối thiểu §41 gợi ý (chỉ 1 scene type), nhưng vẫn cần giới hạn thực tế — ban đầu liệt kê 54 tên loại video (`chart_scene`, `map_scene`, `three_d_scene`, `whiteboard_scene`...), với mục đích: **lập một từ vựng phân loại** để sau này khi người dùng cuối mô tả muốn video "kiểu gì", hệ thống biết nên dựng bằng primitive nào. Không phải yêu cầu xây đủ 54 component ngay.

Round 1 vì vậy gồm hai phần: (A) 8 scene primitive thật + đủ hệ Layout/Animation/Transition/Typography + CLI 4 lệnh + audio phát, và (B) **bảng phân loại taxonomy** ánh xạ toàn bộ 54 tên (+ `transition_scene`, `screenshot_scene`) sang primitive có sẵn hoặc đánh dấu "chưa làm — Round sau, thuộc tiểu-hệ-thống nào".

### Ngoài phạm vi Round 1

Mỗi nhóm sau là một tiểu-hệ-thống riêng, brainstorm/plan độc lập ở Round sau: biểu đồ/infographic (`chart_scene`, `data_visualization_scene`, `infographic_scene`), bản đồ (`map_scene`, `map_route_scene`), camera 3D/parallax (`three_d_scene`, `parallax_scene`, `cinematic_establishing_scene`), phân tích âm thanh (`audio_visualizer_scene`), hoạt hình vẽ tay (`whiteboard_scene`, `explainer_scene`), sơ đồ node (`timeline_scene`, `process_flow_scene`), nhân vật/hội thoại (`character_scene`, `dialogue_scene`, `reaction_scene`), mockup UI riêng từng loại (`document_scene`, `news_headline_scene`, `social_media_scene`, `quiz_scene`, `meme_scene`). Cũng ngoài phạm vi: AI Director (§16, §36 — Claude tự sinh `video-spec.json` từ kịch bản), Template/Style presets (§18–§19), tích hợp `auto-gg-flow` (dự án D, cần cả hai đầu ổn định trước).

## 2. 8 scene primitive

| Primitive | Mô tả | Props chính |
|---|---|---|
| **ImageScene** | Ảnh ngoài làm nền toàn scene | `src`, animation (zoom/pan/kenBurns) |
| **VideoScene** (mới, không có trong ví dụ §8 gốc) | Clip video làm nền/nội dung chính, tự loop nếu ngắn hơn scene | `src`, `volume`, `muted` |
| **TextScene** | Chữ thuần, không ảnh nền (nền theo `style.backgroundColor`) | `text.type` (hero/subtitle/kinetic/highlight/counter), `content` |
| **SplitScene** | Hai vùng nội dung cạnh nhau/trên-dưới | `left`/`right` (mỗi bên là `{type: "image"|"video"|"text", ...}`), `ratio` |
| **DeviceFrameScene** (mới, gộp ScreenshotScene + các biến thể showcase) | Ảnh/video đặt trong khung thiết bị giả | `frame`: `"browser" \| "macos" \| "phone" \| "none"`, `src` |
| **GridScene** | Nhiều ảnh xếp lưới | `items: {src}[]`, `columns` |
| **CodeScene** | Khối code tô cú pháp, gõ dần | `code`, `language`, animation `typewriter` |
| **QuoteScene** | Thẻ trích dẫn có kiểu riêng | `quote`, `author` |

`SceneRenderer` (trong `engine/`) dispatch theo `scene.type` sang đúng component — thêm primitive mới sau này chỉ cần thêm case, không sửa case cũ (đúng §28).

## 3. Layout / Animation / Transition / Typography

Mỗi hệ là module độc lập dưới `src/{layouts,animations,transitions,typography}/`, scene primitive chỉ **tham chiếu theo tên**, không tự implement animation/transition riêng — giữ đúng triết lý composability của spec gốc (§9–§12, §17).

- **Layout** (6, theo §9): `full-screen`, `centered`, `split-screen`, `picture-in-picture`, `grid`, `floating`.
- **Animation** (theo §10, rút gọn còn tham số hoá bằng `direction` thay vì liệt kê từng hướng riêng): `fade`, `zoom` (`direction: in|out`), `pan` (`direction: left|right|up|down`), `slide` (`direction: left|right|up|down`), `reveal`, `typewriter`, `kenBurns`, `scale`, `bounce`. Animation nhận `duration`, `intensity`, `easing` — frame-based, deterministic (đúng §10, không dùng CSS transition/setTimeout/random cho timing).
- **Transition** (5, theo §11): `fade`, `slide`, `wipe`, `zoom`, `blur` (+ `none`).
- **Typography** (7, theo §12): `Hero`, `Subtitle`, `KineticText`, `HighlightText`, `Quote`, `Counter`, `Code`.

## 4. `video-spec.json` — schema (zod)

Theo đúng ví dụ §7 của spec gốc, bổ sung `type` cho 8 primitive:

```ts
// src/schemas/video-spec.ts
import { z } from "zod";

const settingsSchema = z.object({
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().positive().default(30),
  duration: z.number().positive(), // giây — đối chiếu với tổng duration các scene lúc validate
});

const styleSchema = z.object({
  theme: z.string().default("minimal"),
  font: z.string().default("Inter"),
  primaryColor: z.string().default("#FFFFFF"),
  accentColor: z.string().default("#7C5CFF"),
  backgroundColor: z.string().default("#050505"),
});

const audioSchema = z.object({
  voiceOver: z.string().optional(), // đường dẫn file có sẵn — KHÔNG tự sinh TTS (§4 Non-Goals)
  music: z.string().optional(),
  musicVolume: z.number().min(0).max(1).default(0.15),
});

const layoutSchema = z.object({
  type: z.enum(["full-screen", "centered", "split-screen", "picture-in-picture", "grid", "floating"]),
  direction: z.enum(["horizontal", "vertical"]).optional(),
  ratio: z.number().min(0.1).max(0.9).optional(),
});

const animationSchema = z.object({
  type: z.enum(["fade", "zoom", "pan", "slide", "reveal", "typewriter", "kenBurns", "scale", "bounce"]),
  direction: z.enum(["left", "right", "up", "down", "in", "out"]).optional(),
  duration: z.number().positive().default(1),
  intensity: z.number().min(0).max(1).default(0.15),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).default("easeOut"),
});

const transitionSchema = z.object({
  type: z.enum(["none", "fade", "slide", "wipe", "zoom", "blur"]).default("fade"),
  direction: z.enum(["left", "right", "up", "down"]).optional(),
  duration: z.number().positive().default(0.4),
});

const textSchema = z.object({
  type: z.enum(["hero", "subtitle", "kinetic", "highlight", "quote", "counter", "code"]),
  content: z.string(),
  position: z.enum(["top", "center", "bottom"]).default("center"),
});

const sceneBaseSchema = z.object({
  id: z.string(),
  duration: z.number().positive(), // giây
  layout: layoutSchema.optional(),
  animation: animationSchema.optional(),
  transition: transitionSchema.optional(),
  text: textSchema.optional(),
});

export const sceneSchema = z.discriminatedUnion("type", [
  sceneBaseSchema.extend({ type: z.literal("image"), src: z.string() }),
  sceneBaseSchema.extend({ type: z.literal("video"), src: z.string(), volume: z.number().min(0).max(1).default(1), muted: z.boolean().default(false) }),
  sceneBaseSchema.extend({ type: z.literal("text") }), // bắt buộc có `text` ở sceneBaseSchema, kiểm thêm lúc validate
  sceneBaseSchema.extend({
    type: z.literal("split"),
    left: z.object({ kind: z.enum(["image", "video", "text"]), src: z.string().optional(), content: z.string().optional() }),
    right: z.object({ kind: z.enum(["image", "video", "text"]), src: z.string().optional(), content: z.string().optional() }),
  }),
  sceneBaseSchema.extend({
    type: z.literal("deviceFrame"),
    frame: z.enum(["browser", "macos", "phone", "none"]),
    src: z.string(),
  }),
  sceneBaseSchema.extend({ type: z.literal("grid"), items: z.array(z.object({ src: z.string() })).min(2), columns: z.number().int().min(1).max(4).default(2) }),
  sceneBaseSchema.extend({ type: z.literal("code"), code: z.string(), language: z.string().default("text") }),
  sceneBaseSchema.extend({ type: z.literal("quote"), quote: z.string(), author: z.string().optional() }),
]);

export const videoSpecSchema = z.object({
  version: z.literal("1.0"),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  settings: settingsSchema,
  style: styleSchema.default({}),
  audio: audioSchema.default({}),
  scenes: z.array(sceneSchema).min(1),
});

export type VideoSpec = z.infer<typeof videoSpecSchema>;
export type Scene = z.infer<typeof sceneSchema>;
```

Scene `type` dùng tên ngắn (`image`/`video`/`text`/`split`/`deviceFrame`/`grid`/`code`/`quote`), không phải tên primitive component (`ImageScene`...) — `SceneRenderer` map `type` → component.

## 5. Bảng phân loại (taxonomy) — `src/taxonomy/scene-categories.ts`

Dữ liệu thật, không phải ghi chú — AI Director (Round sau) hoặc bất kỳ step phân loại nào đọc bảng này để quyết định dùng primitive nào, hoặc báo "chưa hỗ trợ".

```ts
// src/taxonomy/scene-categories.ts
// Union lặp lại đúng các literal trong schemas/video-spec.ts (layoutSchema.type / animationSchema.type) —
// để TypeScript tự bắt lỗi nếu ai đó gõ một preset không tồn tại (vd. "wipe" không phải animation, đó
// là transition). Không animation nào thì bỏ trống field, không gán "none".
type LayoutPreset = "full-screen" | "centered" | "split-screen" | "picture-in-picture" | "grid" | "floating";
type AnimationPreset = "fade" | "zoom" | "pan" | "slide" | "reveal" | "typewriter" | "kenBurns" | "scale" | "bounce";

export type SceneCategoryEntry =
  | {
      status: "available";
      primitive: "image" | "video" | "text" | "split" | "deviceFrame" | "grid" | "code" | "quote";
      layoutPreset?: LayoutPreset;
      animationPreset?: AnimationPreset;
      note?: string;
    }
  | { status: "deferred"; subsystem: string; note?: string };

export const SCENE_CATEGORIES: Record<string, SceneCategoryEntry> = {
  video_scene: { status: "available", primitive: "video" },
  image_scene: { status: "available", primitive: "image", animationPreset: "kenBurns" },
  parallax_scene: { status: "deferred", subsystem: "camera-3d" },
  three_d_scene: { status: "deferred", subsystem: "camera-3d" },
  title_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "reveal", note: "text.type = hero" },
  kinetic_text_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "typewriter", note: "text.type = kinetic" },
  quote_scene: { status: "available", primitive: "quote", layoutPreset: "centered", animationPreset: "fade" },
  outro_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "fade", note: "text.type = hero" },
  data_visualization_scene: { status: "deferred", subsystem: "chart" },
  infographic_scene: { status: "deferred", subsystem: "chart" },
  timeline_scene: { status: "deferred", subsystem: "node-diagram" },
  map_scene: { status: "deferred", subsystem: "map" },
  split_screen_scene: { status: "available", primitive: "split", layoutPreset: "split-screen", animationPreset: "slide" },
  collage_scene: { status: "available", primitive: "grid", layoutPreset: "grid", animationPreset: "fade" },
  audio_visualizer_scene: { status: "deferred", subsystem: "audio-analysis" },
  screen_demo_scene: { status: "available", primitive: "deviceFrame", note: "frame = browser", animationPreset: "zoom" },
  screenshot_scene: { status: "available", primitive: "deviceFrame", note: "frame = browser | macos (chọn theo nội dung ảnh)", animationPreset: "zoom" },
  character_scene: { status: "deferred", subsystem: "character-dialogue" },
  dialogue_scene: { status: "deferred", subsystem: "character-dialogue" },
  product_showcase_scene: { status: "available", primitive: "deviceFrame", layoutPreset: "floating", animationPreset: "zoom" },
  code_animation_scene: { status: "available", primitive: "code", animationPreset: "typewriter" },
  logo_reveal_scene: { status: "available", primitive: "image", layoutPreset: "centered", animationPreset: "reveal" },
  intro_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "reveal", note: "text.type = hero" },
  b_roll_scene: { status: "available", primitive: "video" },
  a_roll_scene: { status: "available", primitive: "video" },
  talking_head_scene: { status: "available", primitive: "video", note: "chưa có khung nhân vật riêng — xem character-dialogue ở Round sau" },
  picture_in_picture_scene: { status: "available", primitive: "video", layoutPreset: "picture-in-picture" },
  comparison_scene: { status: "available", primitive: "split", layoutPreset: "split-screen", animationPreset: "slide" },
  before_after_scene: {
    status: "available",
    primitive: "split",
    layoutPreset: "split-screen",
    animationPreset: "reveal", // không dùng "wipe": đó là kiểu transition giữa 2 scene, không phải animation trong 1 scene
  },
  slideshow_scene: { status: "available", primitive: "grid", layoutPreset: "grid", animationPreset: "fade" },
  photo_montage_scene: { status: "available", primitive: "grid", layoutPreset: "grid", animationPreset: "fade" },
  document_scene: { status: "deferred", subsystem: "ui-mockup" },
  news_headline_scene: { status: "deferred", subsystem: "ui-mockup" },
  social_media_scene: { status: "deferred", subsystem: "ui-mockup" },
  website_showcase_scene: { status: "available", primitive: "deviceFrame", note: "frame = browser", animationPreset: "pan" },
  mobile_app_scene: { status: "available", primitive: "deviceFrame", note: "frame = phone", animationPreset: "pan" },
  countdown_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "scale", note: "text.type = counter" },
  listicle_scene: { status: "available", primitive: "grid", layoutPreset: "grid", animationPreset: "reveal" },
  quiz_scene: { status: "deferred", subsystem: "ui-mockup" },
  meme_scene: { status: "deferred", subsystem: "ui-mockup" },
  reaction_scene: { status: "deferred", subsystem: "character-dialogue" },
  whiteboard_scene: { status: "deferred", subsystem: "hand-drawn" },
  explainer_scene: { status: "deferred", subsystem: "hand-drawn" },
  process_flow_scene: { status: "deferred", subsystem: "node-diagram" },
  statistic_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "scale", note: "text.type = counter" },
  chart_scene: { status: "deferred", subsystem: "chart" },
  map_route_scene: { status: "deferred", subsystem: "map" },
  historical_archive_scene: { status: "available", primitive: "image", animationPreset: "kenBurns", note: "chưa có filter ảnh cổ riêng" },
  cinematic_establishing_scene: { status: "deferred", subsystem: "camera-3d" },
  transition_scene: { status: "available", primitive: "image", note: "không phải scene riêng — dùng trường `transition` giữa 2 scene bất kỳ, xem §3" },
  cta_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "bounce", note: "text.type = hero" },
  end_screen_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "fade", note: "text.type = hero" },
  credits_scene: { status: "available", primitive: "text", layoutPreset: "centered", animationPreset: "slide", note: "text.type = subtitle" },
};
```

## 6. Audio

Phát `audio.voiceOver`/`audio.music` qua `<Audio src={staticFile(...)} volume={...}>` của Remotion trong `Video.tsx` (không riêng từng scene) — nhạc nền giảm âm theo `musicVolume`, không có logic ducking tự động ở Round 1 (người dùng tự cân chỉnh qua giá trị `musicVolume`). **Không tự sinh giọng đọc** — `voiceOver` phải là file có sẵn (đúng §4 Non-Goals; tích hợp TTS provider như `short-video-engine` đã làm để dành Round sau nếu cần).

## 7. CLI — 4 lệnh

```bash
npm run create-video <id>   # tạo videos/<id>/video-spec.json mẫu (1 scene image) + videos/<id>/assets/ rỗng
npm run validate <id>       # schema zod + asset thiếu (AssetResolver) + tổng duration scene khớp settings.duration
npm run preview <id>        # mở Remotion Studio, props nạp từ videos/<id>/video-spec.json qua calculateMetadata
npm run render <id>         # render videos/<id>/output/video.mp4
```

Lỗi rõ ràng theo đúng ví dụ §29: `Asset not found: videos/<id>/assets/scene-03.png`, `Unknown animation: "superZoom"`, `Scene duration must be greater than 0.`, `Video duration does not match timeline.`

## 8. Kiến trúc file

```
remotion-engine/
├── src/
│   ├── Root.tsx
│   ├── Video.tsx                  # Composition tổng quát, audio, calculateMetadata đọc video-spec.json
│   ├── scenes/
│   │   ├── ImageScene.tsx, VideoScene.tsx, TextScene.tsx, SplitScene.tsx,
│   │   │   DeviceFrameScene.tsx, GridScene.tsx, CodeScene.tsx, QuoteScene.tsx
│   ├── layouts/        # FullScreen, Centered, SplitScreen, PictureInPicture, Grid, Floating
│   ├── animations/     # fade, zoom, pan, slide, reveal, typewriter, kenBurns, scale, bounce — mỗi file 1 hàm interpolate thuần
│   ├── transitions/    # FadeTransition, SlideTransition, WipeTransition, ZoomTransition, BlurTransition
│   ├── typography/     # HeroText, Subtitle, KineticText, HighlightText, QuoteText, CounterText, CodeText
│   ├── engine/
│   │   ├── SceneRenderer.tsx       # scene.type -> component
│   │   ├── LayoutRenderer.tsx
│   │   ├── AnimationRenderer.ts    # animation.type -> hàm interpolate tương ứng
│   │   ├── TransitionRenderer.tsx
│   │   └── AssetResolver.ts        # ghép đường dẫn tương đối trong spec với videos/<id>/assets/
│   ├── schemas/
│   │   └── video-spec.ts
│   └── taxonomy/
│       └── scene-categories.ts
├── videos/
│   └── <id>/{video-spec.json, assets/, output/}
├── scripts/
│   ├── create-video.ts, validate-video.ts, preview-video.ts, render-video.ts
├── tests/              # unit test cho schema, AssetResolver, AnimationRenderer, taxonomy — không test render thật (xem §9)
├── package.json, tsconfig.json, remotion.config.ts
```

## 9. Kiểm thử

- **Unit test được**: `videoSpecSchema` (zod — chấp nhận spec hợp lệ, báo lỗi rõ khi thiếu field/sai enum), `AssetResolver` (ghép đường dẫn, báo thiếu file), `AnimationRenderer`/`TransitionRenderer` (mỗi animation/transition trả về đúng style tại các frame mốc — đầu/giữa/cuối, frame-based nên test được thuần bằng cách gọi hàm `interpolate` với `frame` giả), taxonomy (mọi key có `status` hợp lệ, mọi `primitive` tham chiếu một primitive thật có trong `scenes/`).
- **Không unit test**: kết quả render MP4 thật (chỉ kiểm bằng mắt qua `npm run preview`/`npm run render` thật, giống cách các project trước trong Workspace đã làm).

## 10. Mốc triển khai (trong chính Round 1 này — không phải 10 phase của spec gốc)

1. Schema + AssetResolver + taxonomy (nền tảng, test được nhiều nhất).
2. Animation + Transition renderer (hàm thuần, test được).
3. Layout + Typography component.
4. 8 scene primitive (dùng lại Layout/Animation/Typography).
5. `Video.tsx` + `SceneRenderer` ráp tất cả lại, audio.
6. CLI 4 lệnh.
7. Video mẫu thật (dùng ảnh/video có sẵn hoặc placeholder) kiểm tra toàn bộ pipeline chạy đúng.
