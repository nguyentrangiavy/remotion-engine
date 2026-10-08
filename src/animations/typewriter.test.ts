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
