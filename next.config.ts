import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Envoi d'images vers Vercel Blob : jusqu'à 5 Mo par fichier, plusieurs
      // fichiers par produit. La limite par défaut (1 Mo) rejetait les photos
      // un peu lourdes avant même d'atteindre l'action serveur.
      bodySizeLimit: "12mb",
    },
  },
  images: {
    remotePatterns: [
      // Vercel Blob (*.public.blob.vercel-storage.com) et visuels distants.
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
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
