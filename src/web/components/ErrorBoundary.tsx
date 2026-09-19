import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full text-muted">
            <div className="text-center max-w-md p-4">
              <p className="text-danger text-lg">Failed to render diff</p>
              <p className="text-muted text-sm mt-2 break-words">{this.state.error?.message}</p>
              <div className="mt-4">
                <Button onClick={() => this.setState({ hasError: false, error: null })}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
