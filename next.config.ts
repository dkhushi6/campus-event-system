import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app renders per signed-in user: the session cookie is
  // read in the layout and all data comes from live database queries. Next 16's
  // Cache Components / Partial Prefetching (on by default in the scaffold)
  // assume cacheable output, so they are disabled here rather than wrapping
  // every page in Suspense for no benefit.
  cacheComponents: false,
  partialPrefetching: false,
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
