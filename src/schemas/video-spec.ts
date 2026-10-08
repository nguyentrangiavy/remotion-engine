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
  style: z.preprocess((v) => v ?? {}, styleSchema),
  audio: z.preprocess((v) => v ?? {}, audioSchema),
  scenes: z.array(sceneSchema).min(1, "cần ít nhất 1 scene"),
});

export type VideoSpec = z.infer<typeof videoSpecSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type LayoutConfig = z.infer<typeof layoutSchema>;
export type AnimationConfig = z.infer<typeof animationSchema>;
export type TransitionConfig = z.infer<typeof transitionSchema>;
