import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/env";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DoseRelay",
    short_name: "DoseRelay",
    description: "Safe medicine handovers for family caregivers. English & Persian.",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#f5f6f3",
    theme_color: "#0f766e",
    icons: [
      { src: `${BASE_PATH}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE_PATH}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE_PATH}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
