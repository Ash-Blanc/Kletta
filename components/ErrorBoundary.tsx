import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  onReset?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Kletta Error Boundary caught an error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8 text-text">
          <div className="max-w-md w-full bg-surface border border-surfaceHighlight rounded-2xl shadow-xl p-8 space-y-4 text-center">
            <div className="text-lg font-semibold">Something went wrong</div>
            <p className="text-sm text-textMuted">
              The Kletta workspace hit an unexpected error. You can reload the page to continue working.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accentHover transition-colors"
            >
              Reload Workspace
            </button>
            <button
              onClick={this.handleReset}
              className="w-full px-4 py-2 rounded-lg border border-surfaceHighlight text-text text-sm hover:bg-surfaceHighlight/40 transition-colors"
            >
              Dismiss
            </button>
            {this.state.error && (
              <pre className="text-[11px] text-left bg-black/40 border border-surfaceHighlight/60 rounded-lg p-4 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;