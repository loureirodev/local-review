import { type FileDiffMetadata, parsePatchFiles } from "@pierre/diffs";
import type { FolderTreeResponse, LaunchSource, ReviewState } from "@shared/types";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "./components/Button";
import CommentsList from "./components/comments/CommentsList";
import {
  type CommentIndexSource,
  type IndexedComment,
  stepComment,
  useCommentIndex,
} from "./components/comments/useCommentIndex";
import DiffViewer, { type NavigationTarget, type ViewerContent } from "./components/DiffViewer";
import type { FolderFileState } from "./components/diff/diffParsing";
import ErrorBoundary from "./components/ErrorBoundary";
import FileTree, { type FileInfo } from "./components/FileTree";
import Layout from "./components/Layout";
import ShortcutsDialog from "./components/ShortcutsDialog";
import SidebarFooter from "./components/sidebar/SidebarFooter";
import SidebarHeader, { type SidebarView } from "./components/sidebar/SidebarHeader";
import Toolbar from "./components/Toolbar";
import { CollapseProvider } from "./context/CollapseContext";
import { ReviewProvider, useReview } from "./context/ReviewContext";
import {
  fetchDiff,
  fetchFolderFile,
  fetchFolderTree,
  fetchReview,
  fetchSession,
  HttpError,
  submitReview,
} from "./hooks/api";
import { SettingsProvider } from "./hooks/useSettings";
import { useGlobalShortcuts } from "./shortcuts/useGlobalShortcuts";
import { createLoadQueue, type LoadOutcome } from "./utils/loadQueue";
import { compareByTreeOrder } from "./utils/treeOrder";

/** What was fetched for the launch mode: a patch, or a folder listing. */
type ViewState =
  | { kind: "diff"; patch: string; branch: string }
  | ({ kind: "folder" } & FolderTreeResponse);

const EMPTY_FILES: FileInfo[] = [];
const EMPTY_FILE_DIFFS: FileDiffMetadata[] = [];

/** Fixed once the app has loaded. */
interface Session {
  launch: LaunchSource;
  /** A saved review was loaded (`--existing`): its source is the one exported. */
  reviewLoaded: boolean;
}

/** The launch source with the pending view currently shown. */
function viewSource(launch: LaunchSource, staged: boolean): LaunchSource {
  return launch.type === "pending" ? { ...launch, staged } : launch;
}

/** Folder files fetched at once; "expand all" on a big folder queues the rest. */
const MAX_FILE_FETCHES = 4;

/** Missing, oversized or binary: asking again gives the same answer. */
const PERMANENT_FILE_ERRORS = new Set([404, 413, 415]);

interface AsyncState {
  loading: boolean;
  error: string | null;
  exporting: boolean;
}

type AsyncAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS" }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "EXPORT_START" }
  | { type: "EXPORT_END" };

function asyncReducer(state: AsyncState, action: AsyncAction): AsyncState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, loading: false };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "EXPORT_START":
      return { ...state, exporting: true };
    case "EXPORT_END":
      return { ...state, exporting: false };
  }
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<ViewState | null>(null);
  const [staged, setStaged] = useState(false);
  const [folderFiles, setFolderFiles] = useState<Record<string, FolderFileState>>({});
  // Contents are cached for the session. A transient failure is shown but
  // forgotten, so selecting the file again retries it.
  const [fileQueue] = useState(() =>
    createLoadQueue(MAX_FILE_FETCHES, async (path): Promise<LoadOutcome> => {
      try {
        const content = await fetchFolderFile(path);
        setFolderFiles((prev) => ({ ...prev, [path]: { status: "loaded", content } }));
        return "done";
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load file";
        setFolderFiles((prev) => ({ ...prev, [path]: { status: "error", message } }));
        return err instanceof HttpError && PERMANENT_FILE_ERRORS.has(err.status) ? "done" : "retry";
      }
    }),
  );
  // Only the latest load may apply its result: toggling the pending view
  // quickly must not leave an older response on screen.
  const loadIdRef = useRef(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Files on every load: the view is not persisted.
  const [sidebarView, setSidebarView] = useState<SidebarView>("files");
  const [fileQuery, setFileQuery] = useState("");
  const [commentQuery, setCommentQuery] = useState("");
  const [currentCommentId, setCurrentCommentId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [async, dispatchAsync] = useReducer(asyncReducer, {
    loading: true,
    error: null,
    exporting: false,
  });

  const { state, dispatch, addComment, deleteComment, updateComment } = useReview();

  const fileDiffs = useMemo(() => {
    if (view?.kind !== "diff" || !view.patch) return EMPTY_FILE_DIFFS;
    try {
      return parsePatchFiles(view.patch)
        .flatMap((p) => p.files)
        .sort((a, b) => compareByTreeOrder(a.name, b.name));
    } catch {
      return EMPTY_FILE_DIFFS;
    }
  }, [view]);

  const files: FileInfo[] = useMemo(() => {
    if (view?.kind === "folder") {
      return view.paths
        .map((name) => ({ name }))
        .sort((a, b) => compareByTreeOrder(a.name, b.name));
    }
    return fileDiffs.length === 0
      ? EMPTY_FILES
      : fileDiffs.map((f) => ({
          name: f.name,
          type:
            f.type === "rename-pure" || f.type === "rename-changed"
              ? f.type === "rename-pure"
                ? ("renamed" as const)
                : ("renamed-changed" as const)
              : (f.type as FileInfo["type"]),
        }));
  }, [view, fileDiffs]);

  const commentSource = useMemo<CommentIndexSource>(
    () =>
      view?.kind === "folder"
        ? { kind: "folder", files: folderFiles }
        : { kind: "diff", fileDiffs: new Map(fileDiffs.map((f) => [f.name, f])) },
    [view, fileDiffs, folderFiles],
  );
  const comments = useCommentIndex(state.files, commentSource, commentQuery);

  const reviewedCount = useMemo(
    () => Object.values(state.files).filter((f) => f.viewed).length,
    [state.files],
  );

  /** Fetches what the launch mode shows; the staged toggle and Retry rerun it. */
  const loadView = useCallback(async (launch: LaunchSource, showStaged: boolean) => {
    const loadId = ++loadIdRef.current;
    const isStale = () => loadId !== loadIdRef.current;
    dispatchAsync({ type: "LOAD_START" });
    try {
      if (launch.type === "folder") {
        const tree = await fetchFolderTree();
        if (isStale()) return;
        setView({ kind: "folder", ...tree });
      } else {
        const data = await fetchDiff(showStaged);
        if (isStale()) return;
        setView({ kind: "diff", patch: data.patch, branch: data.info.branch });
      }
      dispatchAsync({ type: "LOAD_SUCCESS" });
    } catch (err) {
      if (isStale()) return;
      dispatchAsync({
        type: "LOAD_ERROR",
        error: err instanceof Error ? err.message : "Failed to load diff",
      });
    }
  }, []);

  /** Runs once: the launch mode and the saved review. Re-reading the review
   *  later would replace the comments made since with the file's contents. */
  const init = useCallback(async () => {
    dispatchAsync({ type: "LOAD_START" });
    try {
      const [{ source: launch }, savedReview] = await Promise.all([fetchSession(), fetchReview()]);
      dispatch(
        savedReview
          ? { type: "LOAD_REVIEW", reviewState: savedReview }
          : { type: "SET_SOURCE", source: launch },
      );
      // Opens on the pending view the CLI launched with (the saved review's,
      // with --existing).
      const initialStaged = launch.type === "pending" && launch.staged;
      setStaged(initialStaged);
      setSession({ launch, reviewLoaded: savedReview !== null });
      await loadView(launch, initialStaged);
    } catch (err) {
      dispatchAsync({
        type: "LOAD_ERROR",
        error: err instanceof Error ? err.message : "Failed to load diff",
      });
    }
  }, [dispatch, loadView]);

  useEffect(() => {
    if (files.length > 0) {
      dispatch({
        type: "INIT_FILES",
        filePaths: files.map((f) => f.name),
      });
      // Auto-select first file if none selected
      if (!selectedFile || !files.find((f) => f.name === selectedFile)) {
        setSelectedFile(files[0]?.name ?? null);
      }
    }
  }, [files, dispatch, selectedFile]);

  useEffect(() => {
    init();
  }, [init]);

  const handleStagedChange = useCallback(
    (nextStaged: boolean) => {
      setStaged(nextStaged);
      if (session) loadView(session.launch, nextStaged);
    },
    [session, loadView],
  );

  const handleLoadFile = useCallback(
    (path: string, priority?: boolean) => fileQueue.request(path, priority),
    [fileQueue],
  );

  const handleExportReview = useCallback(async () => {
    if (!session) return;
    dispatchAsync({ type: "EXPORT_START" });
    try {
      const reviewState: ReviewState = {
        timestamp: new Date().toISOString(),
        // A saved review keeps its source and revision, with pending reviews
        // following the staged toggle. New reviews use the view shown.
        // The server adds `head`/`commit` if absent.
        source:
          session.reviewLoaded && state.source
            ? state.source.type === "pending" && session.launch.type === "pending"
              ? { ...state.source, staged }
              : state.source
            : viewSource(session.launch, staged),
        files: Object.values(state.files),
      };
      const result = await submitReview(reviewState);
      alert(`Review exported to: ${result.path}`);
    } catch (err) {
      dispatchAsync({
        type: "LOAD_ERROR",
        error: err instanceof Error ? err.message : "Failed to export review",
      });
    } finally {
      dispatchAsync({ type: "EXPORT_END" });
    }
  }, [state, session, staged]);

  const filePaths = useMemo(() => files.map((f) => f.name), [files]);

  const viewerContent = useMemo<ViewerContent>(
    () =>
      view?.kind === "folder"
        ? { kind: "folder", paths: filePaths, files: folderFiles, onLoadFile: handleLoadFile }
        : { kind: "diff", fileDiffs },
    [view, filePaths, folderFiles, handleLoadFile, fileDiffs],
  );

  const handleSelectFile = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    setNavigationTarget({ file: filePath });
  }, []);

  const handleNavigationHandled = useCallback((target: NavigationTarget) => {
    setNavigationTarget((current) => (current === target ? null : current));
  }, []);

  /** A click opens a file-level or orphaned comment in the file's drawer; `n`/`p`
   *  only scroll to the file, so stepping through never stops on a dialog. */
  const navigateToComment = useCallback((entry: IndexedComment, openDrawer: boolean) => {
    const { comment, kind } = entry;
    setCurrentCommentId(comment.id);
    setSelectedFile(comment.filePath);
    setNavigationTarget(
      kind === "line" && comment.line !== null
        ? {
            file: comment.filePath,
            comment: { id: comment.id, line: comment.line, side: comment.side },
          }
        : { file: comment.filePath, openDrawer, fileComment: true },
    );
  }, []);

  const handleSelectComment = useCallback(
    (entry: IndexedComment) => navigateToComment(entry, true),
    [navigateToComment],
  );

  const handleQueryChange = useCallback(
    (query: string) => (sidebarView === "files" ? setFileQuery(query) : setCommentQuery(query)),
    [sidebarView],
  );

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  const openHelp = useCallback(() => setHelpOpen(true), []);

  useGlobalShortcuts({
    toggleSidebar,
    help: openHelp,
    focusSearch: () => {
      setSidebarCollapsed(false);
      // Once the sidebar is visible again: a hidden input can't take focus.
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    },
    nextComment: () => {
      const next = stepComment(comments.all, comments.visible, currentCommentId, 1);
      if (next) navigateToComment(next, false);
    },
    prevComment: () => {
      const prev = stepComment(comments.all, comments.visible, currentCommentId, -1);
      if (prev) navigateToComment(prev, false);
    },
  });

  if (async.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-center max-w-md">
          <p className="text-danger text-sm font-medium">Error</p>
          <p className="text-muted text-xs mt-2">{async.error}</p>
          <div className="mt-4">
            <Button onClick={() => (session ? loadView(session.launch, staged) : init())}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full-screen loader only while there is nothing to show yet: on a reload the
  // UI stays mounted so the reader keeps their scroll position.
  if (!session || !view) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 border-[1.5px] border-hair border-t-accent rounded-full animate-spin" />
          <p className="text-xs text-muted">Loading diff...</p>
        </div>
      </div>
    );
  }

  return (
    <CollapseProvider
      filePaths={filePaths}
      reviewFiles={state.files}
      collapsedByDefault={session.launch.type === "folder"}
    >
      <Layout
        sidebarCollapsed={sidebarCollapsed}
        toolbar={
          <Toolbar
            source={viewSource(session.launch, staged)}
            branch={view.kind === "diff" ? view.branch : ""}
            sidebarCollapsed={sidebarCollapsed}
            reviewedCount={reviewedCount}
            totalFiles={files.length}
            onToggleSidebar={toggleSidebar}
            onStagedChange={handleStagedChange}
            onExportReview={handleExportReview}
            exporting={async.exporting}
          />
        }
        sidebar={
          <div className="flex flex-col h-full">
            <SidebarHeader
              view={sidebarView}
              onViewChange={setSidebarView}
              query={sidebarView === "files" ? fileQuery : commentQuery}
              onQueryChange={handleQueryChange}
              commentCount={comments.all.length}
              inputRef={searchInputRef}
            />
            {/* Both views stay mounted, so each keeps its scroll and the tree
                its expansion. */}
            <div
              className={`flex-1 min-h-0 flex-col ${sidebarView === "files" ? "flex" : "hidden"}`}
            >
              <FileTree
                files={files}
                reviewFiles={state.files}
                selectedFile={selectedFile}
                onSelectFile={handleSelectFile}
                search={fileQuery}
              />
            </div>
            <div
              className={`flex-1 min-h-0 flex-col ${sidebarView === "comments" ? "flex" : "hidden"}`}
            >
              <CommentsList
                comments={comments.visible}
                total={comments.all.length}
                query={commentQuery}
                source={state.source}
                currentCommentId={currentCommentId}
                hidden={sidebarView !== "comments"}
                onSelectComment={handleSelectComment}
                onSelectFile={handleSelectFile}
              />
            </div>
            <SidebarFooter
              skipped={view.kind === "folder" ? view.skipped : undefined}
              onOpenHelp={openHelp}
            />
          </div>
        }
      >
        <ErrorBoundary>
          <DiffViewer
            content={viewerContent}
            diffKey={view.kind === "diff" ? `${staged}:${view.branch}` : "folder"}
            navigationTarget={navigationTarget}
            reviewFiles={state.files}
            onNavigationHandled={handleNavigationHandled}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
            onUpdateComment={updateComment}
          />
        </ErrorBoundary>
      </Layout>
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </CollapseProvider>
  );
}

export default function App() {
  return (
    <ReviewProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ReviewProvider>
  );
}
