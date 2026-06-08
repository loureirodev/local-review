import type { FileReviewState } from "@shared/types.js";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AUTO_COLLAPSE_THRESHOLD = 12;

const GENERATED_FILE_PATTERNS: RegExp[] = [
  /(^|\/)(bun\.lock|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^vendor\//,
  /^node_modules\//,
  /\.min\.(js|css)$/,
  /\.map$/,
];

function isGeneratedFile(filePath: string): boolean {
  return GENERATED_FILE_PATTERNS.some((p) => p.test(filePath));
}

interface CollapseContextValue {
  getIsCollapsed: (filePath: string) => boolean;
  toggleFile: (filePath: string) => void;
  setAllCollapsed: (collapsed: boolean) => void;
  collapsedCount: number;
  totalFiles: number;
}

const CollapseContext = createContext<CollapseContextValue | null>(null);

interface ProviderProps {
  filePaths: string[];
  reviewFiles: Record<string, FileReviewState>;
  children: ReactNode;
}

export function CollapseProvider({ filePaths, reviewFiles, children }: ProviderProps) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isCollapsedDefault = useCallback(
    (filePath: string): boolean => {
      if (reviewFiles[filePath]?.viewed) return true;
      return filePaths.length > AUTO_COLLAPSE_THRESHOLD || isGeneratedFile(filePath);
    },
    [filePaths.length, reviewFiles],
  );

  const getIsCollapsed = useCallback(
    (filePath: string): boolean => {
      if (Object.hasOwn(overrides, filePath)) return overrides[filePath];
      return isCollapsedDefault(filePath);
    },
    [overrides, isCollapsedDefault],
  );

  const toggleFile = useCallback(
    (filePath: string) => {
      setOverrides((prev) => {
        const current = Object.hasOwn(prev, filePath)
          ? prev[filePath]
          : isCollapsedDefault(filePath);
        return { ...prev, [filePath]: !current };
      });
    },
    [isCollapsedDefault],
  );

  const setAllCollapsed = useCallback(
    (collapsed: boolean) => {
      const next: Record<string, boolean> = {};
      for (const path of filePaths) next[path] = collapsed;
      setOverrides(next);
    },
    [filePaths],
  );

  // When a file's viewed state flips, drop its override so the new default
  // (viewed ⇒ collapsed, unviewed ⇒ expanded) takes effect.
  const prevViewedRef = useRef<Record<string, boolean> | null>(null);
  useEffect(() => {
    const current: Record<string, boolean> = {};
    for (const [path, fr] of Object.entries(reviewFiles)) {
      current[path] = fr.viewed;
    }
    const prev = prevViewedRef.current;
    prevViewedRef.current = current;
    if (prev === null) return;
    const changed: string[] = [];
    for (const path of Object.keys(current)) {
      if (prev[path] !== current[path]) changed.push(path);
    }
    if (changed.length === 0) return;
    setOverrides((prevOverrides) => {
      let touched = false;
      const next = { ...prevOverrides };
      for (const path of changed) {
        if (Object.hasOwn(next, path)) {
          delete next[path];
          touched = true;
        }
      }
      return touched ? next : prevOverrides;
    });
  }, [reviewFiles]);

  const collapsedCount = useMemo(() => {
    let count = 0;
    for (const path of filePaths) {
      if (getIsCollapsed(path)) count++;
    }
    return count;
  }, [filePaths, getIsCollapsed]);

  const value = useMemo<CollapseContextValue>(
    () => ({
      getIsCollapsed,
      toggleFile,
      setAllCollapsed,
      collapsedCount,
      totalFiles: filePaths.length,
    }),
    [getIsCollapsed, toggleFile, setAllCollapsed, collapsedCount, filePaths.length],
  );

  return <CollapseContext.Provider value={value}>{children}</CollapseContext.Provider>;
}

export function useCollapse(): CollapseContextValue {
  const ctx = use(CollapseContext);
  if (!ctx) throw new Error("useCollapse must be used within a CollapseProvider");
  return ctx;
}
