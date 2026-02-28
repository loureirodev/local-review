import { parsePatchFiles } from "@pierre/diffs";
import type { DiffMode, DiffResponse, ReviewState } from "@shared/types.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import DiffViewer from "./components/DiffViewer.js";
import FileTree, { type FileInfo } from "./components/FileTree.js";
import Layout from "./components/Layout.js";
import Toolbar from "./components/Toolbar.js";
import { ReviewProvider, useReview } from "./context/ReviewContext.js";
import { changeDiffMode, fetchDiff, submitReview } from "./hooks/useApi.js";
import { useSettings } from "./hooks/useSettings.js";

function AppContent() {
  const [patch, setPatch] = useState("");
  const [mode, setMode] = useState<DiffMode>("unstaged");
  const { settings, update } = useSettings();
  const [branch, setBranch] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { state, dispatch, addComment, deleteComment, toggleViewed } = useReview();

  // Extract file names from the patch
  const files: FileInfo[] = useMemo(() => {
    if (!patch) return [];
    try {
      const parsed = parsePatchFiles(patch);
      const allFiles = parsed.flatMap((p) => p.files);
      return allFiles.map((f) => ({
        name: f.name,
        type:
          f.type === "rename-pure" || f.type === "rename-changed"
            ? f.type === "rename-pure"
              ? ("renamed" as const)
              : ("renamed-changed" as const)
            : (f.type as FileInfo["type"]),
      }));
    } catch {
      return [];
    }
  }, [patch]);

  // Load diff data
  const loadDiff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: DiffResponse = await fetchDiff();
      setPatch(data.patch);
      setMode(data.source.type === "local" ? data.source.mode : "unstaged");
      setBranch(data.info.branch);
      setBaseBranch(data.info.baseBranch);
      dispatch({ type: "SET_SOURCE", source: data.source });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diff");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Initialize files in review state when patch changes
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

  // Load diff on mount
  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  // Handle mode change
  const handleModeChange = useCallback(
    async (newMode: DiffMode) => {
      try {
        await changeDiffMode(newMode);
        setMode(newMode);
        await loadDiff();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change mode");
      }
    },
    [loadDiff],
  );

  // Handle export
  const handleExportReview = useCallback(async () => {
    setExporting(true);
    try {
      const reviewState: ReviewState = {
        timestamp: new Date().toISOString(),
        source: state.source ?? { type: "local", mode },
        files: Object.values(state.files),
      };
      const result = await submitReview(reviewState);
      // Brief success indication
      alert(`Review exported to: ${result.path}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export review");
    } finally {
      setExporting(false);
    }
  }, [state, mode]);

  // Get comments for the selected file
  const selectedFileComments = useMemo(() => {
    if (!selectedFile) return [];
    return state.files[selectedFile]?.comments ?? [];
  }, [selectedFile, state.files]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">Loading diff...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg">Error</p>
          <p className="text-neutral-400 text-sm mt-2">{error}</p>
          <button
            type="button"
            onClick={loadDiff}
            className="mt-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      toolbar={
        <Toolbar
          mode={mode}
          diffStyle={settings.diffStyle}
          branch={branch}
          baseBranch={baseBranch}
          wrapLines={settings.wrapLines}
          showLineNumbers={settings.showLineNumbers}
          nestedTree={settings.nestedTree}
          fontSize={settings.fontSize}
          lineHeight={settings.lineHeight}
          onModeChange={handleModeChange}
          onDiffStyleChange={(v) => update("diffStyle", v)}
          onWrapLinesChange={(v) => update("wrapLines", v)}
          onShowLineNumbersChange={(v) => update("showLineNumbers", v)}
          onNestedTreeChange={(v) => update("nestedTree", v)}
          onFontSizeChange={(v) => update("fontSize", v)}
          onLineHeightChange={(v) => update("lineHeight", v)}
          onExportReview={handleExportReview}
          exporting={exporting}
        />
      }
      sidebar={
        <FileTree
          files={files}
          reviewFiles={state.files}
          selectedFile={selectedFile}
          nested={settings.nestedTree}
          onSelectFile={setSelectedFile}
          onToggleViewed={toggleViewed}
        />
      }
    >
      <DiffViewer
        patch={patch}
        diffStyle={settings.diffStyle}
        wrapLines={settings.wrapLines}
        showLineNumbers={settings.showLineNumbers}
        fontSize={settings.fontSize}
        lineHeight={settings.lineHeight}
        selectedFile={selectedFile}
        comments={selectedFileComments}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ReviewProvider>
      <AppContent />
    </ReviewProvider>
  );
}
