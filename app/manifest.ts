import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/app",
    display: "standalone",
    background_color: "#0B0D1A",
    theme_color: "#0B0D1A",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
