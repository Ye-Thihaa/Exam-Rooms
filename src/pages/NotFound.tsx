import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { GraduationCap, ArrowLeft, Home, FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide uppercase text-foreground">
                ExamRoom
              </p>
              <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                University System
              </p>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Error code */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Error 404
          </p>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            The page you're looking for doesn't exist or you may not have
            permission to view it.
          </p>

          {/* Attempted path */}
          <div className="my-5 px-4 py-2.5 bg-muted rounded-lg border border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              Attempted path
            </p>
            <p className="text-sm font-mono text-foreground truncate">
              {location.pathname}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
            >
              <Home className="h-4 w-4" />
              Return Home
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          If you believe this is an error, please contact your system
          administrator.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
