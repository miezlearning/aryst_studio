import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Register PWA service worker if available
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log("Konten baru tersedia, memuat ulang...");
        },
        onOfflineReady() {
          console.log("Aplikasi siap digunakan secara luring (offline-ready).");
        },
      });
    })
    .catch((err) => {
      console.warn("PWA registration not available in this environment:", err);
    });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
