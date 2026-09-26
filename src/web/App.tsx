import { parsePatchFiles } from "@pierre/diffs";
import type { FolderTreeResponse, LaunchSource, ReviewState } from "@shared/types.js";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "./components/Button";
import DiffViewer, { type ViewerContent } from "./components/DiffViewer";
import type { FolderFileState } from "./components/diff/diffParsing";
import ErrorBoundary from "./components/ErrorBoundary";
import FileTree, { type FileInfo } from "./components/FileTree";
import Layout from "./components/Layout";
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
import { createLoadQueue, type LoadOutcome } from "./utils/loadQueue";
import { compareByTreeOrder } from "./utils/treeOrder";

/** What was fetched for the launch mode: a patch, or a folder listing. */
type ViewState =
  | { kind: "diff"; patch: string; branch: string }
  | ({ kind: "folder" } & FolderTreeResponse);

const EMPTY_FILES: FileInfo[] = [];

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
  const [navigationTargetFile, setNavigationTargetFile] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [async, dispatchAsync] = useReducer(asyncReducer, {
    loading: true,
    error: null,
    exporting: false,
  });

  const { state, dispatch, addComment, deleteComment, updateComment } = useReview();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const files: FileInfo[] = useMemo(() => {
    if (view?.kind === "folder") {
      return view.paths
        .map((name) => ({ name }))
        .sort((a, b) => compareByTreeOrder(a.name, b.name));
    }
    if (!view?.patch) return EMPTY_FILES;
    try {
      const parsed = parsePatchFiles(view.patch);
      const allFiles = parsed.flatMap((p) => p.files);
      return allFiles
        .map((f) => ({
          name: f.name,
          type:
            f.type === "rename-pure" || f.type === "rename-changed"
              ? f.type === "rename-pure"
                ? ("renamed" as const)
                : ("renamed-changed" as const)
              : (f.type as FileInfo["type"]),
        }))
        .sort((a, b) => compareByTreeOrder(a.name, b.name));
    } catch {
      return EMPTY_FILES;
    }
  }, [view]);

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
        : { kind: "diff", patch: view?.patch ?? "" },
    [view, filePaths, folderFiles, handleLoadFile],
  );

  const handleSelectFile = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    setNavigationTargetFile(filePath);
  }, []);

  const handleNavigationHandled = useCallback((filePath: string) => {
    setNavigationTargetFile((current) => (current === filePath ? null : current));
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

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
          <FileTree
            files={files}
            reviewFiles={state.files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            skipped={view.kind === "folder" ? view.skipped : undefined}
          />
        }
      >
        <ErrorBoundary>
          <DiffViewer
            content={viewerContent}
            diffKey={view.kind === "diff" ? `${staged}:${view.branch}` : "folder"}
            navigationTargetFile={navigationTargetFile}
            reviewFiles={state.files}
            onNavigationHandled={handleNavigationHandled}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
            onUpdateComment={updateComment}
          />
        </ErrorBoundary>
      </Layout>
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
