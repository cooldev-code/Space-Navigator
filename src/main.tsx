import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <>
      <App />
      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{
          top: "max(12px, env(safe-area-inset-top, 0px))",
          right: "max(12px, env(safe-area-inset-right, 0px))",
          zIndex: 10000,
        }}
        toastOptions={{
          duration: 3500,
          className: "app-toast",
          style: {
            background: "#222536",
            color: "#f1f5f9",
            border: "1px solid #2f3349",
            maxWidth: "min(360px, calc(100vw - 24px))",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.35)",
          },
          success: {
            className: "app-toast app-toast--success",
            iconTheme: { primary: "#22c55e", secondary: "#222536" },
            style: {
              borderColor: "rgba(34, 197, 94, 0.45)",
            },
          },
          error: {
            className: "app-toast app-toast--danger",
            iconTheme: { primary: "#ef4444", secondary: "#222536" },
            style: {
              borderColor: "rgba(239, 68, 68, 0.5)",
            },
          },
        }}
      />
    </>
  </StrictMode>
);