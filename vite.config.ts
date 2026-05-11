import { defineConfig, loadEnv, createLogger } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const websocketPort = process.env.WEBSOCKET_PORT;

  /**
   * Where `/api/v1` is proxied in dev (server-side only — not exposed to the client).
   * Set `API_PROXY_TARGET` in `.env.development` (no `VITE_` prefix so it stays out of the bundle).
   */
  const apiProxyTarget =
    env.API_PROXY_TARGET?.trim() ||
    env.VITE_DEV_API_PROXY_TARGET?.trim() ||
    "http://127.0.0.1:5050";

  return {
    build: {
      outDir: "server/dist",
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      ...(websocketPort
        ? {
            hmr: {
              clientPort: Number(websocketPort),
            },
          }
        : {}),
      allowedHosts: [".cdpad.io"],
      proxy: {
        "/api/v1": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    customLogger: createLogger("info", { prefix: "[coderpad]" }),
  };
});
