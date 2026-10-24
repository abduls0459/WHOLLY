import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/wholly.svg"],
      manifest: {
        name: "Wholly",
        short_name: "Wholly",
        description: "A calm place for your worship, study, and fitness.",
        theme_color: "#f7f7f4",
        background_color: "#f7f7f4",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/wholly.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
      }
    })
  ],
  envDir: '../..',
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:4000" }
  }
});
export {
  vite_config_default as default
};
