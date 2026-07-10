import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App";
import { migrateLegacyStorage } from "./lib/storageMigration";

// Run a best-effort migration of legacy `foodiz_*` storage keys to `weello_*`.
migrateLegacyStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#111111",
            color: "#FFF8EA",
            border: "1px solid rgba(216, 168, 79, 0.2)",
            borderRadius: "12px",
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>
);
