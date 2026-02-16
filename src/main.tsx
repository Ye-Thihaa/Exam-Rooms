import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Console security warning
const showConsoleWarning = () => {
  const warningStyle = "color: red; font-size: 40px; font-weight: bold;";
  const messageStyle = "color: #ff6b6b; font-size: 18px;";

  console.log("%c⚠️ STOP!", warningStyle);
  console.log(
    "%cThis feature is for developers only. If someone told you to paste something here, you are being scammed!",
    messageStyle,
  );
  console.log(
    "%cPasting code here can give attackers access to this system.",
    messageStyle,
  );
};

// Disable console logs in production
if (import.meta.env.PROD) {
  showConsoleWarning();

  // Override console methods
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
  // Keep console.error for critical debugging
}

createRoot(document.getElementById("root")!).render(<App />);
