import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Em `netlify dev`, as Functions ficam em /.netlify/functions.
// O proxy do Netlify CLI cuida disso; em `vite dev` puro usamos o proxy abaixo.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/.netlify/functions": {
        target: "http://localhost:9999",
        changeOrigin: true,
      },
    },
  },
});
