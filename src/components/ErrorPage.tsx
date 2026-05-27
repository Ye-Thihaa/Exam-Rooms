import React, { useEffect, useState } from "react";
import { WifiOff, ServerCrash, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error?: Error;
  onRetry?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ error, onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isConnectionError =
    !isOnline ||
    error?.message?.toLowerCase().includes("network") ||
    error?.message?.toLowerCase().includes("fetch") ||
    error?.message?.toLowerCase().includes("connection");

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            {isConnectionError ? (
              <WifiOff className="w-7 h-7 text-muted-foreground" />
            ) : (
              <ServerCrash className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {isConnectionError ? "No connection" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isConnectionError
              ? "Unable to reach the server. Please check your internet connection and try again."
              : "An unexpected error occurred. Try refreshing the page or contact support if the issue persists."}
          </p>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-xs text-muted-foreground">
            {isOnline ? "Connected" : "Offline"}
          </span>
        </div>

        {/* Error detail (dev only) */}
        {error?.message && process.env.NODE_ENV === "development" && (
          <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md text-left break-all">
            {error.message}
          </p>
        )}

        {/* Retry button */}
        <Button onClick={handleRetry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;