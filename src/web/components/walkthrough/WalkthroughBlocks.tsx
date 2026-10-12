// The walkthrough's chrome around the diff: the block above the focused files,
// the intent's overview page, and the step bar pinned under the diff.

import type { FileReviewState } from "@shared/types";
import { type ReactNode, useMemo } from "react";
import { useReview } from "../../context/ReviewContext";
import { splitPath } from "../../utils/path";
import {
  type EntryProgress,
  progressOf,
  proseExcerpt,
  type ResolvedWalkthrough,
  stepOf,
  stepPosition,
  type WalkthroughFocus,
} from "../../utils/walkthrough";
import { Button, LinkButton, RowButton } from "../Button";
import { CheckIcon, ChevronRightIcon, CommentIcon, ICON_SIZE_INLINE } from "../icons";
import { Markdown } from "../markdown/Markdown";

/** Files listed beside a step before the rest are summed up. */
const ASIDE_FILE_LIMIT = 12;

const OTHER_TITLE = "Other changes";
const OTHER_DETAIL = "Files no step covers, in tree order.";

/** The label an entry goes by in the bar and the headers. */
function entryLabel(walkthrough: ResolvedWalkthrough, focus: WalkthroughFocus): string {
  switch (focus.kind) {
    case "step":
      return `Step ${stepPosition(walkthrough, focus) + 1} of ${walkthrough.steps.length}`;
    case "other":
      return OTHER_TITLE;
    default:
      return "Overview";
  }
}

function Prose({ children }: { children: string }) {
  return <Markdown density="normal">{children}</Markdown>;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium text-faint uppercase tracking-wide">{children}</p>;
}

/** The reading column with an aside at its right from `lg` up, so a wide
 *  screen holds the step's files instead of empty ground. */
function Frame({
  children,
  aside,
  below,
  rule = true,
}: {
  children: ReactNode;
  aside?: ReactNode;
  /** Full width, under both columns. */
  below?: ReactNode;
  /** The hairline to the files under it; the intent has none. */
  rule?: boolean;
}) {
  return (
    <div className={`bg-bg ${rule ? "border-b border-hair" : ""}`}>
      <div className="mx-auto max-w-[76rem] px-6 py-6">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 max-w-[56rem]">{children}</div>
          {aside ? <aside className="min-w-0">{aside}</aside> : null}
        </div>
        {below}
      </div>
    </div>
  );
}

function Risk({ risk }: { risk: NonNullable<ResolvedWalkthrough["risk"]> }) {
  return (
    <div className="px-4 py-3 bg-panel border border-hair rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <Eyebrow>Risk</Eyebrow>
        <span
          className={`px-1.5 rounded-sm text-[11px] font-medium ${
            risk.reversible ? "bg-success/18 text-success" : "bg-danger/18 text-danger"
          }`}
        >
          {risk.reversible ? "Reversible" : "Not reversible"}
        </span>
      </div>
      <Prose>{risk.body}</Prose>
    </div>
  );
}

/** Viewed/total as a hairline bar: `--accent` filling, `--success` once done. */
function ProgressBar({ progress }: { progress: EntryProgress }) {
  const done = progress.total > 0 && progress.viewed === progress.total;
  const percent = progress.total === 0 ? 0 : (progress.viewed / progress.total) * 100;
  return (
    // The trough is `--faint` at 25%: `--track` is the cards' hover.
    <span className="block h-0.5 rounded-full bg-faint/25 overflow-hidden" aria-hidden="true">
      <span
        className={`block h-full rounded-full transition-[width] duration-300 ease-out ${
          done ? "bg-success" : "bg-accent"
        }`}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}

export function Counts({ progress }: { progress: EntryProgress }) {
  const done = progress.viewed === progress.total;
  return (
    <span className="flex items-center gap-2 text-[11px] text-faint tabular-nums">
      {progress.comments > 0 ? (
        <span className="inline-flex items-center gap-0.5" title="Comments">
          <CommentIcon size={ICON_SIZE_INLINE} written />
          {progress.comments}
        </span>
      ) : null}
      <span title="Files viewed">
        <span className={done ? "text-success" : "text-text"}>{progress.viewed}</span>/
        {progress.total}
      </span>
    </span>
  );
}

/** The focused files as a table of contents: a click scrolls to the file. */
function FileIndex({
  paths,
  roles,
  reviewFiles,
  onSelectFile,
}: {
  paths: readonly string[];
  roles: ReadonlyMap<string, string>;
  reviewFiles: Record<string, FileReviewState>;
  onSelectFile: (path: string) => void;
}) {
  const progress = progressOf(paths, reviewFiles);
  const shown = paths.slice(0, ASIDE_FILE_LIMIT);
  return (
    // Narrow panes read the same roles in the diff's file headers; phones drop them.
    <div className="hidden lg:block">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Eyebrow>Files</Eyebrow>
        <Counts progress={progress} />
      </div>
      <ProgressBar progress={progress} />
      <ul className="mt-2 -mx-2">
        {shown.map((path) => {
          const { name, dir } = splitPath(path);
          const viewed = reviewFiles[path]?.viewed ?? false;
          const role = roles.get(path);
          return (
            <li key={path}>
              <RowButton
                className="flex items-start gap-2 px-2 py-1 rounded-md"
                onClick={() => onSelectFile(path)}
                title={path}
              >
                <span
                  className={`flex items-center justify-center size-4 mt-px shrink-0 ${
                    viewed ? "text-success" : "text-faint"
                  }`}
                >
                  {viewed ? (
                    <CheckIcon size={ICON_SIZE_INLINE} />
                  ) : (
                    <span aria-hidden="true">·</span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline gap-1.5 min-w-0">
                    <span
                      className={`shrink-0 max-w-full truncate text-xs ${
                        viewed ? "text-muted" : "text-text"
                      }`}
                    >
                      {name}
                    </span>
                    {dir ? <span className="truncate text-[11px] text-faint">{dir}</span> : null}
                  </span>
                  {role ? (
                    <span className="block text-[11px] text-muted line-clamp-2 break-words">
                      {role}
                    </span>
                  ) : null}
                </span>
              </RowButton>
            </li>
          );
        })}
      </ul>
      {paths.length > shown.length ? (
        <p className="mt-1 text-[11px] text-faint">
          and {paths.length - shown.length} more in the diff
        </p>
      ) : null}
    </div>
  );
}

/** One entry of the intent's overview: what the sidebar row says, with room
 *  for the verify block's first words. */
function EntryCard({
  marker,
  title,
  detail,
  progress,
  onSelect,
}: {
  marker: ReactNode;
  title: string;
  detail?: string;
  progress: EntryProgress;
  onSelect: () => void;
}) {
  const done = progress.viewed === progress.total;
  return (
    <li className="flex">
      <RowButton
        className="flex flex-col gap-2 p-3 bg-panel border border-hair rounded-md duration-200 ease-out"
        onClick={onSelect}
      >
        <span className="flex items-start gap-2 w-full">
          <span
            className={`flex items-center justify-center size-5 shrink-0 rounded-full text-[11px] font-medium tabular-nums ${
              done ? "bg-success/18 text-success" : "bg-faint/25 text-muted"
            }`}
          >
            {done ? <CheckIcon size={ICON_SIZE_INLINE} /> : marker}
          </span>
          <span
            className={`flex-1 min-w-0 pt-px text-[13px] font-medium break-words ${
              done ? "text-muted" : "text-text"
            }`}
          >
            {title}
          </span>
        </span>
        {detail ? (
          <span className="pl-7 text-xs text-muted line-clamp-2 break-words">{detail}</span>
        ) : null}
        <span className="flex flex-col gap-1.5 w-full mt-auto pl-7">
          <span className="flex items-center justify-between gap-2 text-[11px] text-faint">
            {progress.total} file{progress.total !== 1 ? "s" : ""}
            <Counts progress={progress} />
          </span>
          <ProgressBar progress={progress} />
        </span>
      </RowButton>
    </li>
  );
}

function ReadingOrder({
  walkthrough,
  reviewFiles,
  onSelectFocus,
}: {
  walkthrough: ResolvedWalkthrough;
  reviewFiles: Record<string, FileReviewState>;
  onSelectFocus: (focus: WalkthroughFocus) => void;
}) {
  const excerpts = useMemo(
    () => walkthrough.steps.map((step) => (step.verify ? proseExcerpt(step.verify) : undefined)),
    [walkthrough.steps],
  );
  if (walkthrough.steps.length === 0 && walkthrough.other.length === 0) return null;
  return (
    <section className="mt-8">
      <Eyebrow>Reading order</Eyebrow>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {walkthrough.steps.map((step, index) => (
          <EntryCard
            key={step.id}
            marker={index + 1}
            title={step.title}
            detail={excerpts[index]}
            progress={progressOf(
              step.files.map((f) => f.path),
              reviewFiles,
            )}
            onSelect={() => onSelectFocus({ kind: "step", id: step.id })}
          />
        ))}
        {walkthrough.other.length > 0 ? (
          <EntryCard
            marker={<span aria-hidden="true">·</span>}
            title={OTHER_TITLE}
            detail={OTHER_DETAIL}
            progress={progressOf(walkthrough.other, reviewFiles)}
            onSelect={() => onSelectFocus({ kind: "other" })}
          />
        ) : null}
      </ol>
    </section>
  );
}

/** Reads the review from context: a comment or a viewed toggle re-renders it
 *  without a new header element for CodeView. */
export function WalkthroughHeader({
  walkthrough,
  focus,
  paths,
  onSelectFocus,
  onSelectFile,
}: {
  walkthrough: ResolvedWalkthrough;
  focus: WalkthroughFocus;
  /** The focused files, in reading order. */
  paths: readonly string[];
  onSelectFocus: (focus: WalkthroughFocus) => void;
  onSelectFile: (path: string) => void;
}) {
  const reviewFiles = useReview().state.files;
  const index = (
    <FileIndex
      paths={paths}
      roles={walkthrough.roles}
      reviewFiles={reviewFiles}
      onSelectFile={onSelectFile}
    />
  );
  switch (focus.kind) {
    case "all":
      return null;
    case "intent": {
      const files = walkthrough.steps.reduce(
        (n, s) => n + s.files.length,
        walkthrough.other.length,
      );
      return (
        <Frame
          rule={false}
          aside={
            <div className="flex flex-col gap-4">
              {walkthrough.risk ? <Risk risk={walkthrough.risk} /> : null}
              <p className="text-[11px] text-faint tabular-nums">
                {walkthrough.steps.length} step{walkthrough.steps.length !== 1 ? "s" : ""} · {files}{" "}
                file{files !== 1 ? "s" : ""}
              </p>
            </div>
          }
          below={
            <ReadingOrder
              walkthrough={walkthrough}
              reviewFiles={reviewFiles}
              onSelectFocus={onSelectFocus}
            />
          }
        >
          <Eyebrow>Overview</Eyebrow>
          <div className="mt-2">
            <Prose>{walkthrough.intent}</Prose>
          </div>
        </Frame>
      );
    }
    case "other":
      return (
        <Frame aside={index}>
          <Eyebrow>{OTHER_TITLE}</Eyebrow>
          <p className="mt-1 text-sm text-muted">{OTHER_DETAIL}</p>
        </Frame>
      );
    case "step": {
      const step = stepOf(walkthrough, focus);
      if (!step) return null;
      return (
        <Frame aside={index}>
          <Eyebrow>{entryLabel(walkthrough, focus)}</Eyebrow>
          <h2 className="mt-1 text-[15px] font-semibold text-text">{step.title}</h2>
          {step.verify ? (
            <div className="mt-3">
              <Prose>{step.verify}</Prose>
            </div>
          ) : null}
        </Frame>
      );
    }
  }
}

/** What the bar's Next link names: the step's own title, not its position. */
function entryTitle(walkthrough: ResolvedWalkthrough, focus: WalkthroughFocus): string {
  if (focus.kind === "step") return stepOf(walkthrough, focus)?.title ?? "";
  return entryLabel(walkthrough, focus);
}

/** Pinned under the diff, the toolbar's counterpart: the focused entry's
 *  actions stay in reach however long its files are. */
export function WalkthroughBar({
  walkthrough,
  focus,
  progress,
  next,
  onSetViewed,
  onNext,
}: {
  walkthrough: ResolvedWalkthrough;
  focus: WalkthroughFocus;
  /** The focused files'; null for the intent, which has no files. */
  progress: EntryProgress | null;
  /** The entry after the focused one; null on the last. */
  next: WalkthroughFocus | null;
  onSetViewed: (viewed: boolean) => void;
  onNext: (focus: WalkthroughFocus) => void;
}) {
  const allViewed = progress !== null && progress.viewed === progress.total;
  const position = entryLabel(walkthrough, focus);
  return (
    <div className="flex items-center gap-3 h-10 px-3 bg-panel border-t border-hair shrink-0">
      {progress === null ? null : allViewed ? (
        <Button
          variant="success"
          aria-pressed="true"
          onClick={() => onSetViewed(false)}
          title="Mark every file in this step as not viewed"
        >
          <CheckIcon size={ICON_SIZE_INLINE} />
          <span className="whitespace-nowrap">Step viewed</span>
        </Button>
      ) : (
        <Button onClick={() => onSetViewed(true)}>
          <span className="whitespace-nowrap">
            Mark<span className="max-sm:hidden"> step as</span> viewed
          </span>
        </Button>
      )}
      <span className="max-sm:hidden min-w-0 truncate text-[11px] text-faint tabular-nums">
        {position}
        {progress && !allViewed ? ` · ${progress.viewed}/${progress.total} viewed` : null}
      </span>
      <span className="flex-1" />
      {next ? (
        // Shrinkable, so a long title truncates instead of pushing past the edge.
        <LinkButton style={{ minWidth: 0 }} onClick={() => onNext(next)}>
          <span className="flex items-center gap-1 min-w-0 text-xs">
            <span className="text-faint shrink-0">
              {focus.kind === "intent" ? "Start:" : "Next:"}
            </span>
            <span className="text-text truncate max-w-[40ch]">{entryTitle(walkthrough, next)}</span>
            <ChevronRightIcon size={ICON_SIZE_INLINE} />
          </span>
        </LinkButton>
      ) : null}
    </div>
  );
}
