import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary, { ErrorFallback } from "./components/ErrorBoundary.tsx";
const showConsoleWarning = () => {
  const warningStyle = "color: red; font-size: 40px; font-weight: bold;";
  const messageStyle = "color: #ff6b6b; font-size: 18px;";
  console.log("%c⚠️ STOP!", warningStyle);
  console.log("%cThis feature is for developers only.", messageStyle);
  console.log("%cPasting code here can give attackers access to this system.", messageStyle);
};

if (import.meta.env.PROD) {
  showConsoleWarning();
  console.log   = () => {};
  console.debug = () => {};
  console.info  = () => {};
  console.warn  = () => {};
}

const container = document.getElementById("root")!;
const root = createRoot(container);

const renderApp = () => {
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

// ── Catch errors thrown inside onClick / event handlers ──
window.addEventListener("error", (event) => {
  event.preventDefault();
  root.render(
    <ErrorBoundary>
      <ErrorFallback error={event.error} onRetry={renderApp} />
    </ErrorBoundary>
  );
});

// ── Catch unhandled promise rejections (async fetch failures) ──
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  root.render(
    <ErrorBoundary>
      <ErrorFallback error={new Error(event.reason?.message || "Connection failed")} onRetry={renderApp} />
    </ErrorBoundary>
  );
});

renderApp();