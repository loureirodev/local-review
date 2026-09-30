import { describe, expect, test } from "bun:test";
import { markdownToPlainText } from "./plainText";

describe("markdownToPlainText", () => {
  test("keeps link text and drops the URL", () => {
    expect(markdownToPlainText("See [the docs](https://example.com) now")).toBe("See the docs now");
  });

  test("strips emphasis and strikethrough", () => {
    expect(markdownToPlainText("**bold**, *italic*, __strong__, _em_ and ~~gone~~")).toBe(
      "bold, italic, strong, em and gone",
    );
  });

  test("keeps inline code text", () => {
    expect(markdownToPlainText("Use `Number(env.PORT)` here")).toBe("Use Number(env.PORT) here");
  });

  test("drops heading, quote and list markers", () => {
    expect(markdownToPlainText("## Title\n> quoted\n- one\n2. two\n- [x] done")).toBe(
      "Title quoted one two done",
    );
  });

  test("drops images", () => {
    expect(markdownToPlainText("Before ![shot](a.png) after")).toBe("Before after");
  });

  test("keeps code from fenced blocks without the fences", () => {
    expect(markdownToPlainText("Try:\n```ts\nconst a = 1;\n```")).toBe("Try: const a = 1;");
  });

  test("leaves identifiers with underscores inside words alone", () => {
    expect(markdownToPlainText("snake_case_name")).toBe("snake_case_name");
  });
});
