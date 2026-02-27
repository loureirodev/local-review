import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  ReviewComment,
  FileReviewState,
  DiffSource,
} from "@shared/types.js";

// ===== State =====

interface ReviewStateLocal {
  files: Record<string, FileReviewState>;
  source: DiffSource | null;
}

const initialState: ReviewStateLocal = {
  files: {},
  source: null,
};

// ===== Actions =====

type ReviewAction =
  | { type: "INIT_FILES"; filePaths: string[] }
  | { type: "SET_SOURCE"; source: DiffSource }
  | { type: "TOGGLE_VIEWED"; filePath: string }
  | { type: "ADD_COMMENT"; comment: ReviewComment }
  | { type: "DELETE_COMMENT"; filePath: string; commentId: string }
  | {
      type: "UPDATE_COMMENT";
      filePath: string;
      commentId: string;
      body: string;
    };

function reviewReducer(
  state: ReviewStateLocal,
  action: ReviewAction
): ReviewStateLocal {
  switch (action.type) {
    case "SET_SOURCE":
      return { ...state, source: action.source };

    case "INIT_FILES": {
      const files: Record<string, FileReviewState> = {};
      for (const path of action.filePaths) {
        files[path] = state.files[path] ?? {
          path,
          viewed: false,
          comments: [],
        };
      }
      return { ...state, files };
    }

    case "TOGGLE_VIEWED": {
      const file = state.files[action.filePath];
      if (!file) return state;
      return {
        ...state,
        files: {
          ...state.files,
          [action.filePath]: { ...file, viewed: !file.viewed },
        },
      };
    }

    case "ADD_COMMENT": {
      const file = state.files[action.comment.filePath];
      if (!file) return state;
      return {
        ...state,
        files: {
          ...state.files,
          [action.comment.filePath]: {
            ...file,
            comments: [...file.comments, action.comment],
          },
        },
      };
    }

    case "DELETE_COMMENT": {
      const file = state.files[action.filePath];
      if (!file) return state;
      return {
        ...state,
        files: {
          ...state.files,
          [action.filePath]: {
            ...file,
            comments: file.comments.filter((c) => c.id !== action.commentId),
          },
        },
      };
    }

    case "UPDATE_COMMENT": {
      const file = state.files[action.filePath];
      if (!file) return state;
      return {
        ...state,
        files: {
          ...state.files,
          [action.filePath]: {
            ...file,
            comments: file.comments.map((c) =>
              c.id === action.commentId ? { ...c, body: action.body } : c
            ),
          },
        },
      };
    }

    default:
      return state;
  }
}

// ===== Context =====

interface ReviewContextValue {
  state: ReviewStateLocal;
  dispatch: Dispatch<ReviewAction>;
  addComment: (comment: ReviewComment) => void;
  deleteComment: (filePath: string, commentId: string) => void;
  updateComment: (filePath: string, commentId: string, body: string) => void;
  toggleViewed: (filePath: string) => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  const addComment = useCallback(
    (comment: ReviewComment) => {
      dispatch({ type: "ADD_COMMENT", comment });
    },
    [dispatch]
  );

  const deleteComment = useCallback(
    (filePath: string, commentId: string) => {
      dispatch({ type: "DELETE_COMMENT", filePath, commentId });
    },
    [dispatch]
  );

  const updateComment = useCallback(
    (filePath: string, commentId: string, body: string) => {
      dispatch({ type: "UPDATE_COMMENT", filePath, commentId, body });
    },
    [dispatch]
  );

  const toggleViewed = useCallback(
    (filePath: string) => {
      dispatch({ type: "TOGGLE_VIEWED", filePath });
    },
    [dispatch]
  );

  return (
    <ReviewContext.Provider
      value={{
        state,
        dispatch,
        addComment,
        deleteComment,
        updateComment,
        toggleViewed,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) {
    throw new Error("useReview must be used within a ReviewProvider");
  }
  return ctx;
}
