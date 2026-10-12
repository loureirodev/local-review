import type { FileReviewState } from "@shared/types";
import { memo, type ReactNode, useMemo } from "react";
import {
  type EntryProgress,
  progressOf,
  proseExcerpt,
  type ResolvedWalkthrough,
  sameFocus,
  type WalkthroughFocus,
} from "../../utils/walkthrough";
import { RowButton } from "../Button";
import { CheckIcon, ICON_SIZE_INLINE } from "../icons";
import { Counts } from "./WalkthroughBlocks";

function matches(needle: string, title: string, paths: readonly string[]): boolean {
  return (
    !needle ||
    title.toLowerCase().includes(needle) ||
    paths.some((p) => p.toLowerCase().includes(needle))
  );
}

function Entry({
  selected,
  onSelect,
  marker,
  title,
  detail,
  progress,
}: {
  selected: boolean;
  onSelect: () => void;
  marker: ReactNode;
  title: string;
  detail?: string;
  progress?: EntryProgress;
}) {
  const done = progress != null && progress.viewed === progress.total;
  return (
    <div
      className={`border-l-2 ${selected ? "border-accent bg-accent-tint" : "border-transparent"}`}
    >
      <RowButton
        className="flex items-start gap-2 pl-2 pr-2.5 py-1.5"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        title={title}
      >
        <span
          className={`flex items-center justify-center size-4 mt-px shrink-0 text-[11px] tabular-nums ${
            done ? "text-success" : "text-faint"
          }`}
        >
          {done ? <CheckIcon size={ICON_SIZE_INLINE} /> : marker}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-xs break-words ${done ? "text-muted" : "text-text"}`}>
            {title}
          </span>
          {detail ? (
            <span className="mt-0.5 text-[11px] text-muted line-clamp-2 break-words">{detail}</span>
          ) : null}
        </span>
        {progress ? (
          <span className="mt-px shrink-0">
            <Counts progress={progress} />
          </span>
        ) : null}
      </RowButton>
    </div>
  );
}

interface WalkthroughListProps {
  walkthrough: ResolvedWalkthrough;
  focus: WalkthroughFocus;
  reviewFiles: Record<string, FileReviewState>;
  query: string;
  onSelect: (focus: WalkthroughFocus) => void;
}

/** The sidebar's Walkthrough view: the intent, the steps in reading order and
 *  Other changes. Every diff file is reachable from it. */
export default memo(function WalkthroughList({
  walkthrough,
  focus,
  reviewFiles,
  query,
  onSelect,
}: WalkthroughListProps) {
  const excerpt = useMemo(() => proseExcerpt(walkthrough.intent), [walkthrough.intent]);
  const needle = query.trim().toLowerCase();
  const steps = walkthrough.steps
    .map((step, index) => ({ step, index, paths: step.files.map((f) => f.path) }))
    .filter(({ step, paths }) => matches(needle, step.title, paths));
  // Other changes has no title of its own to match: only its paths.
  const showOther = walkthrough.other.length > 0 && matches(needle, "", walkthrough.other);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth-y py-1">
      <Entry
        selected={focus.kind === "intent"}
        onSelect={() => onSelect({ kind: "intent" })}
        marker={<span aria-hidden="true">·</span>}
        title="Overview"
        detail={excerpt}
      />
      {steps.map(({ step, index, paths }) => (
        <Entry
          key={step.id}
          selected={sameFocus(focus, { kind: "step", id: step.id })}
          onSelect={() => onSelect({ kind: "step", id: step.id })}
          marker={index + 1}
          title={step.title}
          progress={progressOf(paths, reviewFiles)}
        />
      ))}
      {showOther ? (
        <Entry
          selected={focus.kind === "other"}
          onSelect={() => onSelect({ kind: "other" })}
          marker={<span aria-hidden="true">·</span>}
          title="Other changes"
          progress={progressOf(walkthrough.other, reviewFiles)}
        />
      ) : null}
      {needle && steps.length === 0 && !showOther ? (
        <p role="status" className="px-4 py-3 text-center text-[11px] text-faint">
          No step holds a match
        </p>
      ) : null}
    </div>
  );
});
