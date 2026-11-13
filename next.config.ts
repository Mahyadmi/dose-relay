import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static HTML export, served by GitHub Pages. There is no server.
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
