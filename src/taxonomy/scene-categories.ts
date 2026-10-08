// src/taxonomy/scene-categories.ts
// Bảng phân loại 53 tên scene (52 tên người dùng liệt kê khi brainstorm + screenshot_scene) — xem
// docs/superpowers/specs/2026-10-09-remotion-engine-round1-design.md §5 để biết lý do từng ánh xạ.
//
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
