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
