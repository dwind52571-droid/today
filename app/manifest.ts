import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Today.",
    short_name: "Today.",
    description: "A minimal health tracking PWA.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0C",
    theme_color: "#0B0B0C",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
