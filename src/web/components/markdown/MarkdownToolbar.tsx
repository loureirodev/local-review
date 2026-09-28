import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_UNORDERED_LIST_COMMAND, ListNode, REMOVE_LIST_COMMAND } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import { type ReactNode, useRef, useState } from "react";
import { useMountEffect } from "../../hooks/useMountEffect";
import { IS_MAC } from "../../utils/platform";
import { IconButton } from "../Button";
import {
  BoldIcon,
  CodeBlockIcon,
  CodeIcon,
  ICON_SIZE_INLINE,
  ItalicIcon,
  LinkIcon,
  ListIcon,
} from "../icons";
import { isUrl } from "./editorConfig";

interface FormatState {
  bold: boolean;
  italic: boolean;
  code: boolean;
  link: boolean;
  bulletList: boolean;
  codeBlock: boolean;
}

const NO_FORMAT: FormatState = {
  bold: false,
  italic: false,
  code: false,
  link: false,
  bulletList: false,
  codeBlock: false,
};

function $readFormat(): FormatState {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return NO_FORMAT;
  const node = selection.anchor.getNode();
  const block = node.getKey() === "root" ? null : node.getTopLevelElement();
  return {
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    code: selection.hasFormat("code"),
    link: $isLinkNode(node) || $isLinkNode(node.getParent()),
    bulletList: $getNearestNodeOfType(node, ListNode)?.getListType() === "bullet",
    codeBlock: $isCodeNode(block),
  };
}

const MOD = IS_MAC ? "⌘" : "Ctrl+";

function ToolButton({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      compact
      active={active}
      aria-pressed={active}
      title={label}
      aria-label={label}
      // Keep the caret in the editor: the format applies to its selection.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
    >
      {children}
    </IconButton>
  );
}

/** Formatting controls for the comment editor, portalled into the comment's
 *  header row so the body keeps the same box while reading and editing. */
export function MarkdownToolbar() {
  const [editor] = useLexicalComposerContext();
  const [format, setFormat] = useState(NO_FORMAT);
  const [linking, setLinking] = useState(false);
  // The editor loses focus to the URL field; the link lands on this selection.
  const savedSelection = useRef<BaseSelection | null>(null);

  useMountEffect(() =>
    editor.registerUpdateListener(({ editorState }) => {
      const next = editorState.read($readFormat);
      // Most updates are keystrokes and caret moves that leave the format as it was.
      setFormat((prev) =>
        (Object.keys(next) as (keyof FormatState)[]).every((key) => prev[key] === next[key])
          ? prev
          : next,
      );
    }),
  );

  const formatText = (type: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);

  const toggleList = () =>
    editor.dispatchCommand(
      format.bulletList ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
      undefined,
    );

  const toggleCodeBlock = () =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (format.codeBlock) $setBlocksType(selection, $createParagraphNode);
      else $setBlocksType(selection, () => $createCodeNode());
    });

  const startLink = () => {
    if (format.link) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }
    savedSelection.current = editor.getEditorState().read(() => $getSelection()?.clone() ?? null);
    setLinking(true);
  };

  const finishLink = (url: string | null) => {
    setLinking(false);
    const selection = savedSelection.current;
    savedSelection.current = null;
    editor.update(() => {
      if (selection) $setSelection(selection.clone());
      if (url === null) return;
      const current = $getSelection();
      if ($isRangeSelection(current) && current.isCollapsed()) {
        // Nothing selected to wrap: the URL is its own text.
        current.insertNodes([$createLinkNode(url).append($createTextNode(url))]);
      } else {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        // Carry on typing after the link, not over it.
        const linked = $getSelection();
        if ($isRangeSelection(linked)) {
          const end = linked.isBackward() ? linked.anchor : linked.focus;
          linked.anchor.set(end.key, end.offset, end.type);
          linked.focus.set(end.key, end.offset, end.type);
        }
      }
    });
    editor.focus();
  };

  if (linking) return <LinkField onDone={finishLink} />;

  return (
    <div className="flex items-center gap-0.5">
      <ToolButton label={`Bold (${MOD}B)`} active={format.bold} onPress={() => formatText("bold")}>
        <BoldIcon size={ICON_SIZE_INLINE} />
      </ToolButton>
      <ToolButton
        label={`Italic (${MOD}I)`}
        active={format.italic}
        onPress={() => formatText("italic")}
      >
        <ItalicIcon size={ICON_SIZE_INLINE} />
      </ToolButton>
      <ToolButton label="Inline code" active={format.code} onPress={() => formatText("code")}>
        <CodeIcon size={ICON_SIZE_INLINE} />
      </ToolButton>
      <ToolButton
        label={format.link ? "Remove link" : "Link"}
        active={format.link}
        onPress={startLink}
      >
        <LinkIcon size={ICON_SIZE_INLINE} />
      </ToolButton>
      <span aria-hidden="true" className="w-px h-3.5 mx-0.5 bg-hair" />
      <ToolButton label="Bulleted list" active={format.bulletList} onPress={toggleList}>
        <ListIcon size={ICON_SIZE_INLINE} />
      </ToolButton>
      <ToolButton label="Code block" active={format.codeBlock} onPress={toggleCodeBlock}>
        <CodeBlockIcon size={ICON_SIZE_INLINE} />
      </ToolButton>
    </div>
  );
}

/** Takes the toolbar's place, at its height, while a URL is typed. Enter
 *  applies it; Escape or leaving the field drops it. */
function LinkField({ onDone }: { onDone: (url: string | null) => void }) {
  const [url, setUrl] = useState("");
  const valid = isUrl(url);
  return (
    <input
      // biome-ignore lint/a11y/noAutofocus: the link button asked for this field
      autoFocus
      type="url"
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (valid) onDone(url);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onDone(null);
        }
      }}
      onBlur={() => onDone(null)}
      placeholder="https://… then Enter"
      aria-label="Link URL"
      aria-invalid={url !== "" && !valid}
      className="h-6 w-52 px-1.5 text-[11px] bg-bg border border-hair rounded-md text-text placeholder-faint focus:outline-none focus:border-accent aria-invalid:border-danger transition-colors"
    />
  );
}
