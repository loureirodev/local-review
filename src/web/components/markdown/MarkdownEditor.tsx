import { lazy, type ReactNode, Suspense } from "react";

const loadEditor = () => import("./MarkdownEditorImpl");
const MarkdownEditorImpl = lazy(loadEditor);

/** Starts fetching the editor ahead of need (e.g. on hovering "Edit"), so it
 *  opens in place instead of behind a loading state. */
export function preloadMarkdownEditor() {
  void loadEditor();
}

export interface MarkdownEditorProps {
  /** The initial markdown. Read when the editor mounts; later changes to it
   *  are ignored, since the editor owns the text from then on. */
  value: string;
  onChange: (value: string) => void;
  /** Ctrl/Cmd+Enter. */
  onSubmit: () => void;
  /** Escape. */
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Where the formatting toolbar renders: the caller's header row, so the
   *  toolbar costs no height of its own. */
  toolbarContainer: HTMLElement | null;
  /** Height the empty editor reserves, in lines. */
  minLines?: number;
  /** Shown while the editor loads. Defaults to a plain textarea. */
  fallback?: ReactNode;
}

/** WYSIWYG input for a comment body, read and written as GFM markdown. */
export function MarkdownEditor(props: MarkdownEditorProps) {
  const {
    value,
    onChange,
    onSubmit,
    onCancel,
    placeholder = "Write a comment...",
    autoFocus,
    minLines = 1,
    fallback,
  } = props;

  return (
    <Suspense
      fallback={
        fallback ?? (
          <textarea
            defaultValue={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSubmit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
            placeholder={placeholder}
            // biome-ignore lint/a11y/noAutofocus: opening the input is the request to type
            autoFocus={autoFocus}
            rows={minLines}
            className="block w-full p-0 text-[13px] leading-[1.6] bg-transparent resize-none focus:outline-none text-text placeholder-faint"
          />
        )
      }
    >
      <MarkdownEditorImpl {...props} placeholder={placeholder} />
    </Suspense>
  );
}
