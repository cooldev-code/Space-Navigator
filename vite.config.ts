import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react";

const websocketPort = process.env.WEBSOCKET_PORT;

export default defineConfig({
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
        target: "http://127.0.0.1:5050",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  customLogger: createLogger("info", { prefix: "[coderpad]" }),
});
