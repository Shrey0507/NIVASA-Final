import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AuthProvider } from "./hooks/useAuth";
import App from "./App.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
