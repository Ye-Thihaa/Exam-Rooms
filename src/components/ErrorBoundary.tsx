import React, { Component, ReactNode } from "react";
import { WifiOff, ServerCrash, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── ErrorFallback UI ─────────────────────────────────────────────────────────
export const ErrorFallback = ({
  error,
  onRetry,
}: {
  error?: Error;
  onRetry?: () => void;
}) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const isConnectionError =
    !isOnline ||
    error?.message?.toLowerCase().includes("network")    ||
    error?.message?.toLowerCase().includes("fetch")      ||
    error?.message?.toLowerCase().includes("connection") ||
    error?.message?.toLowerCase().includes("refused");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            {isConnectionError
              ? <WifiOff className="w-7 h-7 text-muted-foreground" />
              : <ServerCrash className="w-7 h-7 text-muted-foreground" />}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {isConnectionError ? "No connection" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isConnectionError
              ? "Unable to reach the server. Check your internet connection and try again."
              : "An unexpected error occurred. Try refreshing or contact support if the issue persists."}
          </p>
        </div>

        {/* Online status dot */}
        <div className="flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-xs text-muted-foreground">
            {isOnline ? "Connected" : "Offline"}
          </span>
        </div>

        {/* Retry button */}
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onRetry ? onRetry() : window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
      </div>
    </div>
  );
};

// ── ErrorBoundary class (catches render errors) ──────────────────────────────
interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;