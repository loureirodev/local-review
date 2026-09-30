import { useEffect, useRef } from "react";
import { SHORTCUTS, type ShortcutId } from "./registry";

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Whether a key pressed on `target` goes into text: an input, a textarea, a
 *  select or a contenteditable (the markdown editor). */
export function isTypingTarget(target: EventTarget | null | undefined): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as Partial<HTMLElement>;
  return (el.tagName !== undefined && TEXT_TAGS.has(el.tagName)) || el.isContentEditable === true;
}

/** Whether `shortcut` should handle `e`. `composedPath()[0]` is the real target
 *  inside a shadow root, where `e.target` is retargeted to the host. */
export function shouldHandle(e: KeyboardEvent, shortcut: { plain: boolean }): boolean {
  if (e.defaultPrevented) return false;
  if (!shortcut.plain) return true;
  return !isTypingTarget(e.composedPath?.()[0] ?? e.target);
}

export type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

/** One document `keydown` listener for every registered shortcut. Handlers are
 *  read through a ref, so passing a fresh object each render re-binds nothing. */
export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of SHORTCUTS) {
        if (!shortcut.match(e)) continue;
        const handler = handlersRef.current[shortcut.id];
        if (!handler || !shouldHandle(e, shortcut)) return;
        e.preventDefault();
        handler();
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
