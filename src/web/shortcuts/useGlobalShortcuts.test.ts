import { describe, expect, test } from "bun:test";
import { SHORTCUTS } from "./registry";
import { isTypingTarget, shouldHandle } from "./useGlobalShortcuts";

function keyEvent(
  key: string,
  target: object | null,
  init: Partial<KeyboardEvent> = {},
): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target,
    composedPath: () => (target ? [target] : []),
    ...init,
  } as unknown as KeyboardEvent;
}

const byId = (id: string) => {
  const shortcut = SHORTCUTS.find((s) => s.id === id);
  if (!shortcut) throw new Error(id);
  return shortcut;
};

const el = (props: object) => props as unknown as EventTarget;

describe("isTypingTarget", () => {
  test("text fields and contenteditable are typing targets", () => {
    expect(isTypingTarget(el({ tagName: "INPUT" }))).toBe(true);
    expect(isTypingTarget(el({ tagName: "TEXTAREA" }))).toBe(true);
    expect(isTypingTarget(el({ tagName: "SELECT" }))).toBe(true);
    expect(isTypingTarget(el({ tagName: "DIV", isContentEditable: true }))).toBe(true);
  });

  test("other elements are not", () => {
    expect(isTypingTarget(el({ tagName: "BUTTON", isContentEditable: false }))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("shouldHandle", () => {
  test("plain shortcuts are skipped while typing", () => {
    expect(shouldHandle(keyEvent("n", { tagName: "INPUT" }), byId("nextComment"))).toBe(false);
    expect(shouldHandle(keyEvent("n", { tagName: "BODY" }), byId("nextComment"))).toBe(true);
  });

  test("uses the real target inside a shadow root", () => {
    const host = { tagName: "FILE-TREE-CONTAINER" };
    const e = {
      ...keyEvent("/", host),
      composedPath: () => [{ tagName: "INPUT" }, host],
    } as unknown as KeyboardEvent;
    expect(shouldHandle(e, byId("focusSearch"))).toBe(false);
  });

  test("modifier shortcuts still fire while typing", () => {
    const e = keyEvent("b", { tagName: "INPUT" }, { ctrlKey: true });
    expect(byId("toggleSidebar").match(e)).toBe(true);
    expect(shouldHandle(e, byId("toggleSidebar"))).toBe(true);
  });

  test("an event already handled is skipped", () => {
    const e = keyEvent("b", { tagName: "DIV" }, { ctrlKey: true, defaultPrevented: true });
    expect(shouldHandle(e, byId("toggleSidebar"))).toBe(false);
  });
});

describe("registry matching", () => {
  test("? and / match with Shift, plain keys don't match with Ctrl", () => {
    expect(byId("help").match(keyEvent("?", null, { shiftKey: true }))).toBe(true);
    expect(byId("focusSearch").match(keyEvent("/", null, { shiftKey: true }))).toBe(true);
    expect(byId("nextComment").match(keyEvent("n", null, { ctrlKey: true }))).toBe(false);
  });
});
