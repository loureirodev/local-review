import { describe, expect, test } from "bun:test";
import { relativeTime } from "./relativeTime";

const NOW = Date.parse("2026-09-28T12:00:00Z");

describe("relativeTime", () => {
  test("picks the largest unit that fits", () => {
    const threeDays = relativeTime("2026-09-25T11:00:00Z", NOW);
    const twoHours = relativeTime("2026-09-28T10:00:00Z", NOW);
    expect(threeDays).toContain("3");
    expect(twoHours).toContain("2");
    expect(threeDays).not.toBe(twoHours);
  });

  test("returns an empty string for an invalid date", () => {
    expect(relativeTime("not a date", NOW)).toBe("");
  });
});
