import { defineConfig } from "vite";

export default defineConfig({
  base: "/webgl/",
  server: {
    port: Number(process.env.PORT)!,
  },
});
