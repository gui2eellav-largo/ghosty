import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", err, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa] dark:bg-[#0c0c0c] p-6 text-center"
          role="alert"
        >
          <p className="text-black dark:text-white font-medium mb-2">
            Une erreur est survenue
          </p>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            L&apos;application a rencontré un problème. Rechargez la page pour continuer.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold text-sm hover:opacity-80 transition-opacity"
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
