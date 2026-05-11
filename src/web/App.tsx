import { parsePatchFiles } from "@pierre/diffs";
import type { DiffMode, ReviewState } from "@shared/types.js";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import DiffViewer from "./components/DiffViewer";
import ErrorBoundary from "./components/ErrorBoundary";
import FileTree, { type FileInfo } from "./components/FileTree";
import Layout from "./components/Layout";
import Toolbar from "./components/Toolbar";
import { CollapseProvider } from "./context/CollapseContext";
import { ReviewProvider, useReview } from "./context/ReviewContext";
import { changeDiffMode, fetchDiff, fetchReview, submitReview } from "./hooks/api";
import { SettingsProvider } from "./hooks/useSettings";
import { compareByTreeOrder } from "./utils/treeOrder";

interface DiffState {
  patch: string;
  mode: DiffMode;
  branch: string;
  baseBranch: string;
}

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
  const [diffState, setDiffState] = useState<DiffState>({
    patch: "",
    mode: "unstaged",
    branch: "",
    baseBranch: "",
  });
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
    if (!diffState.patch) return [];
    try {
      const parsed = parsePatchFiles(diffState.patch);
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
      return [];
    }
  }, [diffState.patch]);

  const reviewedCount = useMemo(
    () => Object.values(state.files).filter((f) => f.viewed).length,
    [state.files],
  );

  const loadDiff = useCallback(async () => {
    dispatchAsync({ type: "LOAD_START" });
    try {
      const [data, savedReview] = await Promise.all([fetchDiff(), fetchReview()]);
      if (savedReview) {
        dispatch({ type: "LOAD_REVIEW", reviewState: savedReview });
      } else {
        dispatch({ type: "SET_SOURCE", source: data.source });
      }
      setDiffState({
        patch: data.patch,
        mode: data.source.type === "local" ? data.source.mode : "unstaged",
        branch: data.info.branch,
        baseBranch: data.info.baseBranch,
      });
      dispatchAsync({ type: "LOAD_SUCCESS" });
    } catch (err) {
      dispatchAsync({
        type: "LOAD_ERROR",
        error: err instanceof Error ? err.message : "Failed to load diff",
      });
    }
  }, [dispatch]);

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
    loadDiff();
  }, [loadDiff]);

  const handleModeChange = useCallback(
    async (newMode: DiffMode) => {
      try {
        await changeDiffMode(newMode);
        setDiffState((prev) => ({ ...prev, mode: newMode }));
        await loadDiff();
      } catch (err) {
        dispatchAsync({
          type: "LOAD_ERROR",
          error: err instanceof Error ? err.message : "Failed to change mode",
        });
      }
    },
    [loadDiff],
  );

  const handleExportReview = useCallback(async () => {
    dispatchAsync({ type: "EXPORT_START" });
    try {
      const reviewState: ReviewState = {
        timestamp: new Date().toISOString(),
        source: state.source ?? { type: "local", mode: diffState.mode },
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
  }, [state, diffState.mode]);

  const filePaths = useMemo(() => files.map((f) => f.name), [files]);

  const handleSelectFile = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    setNavigationTargetFile(filePath);
  }, []);

  const handleNavigationHandled = useCallback((filePath: string) => {
    setNavigationTargetFile((current) => (current === filePath ? null : current));
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  if (async.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-[1.5px] border-neutral-800 border-t-neutral-400 rounded-full animate-spin" />
          <p className="text-xs text-neutral-600 font-mono">Loading diff...</p>
        </div>
      </div>
    );
  }

  if (async.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="text-center max-w-md">
          <p className="text-red-400/80 text-sm font-medium">Error</p>
          <p className="text-neutral-500 text-xs mt-2 font-mono">{async.error}</p>
          <button
            type="button"
            onClick={loadDiff}
            className="mt-4 px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <CollapseProvider filePaths={filePaths} reviewFiles={state.files}>
      <Layout
        sidebarCollapsed={sidebarCollapsed}
        toolbar={
          <Toolbar
            mode={diffState.mode}
            branch={diffState.branch}
            baseBranch={diffState.baseBranch}
            sidebarCollapsed={sidebarCollapsed}
            reviewedCount={reviewedCount}
            totalFiles={files.length}
            onToggleSidebar={toggleSidebar}
            onModeChange={handleModeChange}
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
          />
        }
      >
        <ErrorBoundary>
          <DiffViewer
            patch={diffState.patch}
            selectedFile={selectedFile}
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
