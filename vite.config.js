import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy API requests to the backend
      "/api": {
        target: "http://localhost:5000", // Corrected backend port
        changeOrigin: true,
      },
      // Proxy Socket.io connections
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
      },
    },
  },
});
