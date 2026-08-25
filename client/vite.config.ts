import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sites } from "@openai/sites-vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sites()],
  server: {
    port: 5173,
    // Проксируем запросы к API на Rails (порт 3000), чтобы в деве писать
    // относительные пути (/api/...) и не упираться в CORS.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
