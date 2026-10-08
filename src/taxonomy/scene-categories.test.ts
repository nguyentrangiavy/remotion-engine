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
