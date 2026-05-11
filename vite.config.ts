import { defineConfig, loadEnv, createLogger } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const websocketPort = process.env.WEBSOCKET_PORT;

  /** Default: local API. Set `VITE_DEV_API_PROXY_TARGET` in `.env.development` to override. */
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY_TARGET?.trim() || "http://127.0.0.1:5050";

  return {
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
