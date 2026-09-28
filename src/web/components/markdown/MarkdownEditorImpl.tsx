// Loaded on demand through `MarkdownEditor`: Lexical is only fetched the first
// time a comment editor opens (or is about to — see `preloadMarkdownEditor`).

import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { mergeRegister } from "@lexical/utils";
import { COMMAND_PRIORITY_HIGH, KEY_ENTER_COMMAND, KEY_ESCAPE_COMMAND } from "lexical";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useMountEffect } from "../../hooks/useMountEffect";
import {
  isUrl,
  MERGE_ADJACENT_LINES,
  NODES,
  PRESERVE_NEW_LINES,
  THEME,
  TRANSFORMERS,
} from "./editorConfig";
import type { MarkdownEditorProps } from "./MarkdownEditor";
import { MarkdownToolbar } from "./MarkdownToolbar";

function onError(error: Error): never {
  throw error;
}

/** Ctrl/Cmd+Enter submits, Escape cancels; everything else is the editor's. */
function KeysPlugin({ onSubmit, onCancel }: Pick<MarkdownEditorProps, "onSubmit" | "onCancel">) {
  const [editor] = useLexicalComposerContext();
  // Read at key time, so the commands register once rather than per keystroke.
  const latest = useRef({ onSubmit, onCancel });
  latest.current = { onSubmit, onCancel };
  useMountEffect(() =>
    mergeRegister(
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event || !(event.ctrlKey || event.metaKey)) return false;
          event.preventDefault();
          latest.current.onSubmit();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          event.preventDefault();
          latest.current.onCancel();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    ),
  );
  return null;
}

export default function MarkdownEditorImpl({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  autoFocus,
  toolbarContainer,
  minLines = 1,
}: MarkdownEditorProps & { placeholder: string }) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: "comment",
        theme: THEME,
        nodes: NODES,
        onError,
        // Read once, on mount: from here on the editor owns the text.
        editorState: () =>
          $convertFromMarkdownString(
            value,
            TRANSFORMERS,
            undefined,
            PRESERVE_NEW_LINES,
            MERGE_ADJACENT_LINES,
          ),
      }}
    >
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="md-body md-body--compact outline-none"
              style={{ minHeight: `${minLines * 1.6}em` }}
              aria-label="Comment"
              aria-placeholder={placeholder}
              placeholder={
                <div className="absolute top-0 left-0 text-[13px] leading-[1.6] text-faint pointer-events-none select-none">
                  {placeholder}
                </div>
              }
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin validateUrl={isUrl} />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      {/* Fires on edits only, not on the initial load, so an untouched comment
          keeps its body byte for byte. */}
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) =>
          onChange(
            editorState.read(() =>
              $convertToMarkdownString(TRANSFORMERS, undefined, PRESERVE_NEW_LINES),
            ),
          )
        }
      />
      {autoFocus ? <AutoFocusPlugin defaultSelection="rootEnd" /> : null}
      <KeysPlugin onSubmit={onSubmit} onCancel={onCancel} />
      {toolbarContainer ? createPortal(<MarkdownToolbar />, toolbarContainer) : null}
    </LexicalComposer>
  );
}
