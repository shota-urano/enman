import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "enman",
    short_name: "enman",
    description: "Harmony & Finances for modern households.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdeff4",
    theme_color: "#fdeff4",
    icons: [
      {
        src: "/logo.png",
        type: "image/png",
        sizes: "1024x1024",
      },
      {
        src: "/logo.png",
        type: "image/png",
        sizes: "1024x1024",
        purpose: "maskable",
      },
    ],
  };
}
