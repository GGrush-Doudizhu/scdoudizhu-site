import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://scdoudizhu.com",
  output: "static",
  build: {
    format: "directory",
  },
  integrations: [sitemap()],
});
