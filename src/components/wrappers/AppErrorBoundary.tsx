import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
    componentStack: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      error,
      componentStack: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      componentStack: errorInfo.componentStack ?? null,
    });

    console.error("Application crash captured by AppErrorBoundary", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message = this.state.error?.message ?? "Unknown render error.";
    const stack = this.state.error?.stack;

    return (
      <main className="min-h-screen bg-stone-100 p-6 text-stone-900">
        <section className="mx-auto max-w-4xl space-y-4 border border-red-300 bg-red-50 p-4">
          <header className="space-y-1">
            <h1 className="text-lg font-semibold text-red-800">Application crashed</h1>
            <p className="text-sm text-red-700">
              A render error was caught by the global error boundary. See details below for debugging.
            </p>
          </header>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-red-800">{message}</p>
            {stack ? <pre className="overflow-x-auto border border-red-200 bg-white p-3 text-xs text-stone-800">{stack}</pre> : null}
            {this.state.componentStack ? (
              <pre className="overflow-x-auto border border-red-200 bg-white p-3 text-xs text-stone-800">{this.state.componentStack}</pre>
            ) : null}
          </div>

          <button
            type="button"
            onClick={this.handleReload}
            className="border border-red-300 bg-white px-3 py-2 text-sm text-red-800 hover:bg-red-100"
          >
            Reload app
          </button>
        </section>
      </main>
    );
  }
}